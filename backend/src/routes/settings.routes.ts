import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/', requireAdmin, updateSettings);

export default router;
