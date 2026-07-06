import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  submitFeedback,
  getFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats,
} from '../controllers/feedback.controller.js';

const router = Router();

router.use(authenticate);
router.post('/', submitFeedback);
router.get('/', requireAdmin, getFeedback);
router.get('/stats', requireAdmin, getFeedbackStats);
router.patch('/:id', requireAdmin, updateFeedback);
router.delete('/:id', requireAdmin, deleteFeedback);

export default router;
