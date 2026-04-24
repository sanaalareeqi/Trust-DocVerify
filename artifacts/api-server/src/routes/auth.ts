import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import xss from 'xss';
import { storage } from '../lib/storage.js';
import { generateKeyPair, savePrivateKeyForUser } from '../services/crypto.service.js';
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();
const SECRET = process.env.JWT_SECRET || 'trustdoc_secret';

// ✅ منع هجمات القوة الغاشمة (Brute Force) - حد أقصى 5 محاولات لكل 15 دقيقة
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // الحد الأقصى 5 محاولات لكل IP
  message: { error: '太多 محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// تسجيل مستخدم جديد
router.post('/register', async (req, res) => {
  try {
    // ✅ تنظيف المدخلات من XSS
    let { username, password, name, role, email } = req.body;
    username = xss(username.trim());
    name = xss(name.trim());
    role = xss(role);
    email = xss(email.trim());
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name,
      role,
      email
    });
    
    const { publicKey, privateKey } = await generateKeyPair();
    // @ts-ignore
    await storage.updateUserPublicKey(user.id, publicKey);
    // @ts-ignore
    await savePrivateKeyForUser(user.id, privateKey);
    
    res.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ✅ تسجيل دخول مع حماية متكاملة
router.post('/login', loginLimiter, async (req, res) => {
  try {
    // ✅ تنظيف المدخلات من XSS
    let { username, password } = req.body;
    username = xss(username.trim());
    password = xss(password);
    
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    console.log(`🔐 Login attempt for user: ${username} from IP: ${ipAddress}`);
    
    // ✅ التحقق من عدد المحاولات الفاشلة خلال آخر 15 دقيقة (طبقة إضافية)
    const failedCount = await storage.getFailedLoginCount(username, ipAddress);
    
    if (failedCount >= 3) {
      console.log(`🚫 User ${username} has exceeded max attempts (${failedCount})`);
      return res.status(429).json({ 
        error: 'تم تجاوز الحد الأقصى للمحاولات (3 محاولات). يرجى المحاولة بعد 15 دقيقة.' 
      });
    }
    
    // البحث عن المستخدم (محمي من SQL Injection بواسطة Drizzle)
    const result = await db.execute(
      sql`SELECT id, username, password, name, role, email, is_admin, is_active FROM users WHERE username = ${username}`
    );
    
    const user = result.rows[0];
    
    if (!user) {
      await storage.logLoginAttempt(username, ipAddress, false);
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    // @ts-ignore
    if (user.is_active === false) {
      await storage.logLoginAttempt(username, ipAddress, false);
      return res.status(401).json({ error: 'الحساب موقوف. يرجى التواصل مع مدير النظام' });
    }
    
    // @ts-ignore
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      await storage.logLoginAttempt(username, ipAddress, false);
      const remaining = 2 - failedCount;
      const remainingText = remaining > 0 ? ` تبقى لك ${remaining} محاولة قبل حظر الحساب لمدة 15 دقيقة.` : '';
      return res.status(401).json({ 
        error: `اسم المستخدم أو كلمة المرور غير صحيحة.${remainingText}` 
      });
    }
    
    // ✅ تسجيل محاولة ناجحة ومسح المحاولات السابقة
    await storage.logLoginAttempt(username, ipAddress, true);
    await storage.clearLoginAttempts(username, ipAddress);
    
    // ✅ التحقق من وجود المفتاح العام وإنشاؤه إذا لزم الأمر
    // @ts-ignore
    let publicKey = await storage.getUserPublicKey(user.id);
    
    if (!publicKey) {
      // @ts-ignore
      console.log(`🔑 Generating new key pair for user ${user.id}`);
      const { publicKey: newPublicKey, privateKey: newPrivateKey } = await generateKeyPair();
      // @ts-ignore
      await storage.updateUserPublicKey(user.id, newPublicKey);
      // @ts-ignore
      await savePrivateKeyForUser(user.id, newPrivateKey);
      publicKey = newPublicKey;
    }
    
    const token = jwt.sign(
      { 
        // @ts-ignore
        id: user.id, 
        // @ts-ignore
        username: user.username, 
        // @ts-ignore
        name: user.name, 
        // @ts-ignore
        role: user.role, 
        // @ts-ignore
        email: user.email, 
        // @ts-ignore
        is_admin: user.is_admin 
      }, 
      SECRET, 
      { expiresIn: '24h' }
    );
    
    console.log(`✅ User ${username} logged in successfully`);
    
    res.json({ 
      token, 
      user: { 
        // @ts-ignore
        id: user.id, 
        // @ts-ignore
        username: user.username, 
        // @ts-ignore
        name: user.name, 
        // @ts-ignore
        role: user.role,
        // @ts-ignore
        email: user.email,
        // @ts-ignore
        is_admin: user.is_admin
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ✅ طلب إرسال رمز التحقق (Forgot Password)
router.post('/forgot-password', async (req, res) => {
  try {
    let { email } = req.body;
    email = xss(email.trim());
    
    if (!email) {
      return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    }
    
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'إذا كان البريد الإلكتروني مسجلاً، سيصلك رمز التحقق خلال دقيقة' 
      });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // @ts-ignore
    await storage.createPasswordReset(user.id, code, expiresAt);
    
    try {
      const { sendResetCode } = await import('../config/email.js');
      await sendResetCode(email, code, user.name);
      
      res.json({ 
        success: true, 
        message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' 
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ error: 'فشل في إرسال البريد الإلكتروني، يرجى المحاولة لاحقاً' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'حدث خطأ، يرجى المحاولة لاحقاً' });
  }
});

// ✅ التحقق من صحة الرمز (Verify Reset Code)
router.post('/verify-reset-code', async (req, res) => {
  try {
    let { code } = req.body;
    code = xss(code);
    
    if (!code) {
      return res.status(400).json({ error: 'الرمز مطلوب' });
    }
    
    const resetRecord = await storage.getPasswordResetByCode(code);
    
    if (!resetRecord) {
      return res.status(400).json({ error: 'الرمز غير صالح أو منتهي الصلاحية' });
    }
    
    res.json({ 
      success: true, 
      userId: resetRecord.user_id,
      message: 'الرمز صالح' 
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ✅ إعادة تعيين كلمة المرور (Reset Password)
router.post('/reset-password', async (req, res) => {
  try {
    let { code, newPassword } = req.body;
    code = xss(code);
    newPassword = xss(newPassword);
    
    if (!code || !newPassword) {
      return res.status(400).json({ error: 'الرمز وكلمة المرور مطلوبة' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    
    const resetRecord = await storage.getPasswordResetByCode(code);
    
    if (!resetRecord) {
      return res.status(400).json({ error: 'الرمز غير صالح أو منتهي الصلاحية' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // @ts-ignore
    await storage.updateUserPassword(resetRecord.user_id, hashedPassword);
    
    await storage.markResetCodeAsUsed(code);
    
    res.json({ 
      success: true, 
      message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// ✅ تغيير كلمة المرور (للأدمن فقط أو للمستخدم نفسه)
router.put('/change-password', async (req, res) => {
  try {
    let { userId, newPassword, currentPassword } = req.body;
    newPassword = xss(newPassword);
    currentPassword = xss(currentPassword);
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET) as any;
    } catch (err) {
      return res.status(401).json({ error: 'رمز غير صالح' });
    }
    
    let targetUserId = userId;
    let isAdminChanging = false;
    
    if (!targetUserId) {
      targetUserId = decoded.id;
    } else {
      if (decoded.role !== 'مدير النظام') {
        return res.status(403).json({ error: 'ليس لديك صلاحية لتغيير كلمة مرور مستخدم آخر' });
      }
      isAdminChanging = true;
    }
    
    const userResult = await db.execute(
      sql`SELECT id, username, role, password FROM users WHERE id = ${targetUserId}`
    );
    
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    if (!isAdminChanging) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'الرجاء إدخال كلمة المرور الحالية' });
      }
      
      // @ts-ignore
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      }
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.execute(
      sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${targetUserId}`
    );
    
    res.json({ 
      success: true, 
      message: isAdminChanging 
        ? `تم تغيير كلمة المرور للمستخدم ${user.username} بنجاح`
        : 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'فشل في تغيير كلمة المرور' });
  }
});

// جلب المستخدم الحالي
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    
    const decoded = jwt.verify(token, SECRET) as any;
    
    const result = await db.execute(
      sql`SELECT id, username, name, role, email, is_admin FROM users WHERE id = ${decoded.id}`
    );
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'رمز غير صالح' });
  }
});

export default router;