import { Request, Response } from 'express';
import { ProjectRepository } from '../repositories/projectRepository';
import { StandupService } from '../services/standupService';
import { handleError, AppError } from '../utils/errors';
import { parseId } from '../utils/params';
import { formatDate } from '../utils/dates';
import { getAccessibleProjectIds } from '../utils/permissions';
import { z } from 'zod';

const standupService = new StandupService();

export const standupController = {
  getSession(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const sessionDate = (req.query.date as string) || formatDate(new Date());
      const data = standupService.getOrCreateSession(projectId, sessionDate, req.user?.id);
      res.json(data);
    } catch (e) {
      handleError(e, res);
    }
  },

  updateSession(req: Request, res: Response) {
    try {
      const sessionId = parseId(req.params.sessionId);
      const { notes, attendees, duration_min } = z
        .object({
          notes: z.string().optional(),
          attendees: z.array(z.string()).optional(),
          duration_min: z.number().int().nullable().optional(),
        })
        .parse(req.body);
      const session = standupService.updateSession(sessionId, {
        notes,
        attendees: attendees ? JSON.stringify(attendees) : undefined,
        duration_min,
      });
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json(session);
    } catch (e) {
      handleError(e, res);
    }
  },

  addDecision(req: Request, res: Response) {
    try {
      const sessionId = parseId(req.params.sessionId);
      const data = z
        .object({
          decision: z.string().min(1),
          action: z.string().optional(),
          owner_name: z.string().min(1),
          due_date: z.string().optional(),
          category: z.string().optional(),
        })
        .parse(req.body);
      res.status(201).json(standupService.addDecision(sessionId, data));
    } catch (e) {
      handleError(e, res);
    }
  },

  deleteDecision(req: Request, res: Response) {
    try {
      if (!standupService.deleteDecision(parseId(req.params.decisionId))) {
        return res.status(404).json({ error: 'Decision not found' });
      }
      res.json({ success: true });
    } catch (e) {
      handleError(e, res);
    }
  },

  addParking(req: Request, res: Response) {
    try {
      const sessionId = parseId(req.params.sessionId);
      const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
      res.status(201).json(standupService.addParking(sessionId, text));
    } catch (e) {
      handleError(e, res);
    }
  },

  resolveParking(req: Request, res: Response) {
    try {
      const { resolved } = z.object({ resolved: z.boolean() }).parse(req.body);
      const item = standupService.resolveParking(parseId(req.params.parkingId), resolved);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json(item);
    } catch (e) {
      handleError(e, res);
    }
  },

  emailDraft(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const sessionDate = (req.query.date as string) || formatDate(new Date());
      const data = standupService.getOrCreateSession(projectId, sessionDate, req.user?.id);
      const draft = standupService.buildEmailDraft(
        data.projectName,
        data.session,
        data.agenda,
        data.decisions
      );
      res.json(draft);
    } catch (e) {
      handleError(e, res);
    }
  },

  morningBriefing(req: Request, res: Response) {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');
      const projectRepo = new ProjectRepository();
      const ids = getAccessibleProjectIds(req.user);
      const projectIds =
        ids === 'all' ? projectRepo.findAll().map((p) => p.id) : ids;
      res.json(standupService.getMorningBriefing(projectIds));
    } catch (e) {
      handleError(e, res);
    }
  },
};
