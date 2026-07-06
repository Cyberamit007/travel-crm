import { Router } from 'express';
import { verifyWhatsAppWebhook, handleWhatsAppWebhook, verifyInstagramWebhook, handleInstagramWebhook, simulateLead } from '../controllers/webhook.controller.js';

const router = Router();

router.get('/whatsapp', verifyWhatsAppWebhook);
router.post('/whatsapp', handleWhatsAppWebhook);
router.get('/instagram', verifyInstagramWebhook);
router.post('/instagram', handleInstagramWebhook);
router.post('/simulate', simulateLead);

export default router;
