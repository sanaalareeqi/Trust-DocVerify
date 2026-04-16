import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ROLE_LABELS } from "@shared/roles";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ USER ROUTES ============
  
  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Create user
  app.post("/api/users", async (req, res) => {
    try {
      const { username, password, name, role } = req.body;
      if (!username || !password || !name || !role) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const user = await storage.createUser({ username, password, name, role });
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // ============ DOCUMENT ROUTES ============

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get documents for a specific user and role
  app.get("/api/documents/user/:userId/:role", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const role = req.params.role;
      const docs = await storage.getDocumentsForUser(userId, role);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching user documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(parseInt(req.params.id));
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Create document
  app.post("/api/documents", async (req, res) => {
    try {
      const { title, type, creatorId, fileUrl, documentHash, workflow } = req.body;
      if (!title || !type || !creatorId || !workflow) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const firstRole = workflow[0]?.role;
      const statusLabel = firstRole ? `بانتظار ${ROLE_LABELS[firstRole] || firstRole}` : "بانتظار المراجعة";
      
      const doc = await storage.createDocument({
        title,
        type,
        status: "Pending",
        currentStep: 0,
        creatorId,
        fileUrl,
        documentHash,
        workflow,
      });
      res.json(doc);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // Update document status and move to next signer
  app.put("/api/documents/:id/sign", async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      const { signerId, signerRole, comment, hash } = req.body;
      
      const doc = await storage.getDocument(docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      const workflow = doc.workflow as any[];
      const currentIndex = doc.currentStep ?? 0;
      
      // Create signature log
      await storage.createSignatureLog({
        documentId: docId,
        signerId,
        signerRole,
        action: "signed",
        comment,
        hash,
      });

      let newStatus = "Pending";
      let newStep = currentIndex + 1;
      
      if (newStep >= workflow.length) {
        newStatus = "Verified";
        newStep = workflow.length - 1;
      }

      const updatedDoc = await storage.updateDocument(docId, {
        status: newStatus,
        currentStep: newStep,
      });

      res.json(updatedDoc);
    } catch (error) {
      console.error("Error signing document:", error);
      res.status(500).json({ error: "Failed to sign document" });
    }
  });

  // Return document to previous signer
  app.put("/api/documents/:id/return", async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      const { returnerId, returnerRole, reason } = req.body;
      
      const doc = await storage.getDocument(docId);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      const workflow = doc.workflow as any[];
      const currentIndex = Math.max(0, (doc.currentStep ?? 0) - 1);
      
      // Create signature log
      await storage.createSignatureLog({
        documentId: docId,
        signerId: returnerId,
        signerRole: returnerRole,
        action: "returned",
        comment: reason,
      });

      const previousRole = workflow[currentIndex]?.role;
      const statusLabel = previousRole ? `بانتظار ${ROLE_LABELS[previousRole] || previousRole}` : "معاد للمراجعة";

      const updatedDoc = await storage.updateDocument(docId, {
        status: "Returned",
        currentStep: currentIndex,
      });

      // Create notification for the previous signer
      if (workflow[currentIndex]) {
        const previousSigner = workflow[currentIndex];
        // Find user with this role to send notification
        const users = await storage.getAllUsers();
        const targetUser = users.find(u => u.role === previousSigner.role);
        if (targetUser) {
          await storage.createNotification({
            recipientId: targetUser.id,
            documentId: docId,
            message: `تم إعادة الوثيقة إليك للمراجعة: ${doc.title}`,
            reason: reason,
          });
        }
      }

      res.json(updatedDoc);
    } catch (error) {
      console.error("Error returning document:", error);
      res.status(500).json({ error: "Failed to return document" });
    }
  });

  // ============ SIGNATURE LOG ROUTES ============

  // Get signature logs for a document
  app.get("/api/documents/:id/signatures", async (req, res) => {
    try {
      const logs = await storage.getSignatureLogs(parseInt(req.params.id));
      res.json(logs);
    } catch (error) {
      console.error("Error fetching signature logs:", error);
      res.status(500).json({ error: "Failed to fetch signature logs" });
    }
  });

  // ============ NOTIFICATION ROUTES ============

  // Get notifications for a user
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getNotifications(parseInt(req.params.userId));
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  return httpServer;
}
