import { Router } from 'express';
import {
  getDesignations, createDesignation, updateDesignation, deleteDesignation,
} from '../controllers/designation.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getDesignations);
router.post('/', requireAdmin, createDesignation);
router.put('/:id', requireAdmin, updateDesignation);
router.delete('/:id', requireAdmin, deleteDesignation);

export default router;
