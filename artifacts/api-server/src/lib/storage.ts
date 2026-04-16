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
}

export const storage = new DatabaseStorage();