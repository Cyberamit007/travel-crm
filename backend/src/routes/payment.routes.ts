import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getBookingPayments,
  recordPayment,
  deletePayment,
  getPaymentsSummary,
} from '../controllers/payment.controller.js';

const router = Router({ mergeParams: true }); // mergeParams to get :bookingId

router.use(authenticate);

router.get('/summary', getPaymentsSummary);
router.get('/', getBookingPayments);
router.post('/', recordPayment);
router.delete('/:id', deletePayment);

export default router;
