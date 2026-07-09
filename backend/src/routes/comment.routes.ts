import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getLeadComments, createComment, updateComment, deleteComment } from '../controllers/comment.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getLeadComments);
router.post('/', createComment);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
