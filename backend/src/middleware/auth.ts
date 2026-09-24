import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { validateProductionSecrets } from '../services/deployment-config';

validateProductionSecrets(process.env);

const JWT_SECRET = process.env.JWT_SECRET || 'pia-jwt-secret-dev';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pia-refresh-secret-dev';

// Durées de validité
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    consignataireId: number | null;
  };
}

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
  tokenVersion?: number;
  sessionId?: string;
}

export function generateAccessToken(user: TokenPayload): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion ?? 0, sessionId: user.sessionId },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

export function generateRefreshToken(user: TokenPayload, rememberMe = false): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion ?? 0, sessionId: user.sessionId },
    JWT_REFRESH_SECRET,
    { expiresIn: rememberMe ? `${REFRESH_TOKEN_EXPIRY_DAYS}d` : '8h' },
  );
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export class ActiveSessionError extends Error {}

export async function createRefreshToken(userId: number, rememberMe = false, verifiedPasswordHash?: string): Promise<string> {
  return prisma.$transaction(async tx => {
    // A per-user lock serializes concurrent logins, logout and revocation.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.isActive || (verifiedPasswordHash && user.password !== verifiedPasswordHash)) throw new Error('Compte modifié pendant la connexion');
    const sessions = await tx.refreshToken.findMany({ where: { userId, expiresAt: { gt: new Date() } } });
    for (const session of sessions) {
      let decoded: TokenPayload;
      try { decoded = verifyRefreshToken(session.token); } catch { continue; }
      if (decoded.sessionId === session.id && decoded.tokenVersion === user.tokenVersion) {
        throw new ActiveSessionError('Ce compte possède déjà une session active. Déconnectez-vous sur l’autre appareil ou contactez un administrateur.');
      }
    }
    // Legacy sessions (without sessionId) are rejected by authentication after deployment.
    await tx.refreshToken.deleteMany({ where: { userId } });
    const current = await tx.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 }, updatedAt: user.updatedAt } });
    const sessionId = randomUUID();
    const token = generateRefreshToken({ ...current, sessionId }, rememberMe);
    const expiresAt = new Date(Date.now() + (rememberMe ? REFRESH_TOKEN_EXPIRY_DAYS * 24 : 8) * 3600_000);
    await tx.refreshToken.create({ data: { id: sessionId, token, userId, expiresAt } });
    return token;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function revokeRefreshToken(token: string): Promise<number | null> {
  const session = await prisma.refreshToken.findUnique({ where: { token } });
  if (!session) return null;
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${session.userId} FOR UPDATE`;
    const deleted = await tx.refreshToken.deleteMany({ where: { id: session.id, token } });
    if (deleted.count) await tx.$executeRaw`UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1 WHERE id = ${session.userId}`;
    return deleted.count ? session.userId : null;
  });
}

export async function revokeAllUserRefreshTokens(userId: number): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (!decoded.sessionId || !await prisma.refreshToken.findFirst({ where: { id: decoded.sessionId, userId: decoded.id, expiresAt: { gt: new Date() } } })) {
      res.status(401).json({ error: 'Session expirée ou révoquée. Reconnectez-vous.' }); return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive || user.tokenVersion !== (decoded.tokenVersion ?? 0)) {
      res.status(401).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role, consignataireId: user.consignataireId };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !(roles.includes(req.user.role) || (req.user.role === 'ADMIN' && roles.includes('LOGISTICIEN')))) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }
    next();
  };
}
