import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import workspaceMiddleware from '../middleware/workspace.js';
import { getStats } from '../controllers/dashboardController.js';

const router = Router();

// Dashboard routes require authentication + workspace membership
router.use(authMiddleware);
router.use(workspaceMiddleware);

router.get('/stats', getStats);

export default router;
