import { Request, Response } from 'express';
import { SprintService } from '../services/sprintService';
import { handleError } from '../utils/errors';
import { parseId } from '../utils/params';
import { z } from 'zod';

const sprintService = new SprintService();

export const sprintController = {
  list(req: Request, res: Response) {
    try {
      res.json(sprintService.list(parseId(req.params.id)));
    } catch (e) {
      handleError(e, res);
    }
  },

  create(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const data = z
        .object({
          start_date: z.string().min(1),
          end_date: z.string().optional(),
          working_days: z.number().int().min(1).max(20).optional(),
          name: z.string().optional(),
          activate: z.boolean().optional(),
        })
        .parse(req.body);
      res.status(201).json(sprintService.create(projectId, data));
    } catch (e) {
      handleError(e, res);
    }
  },

  activate(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const sprintId = parseId(req.params.sprintId);
      res.json(sprintService.activate(projectId, sprintId));
    } catch (e) {
      handleError(e, res);
    }
  },

  close(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const sprintId = parseId(req.params.sprintId);
      res.json(sprintService.close(projectId, sprintId));
    } catch (e) {
      handleError(e, res);
    }
  },

  assignTask(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const sprintId = parseId(req.params.sprintId);
      const { task_id } = z.object({ task_id: z.number().int().positive() }).parse(req.body);
      res.json(sprintService.assignTask(projectId, sprintId, task_id));
    } catch (e) {
      handleError(e, res);
    }
  },

  removeTask(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const taskId = parseId(req.params.taskId);
      res.json(sprintService.removeTask(projectId, taskId));
    } catch (e) {
      handleError(e, res);
    }
  },

  sprintTasks(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const sprintId = parseId(req.params.sprintId);
      res.json(sprintService.getSprintTasks(projectId, sprintId));
    } catch (e) {
      handleError(e, res);
    }
  },
};
