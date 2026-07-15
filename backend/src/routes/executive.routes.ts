import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getExecutiveDashboardStats } from '../controllers/executiveDashboard.controller.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard', getExecutiveDashboardStats);

export default router;
