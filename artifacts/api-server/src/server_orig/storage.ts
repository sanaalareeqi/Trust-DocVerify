import { 
  type User, type InsertUser, 
  type SignatureLog, type Notification,
  users, documents, signatureLogs, notifications 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Document operations
  createDocument(doc: any): Promise<any>;
  getDocument(id: number): Promise<any>;
  updateDocument(id: number, updates: any): Promise<any>;
  getDocumentsForUser(userId: number, role: string): Promise<any[]>;
  getAllDocuments(): Promise<any[]>;

  // Signature Log operations
  createSignatureLog(log: any): Promise<SignatureLog>;
  getSignatureLogs(documentId: number): Promise<SignatureLog[]>;

  // Notification operations
  createNotification(notif: any): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async updateDocument(id: number, updates: any): Promise<any> {
    const [updatedDoc] = await db.update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return updatedDoc;
  }

  async getDocumentsForUser(userId: number, role: string): Promise<any[]> {
    // Documents where user is creator OR user is in the workflow
    const allDocs = await db.select().from(documents).orderBy(desc(documents.createdAt));
    return allDocs.filter(doc => {
      const workflow = doc.workflow as any[];
      const isCreator = doc.creatorId === userId;
      const isInWorkflow = workflow && workflow.some(step => step.role === role);
      return isCreator || isInWorkflow;
    });
  }

  async getAllDocuments(): Promise<any[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async createSignatureLog(log: any): Promise<SignatureLog> {
    const [newLog] = await db.insert(signatureLogs).values(log).returning();
    return newLog;
  }

  async getSignatureLogs(documentId: number): Promise<SignatureLog[]> {
    return await db.select().from(signatureLogs)
      .where(eq(signatureLogs.documentId, documentId))
      .orderBy(desc(signatureLogs.timestamp));
  }

  async createNotification(notif: any): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notif).returning();
    return newNotif;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
