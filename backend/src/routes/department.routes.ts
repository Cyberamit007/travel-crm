import { Router } from 'express';
import {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
} from '../controllers/department.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getDepartments);
router.post('/', requireAdmin, createDepartment);
router.put('/:id', requireAdmin, updateDepartment);
router.delete('/:id', requireAdmin, deleteDepartment);

export default router;
