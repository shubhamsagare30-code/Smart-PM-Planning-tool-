import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { User, UserRole } from '../types';
import { hashPassword, signToken, verifyPassword } from '../utils/auth';
import { handleError, AppError } from '../utils/errors';
import { parseId } from '../utils/params';
import { z } from 'zod';

const userRepo = new UserRepository();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'director', 'pm', 'member']),
  resource_id: z.number().int().positive().optional().nullable(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'director', 'pm', 'member']).optional(),
  resource_id: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    resource_id: user.resource_id,
    is_active: user.is_active,
    must_change_password: user.must_change_password,
  };
}

export const authController = {
  login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const row = userRepo.findByEmail(email);
      if (!row || !verifyPassword(password, row.password_hash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (!row.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }
      const user = userRepo.findById(row.id)!;
      const token = signToken(user);
      res.json({ token, user: publicUser(user) });
    } catch (e) {
      handleError(e, res);
    }
  },

  me(req: Request, res: Response) {
    try {
      if (!req.user) throw new AppError(401, 'Not authenticated');
      res.json(publicUser(req.user));
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const adminUserController = {
  list(_req: Request, res: Response) {
    try {
      res.json(userRepo.findAll().map(publicUser));
    } catch (e) {
      handleError(e, res);
    }
  },

  create(req: Request, res: Response) {
    try {
      const data = createUserSchema.parse(req.body);
      if (userRepo.findByEmail(data.email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const user = userRepo.create({
        email: data.email,
        password_hash: hashPassword(data.password),
        name: data.name,
        role: data.role as UserRole,
        resource_id: data.resource_id ?? null,
        must_change_password: true,
      });
      res.status(201).json(publicUser(user));
    } catch (e) {
      handleError(e, res);
    }
  },

  update(req: Request, res: Response) {
    try {
      const data = updateUserSchema.parse(req.body);
      const id = parseId(req.params.id);
      const payload: Parameters<UserRepository['update']>[1] = {
        name: data.name,
        role: data.role as UserRole | undefined,
        resource_id: data.resource_id,
        is_active: data.is_active,
      };
      if (data.password) payload.password_hash = hashPassword(data.password);
      const user = userRepo.update(id, payload);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(publicUser(user));
    } catch (e) {
      handleError(e, res);
    }
  },

  assignProject(req: Request, res: Response) {
    try {
      const userId = parseId(req.params.id);
      const { project_id, member_role } = z.object({
        project_id: z.number().int().positive(),
        member_role: z.enum(['pm', 'member']).default('member'),
      }).parse(req.body);
      const user = userRepo.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      userRepo.assignToProject(project_id, userId, member_role);
      res.json({ success: true });
    } catch (e) {
      handleError(e, res);
    }
  },
};
