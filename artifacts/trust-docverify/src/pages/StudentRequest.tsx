import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, CheckCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const COLLEGES = [
  { ar: "كلية علوم الحاسوب", en: "Faculty of Computer Science" },
  { ar: "كلية الهندسة", en: "Faculty of Engineering" },
  { ar: "كلية إدارة الأعمال", en: "Faculty of Business Administration" },
];

export default function StudentRequest() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeLang, setActiveLang] = useState<"ar" | "en">("ar");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    student_name_ar: "",
    student_name_en: "",
    nationality_ar: "",
    nationality_en: "",
    birthplace_ar: "",
    birthplace_en: "",
    birth_year: "",
    college_ar: "",
    college_en: "",
  });

  // ✅ دالة بسيطة للتغيير - بدون ترجمة تلقائية
  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
  // ✅ التحقق من الحقول المطلوبة
  const requiredFields = [
    formData.student_name_ar,
    formData.student_name_en,
    formData.nationality_ar,
    formData.nationality_en,
    formData.birthplace_ar,
    formData.birthplace_en,
    formData.birth_year,
    formData.college_ar,
    formData.college_en,
  ];

  if (requiredFields.some(field => !field)) {
    toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" });
    return;
  }

  if (parseInt(formData.birth_year) < 1950 || parseInt(formData.birth_year) > new Date().getFullYear()) {
    toast({ title: "خطأ", description: "سنة الميلاد غير صحيحة", variant: "destructive" });
    return;
  }

  setIsSubmitting(true);

  try {
    const response = await fetch("http://localhost:3000/api/certificate-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      setShowSuccess(true);
      toast({ title: "✅ تم الإرسال", description: "تم إرسال طلب الشهادة بنجاح" });
      
      // ✅ بعد 3 ثواني، إعادة تعيين النموذج وإخفاء رسالة النجاح
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          student_name_ar: "",
          student_name_en: "",
          nationality_ar: "",
          nationality_en: "",
          birthplace_ar: "",
          birthplace_en: "",
          birth_year: "",
          college_ar: "",
          college_en: "",
        });
      }, 3000);
    } else {
      const error = await response.json();
      throw new Error(error.error || "فشل في إرسال الطلب");
    }
  } catch (error: any) {
    toast({ title: "خطأ", description: error.message, variant: "destructive" });
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <FileText className="h-6 w-6" />
              طلب شهادة جامعية
            </CardTitle>
            <p className="text-muted-foreground">يرجى تعبئة البيانات التالية لطلب الشهادة</p>
          </CardHeader>
          <CardContent>
            {showSuccess ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">تم إرسال طلبك بنجاح!</h2>
                <p className="text-muted-foreground">سيتم مراجعة طلبك من قبل شؤون الخريجين وسيتم إشعارك عند الموافقة.</p>
              </div>
            ) : (
              <>
                {/* تبديل اللغة */}
                <div className="flex justify-center mb-6">
                  <Tabs value={activeLang} onValueChange={(v) => setActiveLang(v as "ar" | "en")} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="ar">العربية</TabsTrigger>
                      <TabsTrigger value="en">English</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* الاسم */}
                  <div>
                    <Label className="text-right block mb-2">الاسم الكامل {activeLang === "ar" ? "(بالعربية)" : "(in Arabic)"}</Label>
                    <Input
                      value={formData.student_name_ar}
                      onChange={(e) => handleChange("student_name_ar", e.target.value)}
                      placeholder="أدخل الاسم الكامل بالعربية"
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label className="text-right block mb-2">Full Name {activeLang === "en" ? "(in English)" : "(بالإنجليزية)"}</Label>
                    <Input
                      value={formData.student_name_en}
                      onChange={(e) => handleChange("student_name_en", e.target.value)}
                      placeholder="Enter full name in English"
                      className="text-right"
                    />
                  </div>

                  {/* الجنسية - إدخال يدوي */}
                  <div>
                    <Label className="text-right block mb-2">الجنسية</Label>
                    <Input
                      value={formData.nationality_ar}
                      onChange={(e) => handleChange("nationality_ar", e.target.value)}
                      placeholder="أدخل الجنسية بالعربية"
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label className="text-right block mb-2">Nationality</Label>
                    <Input
                      value={formData.nationality_en}
                      onChange={(e) => handleChange("nationality_en", e.target.value)}
                      placeholder="Enter nationality in English"
                      className="text-right"
                    />
                  </div>

                  {/* مكان الميلاد */}
                  <div>
                    <Label className="text-right block mb-2">مكان الميلاد</Label>
                    <Input
                      value={formData.birthplace_ar}
                      onChange={(e) => handleChange("birthplace_ar", e.target.value)}
                      placeholder="مثال: مكة المكرمة"
                      className="text-right"
                    />
                  </div>
                  <div>
                    <Label className="text-right block mb-2">Place of Birth</Label>
                    <Input
                      value={formData.birthplace_en}
                      onChange={(e) => handleChange("birthplace_en", e.target.value)}
                      placeholder="Example: Mecca"
                      className="text-right"
                    />
                  </div>

                  {/* سنة الميلاد */}
                  <div>
                    <Label className="text-right block mb-2">سنة الميلاد</Label>
                    <Input
                      type="number"
                      value={formData.birth_year}
                      onChange={(e) => handleChange("birth_year", e.target.value)}
                      placeholder="مثال: 1995"
                      className="text-right"
                      min="1950"
                      max={new Date().getFullYear()}
                    />
                  </div>

                  {/* الكلية */}
                  <div>
                    <Label className="text-right block mb-2">الكلية</Label>
                    <Select value={formData.college_ar} onValueChange={(v) => {
                      setFormData(prev => ({ ...prev, college_ar: v }));
                      const en = COLLEGES.find(c => c.ar === v)?.en || "";
                      setFormData(prev => ({ ...prev, college_en: en }));
                    }}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر الكلية" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGES.map(c => (
                          <SelectItem key={c.ar} value={c.ar} className="text-right">{c.ar}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-right block mb-2">College</Label>
                    <Input 
                      value={formData.college_en} 
                      onChange={(e) => handleChange("college_en", e.target.value)}
                      placeholder="Enter college name in English"
                      className="text-right"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full mt-6 gap-2"
                  size="lg"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {isSubmitting ? "جاري الإرسال..." : "إرسال طلب الشهادة"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}