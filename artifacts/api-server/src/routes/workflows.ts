import { Router, type Response } from 'express';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middlewares/auth.js';

const router = Router();

const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  const u = req.user;
  if (!u || (u.role !== 'مدير النظام' && u.is_admin !== true)) {
    return res.status(403).json({ error: 'غير مصرح - يتطلب صلاحية الأدمن' });
  }
  next();
};

router.use(authenticate, requireAdmin);

// GET /api/workflows - قائمة جميع المسارات مع المراحل
router.get('/', async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT w.id, w.name, w.document_type, w.contract_type, w.is_active, w.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', s.id, 'step_order', s.step_order, 'role_name', s.role_name, 'is_external', s.is_external
          ) ORDER BY s.step_order) FROM workflow_steps s WHERE s.workflow_id = w.id),
          '[]'::json
        ) AS steps
      FROM workflows w
      ORDER BY w.id ASC
    `);
    res.json((result as any).rows ?? result);
  } catch (e: any) {
    console.error('GET /workflows error:', e);
    res.status(500).json({ error: 'فشل في تحميل المسارات' });
  }
});

// POST /api/workflows - إنشاء مسار جديد
router.post('/', async (req, res) => {
  try {
    const { name, document_type, contract_type, steps } = req.body as {
      name: string;
      document_type?: string;
      contract_type?: string | null;
      steps: { role_name: string; is_external?: boolean }[];
    };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم المسار مطلوب' });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة مرحلة واحدة على الأقل' });
    }

    const docType = document_type || 'Certificate';
    const inserted: any = await db.execute(sql`
      INSERT INTO workflows (name, document_type, contract_type, is_active)
      VALUES (${name.trim()}, ${docType}, ${contract_type ?? null}, FALSE)
      RETURNING id
    `);
    const wid = ((inserted as any).rows ?? inserted)[0].id;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await db.execute(sql`
        INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external)
        VALUES (${wid}, ${i + 1}, ${s.role_name}, ${s.is_external ?? false})
      `);
    }

    res.json({ success: true, id: wid });
  } catch (e: any) {
    console.error('POST /workflows error:', e);
    res.status(500).json({ error: 'فشل في إنشاء المسار' });
  }
});

// PUT /api/workflows/:id - تحديث المسار
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'معرّف غير صالح' });

    const { name, document_type, contract_type, steps } = req.body as {
      name: string;
      document_type?: string;
      contract_type?: string | null;
      steps: { role_name: string; is_external?: boolean }[];
    };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم المسار مطلوب' });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة مرحلة واحدة على الأقل' });
    }

    await db.execute(sql`
      UPDATE workflows
      SET name = ${name.trim()},
          document_type = ${document_type || 'Certificate'},
          contract_type = ${contract_type ?? null}
      WHERE id = ${id}
    `);

    await db.execute(sql`DELETE FROM workflow_steps WHERE workflow_id = ${id}`);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await db.execute(sql`
        INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external)
        VALUES (${id}, ${i + 1}, ${s.role_name}, ${s.is_external ?? false})
      `);
    }

    res.json({ success: true });
  } catch (e: any) {
    console.error('PUT /workflows/:id error:', e);
    res.status(500).json({ error: 'فشل في تحديث المسار' });
  }
});

// PATCH /api/workflows/:id/activate - تعيين كنشط (يلغي تنشيط الباقي)
router.patch('/:id/activate', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'معرّف غير صالح' });

    await db.execute(sql`UPDATE workflows SET is_active = FALSE`);
    await db.execute(sql`UPDATE workflows SET is_active = TRUE WHERE id = ${id}`);

    res.json({ success: true });
  } catch (e: any) {
    console.error('PATCH /workflows/:id/activate error:', e);
    res.status(500).json({ error: 'فشل في تعيين المسار النشط' });
  }
});

// DELETE /api/workflows/:id - حذف المسار (لا يمكن حذف النشط)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'معرّف غير صالح' });

    const existing: any = await db.execute(sql`SELECT is_active FROM workflows WHERE id = ${id}`);
    const rows = (existing as any).rows ?? existing;
    if (rows.length === 0) {
      return res.status(404).json({ error: 'المسار غير موجود' });
    }
    if (rows[0].is_active) {
      return res.status(400).json({ error: 'لا يمكن حذف المسار النشط' });
    }

    await db.execute(sql`DELETE FROM workflow_steps WHERE workflow_id = ${id}`);
    await db.execute(sql`DELETE FROM workflows WHERE id = ${id}`);

    res.json({ success: true });
  } catch (e: any) {
    console.error('DELETE /workflows/:id error:', e);
    res.status(500).json({ error: 'فشل في حذف المسار' });
  }
});

export default router;
