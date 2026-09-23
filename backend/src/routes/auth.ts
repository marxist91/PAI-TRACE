import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  generateAccessToken,
  createRefreshToken,
  revokeRefreshToken,
  verifyRefreshToken,
  authenticate,
  requireRole,
  AuthRequest,
} from '../middleware/auth';

const router = Router();

// Schémas de validation
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères').max(72),
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  telephone: z.string().optional(),
  role: z.enum(['ADMIN', 'LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA']).default('LOGISTICIEN'),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

const ACTIVE_ROLES = ['ADMIN', 'LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'];

function isDatabaseUnavailable(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P1001';
}

async function withDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return operation();
  }
}

// POST /api/auth/register
router.post('/register', authenticate, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    // Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(400).json({ error: 'Cet email est déjà utilisé' });
      return;
    }

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nom: data.nom,
        prenom: data.prenom,
        telephone: data.telephone,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        createdAt: true,
      },
    });

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = await createRefreshToken(user.id);

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Données invalides', details: error.issues });
      return;
    }
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    // Trouver l'utilisateur
    const user = await withDatabaseRetry(() => prisma.user.findUnique({ where: { email: data.email } }));
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      return;
    }
    if (!ACTIVE_ROLES.includes(user.role)) {
      res.status(403).json({ error: 'Cet ancien espace n’est plus actif dans le nouveau parcours PIA-TRACE.' });
      return;
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      return;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        consignataireId: user.consignataireId,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Données invalides', details: error.issues });
      return;
    }
    if (isDatabaseUnavailable(error)) {
      console.error('Connexion refusée : base de données temporairement indisponible (P1001).');
      res.status(503).json({ error: 'La base de données est temporairement indisponible. Réessayez dans quelques instants.' });
      return;
    }
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true, role: true, isActive: true, tokenVersion: true } } },
    });

    if (!storedToken || !storedToken.user.isActive || storedToken.expiresAt < new Date()) {
      res.status(401).json({ error: 'Refresh token invalide ou expiré' });
      return;
    }

    if (!ACTIVE_ROLES.includes(storedToken.user.role)) {
      await revokeRefreshToken(refreshToken);
      res.status(403).json({ error: 'Cet ancien espace n’est plus actif dans le nouveau parcours PIA-TRACE.' });
      return;
    }

    // Vérifier la signature du refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if ((decoded.tokenVersion ?? 0) !== storedToken.user.tokenVersion) {
      res.status(401).json({ error: 'Session révoquée. Reconnectez-vous.' }); return;
    }

    // Générer un nouvel access token
    const accessToken = generateAccessToken(storedToken.user);

    res.json({ accessToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Données invalides', details: error.issues });
      return;
    }
    console.error('Erreur refresh:', error);
    res.status(401).json({ error: 'Refresh token invalide ou expiré' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur logout:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        role: true,
        consignataireId: true,
        consignataire: { select: { id: true, nom: true, code: true } },
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    if (!ACTIVE_ROLES.includes(user.role)) {
      res.status(403).json({ error: 'Cet ancien espace n’est plus actif dans le nouveau parcours PIA-TRACE.' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Erreur me:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
