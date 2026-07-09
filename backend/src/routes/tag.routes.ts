import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getTags, createTag, updateTag, deleteTag, setLeadTags } from '../controllers/tag.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getTags);
router.post('/', requireAdmin, createTag);
router.put('/:id', requireAdmin, updateTag);
router.delete('/:id', requireAdmin, deleteTag);

// Lead tag assignment
router.put('/lead/:leadId', setLeadTags);

export default router;
