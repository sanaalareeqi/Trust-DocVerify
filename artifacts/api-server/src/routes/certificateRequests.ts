import { Router } from "express";
import { db } from "@workspace/db";
import jwt from "jsonwebtoken";

const router = Router();

// دالة مساعدة للتعامل مع النصوص
const safeString = (value: any): string => {
  if (!value) return '';
  return String(value).replace(/'/g, "''");
};

// ============== إدارة طلبات الشهادات ==============

// إنشاء طلب جديد (للطالب - بدون تسجيل دخول)
router.post("/certificate-requests", async (req: any, res: any) => {
  try {
    const {
      student_name_ar, student_name_en,
      nationality_ar, nationality_en,
      birthplace_ar, birthplace_en,
      birth_year,
      college_ar, college_en,
    } = req.body;

    console.log("📝 استلام طلب شهادة جديد:", { student_name_ar, college_ar });

    // ✅ التحقق من الحقول المطلوبة
    if (!student_name_ar || !student_name_en || !nationality_ar || !nationality_en || 
        !birthplace_ar || !birthplace_en || !birth_year || !college_ar || !college_en) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }

    // ✅ استعلام INSERT مع إضافة قيم افتراضية لـ major_ar و major_en
    const result = await db.execute(`
      INSERT INTO certificate_requests (
        student_name_ar, student_name_en,
        nationality_ar, nationality_en,
        birthplace_ar, birthplace_en,
        birth_year,
        major_ar, major_en,
        college_ar, college_en, 
        student_id, status
      ) VALUES (
        '${safeString(student_name_ar)}', 
        '${safeString(student_name_en)}',
        '${safeString(nationality_ar)}', 
        '${safeString(nationality_en)}',
        '${safeString(birthplace_ar)}', 
        '${safeString(birthplace_en)}',
        ${birth_year},
        'غير محدد', 'Not Specified',
        '${safeString(college_ar)}', 
        '${safeString(college_en)}', 
        NULL, 'pending'
      )
      RETURNING *
    `);

    console.log("✅ تم حفظ الطلب بنجاح، ID:", result.rows[0].id);

    // ✅ إرسال إشعار إلى شؤون الخريجين
    await db.execute(`
      INSERT INTO notifications (recipient_id, message, created_at)
      SELECT id, '📋 طلب شهادة جديد من الطالب: ${safeString(student_name_ar)}', NOW() 
      FROM users WHERE role = 'شؤون الخريجين'
    `);

    res.json({ 
      success: true, 
      message: "تم إرسال طلب الشهادة بنجاح",
      requestId: result.rows[0].id 
    });
    
  } catch (err: any) {
    console.error("❌ خطأ في إنشاء الطلب:", err);
    res.status(500).json({ error: "فشل في إنشاء الطلب: " + err.message });
  }
});

// جلب جميع الطلبات (لشؤون الخريجين)
router.get("/certificate-requests", async (req: any, res: any) => {
  try {
    const result = await db.execute(`
      SELECT * FROM certificate_requests 
      ORDER BY 
        CASE status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'issued' THEN 3 
          ELSE 4 
        END,
        request_date DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ خطأ في جلب الطلبات:", err);
    res.status(500).json({ error: "فشل في جلب الطلبات" });
  }
});

// الموافقة على الطلب
router.put("/certificate-requests/:id/approve", async (req: any, res: any) => {
  try {
    const requestId = parseInt(req.params.id);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "غير مصرح به" });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");

    const result = await db.execute(`
      UPDATE certificate_requests 
      SET status = 'approved', reviewed_by = ${decoded.id}, reviewed_at = NOW()
      WHERE id = ${requestId}
      RETURNING *
    `);

    await db.execute(`
      INSERT INTO notifications (recipient_id, message, created_at)
      SELECT student_id, '✅ تمت الموافقة على طلب شهادتك وهو قيد الإصدار', NOW()
      FROM certificate_requests WHERE id = ${requestId}
    `);

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ خطأ في الموافقة:", err);
    res.status(500).json({ error: "فشل في الموافقة" });
  }
});

// رفض الطلب
router.put("/certificate-requests/:id/reject", async (req: any, res: any) => {
  try {
    const requestId = parseInt(req.params.id);
    const { reason } = req.body;

    const result = await db.execute(`
      UPDATE certificate_requests 
      SET status = 'rejected', rejection_reason = '${safeString(reason)}'
      WHERE id = ${requestId}
      RETURNING *
    `);

    await db.execute(`
      INSERT INTO notifications (recipient_id, message, created_at)
      SELECT student_id, '❌ تم رفض طلب شهادتك. السبب: ${safeString(reason)}', NOW()
      FROM certificate_requests WHERE id = ${requestId}
    `);

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ خطأ في الرفض:", err);
    res.status(500).json({ error: "فشل في الرفض" });
  }
});

// إصدار الشهادة
router.post("/certificate-requests/issue-certificate", async (req: any, res: any) => {
  try {
    const { requestId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "غير مصرح به" });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");

    const requestResult = await db.execute(`
      SELECT * FROM certificate_requests WHERE id = ${requestId}
    `);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
    
    const request = requestResult.rows[0];

    const docResult = await db.execute(`
      INSERT INTO documents (title, type, status, current_step, creator_id, file_url, document_hash, workflow)
      VALUES (
        'شهادة تخرج - ${safeString(request.student_name_ar)}', 
        'certificate', 
        'Pending', 
        1, 
        ${decoded.id}, 
        'temp.pdf', 
        'pending_hash',
        '[{"step":1,"role":"شؤون الخريجين"}]'::json
      )
      RETURNING *
    `);

    const document = docResult.rows[0];

    await db.execute(`
      UPDATE certificate_requests 
      SET status = 'issued', document_id = ${document.id}
      WHERE id = ${requestId}
    `);

    await db.execute(`
      INSERT INTO notifications (recipient_id, message, document_id, created_at)
      SELECT student_id, '🎓 تم إصدار شهادتك بنجاح! يمكنك عرضها في حسابك.', ${document.id}, NOW()
      FROM certificate_requests WHERE id = ${requestId}
    `);

    res.json({ success: true, documentId: document.id });
  } catch (err: any) {
    console.error("❌ خطأ في إصدار الشهادة:", err);
    res.status(500).json({ error: "فشل في إصدار الشهادة: " + err.message });
  }
});

export default router;