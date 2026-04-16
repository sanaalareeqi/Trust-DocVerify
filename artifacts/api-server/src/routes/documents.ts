import { Router, type IRouter } from "express";
import { storage } from "../lib/storage";
import { logger } from "../lib/logger";
import { signHash, verifySignature, getPrivateKeyForUser } from "../services/crypto.service";
import { v4 as uuidv4 } from 'uuid';
import { sendSignatureInvitation } from '../config/email';
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { scanFile } from "../services/fileSecurity.service";
import { storeDocumentHashOnChain } from "../services/blockchain.service";

const router: IRouter = Router();

const ROLE_LABELS: Record<string, string> = {
  // أدوار الشهادات (5 أدوار)
  "Graduate-Affairs": "شؤون الخريجين",
  "College-Registrar": "مسجل الكلية",
  "Dean": "عميد الكلية",
  "General-Registrar": "المسجل العام",
  "University-President": "رئيس الجامعة",
  
  // أدوار العقود (3 أدوار لكل نوع)
  "Employment-Officer": "مسؤول التوظيف",
  "Secretary-General": "الأمين العام",
  "Board-Chairman": "رئيس مجلس الأمناء",
  "External-Party": "ممثل جهة خارجية",
  
  // أدوار الفواتير (5 أدوار)
  "Requester": "مقدم طلب الشراء",
  "Financial-Manager": "المدير المالي",
  "Auditor": "المراجع",
  "Accounts": "الحسابات",
};

// Users
router.get("/users", async (req, res) => {
  try {
    const result = await storage.getAllUsers();
    res.json(result);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name || !role)
      return res.status(400).json({ error: "Missing required fields" });
    const existing = await storage.getUserByUsername(username);
    if (existing)
      return res.status(409).json({ error: "Username already exists" });
    const user = await storage.createUser({ username, password, name, role });
    res.json(user);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ✅ حذف مستخدم (للأدمن فقط)
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }
    
    // منع حذف مدير النظام
    if (user.role === 'مدير النظام') {
      return res.status(403).json({ error: "لا يمكن حذف مدير النظام" });
    }
    
    // @ts-ignore
    await db.delete(users).where(eq(users.id, userId));
    
    res.json({ success: true, message: "تم حذف المستخدم بنجاح" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "فشل في حذف المستخدم" });
  }
});

// ✅ تعطيل/تفعيل حساب مستخدم
router.put("/users/:id/toggle-suspend", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_active } = req.body;
    
    const query = `UPDATE users SET is_active = ${is_active ? 'TRUE' : 'FALSE'} WHERE id = ${userId} RETURNING *`;
    const result = await db.execute(query);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }
    
    console.log("Updated user:", result.rows[0]);
    
    const message = is_active === false ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب';
    res.json({ success: true, message, user: result.rows[0] });
  } catch (err) {
    console.error("Error toggling user status:", err);
    res.status(500).json({ error: "فشل في تحديث حالة الحساب" });
  }
});

// Documents - مسارات معدلة (بدون تكرار /documents)
router.get("/", async (req, res) => {
  try {
    const docs = await storage.getAllDocuments();
    res.json(docs);
  } catch (err) {
    console.error("Error fetching documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/user/:userId/:role", async (req, res) => {
  try {
    const docs = await storage.getDocumentsForUser(
      parseInt(req.params.userId),
      req.params.role,
    );
    res.json(docs);
  } catch (err) {
    console.error("Error fetching user documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await storage.getDocument(parseInt(req.params.id));
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    console.error("Error fetching document:", err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, type, creatorId, fileUrl, documentHash, workflow, currentStep, externalInvitation } = req.body;
    if (!title || !type || !creatorId || !workflow)
      return res.status(400).json({ error: "Missing required fields" });
    
    // ✅ فحص أمان الملف (إذا كان هناك ملف حقيقي)
    let securityCheckPassed = true;
    let securityError = null;
    
    if (fileUrl && fileUrl !== "temp.pdf" && fileUrl.startsWith('data:')) {
      try {
        // تحويل data URL إلى Buffer
        const base64Data = fileUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const scanResult = await scanFile(buffer, title);
        
        if (!scanResult.isValid) {
          securityCheckPassed = false;
          securityError = scanResult.error;
          
          // تسجيل الحادثة الأمنية
          await storage.createSecurityLog({
            userId: creatorId,
            eventType: 'malicious_file',
            fileName: title,
            virusName: scanResult.viruses?.join(', '),
            ipAddress: req.ip,
            details: scanResult.error
          });
          
          console.warn(`⚠️ Security alert: ${scanResult.error} for file ${title} by user ${creatorId}`);
        }
      } catch (scanError) {
        console.error("File scan error:", scanError);
        securityCheckPassed = false;
        securityError = "فشل في فحص الملف الأمني";
      }
    }
    
    if (!securityCheckPassed) {
      return res.status(403).json({ error: securityError || "الملف غير آمن وتم رفضه" });
    }
    
    const doc = await storage.createDocument({
      title,
      type,
      status: "Pending",
      currentStep: currentStep || 1,
      creatorId,
      fileUrl,
      documentHash,
      workflow,
    });
    
    // ✅ إذا كان هناك طرف خارجي، إنشاء دعوة توقيع وإرسال بريد إلكتروني
    if (externalInvitation && externalInvitation.email) {
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await storage.createExternalInvitation({
        documentId: doc.id,
        inviteeEmail: externalInvitation.email,
        inviteeName: externalInvitation.name || null,
        inviteeOrganization: externalInvitation.organization || null,
        uniqueToken: token,
        tokenExpiresAt: expiresAt,
        status: "pending",
      });
      
      try {
        await sendSignatureInvitation(externalInvitation.email, title, token, expiresAt);
        console.log(`External invitation sent to ${externalInvitation.email}`);
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }
    }
    
    res.json(doc);
  } catch (err) {
    console.error("Error creating document:", err);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// ✅ دالة التوقيع الرقمي المعدلة
router.post("/:id/sign", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { signerId, signerRole, comment, documentHash } = req.body;
    
    const doc = await storage.getDocument(docId);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    
    const privateKey = await getPrivateKeyForUser(signerId);
    if (!privateKey) {
      return res.status(400).json({ error: "المفتاح الخاص غير موجود للمستخدم" });
    }
    
    const signature = await signHash(documentHash, privateKey);
    
    await storage.createSignatureLog({
      documentId: docId,
      signerId,
      signerRole,
      action: "signed",
      comment,
      hash: signature,
      documentHash: documentHash,
      timestamp: new Date(),
    });
    
    const workflow = doc.workflow as any[];
    const currentStepValue = doc.currentStep ?? 1;
    let newStatus = "Pending";
    let newStep = currentStepValue + 1;
    
    if (newStep > workflow.length) {
      newStatus = "Verified";
      newStep = workflow.length;
    }
    
    const updatedDoc = await storage.updateDocument(docId, {
      status: newStatus,
      currentStep: newStep,
    });
    
    console.log(`Document ${docId} signed by ${signerRole}: step ${currentStepValue} -> ${newStep}, status: ${newStatus}`);
    
    res.json(updatedDoc);
  } catch (err) {
    console.error("Error signing document:", err);
    res.status(500).json({ error: "Failed to sign document" });
  }
});

// ✅ دالة الإعادة المعدلة (للمسجل العام فقط)
router.post("/:id/return", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { returnerId, returnerRole, reason } = req.body;
    
    const doc = await storage.getDocument(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    if (returnerRole !== "General-Registrar") {
      return res.status(403).json({ error: "Only General Registrar can return documents" });
    }
    
    const newStep = 1;
    
    await storage.createSignatureLog({
      documentId: docId,
      signerId: returnerId,
      signerRole: returnerRole,
      action: "returned",
      comment: reason,
      timestamp: new Date(),
    });
    
    const updatedDoc = await storage.updateDocument(docId, {
      status: "Returned",
      currentStep: newStep,
    });
    
    const allUsers = await storage.getAllUsers();
    const graduateAffairsUser = allUsers.find((u: any) => u.role === "شؤون الخريجين");
    
    if (graduateAffairsUser) {
      await storage.createNotification({
        recipientId: graduateAffairsUser.id,
        documentId: docId,
        message: `📢 تم إعادة الوثيقة "${doc.title}" إليك للمراجعة. السبب: ${reason}`,
        reason: reason,
        createdAt: new Date(),
      });
      console.log(`Notification sent to ${graduateAffairsUser.name} (ID: ${graduateAffairsUser.id})`);
    }
    
    console.log(`Document ${docId} returned by ${returnerRole} to step ${newStep}`);
    res.json({ 
      success: true, 
      message: "تم إعادة الوثيقة إلى شؤون الخريجين",
      document: updatedDoc 
    });
  } catch (err) {
    console.error("Error returning document:", err);
    res.status(500).json({ error: "Failed to return document" });
  }
});

// ✅ التحقق من صلاحية رابط التوقيع الخارجي
router.get("/external/invitation/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const invitation = await storage.getExternalInvitationByToken(token);
    
    if (!invitation) {
      return res.json({ isValid: false, message: "الرابط غير صالح" });
    }
    
    const now = new Date();
    const expiresAt = new Date(invitation.tokenExpiresAt);
    
    if (invitation.status !== "pending") {
      return res.json({ isValid: false, message: "تم استخدام هذا الرابط بالفعل" });
    }
    
    if (now > expiresAt) {
      return res.json({ isValid: false, message: "انتهت صلاحية الرابط" });
    }
    
    const doc = await storage.getDocument(invitation.documentId);
    
    res.json({
      isValid: true,
      invitation: {
        inviteeEmail: invitation.inviteeEmail,
        inviteeName: invitation.inviteeName,
        inviteeOrganization: invitation.inviteeOrganization,
      },
      document: {
        id: doc.id,
        title: doc.title,
        type: doc.type,
      },
    });
  } catch (err) {
    console.error("Error verifying invitation:", err);
    res.status(500).json({ error: "Failed to verify invitation" });
  }
});

// ✅ توقيع الطرف الخارجي
router.post("/external/sign/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const invitation = await storage.getExternalInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ error: "الرابط غير صالح" });
    }
    
    if (invitation.status !== "pending") {
      return res.status(400).json({ error: "تم استخدام هذا الرابط بالفعل" });
    }
    
    const now = new Date();
    const expiresAt = new Date(invitation.tokenExpiresAt);
    
    if (now > expiresAt) {
      return res.status(400).json({ error: "انتهت صلاحية الرابط" });
    }
    
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    
    await storage.createSignatureLog({
      documentId: invitation.documentId,
      signerId: null,
      signerRole: "ممثل جهة خارجية",
      action: "signed",
      comment: `توقيع خارجي عبر البريد الإلكتروني: ${invitation.inviteeEmail}`,
      documentHash: "external_signature",
      timestamp: new Date(),
    });
    
    await storage.updateExternalInvitationStatus(token, "signed", clientIp);
    
    await storage.updateDocument(invitation.documentId, {
      status: "Verified",
      currentStep: 5,
    });
    
    res.json({ success: true, message: "تم التوقيع بنجاح" });
  } catch (err) {
    console.error("Error external signing:", err);
    res.status(500).json({ error: "Failed to sign document" });
  }
});

// ✅ مسار التحقق من صحة التوقيع
router.get("/:id/verify-signature", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    
    const doc = await storage.getDocument(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    const signatures = await storage.getSignatureLogs(docId);
    if (!signatures || signatures.length === 0) {
      return res.json({ 
        isValid: false, 
        message: "لا يوجد توقيع على هذه الوثيقة" 
      });
    }
    
    const lastSignature = signatures[signatures.length - 1];
    
    if (!lastSignature.documentHash || !lastSignature.hash || !lastSignature.signerId) {
      return res.json({ 
        isValid: false, 
        message: "بيانات التوقيع غير مكتملة (تم التوقيع بالنظام القديم)" 
      });
    }
    
    const publicKey = await storage.getUserPublicKey(lastSignature.signerId);
    if (!publicKey) {
      return res.json({ 
        isValid: false, 
        message: "المفتاح العام غير موجود للموقع" 
      });
    }
    
    const isValid = await verifySignature(
      lastSignature.documentHash,
      lastSignature.hash,
      publicKey
    );
    
    res.json({
      isValid,
      signer: lastSignature.signerRole,
      signedAt: lastSignature.timestamp,
      documentHash: lastSignature.documentHash?.substring(0, 32) + "...",
      message: isValid ? "✅ التوقيع صحيح" : "❌ التوقيع غير صحيح"
    });
  } catch (err) {
    console.error("Error verifying signature:", err);
    res.status(500).json({ error: "Failed to verify signature" });
  }
});

// ✅ تسجيل هاش الوثيقة على Blockchain
router.post("/:id/register-on-chain", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);

    const doc = await storage.getDocument(docId);
    if (!doc) {
      return res.status(404).json({ error: "الوثيقة غير موجودة" });
    }

    if (doc.status !== "Verified") {
      return res.status(400).json({ error: "يمكن تسجيل الوثائق المكتملة (Verified) فقط على Blockchain" });
    }

    if (!doc.documentHash) {
      return res.status(400).json({ error: "لا يوجد هاش للوثيقة" });
    }

    if (doc.blockchainTxUrl) {
      return res.status(409).json({ 
        error: "تم تسجيل هذه الوثيقة مسبقاً على Blockchain",
        txUrl: doc.blockchainTxUrl
      });
    }

    logger.info({ docId }, "بدء تسجيل الوثيقة على Blockchain...");

    const txUrl = await storeDocumentHashOnChain(doc.documentHash);

    const updatedDoc = await storage.updateDocument(docId, {
      blockchainTxUrl: txUrl,
    });

    logger.info({ docId, txUrl }, "تم تسجيل الوثيقة على Blockchain بنجاح");

    res.json({ 
      success: true, 
      message: "تم تسجيل الوثيقة على Blockchain بنجاح",
      txUrl,
      document: updatedDoc
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "فشل تسجيل الوثيقة على Blockchain");
    res.status(500).json({ error: err.message || "فشل التسجيل على Blockchain" });
  }
});

// Signature logs
router.get("/:id/signatures", async (req, res) => {
  try {
    const logs = await storage.getSignatureLogs(parseInt(req.params.id));
    res.json(logs);
  } catch (err) {
    console.error("Error fetching signature logs:", err);
    res.status(500).json({ error: "Failed to fetch signature logs" });
  }
});

// Notifications
router.get("/notifications/:userId", async (req, res) => {
  try {
    const notifs = await storage.getNotifications(parseInt(req.params.userId));
    res.json(notifs);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.put("/notifications/:id/read", async (req, res) => {
  try {
    await storage.markNotificationRead(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

export default router;