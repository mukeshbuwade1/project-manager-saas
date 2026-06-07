import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import workspaceMiddleware from '../middleware/workspace.js';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../controllers/taskController.js';

const router = Router();

// All task routes require authentication + workspace membership
router.use(authMiddleware);
router.use(workspaceMiddleware);

const createTaskValidation = [
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 500 })
    .withMessage('Task title cannot exceed 500 characters'),
  body('description').optional().trim(),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be pending, in_progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('assignedTo')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid assignedTo user ID'),
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('sortOrder').optional().isNumeric().withMessage('sortOrder must be a number'),
];

const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task title cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Task title cannot exceed 500 characters'),
  body('description').optional().trim(),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be pending, in_progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('assignedTo')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid assignedTo user ID'),
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('sortOrder').optional().isNumeric().withMessage('sortOrder must be a number'),
];

router.get('/', getTasks);
router.post('/', createTaskValidation, createTask);
router.get('/:id', getTask);
router.put('/:id', updateTaskValidation, updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

export default router;
