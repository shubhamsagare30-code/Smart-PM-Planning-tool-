import { NextFunction, Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { User, UserRole } from '../types';
import { AppError } from '../utils/errors';
import { verifyToken } from '../utils/auth';

const userRepo = new UserRepository();

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }
    const token = header.slice(7);
    const payload = verifyToken(token);
    const user = userRepo.findById(payload.sub);
    if (!user || !user.is_active) {
      throw new AppError(401, 'Invalid or inactive user');
    }
    req.user = user;
    next();
  } catch (e) {
    if (e instanceof AppError) return next(e);
    next(new AppError(401, 'Invalid token'));
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

export function requireProjectAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  const raw = req.params.id || req.params.projectId || '0';
  const projectId = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
  if (!projectId) return next();

  const { canAccessProject } = require('../utils/permissions');
  if (!canAccessProject(req.user, projectId)) {
    return next(new AppError(403, 'You do not have access to this project'));
  }
  next();
}
