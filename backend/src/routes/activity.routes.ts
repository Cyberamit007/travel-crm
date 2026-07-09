import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getActivityFeed } from '../controllers/activity.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', requireAdmin, getActivityFeed);

export default router;
