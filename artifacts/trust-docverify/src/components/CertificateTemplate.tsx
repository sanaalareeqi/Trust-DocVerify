import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Shield, Calendar, GraduationCap, MapPin } from "lucide-react";

interface CertificateData {
  id: number;
  student_name_ar: string;
  student_name_en: string;
  nationality_ar: string;
  nationality_en: string;
  birthplace_ar: string;
  birthplace_en: string;
  birth_year: number;
  college_ar: string;
  college_en: string;
  request_date: string;
}

interface CertificateTemplateProps {
  data: CertificateData;
  onSendToWorkflow: () => void;
  isSending?: boolean;
}

export default function CertificateTemplate({ data, onSendToWorkflow, isSending = false }: CertificateTemplateProps) {
  const currentDate = new Date().toLocaleDateString("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-2xl border border-blue-200 max-w-4xl mx-auto" dir="rtl">
      {/* الهيكل الخارجي للشهادة */}
      <div className="relative">
        {/* الإطار الزخرفي */}
        <div className="absolute inset-0 border-4 border-double border-amber-600/30 rounded-xl pointer-events-none" />
        <div className="absolute inset-2 border border-amber-600/20 rounded-lg pointer-events-none" />
        
        {/* محتوى الشهادة */}
        <div className="relative z-10 p-8">
          {/* الشعار */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-3">
              <GraduationCap className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-blue-800">شهادة تخرج</h1>
            <h2 className="text-xl text-blue-600">Graduate Certificate</h2>
            <div className="w-24 h-0.5 bg-amber-500 mx-auto mt-2" />
          </div>

          {/* نص الشهادة */}
          <div className="text-center space-y-6 my-8">
            <p className="text-lg text-gray-700">تشهد جامعة</p>
            <p className="text-2xl font-bold text-blue-800">Trust DocVerify</p>
            <p className="text-lg text-gray-700">بأن</p>
            
            <div>
              <h3 className="text-3xl font-bold text-amber-700">{data.student_name_ar}</h3>
              <p className="text-xl text-gray-500">{data.student_name_en}</p>
            </div>
            
            <p className="text-lg text-gray-700">
              قد استوفى متطلبات التخرج في
            </p>
            
            <div>
              <h4 className="text-xl font-semibold text-blue-700">{data.college_ar}</h4>
              <p className="text-gray-500">{data.college_en}</p>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <MapPin className="h-4 w-4 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600">مكان الميلاد</p>
              <p className="font-medium">{data.birthplace_ar}</p>
              <p className="text-xs text-gray-400">{data.birthplace_en}</p>
            </div>
            <div className="text-center">
              <Calendar className="h-4 w-4 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600">سنة الميلاد</p>
              <p className="font-medium">{data.birth_year}</p>
            </div>
            <div className="text-center">
              <Shield className="h-4 w-4 text-gray-400 mx-auto mb-1" />
              <p className="text-sm text-gray-600">الجنسية</p>
              <p className="font-medium">{data.nationality_ar}</p>
              <p className="text-xs text-gray-400">{data.nationality_en}</p>
            </div>
          </div>

          {/* التواريخ والتوقيع */}
          <div className="flex justify-between items-end mt-8 pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-gray-500">تاريخ الإصدار</p>
              <p className="font-medium">{currentDate}</p>
            </div>
            <div className="text-center">
              <div className="w-48 h-0.5 bg-gray-300 mb-1" />
              <p className="text-sm text-gray-500">توقيع رئيس الجامعة</p>
            </div>
            <div className="text-left">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <Shield className="h-3 w-3 ml-1" />
                موثقة بتقنية Blockchain
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* زر إرسال للتوقيع */}
      <div className="flex justify-center mt-8">
        <Button
          onClick={onSendToWorkflow}
          disabled={isSending}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
        >
          {isSending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {isSending ? "جاري الإرسال..." : "📜 إرسال للتوثيق والتوقيع"}
        </Button>
      </div>
    </div>
  );
}