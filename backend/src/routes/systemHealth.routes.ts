import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getSystemHealth } from '../controllers/systemHealth.controller.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/health', getSystemHealth);

export default router;
