import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, getEmployeePerformance } from '../controllers/user.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', requireAdmin, getUsers);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);
router.get('/performance/employees', requireAdmin, getEmployeePerformance);

export default router;
