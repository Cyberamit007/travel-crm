import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import campaignRoutes from './campaign.routes.js';
import leadRoutes from './lead.routes.js';
import notificationRoutes from './notification.routes.js';
import webhookRoutes from './webhook.routes.js';
import feedbackRoutes from './feedback.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/leads', leadRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/feedback', feedbackRoutes);

export default router;
