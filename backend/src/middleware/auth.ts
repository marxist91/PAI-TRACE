import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

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
}

export function generateAccessToken(user: TokenPayload): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

export function generateRefreshToken(user: TokenPayload): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` },
  );
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function createRefreshToken(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  const token = generateRefreshToken(user);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
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

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
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
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }
    next();
  };
}
