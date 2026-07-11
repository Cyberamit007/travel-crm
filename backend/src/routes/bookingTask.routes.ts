import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getBookingTasks,
  createTask,
  updateTask,
  getMyTasks,
  getAllTasks,
} from '../controllers/bookingTask.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Standalone task endpoints (no bookingId prefix)
router.get('/my-tasks', getMyTasks);
router.get('/all', getAllTasks);
router.patch('/:id', updateTask);

// Booking-scoped task endpoints (called via /bookings/:bookingId/tasks)
router.get('/', getBookingTasks);
router.post('/', createTask);

export default router;
