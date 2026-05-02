import { Router } from "express";
import { storage } from "../lib/storage";
import { logger } from "../lib/logger";

const router = Router();

// ✅ الحصول على جميع مسارات التوقيع
router.get("/", async (req, res) => {
  try {
    const workflows = await storage.getAllWorkflows();
    res.json(workflows);
  } catch (err) {
    console.error("Error fetching workflows:", err);
    res.status(500).json({ error: "فشل في جلب مسارات التوقيع" });
  }
});

// ✅ الحصول على المسار النشط
router.get("/active", async (req, res) => {
  try {
    const activeWorkflow = await storage.getActiveWorkflow();
    res.json(activeWorkflow);
  } catch (err) {
    console.error("Error fetching active workflow:", err);
    res.status(500).json({ error: "فشل في جلب المسار النشط" });
  }
});

// ✅ إضافة مسار توقيع جديد
router.post("/", async (req, res) => {
  try {
    const { name, workflow } = req.body;
    
    if (!name || !workflow || !Array.isArray(workflow)) {
      return res.status(400).json({ error: "اسم المسار وقائمة التوقيعات مطلوبة" });
    }
    
    const newWorkflow = await storage.createWorkflow({ name, workflow });
    res.json(newWorkflow);
  } catch (err) {
    console.error("Error creating workflow:", err);
    res.status(500).json({ error: "فشل في إنشاء مسار التوقيع" });
  }
});

// ✅ تحديث مسار توقيع
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, workflow } = req.body;
    
    const updated = await storage.updateWorkflow(id, { name, workflow });
    res.json(updated);
  } catch (err) {
    console.error("Error updating workflow:", err);
    res.status(500).json({ error: "فشل في تحديث مسار التوقيع" });
  }
});

// ✅ تعيين مسار توقيع كنشط
router.put("/:id/activate", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const activated = await storage.activateWorkflow(id);
    res.json(activated);
  } catch (err) {
    console.error("Error activating workflow:", err);
    res.status(500).json({ error: "فشل في تفعيل مسار التوقيع" });
  }
});

// ✅ حذف مسار توقيع
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteWorkflow(id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting workflow:", err);
    res.status(500).json({ error: "فشل في حذف مسار التوقيع" });
  }
});

export default router;