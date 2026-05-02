import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExternalSign() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [document, setDocument] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        // ✅ تصحيح المسار: إضافة /api/documents
        const response = await fetch(`http://localhost:3000/api/documents/external/invitation/${token}`);
        const data = await response.json();
        
        console.log("API Response:", data); // للتتبع
        
        if (response.ok && data.isValid) {
          setInvitation(data.invitation);
          setDocument(data.document);
          setError(null);
        } else {
          setError(data.message || "الرابط غير صالح");
        }
      } catch (error) {
        console.error("Error fetching invitation:", error);
        setError("حدث خطأ في الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    };
    
    if (token) fetchInvitation();
  }, [token, toast]);

  const handleSign = async () => {
    setSigning(true);
    try {
      // ✅ تصحيح المسار: إضافة /api/documents
      const response = await fetch(`http://localhost:3000/api/documents/external/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ 
          title: "✅ تم التوقيع بنجاح", 
          description: "شكراً لتوقيعك على المستند. سيتم توجيهك للصفحة الرئيسية خلال ثوانٍ.",
          duration: 5000,
        });
        setTimeout(() => setLocation("/"), 3000);
      } else {
        throw new Error(data.error || "فشل في التوقيع");
      }
    } catch (error: any) {
      console.error("Sign error:", error);
      toast({ 
        title: "❌ خطأ", 
        description: error.message || "حدث خطأ أثناء التوقيع", 
        variant: "destructive" 
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">رابط غير صالح</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation || !document) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">رابط غير صالح</h2>
            <p className="text-muted-foreground">لم يتم العثور على بيانات هذا الرابط.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">توقيع مستند إلكتروني</CardTitle>
          <p className="text-muted-foreground">الرجاء مراجعة بيانات المستند قبل التوقيع</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="font-bold text-lg">📄 المستند: {document.title}</p>
            <p className="text-sm text-muted-foreground">نوع المستند: {document.type === 'contract' ? 'عقد' : document.type === 'certificate' ? 'شهادة' : 'فاتورة'}</p>
          </div>
          
          <div className="p-4 bg-blue-50/30 rounded-lg border border-blue-200">
            <p className="font-bold text-blue-700">📧 بياناتك</p>
            <p>البريد الإلكتروني: {invitation.inviteeEmail}</p>
            {invitation.inviteeName && <p>الاسم: {invitation.inviteeName}</p>}
            {invitation.inviteeOrganization && <p>الجهة: {invitation.inviteeOrganization}</p>}
          </div>
          
          <Button 
            onClick={handleSign} 
            disabled={signing} 
            className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
          >
            {signing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
                جاري التوقيع...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 ml-2" />
                توقيع المستند
              </>
            )}
          </Button>
          
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>⚠️ بالضغط على "توقيع المستند"، فإنك توافق على محتوى هذا المستند.</p>
            <p>🔒 سيتم تسجيل توقيعك وتاريخه وعنوان IP الخاص بك لأغراض التوثيق.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}