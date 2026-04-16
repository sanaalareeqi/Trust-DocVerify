import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  isAdmin: boolean("is_admin").default(false),
  // ✅ الحقول الجديدة للتوقيع الرقمي
  publicKey: text("public_key"),
  keyCreatedAt: timestamp("key_created_at"),
  isActive: boolean("is_active").default(true),
  email: text("email"),  // ✅ أضيفي هذا السطر
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  currentStep: integer("current_step").default(0),
  creatorId: integer("creator_id").references(() => users.id),
  fileUrl: text("file_url"),
  documentHash: text("document_hash"),
  workflow: jsonb("workflow").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const signatureLogs = pgTable("signature_logs", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
  signerId: integer("signer_id").references(() => users.id),
  signerRole: text("signer_role").notNull(),
  action: text("action").notNull(),
  comment: text("comment"),
  hash: text("hash"),
  documentHash: text("document_hash"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").references(() => users.id),
  documentId: integer("document_id").references(() => documents.id),
  message: text("message").notNull(),
  reason: text("reason"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ✅ جدول دعوات التوقيع الخارجي
export const externalSignatureInvitations = pgTable("external_signature_invitations", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "cascade" }),
  inviteeEmail: text("invitee_email").notNull(),
  inviteeName: text("invitee_name"),
  inviteeOrganization: text("invitee_organization"),
  uniqueToken: text("unique_token").unique().notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  status: text("status").default("pending"),
  signedAt: timestamp("signed_at"),
  signerIp: text("signer_ip"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  fileName: text("file_name"),
  virusName: text("virus_name"),
  ipAddress: text("ip_address"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createInsertSchema(users);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertDocumentSchema = createInsertSchema(documents);
export type Document = z.infer<typeof insertDocumentSchema>;

export const insertSignatureLogSchema = createInsertSchema(signatureLogs);
export type SignatureLog = z.infer<typeof insertSignatureLogSchema>;

export const insertNotificationSchema = createInsertSchema(notifications);
export type Notification = z.infer<typeof insertNotificationSchema>;

// ✅ إضافة Schema للجدول الجديد
export const insertExternalInvitationSchema = createInsertSchema(externalSignatureInvitations);
export type ExternalInvitation = z.infer<typeof insertExternalInvitationSchema>;