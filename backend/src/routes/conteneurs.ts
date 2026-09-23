import { Router, Request, Response } from 'express';
import { readSettings } from '../services/operational-settings';
import { activeDestinationCountries, configuredDestination } from '../services/destination-countries';
import { operationError } from '../services/operation-validation';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { StatutConteneur, TypeCheckpoint } from '../generated/prisma/enums';
import { publishNotifications, publishOperationChange } from '../realtime';
import { canAccessContainer, checkpointTypeForRole, containerScopeFor } from '../services/access-control';

const router = Router();

const conteneurSchema = z.object({
  numeroBL: z.string().min(1, 'Numéro B/L requis'),
  numeroConteneur: z.string().min(1).optional(),
  atp: z.string().optional(),
  consignataireId: z.number().int().positive('Compagnie maritime invalide').optional(),
  clientEmail: z.string().email('Email interne invalide').optional(),
  destination: z.string().min(1, 'Destination requise'),
  typeMarchandise: z.string().min(1, 'Type de marchandise requis'),
  dateArrivee: z.string().datetime('Date invalide'),
  datePrevuePia: z.string().datetime('Date prévue PIA invalide').optional(),
  dateDebarquement: z.string().datetime('Date de débarquement invalide').optional(),
  paysDestination: z.string().optional(),
  statut: z.enum(StatutConteneur as unknown as [string, ...string[]]).default('EN_ATTENTE'),
  terminalAffecte: z.enum(['LCT', 'TOGO']),
});

const updateConteneurSchema = conteneurSchema.partial();

const conteneurSelect = {
  id: true,
  numeroConteneur: true,
  numeroBL: true,
  atp: true,
  destination: true,
  typeMarchandise: true,
  dateArrivee: true,
  datePrevuePia: true,
  dateDebarquement: true,
  vueAQuaiAt: true,
  dateSortieTerminal: true,
  dateEntreePia: true,
  dateSortiePia: true,
  paysDestination: true,
  statut: true,
  terminalAffecte: true,
  createdAt: true,
  updatedAt: true,
  consignataire: { select: { id: true, nom: true, code: true } },
  client: { select: { id: true, nom: true, prenom: true, email: true } },
  checkpoints: {
    orderBy: { date: 'asc' as const },
    select: {
      id: true,
      type: true,
      statut: true,
      date: true,
      lieu: true,
      notes: true,
    },
  },
  mouvements: {
    orderBy: { date: 'desc' as const },
    take: 1,
    select: {
      id: true,
      action: true,
      date: true,
      details: true,
      user: { select: { id: true, nom: true, prenom: true } },
    },
  },
};

// GET /api/conteneurs - Liste des conteneurs
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { statut, search } = req.query;
    const where: any = { AND: [containerScopeFor(req.user!)] };

    if (statut && typeof statut === 'string') {
      where.statut = statut;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { numeroConteneur: { contains: search, mode: 'insensitive' } },
        { numeroBL: { contains: search, mode: 'insensitive' } },
        { atp: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const conteneurs = await prisma.conteneur.findMany({
      where,
      // Toutes les files opérationnelles placent la dernière unité traitée en tête.
      // `updatedAt` est automatiquement renouvelé par Prisma à chaque checkpoint.
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        id: true,
        numeroConteneur: true,
        numeroBL: true,
        atp: true,
        destination: true,
        typeMarchandise: true,
        dateArrivee: true,
        datePrevuePia: true,
        dateDebarquement: true,
        dateSortieTerminal: true,
        dateEntreePia: true,
        dateSortiePia: true,
        paysDestination: true,
        statut: true,
        terminalAffecte: true,
        createdAt: true,
        updatedAt: true,
        consignataire: { select: { id: true, nom: true, code: true } },
        client: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    });

    res.json({ conteneurs });
  } catch (error) {
    console.error('Erreur liste conteneurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/conteneurs/:id - Détail d'un conteneur
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const conteneur = await prisma.conteneur.findUnique({
      where: { id },
      select: conteneurSelect,
    });

    if (!conteneur) {
      res.status(404).json({ error: 'Conteneur non trouvé' });
      return;
    }

    if (!canAccessContainer(req.user!, {
      clientId: conteneur.client.id,
      consignataireId: conteneur.consignataire.id,
      terminalAffecte: conteneur.terminalAffecte,
      statut: conteneur.statut,
    })) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    res.json({ conteneur });
  } catch (error) {
    console.error('Erreur détail conteneur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/conteneurs - Créer un conteneur (logisticiens)
router.post('/', authenticate, requireRole('LOGISTICIEN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = conteneurSchema.parse(req.body);

    const internalOwner = data.clientEmail
      ? await prisma.user.findUnique({ where: { email: data.clientEmail } })
      : await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!internalOwner) {
      res.status(400).json({ error: 'Compte interne introuvable' });
      return;
    }

    const existing = await prisma.conteneur.findFirst({
      where: { OR: [
        { numeroBL: data.numeroBL },
        ...(data.numeroConteneur ? [{ numeroConteneur: data.numeroConteneur }] : []),
      ] },
    });

    if (existing) {
      res.status(400).json({ error: 'Ce numéro de B/L existe déjà' });
      return;
    }

    const fallbackCompany = data.consignataireId ? null : await prisma.consignataire.upsert({
      where: { code: 'MNF' }, update: {}, create: { nom: 'Compagnie non renseignée', code: 'MNF' },
    });
    const consignataireId = data.consignataireId ?? fallbackCompany!.id;

    const conteneur = await prisma.conteneur.create({
      data: {
        numeroConteneur: data.numeroConteneur,
        numeroBL: data.numeroBL,
        atp: data.atp,
        consignataireId,
        clientId: internalOwner.id,
        destination: data.destination,
        typeMarchandise: data.typeMarchandise,
        dateArrivee: new Date(data.dateArrivee),
        datePrevuePia: data.datePrevuePia ? new Date(data.datePrevuePia) : null,
        dateDebarquement: data.dateDebarquement ? new Date(data.dateDebarquement) : null,
        vueAQuaiAt: data.dateDebarquement ? new Date(data.dateDebarquement) : null,
        paysDestination: data.paysDestination,
        statut: data.statut as any,
        terminalAffecte: data.terminalAffecte,
      },
      select: conteneurSelect,
    });

    res.status(201).json({ conteneur });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Données invalides', details: error.issues });
      return;
    }
    console.error('Erreur création conteneur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/conteneurs/:id - Modifier un conteneur (logisticiens)
router.put('/:id', authenticate, requireRole('LOGISTICIEN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const data = updateConteneurSchema.parse(req.body);

    const updateData: any = { ...data };
    if (data.clientEmail) {
      const client = await prisma.user.findUnique({
        where: { email: data.clientEmail },
      });
      if (!client) {
        res.status(400).json({ error: 'Client introuvable avec cet email' });
        return;
      }
      updateData.clientId = client.id;
      delete updateData.clientEmail;
    }

    if (data.dateArrivee) {
      updateData.dateArrivee = new Date(data.dateArrivee);
    }
    if (data.datePrevuePia) updateData.datePrevuePia = new Date(data.datePrevuePia);
    if (data.dateDebarquement) {
      updateData.dateDebarquement = new Date(data.dateDebarquement);
      updateData.vueAQuaiAt = new Date(data.dateDebarquement);
    }

    delete updateData.statut; // Le statut se met à jour via les checkpoints

    const conteneur = await prisma.conteneur.update({
      where: { id },
      data: updateData,
      select: conteneurSelect,
    });

    res.json({ conteneur });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Données invalides', details: error.issues });
      return;
    }
    console.error('Erreur modification conteneur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/conteneurs/:id - Supprimer un conteneur (logisticiens)
router.delete('/:id', authenticate, requireRole('LOGISTICIEN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    await prisma.conteneur.delete({ where: { id } });
    res.json({ message: 'Conteneur supprimé' });
  } catch (error) {
    console.error('Erreur suppression conteneur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/conteneurs/:id/checkpoints - Ajouter un checkpoint (logisticiens)
router.post('/:id/checkpoints', authenticate, requireRole('LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const checkpointSchema = z.object({
      type: z.enum(TypeCheckpoint as unknown as [string, ...string[]]),
      statut: z.string().min(1, 'Statut requis'),
      date: z.string().datetime('Date invalide'),
      lieu: z.string().min(1, 'Lieu requis'),
      notes: z.string().optional(),
      paysDestination: z.string().optional(),
    });

    const data = checkpointSchema.parse(req.body);

    const conteneur = await prisma.conteneur.findUnique({ where: { id } });
    if (!conteneur) {
      res.status(404).json({ error: 'Conteneur non trouvé' });
      return;
    }

    if (!canAccessContainer(req.user!, conteneur)) {
      res.status(403).json({ error: 'Ce conteneur ne fait pas partie de votre périmètre' });
      return;
    }

    const requiredType = checkpointTypeForRole(req.user!.role);
    if (requiredType && data.type !== requiredType) {
      res.status(403).json({ error: `Votre espace autorise uniquement le checkpoint ${requiredType}` });
      return;
    }

    const normalizedAction = data.statut.toLocaleUpperCase('fr-FR');
    if ((req.user!.role === 'CONTROLEUR_LCT' || req.user!.role === 'CONTROLEUR_TOGO') && !normalizedAction.includes('SORTIE')) {
      res.status(400).json({ error: 'Le checkpoint terminal enregistre uniquement une sortie de conteneur.' });
      return;
    }
    if (req.user!.role === 'AGENT_PIA' && !/(ENTREE|ARRIVEE|SORTIE)/.test(normalizedAction)) {
      res.status(400).json({ error: 'La PIA enregistre une entrée ou une sortie de conteneur.' });
      return;
    }

    const terminalTypes = [TypeCheckpoint.TERMINAL_LCT, TypeCheckpoint.TERMINAL_TOGO];
    if (terminalTypes.includes(data.type as (typeof terminalTypes)[number])) {
      const expectedTerminalType = conteneur.terminalAffecte === 'LCT' ? TypeCheckpoint.TERMINAL_LCT : TypeCheckpoint.TERMINAL_TOGO;
      if (data.type !== expectedTerminalType) {
        res.status(409).json({ error: `Ce conteneur est affecté à ${conteneur.terminalAffecte === 'LCT' ? 'LCT' : 'Togo Terminal'}` });
        return;
      }
      const conflictingTerminal = await prisma.checkpoint.findFirst({
        where: {
          conteneurId: id,
          type: {
            in: terminalTypes.filter((terminalType) => terminalType !== data.type),
          },
        },
        select: { type: true, lieu: true },
      });

      if (conflictingTerminal) {
        res.status(409).json({
          error: `Ce conteneur est déjà affecté au checkpoint ${conflictingTerminal.lieu}.`,
        });
        return;
      }
    }

    // Mise à jour automatique du statut selon le checkpoint
    const action = normalizedAction;
    let newStatut: string = conteneur.statut;
    if (data.type === 'TERMINAL_LCT' || data.type === 'TERMINAL_TOGO') {
      newStatut = 'SORTI_TERMINAL';
    }
    if (data.type === 'PIA') newStatut = /SORTIE/.test(action) ? 'SORTI_PIA' : 'ENTRE_PIA';

    if (newStatut === 'SORTI_PIA') {
      const settings = await readSettings();
      const country = configuredDestination(data.paysDestination, activeDestinationCountries(settings.destinationCountries, settings.disabledDestinationCountries));
      if (!country) { res.status(400).json({ error: 'Choisissez un pays de destination configuré dans les paramètres. Pour un nouveau pays, contactez l’administrateur.' }); return; }
      data.paysDestination = country;
    }

    const validationError = operationError(conteneur, newStatut, new Date(data.date));
    if (validationError) {
      res.status(409).json({ error: validationError });
      return;
    }

    const operationalRecipients = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: ['ADMIN', 'LOGISTICIEN'] } },
          { role: 'AGENT_PIA' },
          { role: conteneur.terminalAffecte === 'LCT' ? 'CONTROLEUR_LCT' : 'CONTROLEUR_TOGO' },
        ],
      },
      select: { id: true },
    });
    const recipientIds = [...new Set(operationalRecipients.map((user) => user.id))];
    const reference = [conteneur.numeroConteneur, `B/L ${conteneur.numeroBL}`, conteneur.atp]
      .filter(Boolean)
      .join(' / ');
    const terminalLabel = conteneur.terminalAffecte === 'TOGO' ? 'Togo Terminal' : 'LCT';
    const statusMessage = data.type === 'PIA'
      ? /SORTIE/.test(action)
        ? `${reference} : sortie de la PIA confirmée vers ${data.paysDestination || conteneur.paysDestination || conteneur.destination}.`
        : `${reference} : entrée à la PIA confirmée.`
      : `${reference} : sortie de ${terminalLabel} enregistrée, conteneur attendu à la PIA.`;

    const result = await prisma.$transaction(async (tx) => {
      // Claim this version before creating any event; concurrent requests cannot both succeed.
      const claimed = await tx.conteneur.updateMany({
        where: { id, updatedAt: conteneur.updatedAt },
        data: { updatedAt: new Date(Math.max(Date.now(), conteneur.updatedAt.getTime() + 1)) },
      });
      if (claimed.count !== 1) throw new Error('OPERATION_CONFLICT');
      const checkpoint = await tx.checkpoint.create({
        data: {
          conteneurId: id,
          type: data.type as any,
          statut: data.statut,
          date: new Date(data.date),
          lieu: data.lieu,
          notes: data.notes,
        },
      });

      await tx.mouvement.create({
        data: {
          conteneurId: id,
          checkpointId: checkpoint.id,
          userId: req.user!.id,
          action: data.statut,
          details: data.notes || undefined,
        },
      });

      const operationalDates: Record<string, Date | string | null> = {};
      if (newStatut === 'SORTI_TERMINAL') operationalDates.dateSortieTerminal = new Date(data.date);
      if (newStatut === 'ENTRE_PIA') operationalDates.dateEntreePia = new Date(data.date);
      if (newStatut === 'SORTI_PIA') {
        operationalDates.dateSortiePia = new Date(data.date);
        operationalDates.paysDestination = data.paysDestination || conteneur.paysDestination;
      }
      const updatedContainer = await tx.conteneur.update({
        where: { id },
        data: { statut: newStatut as any, ...operationalDates },
      });

      const notifications = await tx.notification.createManyAndReturn({
        data: recipientIds.map((userId) => ({
          userId,
          conteneurId: id,
          message: statusMessage,
          type: data.type === 'PIA' ? (/SORTIE/.test(action) ? 'SORTIE_PIA' : 'ARRIVEE_PIA') : 'ATTENDU_PIA',
        })),
      });

      return { checkpoint, notifications, updatedContainer };
    });

    publishNotifications(result.notifications);
    publishOperationChange(conteneur.clientId, {
      conteneurId: id,
      statut: result.updatedContainer.statut,
      checkpointType: data.type,
    });

    res.status(201).json({ checkpoint: result.checkpoint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Données invalides', details: error.issues });
      return;
    }
    if (error instanceof Error && error.message === 'OPERATION_CONFLICT') {
      res.status(409).json({ error: 'Ce conteneur vient d’être modifié. Actualisez la fiche avant de poursuivre.' });
      return;
    }
    console.error('Erreur création checkpoint:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
