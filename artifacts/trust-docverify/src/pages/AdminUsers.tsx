import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash2, Ban, Loader2 } from "lucide-react";
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
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    role: "",
  });
  const { toast } = useToast();

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
        // استبعاد مدير النظام
        const filteredData = data.filter((user: any) => user.role !== 'مدير النظام');
        setUsers(filteredData);
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
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ title: "خطأ", description: "البريد الإلكتروني غير صحيح", variant: "destructive" });
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

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/documents/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast({ title: "تم الحذف", description: "تم حذف المستخدم بنجاح" });
        fetchUsers();
      } else {
        throw new Error("فشل في حذف المستخدم");
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في حذف المستخدم", variant: "destructive" });
    }
  };

  const handleSuspendUser = async (userId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const newStatus = !currentStatus;
      
      // تحديث الحالة محليًا أولاً
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_active: newStatus }
            : user
        )
      );
      
      const response = await fetch(`http://localhost:3000/api/documents/users/${userId}/toggle-suspend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ is_active: newStatus })
      });
      
      if (response.ok) {
        const message = newStatus ? 'تم تفعيل الحساب بنجاح' : 'تم إيقاف الحساب بنجاح';
        toast({ title: "تم التحديث", description: message });
      } else {
        // استرجاع الحالة القديمة إذا فشل الطلب
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { ...user, is_active: currentStatus }
              : user
          )
        );
        throw new Error("فشل في تحديث حالة الحساب");
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تحديث حالة الحساب", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" /> مستخدم جديد</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>إضافة مستخدم جديد</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>اسم المستخدم</Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} /></div>
                <div><Label>كلمة المرور</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} /></div>
                <div><Label>البريد الإلكتروني</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                <div><Label>الدور</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                    <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} className="w-full">إنشاء حساب</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>قائمة المستخدمين</CardTitle></CardHeader>
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
                    <TableHead className="text-right w-36">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-right w-12">{idx+1}</TableCell>
                      <TableCell className="text-right">{user.username}</TableCell>
                      <TableCell className="text-right">{user.email || "-"}</TableCell>
                      <TableCell className="text-right">{user.role}</TableCell>
                      <TableCell className="text-right w-16">
                        {user.is_active !== false ? 
                          <Badge className="bg-green-100 text-green-700">نشط</Badge> : 
                          <Badge className="bg-red-100 text-red-700">موقوف</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right w-36">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSuspendUser(user.id, user.is_active !== false)}
                            className="gap-1 text-yellow-600 border-yellow-200 hover:bg-yellow-50 whitespace-nowrap"
                          >
                            <Ban className="h-4 w-4" />
                            {user.is_active !== false ? "إيقاف" : "تفعيل"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id)}
                            className="gap-1 whitespace-nowrap"
                          >
                            <Trash2 className="h-4 w-4" />
                            حذف
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
      </main>
    </div>
  );
}