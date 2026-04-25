import { Router } from 'express';
import healthRoutes from './health.js';
import documentsRoutes from './documents.js';
import authRoutes from './auth.js';
import notificationsRoutes from './notifications.js';
import workflowsRoutes from './workflows.js';

const router = Router();

router.use('/healthz', healthRoutes);
router.use('/documents', documentsRoutes);
router.use('/auth', authRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/workflows', workflowsRoutes);

export default router;