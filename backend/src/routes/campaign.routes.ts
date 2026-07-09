import { Router } from 'express';
import {
  getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign,
  getCampaignStats, exportCampaigns,
  getCampaignNotes, createCampaignNote, updateCampaignNote, deleteCampaignNote,
  getCampaignAttachments, uploadCampaignAttachment, deleteCampaignAttachment,
} from '../controllers/campaign.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);
router.get('/', getCampaigns);
router.get('/stats', requireAdmin, getCampaignStats);
router.get('/export', requireAdmin, exportCampaigns);
router.get('/:id', getCampaignById);
router.post('/', requireAdmin, createCampaign);
router.put('/:id', requireAdmin, updateCampaign);
router.delete('/:id', requireAdmin, deleteCampaign);

// Notes
router.get('/:id/notes', getCampaignNotes);
router.post('/:id/notes', createCampaignNote);
router.put('/:id/notes/:noteId', updateCampaignNote);
router.delete('/:id/notes/:noteId', deleteCampaignNote);

// Attachments
router.get('/:id/attachments', getCampaignAttachments);
router.post('/:id/attachments', upload.single('file'), uploadCampaignAttachment);
router.delete('/:id/attachments/:attachmentId', deleteCampaignAttachment);

export default router;
