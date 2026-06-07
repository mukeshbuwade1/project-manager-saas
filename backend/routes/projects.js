import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import workspaceMiddleware from '../middleware/workspace.js';
import { requireRole } from '../middleware/rbac.js';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';

const router = Router();

// All project routes require authentication + workspace membership
router.use(authMiddleware);
router.use(workspaceMiddleware);

const createProjectValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 200 })
    .withMessage('Project name cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color (e.g. #5E6AD2)'),
];

const updateProjectValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Project name cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'archived'])
    .withMessage('Status must be active, completed, or archived'),
];

router.get('/', getProjects);
router.post('/', createProjectValidation, createProject);
router.get('/:id', getProject);
router.put(
  '/:id',
  requireRole('manager'),
  updateProjectValidation,
  updateProject
);
router.delete('/:id', requireRole('manager'), deleteProject);

export default router;
