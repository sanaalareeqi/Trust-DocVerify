import { Router } from 'express';
import { storage } from '../lib/storage.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// جلب إشعارات المستخدم الحالي
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'فشل في جلب الإشعارات' });
  }
});

// تحديث إشعار كمقرو
router.patch('/:id/read', authenticate, async (req: any, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    await storage.markNotificationRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'فشل في تحديث الإشعار' });
  }
});

export default router;