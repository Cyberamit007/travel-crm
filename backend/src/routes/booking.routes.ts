import { Router } from 'express';
import { getBookingByLead, createBooking, updateBooking, markReviewCollected, markReferralReceived } from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/lead/:leadId', getBookingByLead);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.put('/:id/mark-review-collected', markReviewCollected);
router.put('/:id/mark-referral-received', markReferralReceived);

export default router;
