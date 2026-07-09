import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import campaignRoutes from './campaign.routes.js';
import leadRoutes from './lead.routes.js';
import notificationRoutes from './notification.routes.js';
import webhookRoutes from './webhook.routes.js';
import feedbackRoutes from './feedback.routes.js';
import tagRoutes from './tag.routes.js';
import commentRoutes from './comment.routes.js';
import activityRoutes from './activity.routes.js';
import settingsRoutes from './settings.routes.js';
import reportRoutes from './report.routes.js';
import metaConnectionRoutes from './metaConnection.routes.js';
import departmentRoutes from './department.routes.js';
import designationRoutes from './designation.routes.js';
import mastersRoutes from './masters.routes.js';

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
router.use('/activity', activityRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportRoutes);
router.use('/settings/meta-connection', metaConnectionRoutes);
router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/masters', mastersRoutes);

export default router;
