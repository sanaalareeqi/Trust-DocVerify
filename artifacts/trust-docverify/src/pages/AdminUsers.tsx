import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash2, Ban, Loader2, Edit, Eye, EyeOff, CheckCircle2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";

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
  
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    userId: number | null;
    user: any | null;
  }>({
    isOpen: false,
    userId: null,
    user: null,
  });
  
  const [editFormData, setEditFormData] = useState({
    name: "",
    role: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    role: "",
  });
  const { toast } = useToast();

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
      const response = await fetch("http://localhost:3000/api/documents/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const filteredData = data.filter((user: any) => user.role !== 'مدير النظام');
        
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
      const response = await fetch("http://localhost:3000/api/auth/register", {
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
        toast({ title: "✅ تم إنشاء المستخدم", description: `تم إنشاء حساب ${formData.username}` });
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

  const handleEditUser = async () => {
    if (!editDialog.userId || !editDialog.user) return;
    
    try {
      const token = localStorage.getItem("token");
      const updates: any = {};
      
      if (editFormData.name && editFormData.name !== editDialog.user.name) {
        updates.name = editFormData.name;
        updates.username = editFormData.name;
      }
      
      if (editFormData.role && editFormData.role !== editDialog.user.role) {
        updates.role = editFormData.role;
      }
      
      if (editFormData.password && editFormData.password.length >= 6) {
        updates.password = editFormData.password;
      }
      
      if (Object.keys(updates).length === 0) {
        toast({ title: "تنبيه", description: "لم تقم بإجراء أي تغييرات", variant: "default" });
        setEditDialog({ isOpen: false, userId: null, user: null });
        return;
      }
      
      const response = await fetch(`http://localhost:3000/api/documents/users/${editDialog.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({ title: "✅ تم التحديث", description: "تم تحديث بيانات المستخدم بنجاح" });
        setEditDialog({ isOpen: false, userId: null, user: null });
        setEditFormData({ name: "", role: "", password: "" });
        fetchUsers();
      } else {
        throw new Error(result.error || "فشل في تحديث المستخدم");
      }
    } catch (error: any) {
      console.error("Edit error:", error);
      toast({ title: "❌ خطأ", description: error.message || "حدث خطأ أثناء تحديث المستخدم", variant: "destructive" });
    }
  };
  
  const openEditDialog = (user: any) => {
    setEditDialog({
      isOpen: true,
      userId: user.id,
      user: user,
    });
    setEditFormData({
      name: user.name || user.username || "",
      role: user.role || "",
      password: "",
    });
    setShowPassword(false);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("⚠️ هل أنت متأكد من حذف هذا المستخدم نهائياً؟")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/documents/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({ title: "✅ تم الحذف", description: "تم حذف المستخدم بنجاح" });
        const savedStatuses = JSON.parse(localStorage.getItem("user_statuses") || "{}");
        delete savedStatuses[userId];
        localStorage.setItem("user_statuses", JSON.stringify(savedStatuses));
        fetchUsers();
      } else {
        throw new Error(result.error || "فشل في حذف المستخدم");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ 
        title: "❌ خطأ", 
        description: error.message || "حدث خطأ أثناء محاولة حذف المستخدم.", 
        variant: "destructive" 
      });
    }
  };

  const handleSuspendUser = async (userId: number, currentIsActive: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = !currentIsActive;
      
      const response = await fetch(`http://localhost:3000/api/documents/users/${userId}/toggle-suspend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ is_active: newStatus })
      });
      
      const savedStatuses = JSON.parse(localStorage.getItem("user_statuses") || "{}");
      savedStatuses[userId] = newStatus;
      localStorage.setItem("user_statuses", JSON.stringify(savedStatuses));

      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, is_active: newStatus } : user
        )
      );
      
      toast({ 
        title: "✅ تم التحديث", 
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">لوحة تحكم المدير</h1>
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
          <CardHeader>
            <CardTitle className="text-right">قائمة المستخدمين</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* ✅ ترتيب الأعمدة من اليمين إلى اليسار: # ← اسم المستخدم ← البريد ← الدور ← الحالة ← الإجراءات */}
                      <TableHead className="text-right w-16">#</TableHead>
                      <TableHead className="text-right">اسم المستخدم</TableHead>
                      <TableHead className="text-right">البريد الإلكتروني</TableHead>
                      <TableHead className="text-right">الدور</TableHead>
                      <TableHead className="text-right w-20">الحالة</TableHead>
                      <TableHead className="text-right w-48">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, idx) => {
                      const isActive = user.is_active !== false;
                      return (
                        <TableRow key={user.id}>
                          {/* # */}
                          <TableCell className="text-right">{idx + 1}</TableCell>
                          
                          {/* اسم المستخدم */}
                          <TableCell className="text-right font-medium">{user.name || user.username}</TableCell>
                          
                          {/* البريد الإلكتروني */}
                          <TableCell className="text-right">{user.email || "-"}</TableCell>
                          
                          {/* الدور */}
                          <TableCell className="text-right">{user.role}</TableCell>
                          
                          {/* الحالة */}
                          <TableCell className="text-right">
                            {isActive ? 
                              <Badge className="bg-green-100 text-green-700"> نشط</Badge> : 
                              <Badge className="bg-red-100 text-red-700">⛔ موقوف</Badge>
                            }
                          </TableCell>
                          
                          {/* الإجراءات */}
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-start">
                              <Button 
                                size="sm" 
                                onClick={() => openEditDialog(user)} 
                                className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Edit className="h-4 w-4" /> تعديل
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSuspendUser(user.id, isActive)}
                                className={`gap-1 whitespace-nowrap ${isActive ? "text-yellow-600 border-yellow-200 hover:bg-yellow-50" : "text-green-600 border-green-200 hover:bg-green-50"}`}
                              >
                                {isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                {isActive ? "إيقاف" : "تفعيل"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleDeleteUser(user.id)} 
                                className="gap-1"
                              >
                                <Trash2 className="h-4 w-4" /> حذف
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* نافذة تعديل المستخدم */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => setEditDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-end">
              <Edit className="h-5 w-5 text-blue-600" /> 
              تعديل بيانات المستخدم
            </DialogTitle>
            <DialogDescription className="text-right">
              تعديل بيانات المستخدم: <strong>{editDialog.user?.name || editDialog.user?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-right block mb-2">الاسم</Label>
              <Input 
                type="text" 
                value={editFormData.name} 
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} 
                placeholder="أدخل الاسم الجديد"
                className="text-right"
              />
            </div>
            
            <div>
              <Label className="text-right block mb-2">الدور</Label>
              <Select 
                value={editFormData.role} 
                onValueChange={(v) => setEditFormData({...editFormData, role: v})}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r} className="text-right">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-right block mb-2">
                كلمة المرور الجديدة 
                <span className="text-xs text-muted-foreground mr-2">(اختياري)</span>
              </Label>
              <div className="relative flex items-center">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={editFormData.password} 
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} 
                  placeholder="أدخل كلمة المرور الجديدة (اختياري)"
                  className="text-right pl-10"
                />
                <button 
                  type="button" 
                  className="absolute right-3 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {editFormData.password && editFormData.password.length < 6 && editFormData.password.length > 0 && (
                <p className="text-red-500 text-xs mt-1 text-right">⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex-row-reverse gap-2 mt-4">
            <Button onClick={handleEditUser} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4" /> حفظ التغييرات
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditDialog({ isOpen: false, userId: null, user: null });
                setEditFormData({ name: "", role: "", password: "" });
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" /> إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}