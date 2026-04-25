import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Trash2, Ban, Loader2, KeyRound, Eye, EyeOff, CheckCircle2, Users, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import AdminWorkflows from "./AdminWorkflows";

const ROLES = [
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

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState<{ isOpen: boolean; userId: number | null; username: string }>({
    isOpen: false,
    userId: null,
    username: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    role: "",
  });
  const { toast } = useToast();

  // ✅ حماية: فقط مدير النظام يمكنه الوصول
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      window.location.href = "/login";
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      if (user.role !== "مدير النظام") {
        window.location.href = "/dashboard";
        return;
      }
    } catch (error) {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/documents/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const filteredData = data.filter((user: any) => user.role !== 'مدير النظام');
        
        // ✅ دمج الحالة المحفوظة في localStorage مع البيانات القادمة من الـ API
        const savedStatuses = JSON.parse(localStorage.getItem("user_statuses") || "{}");
        const dataWithStatus = filteredData.map((user: any) => ({
          ...user,
          is_active: savedStatuses[user.id] !== undefined ? savedStatuses[user.id] : (user.is_active !== false)
        }));
        
        setUsers(dataWithStatus);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.username || !formData.password || !formData.email || !formData.role) {
      toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.username,
          email: formData.email,
          role: formData.role
        })
      });
      
      if (response.ok) {
        toast({ title: " تم إنشاء المستخدم", description: `تم إنشاء حساب ${formData.username}` });
        setDialogOpen(false);
        setFormData({ username: "", password: "", email: "", role: "" });
        fetchUsers();
      } else {
        const error = await response.json();
        throw new Error(error.error || "فشل في إنشاء المستخدم");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!changePasswordDialog.userId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/auth/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userId: changePasswordDialog.userId, newPassword: newPassword })
      });
      
      if (response.ok) {
        toast({ title: " تم التغيير", description: `تم تغيير كلمة المرور للمستخدم ${changePasswordDialog.username}` });
        setChangePasswordDialog({ isOpen: false, userId: null, username: "" });
        setNewPassword("");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  // ✅ دالة حذف المستخدم (معدلة مع رسالة خطأ أفضل)
  const handleDeleteUser = async (userId: number) => {
    if (!confirm("⚠️ هل أنت متأكد من حذف هذا المستخدم نهائياً؟\n\nسيتم حذف جميع بياناته بما في ذلك:\n- المفاتيح الخاصة\n- سجلات التوقيع\n- الإشعارات\n- الوثائق المرتبطة")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/documents/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({ title: " تم الحذف", description: "تم حذف المستخدم بنجاح" });
        
        // ✅ إزالة الحالة المحفوظة من localStorage
        const savedStatuses = JSON.parse(localStorage.getItem("user_statuses") || "{}");
        delete savedStatuses[userId];
        localStorage.setItem("user_statuses", JSON.stringify(savedStatuses));
        
        // ✅ تحديث القائمة دون إعادة تحميل الصفحة
        fetchUsers();
      } else {
        throw new Error(result.error || "فشل في حذف المستخدم");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ 
        title: " خطأ", 
        description: error.message || "حدث خطأ أثناء محاولة حذف المستخدم. يرجى المحاولة مرة أخرى.", 
        variant: "destructive" 
      });
    }
  };

  // ✅ دالة إيقاف/تفعيل المستخدم (مع الحفظ في السيرفر والمتصفح) - لم تتغير
  const handleSuspendUser = async (userId: number, currentIsActive: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = !currentIsActive;
      
      // 1. تحديث في السيرفر
      const response = await fetch(`/api/documents/users/${userId}/toggle-suspend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ is_active: newStatus })
      });
      
      // 2. تحديث في المتصفح (localStorage) كضمان للاحتفاظ بالحالة
      const savedStatuses = JSON.parse(localStorage.getItem("user_statuses") || "{}");
      savedStatuses[userId] = newStatus;
      localStorage.setItem("user_statuses", JSON.stringify(savedStatuses));

      // 3. تحديث الواجهة فوراً
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, is_active: newStatus } : user
        )
      );
      
      toast({ 
        title: " تم التحديث", 
        description: newStatus ? "تم تفعيل الحساب بنجاح" : "تم إيقاف الحساب بنجاح" 
      });
    } catch (error: any) {
      toast({ title: "خطأ", description: "فشل في تحديث الحالة", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Tabs
          defaultValue={typeof window !== "undefined" && window.location.hash === "#workflows" ? "workflows" : "users"}
          className="w-full"
          onValueChange={(v) => { if (typeof window !== "undefined") window.location.hash = v === "workflows" ? "workflows" : ""; }}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="workflows" className="gap-2"><GitBranch className="h-4 w-4" /> إدارة مسارات التوقيع (Workflow)</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" /> مستخدم جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle className="text-right">إضافة مستخدم جديد</DialogTitle></DialogHeader>
              <div className="space-y-4 text-right">
                <div><Label>اسم المستخدم</Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} /></div>
                <div><Label>كلمة المرور</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} /></div>
                <div><Label>البريد الإلكتروني</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                <div><Label>الدور</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                    <SelectTrigger className="text-right"><SelectValue placeholder="اختر الدور" /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="text-right">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} className="w-full">إنشاء حساب</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-right">قائمة المستخدمين</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12">#</TableHead>
                    <TableHead className="text-right">اسم المستخدم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right w-16">الحالة</TableHead>
                    <TableHead className="text-right w-52">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => {
                    const isActive = user.is_active !== false;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="text-right w-12">{idx+1}</TableCell>
                        <TableCell className="text-right">{user.username}</TableCell>
                        <TableCell className="text-right">{user.email || "-"}</TableCell>
                        <TableCell className="text-right">{user.role}</TableCell>
                        <TableCell className="text-right w-16">
                          {isActive ? 
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100"> نشط</Badge> : 
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">⛔ موقوف</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-right w-52">
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setChangePasswordDialog({ isOpen: true, userId: user.id, username: user.username })} className="gap-1"><KeyRound className="h-4 w-4" /> كلمة المرور</Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleSuspendUser(user.id, isActive)}
                              className={`gap-1 whitespace-nowrap ${isActive ? "text-yellow-600 border-yellow-200 hover:bg-yellow-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                            >
                              {isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              {isActive ? "إيقاف" : "تفعيل"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)} className="gap-1"><Trash2 className="h-4 w-4" /> حذف</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="workflows">
            <AdminWorkflows />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={changePasswordDialog.isOpen} onOpenChange={(open) => setChangePasswordDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-end"><KeyRound className="h-5 w-5 text-purple-600" /> تغيير كلمة المرور</DialogTitle>
            <DialogDescription className="text-right">تغيير كلمة المرور للمستخدم: <strong>{changePasswordDialog.username}</strong></DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-right block mb-2">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" className="text-right pl-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleChangePassword} disabled={!newPassword || newPassword.length < 6} className="gap-2"><KeyRound className="h-4 w-4" /> تغيير كلمة المرور</Button>
            <Button variant="outline" onClick={() => setChangePasswordDialog({ isOpen: false, userId: null, username: "" })}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}