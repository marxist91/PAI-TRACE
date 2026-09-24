import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { disconnectUser } from '../realtime';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));
const roles = ['ADMIN', 'LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'] as const;
const password = z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').max(72).refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Mot de passe trop long.');
const fields = z.object({
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  nom: z.string().trim().min(1).max(100), prenom: z.string().trim().min(1).max(100),
  telephone: z.string().trim().max(30).default(''), role: z.enum(roles), isActive: z.boolean().default(true),
});
const selected = { id: true, email: true, nom: true, prenom: true, telephone: true, role: true,
  isActive: true, createdAt: true, updatedAt: true, _count: { select: { conteneurs: true, mouvements: true } } } as const;
function failure(error: unknown, res: Response) {
  if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Données invalides' }); return; }
  const code = (error as { code?: string })?.code;
  if (code === 'P2003' || code === 'HISTORY') { res.status(409).json({ error: 'Ce compte est lié à l’historique. Désactivez-le plutôt que de le supprimer.' }); return; }
  if (code === 'P2002') { res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' }); return; }
  if (code === 'P2025') { res.status(404).json({ error: 'Utilisateur introuvable.' }); return; }
  if (code === 'P2034') { res.status(409).json({ error: 'Modification simultanée. Actualisez et réessayez.' }); return; }
  res.status(500).json({ error: 'Impossible d’enregistrer le compte.' });
}

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: [...roles] } },
      orderBy: [{ role: 'asc' }, { nom: 'asc' }, { prenom: 'asc' }],
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
        _count: { select: { conteneurs: true, mouvements: true } },
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    res.status(500).json({ error: 'Impossible de charger les utilisateurs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = fields.extend({ password }).strict().parse(req.body);
    const existing = await prisma.user.findFirst({ where: { email: { equals: data.email, mode: 'insensitive' } } });
    if (existing) { res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' }); return; }
    const user = await prisma.user.create({ data: { ...data, password: await bcrypt.hash(data.password, 12) }, select: selected });
    res.status(201).json({ user });
  } catch (error) { failure(error, res); }
});
router.post('/:id/revoke-session', async (req: AuthRequest, res) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
    });
    disconnectUser(id);
    res.json({ message: 'Session révoquée. Le compte peut se reconnecter.' });
  } catch (error) { failure(error, res); }
});
for (const action of ['status', 'delete'] as const) {
  const handler = async (req: AuthRequest, res: Response) => {
    try {
      const id = z.coerce.number().int().positive().parse(req.params.id);
      const schema = z.object({ updatedAt: z.string().datetime() });
      const data = action === 'status'
        ? schema.extend({ isActive: z.boolean() }).strict().parse(req.body)
        : schema.strict().parse(req.body);
      if (id === req.user!.id) { res.status(409).json({ error: 'Vous ne pouvez pas désactiver ou supprimer votre propre compte.' }); return; }
      const result = await prisma.$transaction(async tx => {
        const before = await tx.user.findUniqueOrThrow({ where: { id }, include: { _count: { select: { conteneurs: true, mouvements: true, manifestes: true, notifications: true } } } });
        if (before.updatedAt.toISOString() !== data.updatedAt) return null;
        if (before.role === 'ADMIN' && before.isActive && (action === 'delete' || ('isActive' in data && !data.isActive))) {
          if (!await tx.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: id } } })) throw Object.assign(new Error(), { code: 'P2034' });
        }
        if (action === 'delete') {
          if (Object.values(before._count).some(count => count > 0) || await tx.operationalSettings.count({ where: { updatedBy: id } }) || await tx.rapport.count({ where: { generePar: id } })) throw Object.assign(new Error(), { code: 'HISTORY' });
          await tx.user.delete({ where: { id } });
          return { deleted: true };
        }
        const isActive = z.boolean().parse('isActive' in data ? data.isActive : undefined);
        const user = await tx.user.update({ where: { id }, data: { isActive, tokenVersion: { increment: 1 }, updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) }, select: selected });
        await tx.refreshToken.deleteMany({ where: { userId: id } });
        return { user };
      }, { isolationLevel: 'Serializable' });
      if (!result) { res.status(409).json({ error: 'Ce compte a changé. Actualisez la liste puis réessayez.' }); return; }
      disconnectUser(id);
      res.json(result);
    } catch (error) { failure(error, res); }
  };
  if (action === 'status') router.patch('/:id/status', handler);
  else router.delete('/:id', handler);
}
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const data = fields.extend({ password: password.optional(), updatedAt: z.string().datetime() }).strict().parse(req.body);
    if (id === req.user!.id && (!data.isActive || data.role !== 'ADMIN')) {
      res.status(409).json({ error: 'Vous ne pouvez pas désactiver votre propre compte ni retirer votre rôle administrateur.' }); return;
    }
    const hashed = data.password ? await bcrypt.hash(data.password, 12) : undefined;
    const result = await prisma.$transaction(async tx => {
      const before = await tx.user.findUniqueOrThrow({ where: { id } });
      if (before.updatedAt.toISOString() !== data.updatedAt) return null;
      if (before.role === 'ADMIN' && before.isActive && (data.role !== 'ADMIN' || !data.isActive)) {
        const remaining = await tx.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: id } } });
        if (!remaining) throw Object.assign(new Error(), { code: 'P2034' });
      }
      const duplicate = await tx.user.findFirst({ where: { id: { not: id }, email: { equals: data.email, mode: 'insensitive' } } });
      if (duplicate) throw Object.assign(new Error(), { code: 'P2002' });
      const revoke = before.role !== data.role || before.isActive !== data.isActive || before.email !== data.email || !!hashed;
      const { updatedAt, password: _password, ...profile } = data;
      const user = await tx.user.update({ where: { id }, data: { ...profile, ...(hashed ? { password: hashed } : {}), ...(revoke ? { tokenVersion: { increment: 1 } } : {}), updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) }, select: selected });
      if (revoke) await tx.refreshToken.deleteMany({ where: { userId: id } });
      return { user, revoke };
    }, { isolationLevel: 'Serializable' });
    if (!result) { res.status(409).json({ error: 'Ce compte a changé. Fermez le formulaire puis actualisez la liste.' }); return; }
    if (result.revoke) disconnectUser(id);
    res.json({ user: result.user, sessionRevoked: result.revoke });
  } catch (error) { failure(error, res); }
});
export default router;
