import { Link, useLocation } from "wouter";
import { ShieldCheck, FileText, LayoutDashboard, Menu, PenTool, ChevronDown, User, BarChart3, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string>("");

  // ✅ صلاحية إنشاء الوثائق (من يمكنه رؤية زر "توقيع وثيقة")
  const canCreateDocument = (role: string): boolean => {
    const createPermissions = [
      "شؤون الخريجين",
      "مسؤول التوظيف",
      "الأمين العام",
      "رئيس الجامعة",
      "مقدم طلب الشراء"
    ];
    return createPermissions.includes(role);
  };

  // التحقق من حالة تسجيل الدخول عند تحميل الصفحة
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!token);
    if (user) {
      const parsedUser = JSON.parse(user);
      setCurrentUser(parsedUser);
      // استخراج الدور من URL أو من localStorage
      const pathParts = location.split('/');
      const roleFromUrl = pathParts[pathParts.length - 1];
      // تحويل الدور إلى الصيغة المناسبة
      const roleMap: Record<string, string> = {
        "Graduate-Affairs": "شؤون الخريجين",
        "College-Registrar": "مسجل الكلية",
        "Dean": "عميد الكلية",
        "General-Registrar": "المسجل العام",
        "University-President": "رئيس الجامعة",
        "Employment-Officer": "مسؤول التوظيف",
        "Secretary-General": "الأمين العام",
        "Board-Chairman": "رئيس مجلس الأمناء",
        "Requester": "مقدم طلب الشراء",
        "Financial-Manager": "المدير المالي",
        "Auditor": "المراجع",
        "Accounts": "الحسابات"
      };
      
      // العثور على الدور الحالي
      let role = parsedUser.role;
      for (const [eng, arb] of Object.entries(roleMap)) {
        if (roleFromUrl === eng || roleFromUrl === arb) {
          role = arb;
          break;
        }
      }
      setCurrentRole(role);
    }
  }, [location]);

  // الصفحات التي لا تظهر فيها التبويبات
  const hideNavPages = ["/login", "/register"];
  const shouldHideNav = hideNavPages.includes(location);

  // وظيفة تسجيل الخروج
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentRole("");
    setLocation("/login");
  };

  // الحصول على مسار لوحة التحكم الصحيح
  const getDashboardPath = () => {
    if (!currentUser) return "/dashboard";
    
    // ✅ إذا كان المستخدم أدمن، يذهب إلى صفحة إدارة المستخدمين
    if (currentUser.role === "مدير النظام") {
      return "/admin";
    }
    
    // تحويل الدور العربي إلى الإنجليزي للمسار
    const roleMapReverse: Record<string, string> = {
      "شؤون الخريجين": "Graduate-Affairs",
      "مسجل الكلية": "College-Registrar",
      "عميد الكلية": "Dean",
      "المسجل العام": "General-Registrar",
      "رئيس الجامعة": "University-President",
      "مسؤول التوظيف": "Employment-Officer",
      "الأمين العام": "Secretary-General",
      "رئيس مجلس الأمناء": "Board-Chairman",
      "مقدم طلب الشراء": "Requester",
      "المدير المالي": "Financial-Manager",
      "المراجع": "Auditor",
      "الحسابات": "Accounts"
    };
    
    const englishRole = roleMapReverse[currentRole] || currentUser.role;
    return `/dashboard/${englishRole}`;
  };

  // بناء قائمة التبويبات ديناميكياً
  const getNavItems = () => {
    const items: { href: string; label: string; icon: any }[] = [];
    
    // ✅ زر "توقيع وثيقة" - يظهر فقط للمستخدمين المصرح لهم
    if (isLoggedIn && canCreateDocument(currentUser?.role)) {
      items.push({ href: "/sign", label: "توقيع وثيقة", icon: PenTool });
    }
    
    // ✅ زر "تحقق من وثيقة" - يظهر للجميع
    items.push({ href: "/verify", label: "تحقق من وثيقة", icon: FileText });
    
    // ✅ زر "التقارير" - لا يظهر للأدمن
    if (isLoggedIn && currentUser?.role !== "مدير النظام") {
      items.push({ href: "/reports", label: "التقارير", icon: BarChart3 });
    }
    
    return items;
  };

  const navItems = getNavItems();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={isLoggedIn ? getDashboardPath() : "/"} className="flex items-center gap-2 font-bold text-2xl text-primary hover:opacity-90 transition-opacity">
          <ShieldCheck className="h-8 w-8" />
          <span>TrustDoc</span>
        </Link>

        {/* Desktop Nav - يظهر فقط إذا لم نكن في صفحات التسجيل/الدخول */}
        {!shouldHideNav && (
          <div className="hidden md:flex items-center gap-6">
            {/* التبويبات */}
            {isLoggedIn && navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === item.href
                    ? "text-primary font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {/* ✅ زر لوحة التحكم - يظهر للجميع (بدون قائمة الأدوار) */}
            {isLoggedIn && (
              <Link 
                href={getDashboardPath()}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === getDashboardPath()
                    ? "text-primary font-bold"
                    : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 inline ml-1" />
                لوحة التحكم
              </Link>
            )}

            {/* عرض اسم المستخدم وتسجيل الخروج */}
            {isLoggedIn && currentUser && (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{currentUser.name}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="font-bold gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل خروج
                </Button>
              </div>
            )}

            {/* زر تسجيل الدخول - يظهر فقط عندما لا يكون المستخدم مسجلاً */}
            {!isLoggedIn && (
              <Button 
                size="sm" 
                className="font-bold"
                onClick={() => setLocation("/login")}
              >
                تسجيل الدخول
              </Button>
            )}
          </div>
        )}

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {!shouldHideNav && (
                  <>
                    {isLoggedIn && navItems.map((item) => (
                      <Link 
                        key={item.href} 
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary ${
                          location === item.href
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    ))}
                    
                    {isLoggedIn && currentUser && (
                      <Link 
                        href={getDashboardPath()}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary ${
                          location === getDashboardPath()
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        لوحة التحكم
                      </Link>
                    )}
                    
                    {isLoggedIn && currentUser && (
                      <>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">{currentUser.name}</span>
                        </div>
                        <Button 
                          variant="outline"
                          className="w-full gap-2 text-red-600 border-red-200"
                          onClick={() => {
                            handleLogout();
                            setIsOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          تسجيل خروج
                        </Button>
                      </>
                    )}

                    {!isLoggedIn && (
                      <Button 
                        className="w-full font-bold"
                        onClick={() => {
                          setLocation("/login");
                          setIsOpen(false);
                        }}
                      >
                        تسجيل الدخول
                      </Button>
                    )}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}