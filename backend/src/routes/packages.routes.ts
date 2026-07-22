import { Router } from 'express';
import { getPackages, getPackage, getPackageAudit, createPackage, updatePackage, deletePackage } from '../controllers/packages.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', getPackages);
router.get('/:id', getPackage);
router.get('/:id/audit', getPackageAudit);
router.post('/', createPackage);
router.put('/:id', updatePackage);
router.delete('/:id', deletePackage);

export default router;
