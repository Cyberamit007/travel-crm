import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getLeadReport, getPerformanceReport } from '../controllers/report.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/leads', getLeadReport);
router.get('/performance', getPerformanceReport);

export default router;
