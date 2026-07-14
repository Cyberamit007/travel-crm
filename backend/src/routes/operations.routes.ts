import { Router } from 'express';
import { authenticate, requireOperationsOrAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getDashboardStats, listDepartures, getDepartureDetail, updateDeparture,
  createTraveler, updateTraveler, deleteTraveler,
  approveTraveler, rejectTraveler, requestTravelerCorrection, regenerateTravelerPortalLink,
  updateChecklist,
} from '../controllers/departure.controller.js';
import { createHotel, updateHotel, deleteHotel } from '../controllers/hotel.controller.js';
import { createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicle.controller.js';
import { listVendors, createVendor, updateVendor, deleteVendor } from '../controllers/vendor.controller.js';
import { updateTaskStatus, createTask } from '../controllers/departureTask.controller.js';
import { uploadDocument, deleteDocument } from '../controllers/opsDocument.controller.js';
import { createNote, deleteNote } from '../controllers/opsNote.controller.js';

const router = Router();
router.use(authenticate, requireOperationsOrAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Departures
router.get('/departures', listDepartures);
router.get('/departures/:id', getDepartureDetail);
router.put('/departures/:id', updateDeparture);
router.patch('/departures/:id/checklist', updateChecklist);

// Travelers (Passenger List)
router.post('/bookings/:bookingId/travelers', createTraveler);
router.put('/travelers/:id', updateTraveler);
router.delete('/travelers/:id', deleteTraveler);

// Traveler Portal — Ops review actions + link regeneration
router.put('/travelers/:id/approve', approveTraveler);
router.put('/travelers/:id/reject', rejectTraveler);
router.put('/travelers/:id/request-correction', requestTravelerCorrection);
router.post('/bookings/:bookingId/travelers/portal-link/regenerate', regenerateTravelerPortalLink);

// Hotels
router.post('/departures/:departureId/hotels', createHotel);
router.put('/hotels/:id', updateHotel);
router.delete('/hotels/:id', deleteHotel);

// Vehicles
router.post('/departures/:departureId/vehicles', createVehicle);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);

// Vendors
router.get('/vendors', listVendors);
router.post('/vendors', createVendor);
router.put('/vendors/:id', updateVendor);
router.delete('/vendors/:id', deleteVendor);

// Day-wise timeline tasks
router.post('/departures/:departureId/tasks', createTask);
router.put('/tasks/:id', updateTaskStatus);

// Documents
router.post('/departures/:departureId/documents', upload.single('file'), uploadDocument);
router.delete('/documents/:id', deleteDocument);

// Internal notes
router.post('/departures/:departureId/notes', createNote);
router.delete('/notes/:id', deleteNote);

export default router;
