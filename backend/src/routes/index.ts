import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import campaignRoutes from './campaign.routes.js';
import leadRoutes from './lead.routes.js';
import notificationRoutes from './notification.routes.js';
import webhookRoutes from './webhook.routes.js';
import feedbackRoutes from './feedback.routes.js';
import tagRoutes from './tag.routes.js';
import leaveRoutes from './leave.routes.js';
import commentRoutes from './comment.routes.js';
import activityRoutes from './activity.routes.js';
import settingsRoutes from './settings.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/leads', leadRoutes);
router.use('/leads/:leadId/comments', commentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/tags', tagRoutes);
router.use('/leaves', leaveRoutes);
router.use('/activity', activityRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportRoutes);

export default router;
