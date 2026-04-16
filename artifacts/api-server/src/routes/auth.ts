import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from '../lib/storage.js';
import { generateKeyPair, savePrivateKeyForUser } from '../services/crypto.service.js';
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();
const SECRET = process.env.JWT_SECRET || 'trustdoc_secret';

// تسجيل مستخدم جديد
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, role, email } = req.body;
    
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
      email  // ✅ إضافة البريد الإلكتروني
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

// تسجيل دخول
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // استخدام SQL مباشرة لجلب المستخدم مع is_active
    const result = await db.execute(
      sql`SELECT id, username, password, name, role, email, is_admin, is_active FROM users WHERE username = ${username}`
    );
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    // التحقق من أن الحساب غير موقوف
    if (user.is_active === false) {
      return res.status(401).json({ error: 'الحساب موقوف. يرجى التواصل مع مدير النظام' });
    }
    
    // @ts-ignore
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role, email: user.email, is_admin: user.is_admin }, 
      SECRET, 
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        role: user.role,
        email: user.email,
        is_admin: user.is_admin
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
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