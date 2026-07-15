import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { listBusinessRules, updateBusinessRule } from '../controllers/businessRule.controller.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', listBusinessRules);
router.put('/:key', updateBusinessRule);

export default router;
