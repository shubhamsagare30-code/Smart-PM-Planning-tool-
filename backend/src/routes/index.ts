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
import { adminUserController, authController } from '../controllers/authController';
import { authenticate, requireProjectAccess, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);

router.use(authenticate);

router.get('/admin/users', requireRoles('admin'), adminUserController.list);
router.post('/admin/users', requireRoles('admin'), adminUserController.create);
router.put('/admin/users/:id', requireRoles('admin'), adminUserController.update);
router.post('/admin/users/:id/projects', requireRoles('admin'), adminUserController.assignProject);

const memberBlocked = requireRoles('admin', 'director', 'pm');

router.get('/resources', memberBlocked, resourceController.list);
router.get('/resources/:id', memberBlocked, resourceController.get);
router.post('/resources', requireRoles('admin', 'director'), resourceController.create);
router.put('/resources/:id', requireRoles('admin', 'director'), resourceController.update);
router.patch('/resources/:id/archive', requireRoles('admin', 'director'), resourceController.archive);

router.get('/projects', projectController.list);
router.get('/projects/:id', requireProjectAccess, projectController.get);
router.post('/projects', requireRoles('admin', 'director', 'pm'), projectController.create);
router.put('/projects/:id', requireProjectAccess, requireRoles('admin', 'director', 'pm'), projectController.update);
router.patch('/projects/:id/archive', requireProjectAccess, requireRoles('admin', 'director', 'pm'), projectController.archive);

router.get('/projects/:id/dashboard', requireProjectAccess, projectWorkflowController.getDashboard);
router.post('/projects/preview-margin', requireRoles('admin', 'director', 'pm'), projectWorkflowController.previewMargin);
router.post('/projects/full', requireRoles('admin', 'director', 'pm'), projectWorkflowController.createFull);
router.get('/projects/:id/tasks', requireProjectAccess, projectWorkflowController.listTasks);
router.post('/projects/:id/tasks', requireProjectAccess, projectWorkflowController.createTask);
router.put('/projects/:id/tasks/:taskId', requireProjectAccess, projectWorkflowController.updateTask);
router.post('/projects/:id/tasks/:taskId/comments', requireProjectAccess, projectWorkflowController.addTaskComment);
router.delete('/projects/:id/tasks/:taskId', requireProjectAccess, projectWorkflowController.deleteTask);
router.get('/resource-requests', memberBlocked, projectWorkflowController.listRequests);
router.post('/resource-requests', memberBlocked, projectWorkflowController.createRequest);
router.post('/resource-requests/analyze', memberBlocked, projectWorkflowController.analyzeRequest);
router.patch('/resource-requests/:id', memberBlocked, projectWorkflowController.updateRequestStatus);

router.get('/allocations', memberBlocked, allocationController.list);
router.get('/allocations/:id', memberBlocked, allocationController.get);
router.post('/allocations', memberBlocked, allocationController.create);
router.put('/allocations/:id', memberBlocked, allocationController.update);
router.delete('/allocations/:id', memberBlocked, allocationController.delete);

router.get('/leaves', memberBlocked, leaveController.list);
router.get('/leaves/:id', memberBlocked, leaveController.get);
router.post('/leaves', memberBlocked, leaveController.create);
router.put('/leaves/:id', memberBlocked, leaveController.update);
router.delete('/leaves/:id', memberBlocked, leaveController.delete);

router.get('/lookups/departments', lookupController.departments);
router.get('/lookups/skills', lookupController.skills);
router.get('/lookups/employment-types', lookupController.employmentTypes);

router.get('/dashboard', memberBlocked, dashboardController.get);
router.get('/heatmap', memberBlocked, heatmapController.get);
router.get('/forecast', memberBlocked, forecastController.get);
router.get('/skill-matrix', memberBlocked, skillMatrixController.get);
router.get('/reports/:type', memberBlocked, reportController.get);

export default router;
