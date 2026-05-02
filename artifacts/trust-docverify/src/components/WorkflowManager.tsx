import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, CheckCircle, XCircle, ArrowUp, ArrowDown, Edit2, Pause, Play } from "lucide-react";
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
];

interface Workflow {
  id: number;
  name: string;
  workflow: Array<{ step: number; role: string }> | string | null | undefined;
  is_active: boolean;
  start_date?: string;
  end_date?: string | null;
  created_at: string;
}

interface EditingWorkflow {
  id: number | null;
  name: string;
  selectedRoles: string[];
  startDate: string;
  endDate: string;
}

export default function WorkflowManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [editingWorkflow, setEditingWorkflow] = useState<EditingWorkflow>({
    id: null,
    name: "",
    selectedRoles: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/workflows", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast({ title: "خطأ", description: "فشل في تحميل مسارات التوقيع", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ دالة لحساب حالة المسار
  const getWorkflowStatus = (workflow: Workflow) => {
    if (!workflow.is_active) {
      return { status: "غير نشط", color: "bg-gray-100 text-gray-700" };
    }

    if (workflow.end_date) {
      const endDate = new Date(workflow.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (endDate < today) {
        return { status: "منتهي", color: "bg-red-100 text-red-700" };
      }
    }

    return { status: "نشط", color: "bg-green-100 text-green-700" };
  };

  // ✅ دالة لحساب المدة
  const getDuration = (startDate?: string, endDate?: string | null) => {
    if (!startDate) return "غير محدد";
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (!end) {
      return `من ${start.toLocaleDateString("ar-SA")}`;
    }
    
    return `${start.toLocaleDateString("ar-SA")} إلى ${end.toLocaleDateString("ar-SA")}`;
  };

  const createWorkflow = async () => {
    if (!newWorkflowName || selectedRoles.length === 0) {
      toast({ title: "خطأ", description: "الاسم ومراحل التوقيع مطلوبة", variant: "destructive" });
      return;
    }

    const workflowData = selectedRoles.map((role, index) => ({
      step: index + 1,
      role: role,
    }));

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newWorkflowName,
          workflow: workflowData,
          start_date: startDate,
          end_date: endDate || null,
          is_active: true,
        }),
      });

      if (response.ok) {
        toast({ title: "✅ تم الإضافة", description: `تم إضافة مسار ${newWorkflowName}` });
        setDialogOpen(false);
        setNewWorkflowName("");
        setSelectedRoles([]);
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate("");
        fetchWorkflows();
      } else {
        throw new Error("فشل في الإضافة");
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في إضافة مسار التوقيع", variant: "destructive" });
    }
  };

  // ✅ دالة تعديل المسار
  const updateWorkflow = async () => {
    if (!editingWorkflow.name || editingWorkflow.selectedRoles.length === 0) {
      toast({ title: "خطأ", description: "الاسم ومراحل التوقيع مطلوبة", variant: "destructive" });
      return;
    }

    const workflowData = editingWorkflow.selectedRoles.map((role, index) => ({
      step: index + 1,
      role: role,
    }));

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/workflows/${editingWorkflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editingWorkflow.name,
          workflow: workflowData,
          start_date: editingWorkflow.startDate,
          end_date: editingWorkflow.endDate || null,
        }),
      });

      if (response.ok) {
        toast({ title: "✅ تم التحديث", description: "تم تحديث مسار التوقيع بنجاح" });
        setEditDialogOpen(false);
        fetchWorkflows();
      } else {
        throw new Error("فشل في التحديث");
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحديث مسار التوقيع", variant: "destructive" });
    }
  };

  // ✅ دالة فتح نافذة التعديل
  const openEditDialog = (workflow: Workflow) => {
    const workflowSteps = getWorkflowSteps(workflow.workflow);
    setEditingWorkflow({
      id: workflow.id,
      name: workflow.name,
      selectedRoles: workflowSteps.map((step: any) => step.role),
      startDate: workflow.start_date || new Date().toISOString().split('T')[0],
      endDate: workflow.end_date || "",
    });
    setEditDialogOpen(true);
  };

  // ✅ دالة تبديل حالة المسار (نشط/غير نشط)
  const toggleWorkflowStatus = async (id: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/workflows/${id}/toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        const message = !currentStatus ? "تم تفعيل المسار" : "تم إيقاف المسار مؤقتاً";
        toast({ title: "✅ تم التحديث", description: message });
        fetchWorkflows();
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحديث حالة المسار", variant: "destructive" });
    }
  };

  const deleteWorkflow = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المسار؟")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/workflows/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({ title: "تم الحذف", description: "تم حذف مسار التوقيع" });
        fetchWorkflows();
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في الحذف", variant: "destructive" });
    }
  };

  const moveRole = (index: number, direction: "up" | "down", isEdit: boolean = false) => {
    const roles = isEdit ? editingWorkflow.selectedRoles : selectedRoles;
    const newRoles = [...roles];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRoles.length) return;
    [newRoles[index], newRoles[targetIndex]] = [newRoles[targetIndex], newRoles[index]];
    
    if (isEdit) {
      setEditingWorkflow({ ...editingWorkflow, selectedRoles: newRoles });
    } else {
      setSelectedRoles(newRoles);
    }
  };

  const toggleRole = (role: string, isEdit: boolean = false) => {
    const roles = isEdit ? editingWorkflow.selectedRoles : selectedRoles;
    if (roles.includes(role)) {
      const newRoles = roles.filter((r) => r !== role);
      if (isEdit) {
        setEditingWorkflow({ ...editingWorkflow, selectedRoles: newRoles });
      } else {
        setSelectedRoles(newRoles);
      }
    } else {
      const newRoles = [...roles, role];
      if (isEdit) {
        setEditingWorkflow({ ...editingWorkflow, selectedRoles: newRoles });
      } else {
        setSelectedRoles(newRoles);
      }
    }
  };

  // ✅ دالة مساعدة لمعالجة workflow بشكل آمن
  const getWorkflowSteps = (workflow: any) => {
    try {
      if (typeof workflow === 'string') {
        const parsed = JSON.parse(workflow);
        return Array.isArray(parsed) ? parsed : [];
      }
      if (Array.isArray(workflow)) {
        return workflow;
      }
      return [];
    } catch (error) {
      console.error("Error parsing workflow:", error);
      return [];
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">إدارة مسارات التوقيع</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> إضافة مسار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl text-right" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">إضافة مسار توقيع جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-right block">اسم المسار</Label>
                <Input
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="مثال: مسار الشهادات الافتراضي"
                  className="text-right"
                />
              </div>

              {/* ✅ حقول التاريخ */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-right block">تاريخ البدء</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-right"
                  />
                </div>
                <div>
                  <Label className="text-right block">تاريخ الانتهاء (اختياري)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-right"
                  />
                </div>
              </div>

              <div>
                <Label className="text-right block mb-2">مراحل التوقيع (اختيار وترتيب)</Label>
                {/* ✅ قائمة الأدوار قابلة للتمرير */}
                <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_ROLES.map((role) => (
                      <div
                        key={role}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                          selectedRoles.includes(role)
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/30"
                        }`}
                        onClick={() => toggleRole(role)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role)}
                          readOnly
                          className="ml-2"
                        />
                        <span>{role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedRoles.length > 0 && (
                <div>
                  <Label className="text-right block">ترتيب الموقعين</Label>
                  <div className="space-y-2 mt-2">
                    {selectedRoles.map((role, index) => (
                      <div
                        key={role}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <span>
                          {index + 1}. {role}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveRole(index, "up")}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveRole(index, "down")}
                            disabled={index === selectedRoles.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={createWorkflow} className="w-full">
                إنشاء مسار التوقيع
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      {/* ✅ Dialog تعديل المسار */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل مسار التوقيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-right block">اسم المسار</Label>
              <Input
                value={editingWorkflow.name}
                onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                placeholder="اسم المسار"
                className="text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block">تاريخ البدء</Label>
                <Input
                  type="date"
                  value={editingWorkflow.startDate}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, startDate: e.target.value })}
                  className="text-right"
                />
              </div>
              <div>
                <Label className="text-right block">تاريخ الانتهاء (اختياري)</Label>
                <Input
                  type="date"
                  value={editingWorkflow.endDate}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, endDate: e.target.value })}
                  className="text-right"
                />
              </div>
            </div>

            <div>
              <Label className="text-right block mb-2">مراحل التوقيع</Label>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ROLES.map((role) => (
                    <div
                      key={role}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                        editingWorkflow.selectedRoles.includes(role)
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/30"
                      }`}
                      onClick={() => toggleRole(role, true)}
                    >
                      <input
                        type="checkbox"
                        checked={editingWorkflow.selectedRoles.includes(role)}
                        readOnly
                        className="ml-2"
                      />
                      <span>{role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {editingWorkflow.selectedRoles.length > 0 && (
              <div>
                <Label className="text-right block">ترتيب الموقعين</Label>
                <div className="space-y-2 mt-2">
                  {editingWorkflow.selectedRoles.map((role, index) => (
                    <div
                      key={role}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                    >
                      <span>
                        {index + 1}. {role}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveRole(index, "up", true)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveRole(index, "down", true)}
                          disabled={index === editingWorkflow.selectedRoles.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={updateWorkflow} className="bg-blue-600 hover:bg-blue-700">
                حفظ التعديلات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد مسارات توقيع</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* ✅ ترتيب الأعمدة RTL */}
                  <TableHead className="text-right w-48">الإجراءات</TableHead>
                  <TableHead className="text-right w-28">الحالة</TableHead>
                  <TableHead className="text-right w-40">المدة</TableHead>
                  <TableHead className="text-right">مراحل التوقيع</TableHead>
                  <TableHead className="text-right">اسم المسار</TableHead>
                  <TableHead className="text-right w-12">#</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((wf, idx) => {
                  const workflowSteps = getWorkflowSteps(wf.workflow);
                  const stepsDisplay = workflowSteps.length > 0
                    ? workflowSteps.map((step: any, i: number) => (
                        <Badge key={i} variant="outline" className="ml-1 mb-1 bg-gray-50">
                          {i + 1}. {step.role}
                        </Badge>
                      ))
                    : <span className="text-muted-foreground">لا توجد خطوات</span>;

                  const { status, color } = getWorkflowStatus(wf);

                  return (
                    <TableRow key={wf.id}>
                      {/* ✅ الإجراءات */}
                      <TableCell className="text-right w-48">
                        <div className="flex gap-2 justify-start flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => openEditDialog(wf)}
                          >
                            <Edit2 className="h-4 w-4" /> تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => toggleWorkflowStatus(wf.id, wf.is_active)}
                          >
                            {wf.is_active ? (
                              <>
                                <Pause className="h-4 w-4" /> إيقاف
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" /> تفعيل
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteWorkflow(wf.id)}
                            className="gap-1"
                          >
                            <Trash2 className="h-4 w-4" /> حذف
                          </Button>
                        </div>
                      </TableCell>

                      {/* ✅ الحالة */}
                      <TableCell className="text-right w-28">
                        <Badge className={color}>
                          {status}
                        </Badge>
                      </TableCell>

                      {/* ✅ المدة */}
                      <TableCell className="text-right w-40 text-sm">
                        {getDuration(wf.start_date, wf.end_date)}
                      </TableCell>

                      {/* ✅ مراحل التوقيع */}
                      <TableCell className="text-right">
                        <div className="flex flex-wrap gap-1">
                          {stepsDisplay}
                        </div>
                      </TableCell>

                      {/* ✅ اسم المسار */}
                      <TableCell className="text-right font-medium">{wf.name}</TableCell>

                      {/* ✅ الرقم التسلسلي */}
                      <TableCell className="text-right w-12">{idx + 1}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
