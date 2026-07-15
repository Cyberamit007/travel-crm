import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule,
} from '../controllers/automationRule.controller.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', listAutomationRules);
router.post('/', createAutomationRule);
router.put('/:id', updateAutomationRule);
router.delete('/:id', deleteAutomationRule);

export default router;
