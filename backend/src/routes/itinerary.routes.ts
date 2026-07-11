import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getItinerary,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  reorderItinerary,
} from '../controllers/itinerary.controller.js';

const router = Router({ mergeParams: true }); // mergeParams to get :packageId

router.use(authenticate);

router.get('/', getItinerary);
router.post('/', createItineraryItem);
router.put('/reorder', reorderItinerary);
router.put('/:id', updateItineraryItem);
router.delete('/:id', deleteItineraryItem);

export default router;
