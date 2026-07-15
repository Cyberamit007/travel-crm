import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { globalSearch } from '../controllers/search.controller.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', globalSearch);

export default router;
