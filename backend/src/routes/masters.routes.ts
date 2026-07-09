import { Router } from 'express';
import {
  getDestinations, createDestination, updateDestination, deleteDestination,
  getTourCategories, createTourCategory, updateTourCategory, deleteTourCategory,
} from '../controllers/masters.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Destinations
router.get('/destinations',        getDestinations);
router.post('/destinations',       requireAdmin, createDestination);
router.put('/destinations/:id',    requireAdmin, updateDestination);
router.delete('/destinations/:id', requireAdmin, deleteDestination);

// Tour Categories
router.get('/tour-categories',        getTourCategories);
router.post('/tour-categories',       requireAdmin, createTourCategory);
router.put('/tour-categories/:id',    requireAdmin, updateTourCategory);
router.delete('/tour-categories/:id', requireAdmin, deleteTourCategory);

export default router;
