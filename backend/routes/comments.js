import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import workspaceMiddleware from '../middleware/workspace.js';
import {
  addComment,
  getComments,
  deleteComment,
} from '../controllers/commentController.js';

const router = Router();

// All comment routes require authentication + workspace membership
router.use(authMiddleware);
router.use(workspaceMiddleware);

const addCommentValidation = [
  body('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Comment message is required')
    .isLength({ max: 5000 })
    .withMessage('Comment cannot exceed 5000 characters'),
];

router.post('/', addCommentValidation, addComment);
router.get('/:taskId', getComments);
router.delete('/:id', deleteComment);

export default router;
