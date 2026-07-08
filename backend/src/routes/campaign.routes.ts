import { Router } from 'express';
import { getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign, getCampaignStats, exportCampaigns } from '../controllers/campaign.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getCampaigns);
router.get('/stats', requireAdmin, getCampaignStats);
router.get('/export', requireAdmin, exportCampaigns);
router.get('/:id', getCampaignById);
router.post('/', requireAdmin, createCampaign);
router.put('/:id', requireAdmin, updateCampaign);
router.delete('/:id', requireAdmin, deleteCampaign);

export default router;
