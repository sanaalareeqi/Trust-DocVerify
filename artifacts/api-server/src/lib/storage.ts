// @ts-nocheck
import {
  type User,
  type InsertUser,
  type SignatureLog,
  type Notification,
  users,
  documents,
  signatureLogs,
  notifications,
  externalSignatureInvitations,
  securityLogs,
} from "@workspace/db";
import { db } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createDocument(doc: any): Promise<any>;
  getDocument(id: number): Promise<any>;
  updateDocument(id: number, updates: any): Promise<any>;
  getDocumentsForUser(userId: number, role: string): Promise<any[]>;
  getAllDocuments(): Promise<any[]>;
  createSignatureLog(log: any): Promise<SignatureLog>;
  getSignatureLogs(documentId: number): Promise<SignatureLog[]>;
  createNotification(notif: any): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
  // دوال التوقيع الرقمي
  updateUserPublicKey(userId: number, publicKey: string): Promise<User>;
  getUserPublicKey(userId: number): Promise<string | null>;
  // دوال التوقيع الخارجي
  createExternalInvitation(invitation: any): Promise<any>;
  getExternalInvitationByToken(token: string): Promise<any>;
  updateExternalInvitationStatus(token: string, status: string, signerIp: string): Promise<any>;
  // دوال السجل الأمني
  createSecurityLog(log: any): Promise<any>;
  // ✅ دوال استعادة كلمة المرور (Forgot Password)
  createPasswordReset(userId: number, code: string, expiresAt: Date): Promise<any>;
  getPasswordResetByCode(code: string): Promise<any>;
  markResetCodeAsUsed(code: string): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  // ✅ البحث عن مستخدم عن طريق البريد الإلكتروني
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createDocument(doc: any): Promise<any> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async getDocument(id: number): Promise<any> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return doc;
  }

  async updateDocument(id: number, updates: any): Promise<any> {
    const [updatedDoc] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return updatedDoc;
  }

  async getDocumentsForUser(userId: number, role: string): Promise<any[]> {
    const allDocs = await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));
    return allDocs.filter((doc) => {
      const workflow = doc.workflow as any[];
      const isCreator = doc.creatorId === userId;
      const isInWorkflow =
        workflow && workflow.some((step: any) => step.role === role);
      return isCreator || isInWorkflow;
    });
  }

  async getAllDocuments(): Promise<any[]> {
    return await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));
  }

  async createSignatureLog(log: any): Promise<SignatureLog> {
    const [newLog] = await db.insert(signatureLogs).values(log).returning();
    return newLog;
  }

  async getSignatureLogs(documentId: number): Promise<SignatureLog[]> {
    return await db
      .select()
      .from(signatureLogs)
      .where(eq(signatureLogs.documentId, documentId))
      .orderBy(desc(signatureLogs.timestamp));
  }

  async createNotification(notif: any): Promise<Notification> {
    const [newNotif] = await db
      .insert(notifications)
      .values(notif)
      .returning();
    return newNotif;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }
  

  // ✅ دوال التوقيع الرقمي (باستخدام SQL raw)
  async updateUserPublicKey(userId: number, publicKey: string): Promise<User> {
    const result = await db.execute(
      sql`UPDATE users SET public_key = ${publicKey}, key_created_at = NOW() WHERE id = ${userId} RETURNING *`
    );
    return result.rows[0] as User;
  }

  async getUserPublicKey(userId: number): Promise<string | null> {
    const result = await db.execute(
      sql`SELECT public_key FROM users WHERE id = ${userId}`
    );
    return result.rows[0]?.public_key || null;
  }

  // ✅ دوال التوقيع الخارجي
  async createExternalInvitation(invitation: any): Promise<any> {
    const [newInvitation] = await db.insert(externalSignatureInvitations).values(invitation).returning();
    return newInvitation;
  }

  async getExternalInvitationByToken(token: string): Promise<any> {
    const [invitation] = await db
      .select()
      .from(externalSignatureInvitations)
      .where(eq(externalSignatureInvitations.uniqueToken, token));
    return invitation;
  }

  async updateExternalInvitationStatus(token: string, status: string, signerIp: string): Promise<any> {
    const [updated] = await db
      .update(externalSignatureInvitations)
      .set({ status, signedAt: new Date(), signerIp })
      .where(eq(externalSignatureInvitations.uniqueToken, token))
      .returning();
    return updated;
  }

  // ✅ دوال السجل الأمني
  async createSecurityLog(log: any): Promise<any> {
    const [newLog] = await db.insert(securityLogs).values(log).returning();
    return newLog;
  }
  // ✅ تسجيل محاولة تسجيل دخول (ناجحة أو فاشلة)
async logLoginAttempt(username: string, ipAddress: string, success: boolean): Promise<void> {
  await db.execute(
    sql`INSERT INTO login_attempts (username, ip_address, success, attempted_at) 
        VALUES (${username}, ${ipAddress}, ${success}, NOW())`
  );
}

// ✅ التحقق من عدد المحاولات الفاشلة خلال آخر 15 دقيقة
async getFailedLoginCount(username: string, ipAddress: string): Promise<number> {
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM login_attempts 
        WHERE username = ${username} 
        AND ip_address = ${ipAddress} 
        AND success = FALSE 
        AND attempted_at > NOW() - INTERVAL '15 minutes'`
  );
  return parseInt(result.rows[0]?.count || '0');
}

// ✅ حذف محاولات مستخدم معين (بعد تسجيل الدخول الناجح)
async clearLoginAttempts(username: string, ipAddress: string): Promise<void> {
  await db.execute(
    sql`DELETE FROM login_attempts WHERE username = ${username} AND ip_address = ${ipAddress}`
  );
}

  // ✅✅✅ دوال استعادة كلمة المرور (Forgot Password) ✅✅✅

  // إنشاء رمز إعادة تعيين كلمة المرور
  async createPasswordReset(userId: number, code: string, expiresAt: Date): Promise<any> {
    // حذف أي رموز سابقة للمستخدم قبل إنشاء رمز جديد
    await db.execute(
      sql`DELETE FROM password_resets WHERE user_id = ${userId} AND used = FALSE`
    );
    
    const result = await db.execute(
      sql`INSERT INTO password_resets (user_id, code, expires_at, created_at, used) 
          VALUES (${userId}, ${code}, ${expiresAt}, NOW(), FALSE) 
          RETURNING *`
    );
    return result.rows[0];
  }

  // البحث عن رمز إعادة التعيين (غير مستخدم وغير منتهي الصلاحية)
  async getPasswordResetByCode(code: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM password_resets 
          WHERE code = ${code} 
          AND expires_at > NOW() 
          AND used = FALSE`
    );
    return result.rows[0];
  }

  // تعليم الرمز كمستخدم
  async markResetCodeAsUsed(code: string): Promise<void> {
    await db.execute(
      sql`UPDATE password_resets SET used = TRUE WHERE code = ${code}`
    );
  }

  // تحديث كلمة مرور المستخدم
  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.execute(
      sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`
    );
  }
}


export const storage = new DatabaseStorage();