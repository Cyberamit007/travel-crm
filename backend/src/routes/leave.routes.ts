import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  deleteLeaveRequest,
  getUpcomingLeaves,
} from '../controllers/leave.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getLeaveRequests);
router.get('/upcoming', getUpcomingLeaves);
router.post('/', createLeaveRequest);
router.put('/:id/status', requireAdmin, updateLeaveStatus);
router.delete('/:id', deleteLeaveRequest);

export default router;
