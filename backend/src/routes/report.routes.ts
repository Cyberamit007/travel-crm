import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getLeadReport,
  getPerformanceReport,
  getLostReasonReport,
  getCampaignReport,
  getDailyTrend,
} from '../controllers/report.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/leads', getLeadReport);
router.get('/performance', getPerformanceReport);
router.get('/lost-reasons', getLostReasonReport);
router.get('/campaigns', getCampaignReport);
router.get('/daily-trend', getDailyTrend);

export default router;
