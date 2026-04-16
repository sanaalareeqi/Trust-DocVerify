import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, AlertCircle, FileCheck, Loader2, Download } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface SignatureLog {
  signerRole: string;
  timestamp: string;
  action: string;
  comment: string;
  hash?: string;
  documentHash?: string;
}

interface VerificationResult {
  isValid: boolean;
  signer?: string;
  signedAt?: string;
  documentHash?: string;
  message?: string;
}

export default function Verify() {
  const [docId, setDocId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [signatureLogs, setSignatureLogs] = useState<SignatureLog[]>([]);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return;
    
    setStatus("loading");
    setVerificationResult(null);
    setSignatureLogs([]);

    try {
      const token = localStorage.getItem("token");
      
      // 1. التحقق من صحة التوقيع
      const verifyResponse = await fetch(`http://localhost:3000/api/documents/${docId}/verify-signature`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const verifyData = await verifyResponse.json();
      
      // 2. جلب سجل التوقيعات
      const logsResponse = await fetch(`http://localhost:3000/api/documents/${docId}/signatures`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setSignatureLogs(logsData);
      }
      
      if (verifyData.isValid) {
        setStatus("valid");
        setVerificationResult(verifyData);
      } else {
        setStatus("invalid");
        setVerificationResult(verifyData);
      }
      
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحقق من الوثيقة",
        variant: "destructive",
      });
      setStatus("invalid");
    }
  };

  const exportSignatureLog = () => {
    try {
      // @ts-ignore
      const { default: jsPDF } = require("jspdf");
      // @ts-ignore
      require("jspdf-autotable");
      
      // @ts-ignore
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text("TrustDoc - Signature Log Report", 40, 40);
      
      doc.setFontSize(12);
      doc.text(`Document ID: ${docId}`, 40, 70);
      doc.text(`Document Type: Certificate`, 40, 90);
      doc.text(`Export Date: ${new Date().toLocaleString()}`, 40, 110);
      
      const tableColumn = ["Role", "Date", "Status", "Comments"];
      const tableRows: any[] = [];
      
      signatureLogs.forEach(log => {
        const rowData = [
          log.signerRole || "غير معروف",
          new Date(log.timestamp).toLocaleString('ar-EG'),
          log.action === "signed" ? "موقع" : log.action === "returned" ? "معاد" : "مرفوض",
          log.comment || "-"
        ];
        tableRows.push(rowData);
      });
      
      // @ts-ignore
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 130,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      doc.save(`signature-log-${docId}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "خطأ", description: "فشل في تصدير PDF", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 font-sans">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold text-foreground">التحقق من صحة الوثيقة</h1>
          <p className="text-muted-foreground text-lg">
            أدخل الرقم المرجعي للوثيقة للتحقق من صحتها والتوقيعات الرقمية المرتبطة بها.
          </p>
        </div>

        <Card className="shadow-lg border-primary/10 overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <CardContent className="p-8">
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2 text-right">
                <Label htmlFor="docId" className="text-lg">رقم الوثيقة المرجعي</Label>
                <div className="relative">
                  <Input 
                    id="docId"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    placeholder="أدخل رقم الوثيقة (مثال: 13)"
                    className="h-14 text-lg px-4 text-right dir-rtl font-mono border-2 focus-visible:ring-primary/20 transition-all"
                    style={{ direction: 'ltr', textAlign: 'right' }} 
                  />
                  <FileCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-6 w-6" />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold rounded-xl"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  <>
                    <Search className="ml-2 h-5 w-5" />
                    تحقق الآن
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {status === "valid" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8"
            >
              <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-900/10">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">✅ وثيقة سليمة وموثقة</h3>
                  <p className="text-muted-foreground max-w-md">
                    هذه الوثيقة مسجلة في نظام TrustDoc وتم التحقق من توقيعها الرقمي بنجاح.
                  </p>
                  
                  {verificationResult && (
                    <div className="grid grid-cols-2 gap-4 w-full mt-6 bg-background/50 p-6 rounded-xl border">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">الموقع</p>
                        <p className="font-semibold">{verificationResult.signer || "غير معروف"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">تاريخ التوقيع</p>
                        <p className="font-semibold font-mono">
                          {verificationResult.signedAt ? new Date(verificationResult.signedAt).toLocaleString("ar-EG") : "-"}
                        </p>
                      </div>
                      <div className="text-right col-span-2">
                        <p className="text-xs text-muted-foreground">بصمة الوثيقة (جزء)</p>
                        <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                          {verificationResult.documentHash || "-"}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {signatureLogs.length > 0 && (
                    <div className="w-full pt-4 mt-2 border-t">
                      <h4 className="font-bold mb-3 text-right">سجل التوقيعات</h4>
                      <div className="space-y-2 text-right">
                        {signatureLogs.map((log, idx) => (
                          <div key={idx} className="bg-muted/30 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString("ar-EG")}
                              </span>
                              <span className="font-bold">{log.signerRole}</span>
                            </div>
                            <p className="text-sm mt-1">{log.comment || "تم التوقيع"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="w-full pt-4 mt-2 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5"
                      onClick={exportSignatureLog}
                      disabled={signatureLogs.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      تصدير سجل التوقيعات (PDF)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "invalid" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8"
            >
              <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-900/10">
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-red-700 dark:text-red-400">❌ وثيقة غير موثقة</h3>
                  <p className="text-muted-foreground max-w-md">
                    {verificationResult?.message || "لم يتم العثور على سجل لهذه الوثيقة في النظام. يرجى التأكد من الرقم والمحاولة مرة أخرى."}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}