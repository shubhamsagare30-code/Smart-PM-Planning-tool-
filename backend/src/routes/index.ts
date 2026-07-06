import { Router } from 'express';
import {
  allocationController,
  dashboardController,
  forecastController,
  heatmapController,
  leaveController,
  lookupController,
  projectController,
  projectWorkflowController,
  reportController,
  resourceController,
  skillMatrixController,
} from '../controllers';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.get('/resources', resourceController.list);
router.get('/resources/:id', resourceController.get);
router.post('/resources', resourceController.create);
router.put('/resources/:id', resourceController.update);
router.patch('/resources/:id/archive', resourceController.archive);

router.get('/projects', projectController.list);
router.get('/projects/:id', projectController.get);
router.post('/projects', projectController.create);
router.put('/projects/:id', projectController.update);
router.patch('/projects/:id/archive', projectController.archive);

router.get('/projects/:id/dashboard', projectWorkflowController.getDashboard);
router.post('/projects/preview-margin', projectWorkflowController.previewMargin);
router.post('/projects/full', projectWorkflowController.createFull);
router.get('/projects/:id/tasks', projectWorkflowController.listTasks);
router.post('/projects/:id/tasks', projectWorkflowController.createTask);
router.put('/projects/:id/tasks/:taskId', projectWorkflowController.updateTask);
router.post('/projects/:id/tasks/:taskId/comments', projectWorkflowController.addTaskComment);
router.delete('/projects/:id/tasks/:taskId', projectWorkflowController.deleteTask);
router.get('/resource-requests', projectWorkflowController.listRequests);
router.post('/resource-requests', projectWorkflowController.createRequest);
router.post('/resource-requests/analyze', projectWorkflowController.analyzeRequest);
router.patch('/resource-requests/:id', projectWorkflowController.updateRequestStatus);

router.get('/allocations', allocationController.list);
router.get('/allocations/:id', allocationController.get);
router.post('/allocations', allocationController.create);
router.put('/allocations/:id', allocationController.update);
router.delete('/allocations/:id', allocationController.delete);

router.get('/leaves', leaveController.list);
router.get('/leaves/:id', leaveController.get);
router.post('/leaves', leaveController.create);
router.put('/leaves/:id', leaveController.update);
router.delete('/leaves/:id', leaveController.delete);

router.get('/lookups/departments', lookupController.departments);
router.get('/lookups/skills', lookupController.skills);
router.get('/lookups/employment-types', lookupController.employmentTypes);

router.get('/dashboard', dashboardController.get);
router.get('/heatmap', heatmapController.get);
router.get('/forecast', forecastController.get);
router.get('/skill-matrix', skillMatrixController.get);
router.get('/reports/:type', reportController.get);

export default router;
