import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, getEmployeePerformance, resetUserPassword, exportUsers } from '../controllers/user.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getUsers); // non-admins get filtered to active employees only
router.get('/export', requireAdmin, exportUsers);
router.post('/', requireAdmin, createUser);
router.put('/:id', requireAdmin, updateUser);
router.put('/:id/reset-password', requireAdmin, resetUserPassword);
router.delete('/:id', requireAdmin, deleteUser);
router.get('/performance/employees', requireAdmin, getEmployeePerformance);

export default router;
