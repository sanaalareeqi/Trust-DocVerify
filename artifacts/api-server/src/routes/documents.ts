import { Router, type IRouter } from "express";
import { storage } from "../lib/storage";
import { logger } from "../lib/logger";
import { signHash, verifySignature, getPrivateKeyForUser } from "../services/crypto.service";
import { v4 as uuidv4 } from 'uuid';
import { sendSignatureInvitation } from '../config/email';
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { scanFile } from "../services/fileSecurity.service";
import {
  createDocumentOnChain,
  addSignatureToChain,
  completeDocumentOnChain,
} from "../services/blockchain.service";
import { addQRCodeToImage, addQRCodeToPDF } from "../services/qr.service";
import * as fs from 'fs';
import * as path from 'path';

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

// ✅ حذف مستخدم (للأدمن فقط) - نسخة محسنة
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
    
    // ✅ 1. حذف المفتاح الخاص للمستخدم من مجلد keys
    const privateKeyPath = path.join(process.cwd(), 'keys', `user_${userId}.key`);
    if (fs.existsSync(privateKeyPath)) {
      fs.unlinkSync(privateKeyPath);
      console.log(`✅ Deleted private key for user ${userId}`);
    }
    
    // ✅ 2. حذف سجلات التوقيع المرتبطة بالمستخدم
    await db.execute(`DELETE FROM signature_logs WHERE signer_id = ${userId}`);
    
    // ✅ 3. حذف الإشعارات المرتبطة بالمستخدم
    await db.execute(`DELETE FROM notifications WHERE recipient_id = ${userId}`);
    
    // ✅ 4. حذف دعوات التوقيع الخارجي المرتبطة بمستندات المستخدم
    await db.execute(`
      DELETE FROM external_signature_invitations 
      WHERE document_id IN (SELECT id FROM documents WHERE creator_id = ${userId})
    `);
    
    // ✅ 5. حذف سجلات التوقيع المرتبطة بمستندات المستخدم
    await db.execute(`
      DELETE FROM signature_logs 
      WHERE document_id IN (SELECT id FROM documents WHERE creator_id = ${userId})
    `);
    
    // ✅ 6. حذف الإشعارات المرتبطة بمستندات المستخدم
    await db.execute(`
      DELETE FROM notifications 
      WHERE document_id IN (SELECT id FROM documents WHERE creator_id = ${userId})
    `);
    
    // ✅ 7. حذف الوثائق التي أنشأها المستخدم
    await db.execute(`DELETE FROM documents WHERE creator_id = ${userId}`);
    
    // ✅ 8. حذف المستخدم نفسه
    await db.execute(`DELETE FROM users WHERE id = ${userId}`);
    
    console.log(`✅ User ${userId} (${user.username}) deleted successfully`);
    
    res.json({ success: true, message: "تم حذف المستخدم بنجاح" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "فشل في حذف المستخدم: " + (err as Error).message });
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

// ✅ تحميل الوثيقة مع QR Code (لعرضها أو تنزيلها)
router.get("/:id/download", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const doc = await storage.getDocument(docId);
    
    if (!doc || !doc.fileUrl) {
      return res.status(404).json({ error: "الوثيقة غير موجودة" });
    }
    
    // استخراج البيانات من base64
    const matches = doc.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: "تنسيق ملف غير صالح" });
    }
    
    const contentType = matches[1];
    const base64Data = matches[2];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    // تحديد اسم الملف
    let extension = 'bin';
    if (contentType.includes('pdf')) extension = 'pdf';
    else if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('jpeg')) extension = 'jpg';
    else if (contentType.includes('jpg')) extension = 'jpg';
    
    const filename = `document_${docId}.${extension}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(fileBuffer);
    
  } catch (err) {
    console.error("Error downloading document:", err);
    res.status(500).json({ error: "فشل في تحميل الوثيقة" });
  }
});

// ✅ التحقق من الوثيقة عبر QR Code (API)
router.get("/verify/:docId", async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    
    if (isNaN(docId)) {
      return res.status(400).json({ error: "معرف وثيقة غير صالح" });
    }
    
    const doc = await storage.getDocument(docId);
    if (!doc) {
      return res.status(404).json({ error: "الوثيقة غير موجودة" });
    }
    
    // جلب سلسلة التوقيعات
    const signatures = await storage.getSignatureLogs(docId);
    
    // جلب معلومات الـ Blockchain إن وجدت
    let blockchainInfo = null;
    if (doc.blockchainTxUrl) {
      blockchainInfo = {
        txUrl: doc.blockchainTxUrl,
        verified: true,
        message: "✅ مسجلة على Blockchain"
      };
    }
    
    // تنسيق سلسلة التوقيعات للعرض
    const formattedSignatures = signatures.map((sig: any) => ({
      role: ROLE_LABELS[sig.signerRole] || sig.signerRole,
      action: sig.action === "signed" ? "✅ وقع" : "↩️ أعاد",
      comment: sig.comment || "",
      timestamp: sig.timestamp,
    }));
    
    res.json({
      success: true,
      document: {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        status: doc.status,
        createdAt: doc.createdAt,
        documentHash: doc.documentHash ? doc.documentHash.substring(0, 32) + "..." : null,
      },
      blockchain: blockchainInfo,
      signatures: formattedSignatures,
      summary: {
        totalSignatures: signatures.length,
        isComplete: doc.status === "Verified",
        isOnBlockchain: !!doc.blockchainTxUrl,
      }
    });
    
  } catch (err) {
    console.error("Error verifying document via QR:", err);
    res.status(500).json({ error: "فشل في التحقق من الوثيقة" });
  }
});

// ✅ إضافة QR Code إلى الوثيقة (يدوي)
router.post("/:id/add-qr", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const doc = await storage.getDocument(docId);
    
    if (!doc) {
      return res.status(404).json({ error: "الوثيقة غير موجودة" });
    }
    
    if (!doc.fileUrl || doc.fileUrl === "temp.pdf") {
      return res.status(400).json({ error: "لا يمكن إضافة QR Code لهذه الوثيقة" });
    }
    
    const base64Data = doc.fileUrl.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    let newFileUrl = doc.fileUrl;
    
    if (doc.fileUrl.startsWith('data:image/')) {
      const imageWithQR = await addQRCodeToImage(fileBuffer, docId);
      newFileUrl = `data:image/png;base64,${imageWithQR.toString('base64')}`;
    } else if (doc.fileUrl.startsWith('data:application/pdf')) {
      const pdfWithQR = await addQRCodeToPDF(fileBuffer, docId);
      newFileUrl = `data:application/pdf;base64,${pdfWithQR.toString('base64')}`;
    } else {
      return res.status(400).json({ error: "نوع الملف غير مدعوم لإضافة QR Code" });
    }
    
    await storage.updateDocument(docId, { fileUrl: newFileUrl });
    
    res.json({ success: true, message: "تم إضافة QR Code إلى الوثيقة بنجاح" });
  } catch (err) {
    console.error("Error adding QR code:", err);
    res.status(500).json({ error: "فشل في إضافة QR Code" });
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
        const base64Data = fileUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const scanResult = await scanFile(buffer, title);
        
        if (!scanResult.isValid) {
          securityCheckPassed = false;
          securityError = scanResult.error;
          
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

    // ✅ تسجيل الوثيقة على Blockchain بشكل غير متزامن
    if (documentHash) {
      setImmediate(async () => {
        try {
          const { docId: blockchainDocId, txUrl } = await createDocumentOnChain(documentHash);
          await storage.updateDocument(doc.id, { blockchainDocId, blockchainTxUrl: txUrl });
          logger.info({ docId: doc.id, blockchainDocId }, "تم ربط الوثيقة بـ Blockchain");
        } catch (err: any) {
          logger.warn({ err: err.message, docId: doc.id }, "فشل تسجيل الوثيقة على Blockchain");
        }
      });
    }
    
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
    
    // ✅ إضافة QR Code إلى الوثيقة (بدون شرط التحقق المسبب للمشكلة)
    try {
      if (fileUrl && fileUrl !== "temp.pdf" && fileUrl.startsWith('data:')) {
        console.log(`📱 Adding QR code to document ${doc.id}...`);
        
        const base64Data = fileUrl.split(',')[1];
        const fileBuffer = Buffer.from(base64Data, 'base64');
        let newFileUrl = fileUrl;
        
        if (fileUrl.startsWith('data:image/')) {
          console.log(`🖼️ Processing image for QR code...`);
          const imageWithQR = await addQRCodeToImage(fileBuffer, doc.id);
          newFileUrl = `data:image/png;base64,${imageWithQR.toString('base64')}`;
          console.log(`✅ Image QR code added`);
        } else if (fileUrl.startsWith('data:application/pdf')) {
          console.log(`📄 Processing PDF for QR code...`);
          const pdfWithQR = await addQRCodeToPDF(fileBuffer, doc.id);
          newFileUrl = `data:application/pdf;base64,${pdfWithQR.toString('base64')}`;
          console.log(`✅ PDF QR code added`);
        } else {
          console.log(`⚠️ Unsupported file type for QR code: ${fileUrl.substring(0, 50)}`);
        }
        
        if (newFileUrl !== fileUrl) {
          await storage.updateDocument(doc.id, { fileUrl: newFileUrl });
          console.log(`✅ QR Code successfully added to document ${doc.id}`);
        } else {
          console.log(`⚠️ QR Code was not added (newFileUrl same as old)`);
        }
      } else {
        console.log(`⚠️ Skipping QR code: fileUrl condition not met`);
      }
    } catch (qrError) {
      console.error(`❌ Failed to add QR code to document ${doc.id}:`, qrError);
    }
    
    res.json(doc);
  } catch (err) {
    console.error("Error creating document:", err);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// ✅ دالة التوقيع الرقمي المعدلة (مع إضافة تشخيص)
router.post("/:id/sign", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);
    const { signerId, signerRole, comment, documentHash } = req.body;
    
    console.log("🔐 Sign request received:", { docId, signerId, signerRole });
    console.log("📝 Document hash (first 32 chars):", documentHash?.substring(0, 32));
    
    const doc = await storage.getDocument(docId);
    if (!doc) {
      console.log("❌ Document not found");
      return res.status(404).json({ error: "Document not found" });
    }
    
    console.log("🔑 Getting private key for user:", signerId);
    const privateKey = await getPrivateKeyForUser(signerId);
    console.log("🔑 Private key retrieved:", privateKey ? `Yes (length: ${privateKey.length})` : "No");
    
    if (!privateKey) {
      console.error(`❌ No private key found for user ${signerId}`);
      return res.status(400).json({ error: "المفتاح الخاص غير موجود للمستخدم" });
    }
    
    console.log("✍️ Attempting to sign hash with ECC...");
    const signature = await signHash(documentHash, privateKey);
    console.log("✅ Signature created successfully, length:", signature.length);
    
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
    
    logger.info({ docId, signerRole, newStatus }, `Document signed: step ${currentStepValue} -> ${newStep}`);

    // ✅ تسجيل التوقيع على Blockchain بشكل غير متزامن
    const blockchainDocId = (doc as any).blockchainDocId;
    if (blockchainDocId) {
      setImmediate(async () => {
        try {
          await addSignatureToChain(blockchainDocId, signerRole, signature);
          logger.info({ docId, blockchainDocId, signerRole }, "تم تسجيل التوقيع على Blockchain");

          if (newStatus === "Verified") {
            const completeTxUrl = await completeDocumentOnChain(blockchainDocId);
            await storage.updateDocument(docId, { blockchainTxUrl: completeTxUrl });
            logger.info({ docId, blockchainDocId }, "تم إكمال الوثيقة على Blockchain");
          }
        } catch (blockchainErr: any) {
          logger.warn({ err: blockchainErr.message, docId, signerRole }, "فشل تسجيل التوقيع على Blockchain");
        }
      });
    }
    
    res.json(updatedDoc);
  } catch (err) {
    logger.error({ err }, "Error signing document");
    res.status(500).json({ error: "Failed to sign document: " + (err as Error).message });
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

// البحث عن وثيقة بواسطة الهاش
router.get("/by-hash/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const allDocs = await storage.getAllDocuments();
    const doc = allDocs.find(d => d.documentHash === hash);
    
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    res.json(doc);
  } catch (err) {
    console.error("Error finding document by hash:", err);
    res.status(500).json({ error: "Failed to find document" });
  }
});

// ✅ فحص حالة تسجيل الوثيقة على Blockchain / تسجيل يدوي إذا لم يكتمل التلقائي
router.post("/:id/register-on-chain", async (req, res) => {
  try {
    const docId = parseInt(req.params.id);

    const doc = await storage.getDocument(docId);
    if (!doc) {
      return res.status(404).json({ error: "الوثيقة غير موجودة" });
    }

    // إذا كان هناك رابط معاملة بالفعل، إرجاعه
    if ((doc as any).blockchainTxUrl) {
      return res.status(409).json({ 
        error: "تم تسجيل هذه الوثيقة مسبقاً على Blockchain",
        txUrl: (doc as any).blockchainTxUrl
      });
    }

    if (doc.status !== "Verified") {
      return res.status(400).json({ error: "يمكن تسجيل الوثائق المكتملة (Verified) فقط على Blockchain" });
    }

    if (!doc.documentHash) {
      return res.status(400).json({ error: "لا يوجد هاش للوثيقة" });
    }

    // تسجيل يدوي في حالة فشل التسجيل التلقائي
    logger.info({ docId }, "بدء التسجيل اليدوي للوثيقة على Blockchain...");
    const { docId: blockchainDocId, txUrl } = await createDocumentOnChain(doc.documentHash);
    
    const updatedDoc = await storage.updateDocument(docId, {
      blockchainDocId,
      blockchainTxUrl: txUrl,
    });

    logger.info({ docId, blockchainDocId, txUrl }, "تم التسجيل اليدوي بنجاح");

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