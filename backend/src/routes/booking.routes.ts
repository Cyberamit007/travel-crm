import { Router } from 'express';
import { getBookingByLead, createBooking, updateBooking } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/lead/:leadId', getBookingByLead);
router.post('/', createBooking);
router.put('/:id', updateBooking);

export default router;
