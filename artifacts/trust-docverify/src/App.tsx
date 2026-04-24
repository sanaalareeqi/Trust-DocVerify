import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Verify from "@/pages/Verify";
import Dashboard from "@/pages/Dashboard";
import RoleDashboard from "@/pages/RoleDashboard";
import SignDocument from "@/pages/SignDocument";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Reports from "@/pages/Reports";
import ExternalSign from "@/pages/ExternalSign";
import AdminUsers from "@/pages/AdminUsers";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import { ReactNode, useEffect, useState } from "react";

// ✅ مكون حماية المسارات
function ProtectedRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    // التحقق من وجود token
    if (!token) {
      setLocation("/login");
      return;
    }

    // التحقق من وجود بيانات المستخدم
    if (!userStr) {
      localStorage.removeItem("token");
      setLocation("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // التحقق من صلاحيات الدور (إذا تم تحديدها)
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
          setLocation("/login");
          return;
        }
      }
      
      setIsAuthorized(true);
    } catch (error) {
      console.error("Error parsing user:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setLocation("/login");
    }
  }, [setLocation, allowedRoles]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}

// ✅ مكون حماية لوحة التحكم حسب الدور
function ProtectedRoleDashboard({ role }: { role: string }) {
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      setLocation("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // خريطة الأدوار الإنجليزية إلى العربية
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
      
      const expectedRole = roleMap[role];
      
      // التحقق أن المستخدم له نفس الدور المطلوب أو هو أدمن
      if (user.role !== expectedRole && user.role !== "مدير النظام") {
        setLocation("/login");
        return;
      }
      
      setIsAuthorized(true);
    } catch (error) {
      setLocation("/login");
    }
  }, [role, setLocation]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthorized ? <RoleDashboard params={{ role }} /> : null;
}

function Router() {
  return (
    <Switch>
      {/* الصفحات العامة (بدون حماية) */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify" component={Verify} />
      <Route path="/verify/:id" component={Verify} />
      
      {/* ✅ صفحات استعادة كلمة المرور (بدون حماية) */}
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* صفحة التوقيع الخارجي (بدون حماية) */}
      <Route path="/external-sign/:token" component={ExternalSign} />
      
      {/* ✅ الصفحات المحمية (تتطلب تسجيل دخول) */}
      
      {/* صفحة إدارة المستخدمين (للأدمن فقط) */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["مدير النظام"]}>
          <AdminUsers />
        </ProtectedRoute>
      </Route>
      
      {/* صفحة إنشاء وثيقة جديدة (للأدمن فقط) */}
      <Route path="/sign">
        <ProtectedRoute allowedRoles={["مدير النظام"]}>
          <SignDocument />
        </ProtectedRoute>
      </Route>
      
      {/* صفحة التقارير (لجميع المستخدمين المسجلين) */}
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      
      {/* لوحة التحكم العامة */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      {/* لوحات التحكم حسب الدور (مع حماية الدور) */}
      <Route path="/dashboard/graduate-affairs">
        <ProtectedRoleDashboard role="Graduate-Affairs" />
      </Route>
      <Route path="/dashboard/college-registrar">
        <ProtectedRoleDashboard role="College-Registrar" />
      </Route>
      <Route path="/dashboard/dean">
        <ProtectedRoleDashboard role="Dean" />
      </Route>
      <Route path="/dashboard/general-registrar">
        <ProtectedRoleDashboard role="General-Registrar" />
      </Route>
      <Route path="/dashboard/president">
        <ProtectedRoleDashboard role="University-President" />
      </Route>
      <Route path="/dashboard/employment">
        <ProtectedRoleDashboard role="Employment-Officer" />
      </Route>
      <Route path="/dashboard/secretary">
        <ProtectedRoleDashboard role="Secretary-General" />
      </Route>
      <Route path="/dashboard/board-chairman">
        <ProtectedRoleDashboard role="Board-Chairman" />
      </Route>
      <Route path="/dashboard/requester">
        <ProtectedRoleDashboard role="Requester" />
      </Route>
      <Route path="/dashboard/finance">
        <ProtectedRoleDashboard role="Financial-Manager" />
      </Route>
      <Route path="/dashboard/auditor">
        <ProtectedRoleDashboard role="Auditor" />
      </Route>
      <Route path="/dashboard/accounts">
        <ProtectedRoleDashboard role="Accounts" />
      </Route>
      
      {/* صفحة 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter>
          <Router />
          <Toaster />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;