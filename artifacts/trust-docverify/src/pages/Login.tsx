import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{username?: string, password?: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {username?: string, password?: string} = {};
    if (!username) newErrors.username = "اسم المستخدم مطلوب";
    if (!password) newErrors.password = "كلمة المرور مطلوبة";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // مسارات التوجيه حسب الدور
  const roleRoutes: Record<string, string> = {
     "مدير النظام": "/admin",
    'شؤون الخريجين': '/dashboard/graduate-affairs',
    'مسجل الكلية': '/dashboard/college-registrar',
    'عميد الكلية': '/dashboard/dean',
    'المسجل العام': '/dashboard/general-registrar',
    'رئيس الجامعة': '/dashboard/president',
    'مسؤول التوظيف': '/dashboard/employment',
    'الأمين العام': '/dashboard/secretary',
    'رئيس مجلس الأمناء': '/dashboard/board-chairman',
    'مقدم طلب الشراء': '/dashboard/requester',
    'المدير المالي': '/dashboard/finance',
    'المراجع': '/dashboard/auditor',
    'الحسابات': '/dashboard/accounts',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "فشل تسجيل الدخول",
        description: "يرجى التأكد من البيانات المدخلة",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // تخزين token والمستخدم
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: `مرحباً بك، ${data.user.name}`,
        });
        
        // توجيه المستخدم حسب دوره
        const redirectPath = roleRoutes[data.user.role] || "/dashboard";
        setLocation(redirectPath);
      } else {
        toast({
          title: "فشل تسجيل الدخول",
          description: data.error || "اسم المستخدم أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الاتصال",
        description: error.message || "حدث خطأ في الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-md shadow-xl border-primary/10">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بيانات الاعتماد الخاصة بك للوصول إلى النظام</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2 text-right">
                <Label htmlFor="username">اسم المستخدم</Label>
                <div className="relative">
                  <Input 
                    id="username" 
                    placeholder="أدخل اسم المستخدم" 
                    className={`text-right h-12 pl-10 ${errors.username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors({...errors, username: undefined});
                    }}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                </div>
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
              </div>
              
              <div className="space-y-2 text-right">
                <div className="flex justify-between items-center">
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    نسيت كلمة المرور؟
                  </Link>
                  <Label htmlFor="password">كلمة المرور</Label>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    className={`text-right h-12 pl-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({...errors, password: undefined});
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>
              
              <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? "جاري الدخول..." : "دخول"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 bg-slate-50/50 rounded-b-xl">
            {/* <p className="text-sm text-slate-600">
              ليس لديك حساب؟ {" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                أنشئ حساباً جديداً
              </Link>
            </p> */}
            <Link href="/forgot-password" className="text-sm text-primary hover:underline text-center block mt-4">
  نسيت كلمة المرور؟
</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}