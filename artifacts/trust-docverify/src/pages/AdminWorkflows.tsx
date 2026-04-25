import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Pencil, ArrowUp, ArrowDown, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_ROLES = [
  "شؤون الخريجين",
  "مسجل الكلية",
  "عميد الكلية",
  "المسجل العام",
  "رئيس الجامعة",
  "مسؤول التوظيف",
  "الأمين العام",
  "رئيس مجلس الأمناء",
  "مقدم طلب الشراء",
  "المدير المالي",
  "المراجع",
  "الحسابات",
  "ممثل جهة خارجية",
];

interface WorkflowStep {
  id?: number;
  step_order: number;
  role_name: string;
  is_external?: boolean;
}

interface Workflow {
  id: number;
  name: string;
  document_type: string;
  contract_type: string | null;
  is_active: boolean;
  steps: WorkflowStep[];
}

export default function AdminWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [formName, setFormName] = useState("");
  const [formSteps, setFormSteps] = useState<string[]>([]);
  const [roleToAdd, setRoleToAdd] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null; name: string }>({ open: false, id: null, name: "" });
  const { toast } = useToast();

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  };

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workflows", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      } else {
        toast({ title: "خطأ", description: "فشل في تحميل المسارات", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "خطأ", description: "فشل الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormSteps([]);
    setRoleToAdd("");
    setEditorOpen(true);
  };

  const openEdit = (wf: Workflow) => {
    setEditing(wf);
    setFormName(wf.name);
    setFormSteps(wf.steps.map(s => s.role_name));
    setRoleToAdd("");
    setEditorOpen(true);
  };

  const addStep = () => {
    if (!roleToAdd) return;
    setFormSteps([...formSteps, roleToAdd]);
    setRoleToAdd("");
  };

  const removeStep = (idx: number) => {
    setFormSteps(formSteps.filter((_, i) => i !== idx));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= formSteps.length) return;
    const arr = [...formSteps];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setFormSteps(arr);
  };

  const saveWorkflow = async () => {
    if (!formName.trim()) {
      toast({ title: "خطأ", description: "اسم المسار مطلوب", variant: "destructive" });
      return;
    }
    if (formSteps.length === 0) {
      toast({ title: "خطأ", description: "يجب إضافة مرحلة واحدة على الأقل", variant: "destructive" });
      return;
    }

    const body = {
      name: formName.trim(),
      document_type: editing?.document_type || "Certificate",
      contract_type: editing?.contract_type ?? null,
      steps: formSteps.map(role_name => ({ role_name, is_external: false })),
    };

    try {
      const url = editing ? `/api/workflows/${editing.id}` : "/api/workflows";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (res.ok) {
        toast({ title: "تم الحفظ", description: editing ? "تم تحديث المسار بنجاح" : "تم إنشاء المسار بنجاح" });
        setEditorOpen(false);
        fetchWorkflows();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "خطأ", description: err.error || "فشل في الحفظ", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل الاتصال بالخادم", variant: "destructive" });
    }
  };

  const activateWorkflow = async (id: number) => {
    try {
      const res = await fetch(`/api/workflows/${id}/activate`, { method: "PATCH", headers: authHeaders() });
      if (res.ok) {
        toast({ title: "تم", description: "تم تعيين المسار النشط" });
        fetchWorkflows();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "خطأ", description: err.error || "فشل العملية", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل الاتصال بالخادم", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id == null) return;
    try {
      const res = await fetch(`/api/workflows/${deleteConfirm.id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        toast({ title: "تم الحذف", description: "تم حذف المسار بنجاح" });
        fetchWorkflows();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "خطأ", description: err.error || "فشل في الحذف", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل الاتصال بالخادم", variant: "destructive" });
    } finally {
      setDeleteConfirm({ open: false, id: null, name: "" });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة مسارات التوقيع (Workflow)</h1>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> مسار جديد
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-right">قائمة مسارات التوقيع</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد مسارات. أضف مساراً جديداً.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-20">معرف المسار</TableHead>
                  <TableHead className="text-right">اسم المسار</TableHead>
                  <TableHead className="text-right">مراحل التوقيع</TableHead>
                  <TableHead className="text-right w-32">الحالة</TableHead>
                  <TableHead className="text-right w-72">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map(wf => (
                  <TableRow key={wf.id}>
                    <TableCell className="text-right">{wf.id}</TableCell>
                    <TableCell className="text-right font-medium">{wf.name}</TableCell>
                    <TableCell className="text-right text-sm">
                      {wf.steps && wf.steps.length > 0
                        ? wf.steps.map(s => s.role_name).join(" ← ")
                        : <span className="text-muted-foreground">لا توجد مراحل</span>}
                    </TableCell>
                    <TableCell className="text-right w-32">
                      {wf.is_active
                        ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">نشط</Badge>
                        : <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">غير نشط</Badge>}
                    </TableCell>
                    <TableCell className="text-right w-72">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {!wf.is_active && (
                          <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => activateWorkflow(wf.id)}>
                            <CheckCircle2 className="h-4 w-4" /> تعيين كنشط
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(wf)}>
                          <Pencil className="h-4 w-4" /> تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={wf.is_active}
                          title={wf.is_active ? "لا يمكن حذف المسار النشط" : ""}
                          onClick={() => setDeleteConfirm({ open: true, id: wf.id, name: wf.name })}
                        >
                          <Trash2 className="h-4 w-4" /> حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{editing ? "تعديل مسار التوقيع" : "إضافة مسار توقيع جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-right">
            <div>
              <Label>اسم المسار</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="مثال: مسار الشهادات السريع" className="text-right" />
            </div>

            <div>
              <Label>إضافة مرحلة توقيع</Label>
              <div className="flex gap-2 mt-2">
                <Select value={roleToAdd} onValueChange={setRoleToAdd}>
                  <SelectTrigger className="text-right flex-1"><SelectValue placeholder="اختر دوراً" /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map(r => (
                      <SelectItem key={r} value={r} className="text-right">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addStep} disabled={!roleToAdd} className="gap-1">
                  <Plus className="h-4 w-4" /> إضافة
                </Button>
              </div>
            </div>

            <div>
              <Label>مراحل التوقيع (بالترتيب)</Label>
              {formSteps.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border border-dashed rounded mt-2 text-center">
                  لم تُضف أي مرحلة بعد
                </div>
              ) : (
                <ol className="space-y-2 mt-2">
                  {formSteps.map((role, idx) => (
                    <li key={`${role}-${idx}`} className="flex items-center gap-2 p-2 bg-muted/40 rounded border">
                      <span className="font-bold w-6 text-center">{idx + 1}</span>
                      <span className="flex-1">{role}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveStep(idx, -1)} disabled={idx === 0} title="لأعلى">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveStep(idx, 1)} disabled={idx === formSteps.length - 1} title="لأسفل">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => removeStep(idx)} title="حذف">
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={saveWorkflow}>{editing ? "حفظ التعديلات" : "إنشاء المسار"}</Button>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm.open} onOpenChange={(o) => setDeleteConfirm(prev => ({ ...prev, open: o }))}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-right">
              هل أنت متأكد من حذف المسار "{deleteConfirm.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" onClick={confirmDelete}>تأكيد الحذف</Button>
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, id: null, name: "" })}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
