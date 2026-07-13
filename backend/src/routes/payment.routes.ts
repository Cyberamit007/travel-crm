import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getBookingPayments,
  recordPayment,
  deletePayment,
  getPaymentsSummary,
  resubmitPayment,
} from '../controllers/payment.controller.js';

const router = Router({ mergeParams: true }); // mergeParams to get :bookingId

router.use(authenticate);

router.get('/summary', getPaymentsSummary);
router.get('/', getBookingPayments);
router.post('/', upload.single('proof'), recordPayment);
router.put('/:id/resubmit', upload.single('proof'), resubmitPayment);
router.delete('/:id', deletePayment);

export default router;
