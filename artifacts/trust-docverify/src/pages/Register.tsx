import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Lock, User, Mail, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// قائمة الأدوار المتاحة
const ROLES = [
  "مدير النظام",
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

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Password strength checker
  useEffect(() => {
    const checkStrength = (pass: string) => {
      let strength = 0;
      if (pass.length > 7) strength += 1;
      if (/[A-Z]/.test(pass) || /[a-z]/.test(pass)) strength += 1;
      if (/[0-9]/.test(pass)) strength += 1;
      if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
      return strength;
    };
    setPasswordStrength(checkStrength(formData.password));
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: "" }));
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = "الاسم الكامل مطلوب";
    
    if (!formData.email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
    
    if (!formData.username.trim()) newErrors.username = "اسم المستخدم مطلوب";
    
    if (!formData.role) newErrors.role = "الرجاء اختيار الدور";
    
    if (!formData.password) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else if (passwordStrength < 3) {
      newErrors.password = "كلمة المرور ضعيفة (يجب أن تحتوي على حروف وأرقام ورموز)";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "كلمات المرور غير متطابقة";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    toast({
      title: "خطأ في التسجيل",
      description: "يرجى التحقق من البيانات المدخلة",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);

  try {
    const response = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: formData.username,
        password: formData.password,
        name: formData.fullName,
        role: formData.role
      }),
    });

    const data = await response.json();

    if (response.ok) {
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "يمكنك الآن تسجيل الدخول بحسابك",
      });
      
      setTimeout(() => {
        setLocation("/login");
      }, 1500);
    } else {
      toast({
        title: "خطأ في التسجيل",
        description: data.error || "حدث خطأ، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  } catch (error: any) {
    toast({
      title: "خطأ في التسجيل",
      description: error.message || "حدث خطأ في الاتصال بالخادم",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return "bg-slate-200";
      case 1: return "bg-red-500";
      case 2: return "bg-amber-500";
      case 3: return "bg-emerald-500";
      case 4: return "bg-emerald-600";
      default: return "bg-slate-200";
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 0: return "";
      case 1: return "ضعيفة جداً";
      case 2: return "متوسطة";
      case 3: return "جيدة";
      case 4: return "قوية";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-lg shadow-xl border-primary/10">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <User className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
            <CardDescription>انضم إلى منصة TrustDoc للتوثيق الرقمي الآمن</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2 text-right">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input 
                  id="fullName" 
                  placeholder="أدخل اسمك الكامل" 
                  className={`text-right h-12 ${errors.fullName ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  value={formData.fullName}
                  onChange={handleChange}
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@company.com" 
                    className={`text-right h-12 pl-10 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={formData.email}
                    onChange={handleChange}
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="username">اسم المستخدم</Label>
                <div className="relative">
                  <Input 
                    id="username" 
                    placeholder="اسم مستخدم فريد" 
                    className={`text-right h-12 pl-10 ${errors.username ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={formData.username}
                    onChange={handleChange}
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                </div>
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
              </div>

              <div className="space-y-2 text-right">
                <Label>الدور الوظيفي</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className={`h-12 ${errors.role ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="اختر دورك في النظام" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
              </div>
              
              <div className="space-y-2 text-right">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    className={`text-right h-12 pl-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={formData.password}
                    onChange={handleChange}
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full">
                      {[1, 2, 3, 4].map((level) => (
                        <div 
                          key={level} 
                          className={`h-full flex-1 transition-colors ${passwordStrength >= level ? getStrengthColor() : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs items-center">
                      <span className={`font-medium ${passwordStrength >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {getStrengthText()}
                      </span>
                      <span className="text-slate-500">حروف وأرقام ورموز</span>
                    </div>
                  </div>
                )}
                
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2 text-right">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showPassword ? "text" : "password"} 
                    className={`text-right h-12 pl-10 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                  {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 bg-slate-50/50 rounded-b-xl">
            <p className="text-sm text-slate-600">
              لديك حساب بالفعل؟ {" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                سجل دخولك هنا
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}