import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // جلب المستخدم من localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      
      // تحويل الدور العربي إلى الإنجليزي للمسار
      const roleMap: Record<string, string> = {
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
      
      const englishRole = roleMap[user.role] || user.role;
      setLocation(`/dashboard/${englishRole}`);
    } else {
      // إذا لم يكن هناك مستخدم مسجل، اذهب إلى صفحة تسجيل الدخول
      setLocation("/login");
    }
  }, [setLocation]);

  // عرض مؤشر تحميل أثناء إعادة التوجيه
  return (
    <div className="flex justify-center items-center h-screen bg-muted/20">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">جاري التوجيه إلى لوحة التحكم...</p>
      </div>
    </div>
  );
}