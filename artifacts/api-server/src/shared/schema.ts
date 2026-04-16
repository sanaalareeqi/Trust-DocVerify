import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (Employees)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // e.g., 'University President', 'Accountant'
  isAdmin: boolean("is_admin").default(false),
  publicKey: text("public_key"),
  userType: text("user_type"),
  organizationName: text("organization_name"),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // Certificate, Contract, Invoice
  contractType: text("contract_type"), // employment, purchase, partnership
  status: text("status").notNull(), // Pending, Signed, Rejected, Returned, Verified
  currentStep: integer("current_step").default(0),
  creatorId: integer("creator_id").references(() => users.id),
  fileUrl: text("file_url"), // Path to the file
  documentHash: text("document_hash"), // SHA-256 hash
  workflow: jsonb("workflow").notNull(), // Array of { role, name, isExternal, email }
  createdAt: timestamp("created_at").defaultNow(),
  rejectionReason: text("rejection_reason"),
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: integer("rejected_by").references(() => users.id),
  resubmittedFrom: integer("resubmitted_from"),
  expiresAt: timestamp("expires_at"),
  version: integer("version").default(1),
  secondPartyType: text("second_party_type"),
  secondPartyEmail: text("second_party_email"),
  secondPartyName: text("second_party_name"),
  secondPartyOrganization: text("second_party_organization"),
  externalSignatureToken: text("external_signature_token"),
});

// Signature history/logs
export const signatureLogs = pgTable("signature_logs", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
  signerId: integer("signer_id").references(() => users.id),
  signerRole: text("signer_role").notNull(),
  action: text("action").notNull(), // signed, rejected, returned
  comment: text("comment"),
  hash: text("hash"), // Hash at the time of signing
  timestamp: timestamp("timestamp").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").references(() => users.id),
  documentId: integer("document_id").references(() => documents.id),
  message: text("message").notNull(),
  reason: text("reason"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// New Table: workflows
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  documentType: text("document_type").notNull(),
  contractType: text("contract_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

// New Table: workflow_steps
export const workflowSteps = pgTable("workflow_steps", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").references(() => workflows.id),
  stepOrder: integer("step_order").notNull(),
  roleName: text("role_name").notNull(),
  isExternal: boolean("is_external").default(false),
});

// New Table: external_signature_invitations
export const externalSignatureInvitations = pgTable("external_signature_invitations", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
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

// Zod schemas for validation
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

export const insertWorkflowSchema = createInsertSchema(workflows);
export type Workflow = z.infer<typeof insertWorkflowSchema>;

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps);
export type WorkflowStep = z.infer<typeof insertWorkflowStepSchema>;

export const insertExternalInvitationSchema = createInsertSchema(externalSignatureInvitations);
export type ExternalInvitation = z.infer<typeof insertExternalInvitationSchema>;
