import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, AlertCircle, FileCheck, Loader2, Download, ExternalLink, Upload } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import CryptoJS from "crypto-js";


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
  blockchainTxUrl?: string;
}

export default function Verify() {
  const [docId, setDocId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [signatureLogs, setSignatureLogs] = useState<SignatureLog[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isVerifyingFile, setIsVerifyingFile] = useState(false);
  const { toast } = useToast();

  // حساب Hash الملف
  const calculateFileHash = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
        const hash = CryptoJS.SHA256(wordArray).toString();
        resolve(hash);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // دالة التحقق الأساسية
  const performVerification = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      
      const docResponse = await fetch(`http://localhost:3000/api/documents/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const docData = await docResponse.json();
      
      const verifyResponse = await fetch(`http://localhost:3000/api/documents/${id}/verify-signature`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const verifyData = await verifyResponse.json();
      
      const logsResponse = await fetch(`http://localhost:3000/api/documents/${id}/signatures`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setSignatureLogs(logsData);
      }
      
      if (verifyData.isValid) {
        setStatus("valid");
        setVerificationResult({
          ...verifyData,
          blockchainTxUrl: docData.blockchainTxUrl
        });
      } else {
        setStatus("invalid");
        setVerificationResult({
          ...verifyData,
          blockchainTxUrl: docData.blockchainTxUrl
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("invalid");
    }
  };

  // التحقق عن طريق رفع الملف فقط (تم حذف التحقق بالرقم)
  const handleFileVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setIsVerifyingFile(true);
    setStatus("loading");
    setVerificationResult(null);
    setSignatureLogs([]);
    setDocId("");
    
    try {
      const fileHash = await calculateFileHash(file);
      console.log("File hash:", fileHash);
      
      const token = localStorage.getItem("token");
      
      const response = await fetch(`http://localhost:3000/api/documents/by-hash/${fileHash}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.ok) {
        const docData = await response.json();
        setDocId(docData.id.toString());
        await performVerification(docData.id);
      } else {
        toast({
          title: "لم يتم العثور على الوثيقة",
          description: "هذه الوثيقة غير مسجلة في النظام",
          variant: "destructive",
        });
        setStatus("invalid");
      }
    } catch (error) {
      console.error("File verification error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحقق من الملف",
        variant: "destructive",
      });
      setStatus("invalid");
    } finally {
      setIsVerifyingFile(false);
    }
  };

  const exportSignatureLog = () => {
    try {
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      
      if (!jsPDF) {
        console.error("jsPDF not loaded");
        toast({ title: "خطأ", description: "مكتبة PDF غير متاحة", variant: "destructive" });
        return;
      }
      
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text("TrustDoc - Signature Log Report", 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Document ID: ${docId}`, 20, 40);
      doc.text(`Export Date: ${new Date().toLocaleString()}`, 20, 50);
      
      let yPos = 70;
      signatureLogs.forEach((log, index) => {
        doc.text(`${index + 1}. ${log.signerRole || "غير معروف"}`, 20, yPos);
        doc.text(`   التاريخ: ${new Date(log.timestamp).toLocaleString('ar-EG')}`, 20, yPos + 8);
        doc.text(`   الحالة: ${log.action === "signed" ? "موقع" : log.action === "returned" ? "معاد" : "مرفوض"}`, 20, yPos + 16);
        doc.text(`   ملاحظات: ${log.comment || "-"}`, 20, yPos + 24);
        yPos += 40;
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      doc.save(`signature-log-${docId}.pdf`);
      toast({ title: "تم", description: "تم تصدير التقرير بنجاح" });
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
            ارفع الملف للتحقق من صحته والتوقيعات الرقمية المرتبطة به.
          </p>
        </div>

        <Card className="shadow-lg border-primary/10 overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <CardContent className="p-8">
            {/* طريقة رفع الملف فقط */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">رفع الوثيقة للتحقق</p>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                    ${uploadedFile ? "border-green-500 bg-green-50/30" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"}`}
                  onClick={() => document.getElementById("file-verify")?.click()}
                >
                  {uploadedFile ? (
                    <>
                      <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                      <p className="font-bold text-foreground text-lg">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-3 text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setStatus("idle");
                          setVerificationResult(null);
                          setSignatureLogs([]);
                        }}
                      >
                        إزالة الملف
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="font-bold text-lg">اسحب الملف هنا أو انقر للاختيار</p>
                      <p className="text-sm text-muted-foreground mt-2">PDF, PNG, JPG (حد أقصى 10MB)</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    id="file-verify" 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileVerify}
                    disabled={isVerifyingFile}
                  />
                </div>
                {isVerifyingFile && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">جاري التحقق من الملف...</span>
                  </div>
                )}
              </div>
            </div>
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
                  <h3 className="text-2xl font-bold text-green-700 dark:text-green-400"> وثيقة سليمة وموثقة</h3>
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
                      
                      {verificationResult.blockchainTxUrl && verificationResult.blockchainTxUrl.startsWith('http') && (
                        <div className="text-right col-span-2 mt-2 p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <ExternalLink className="h-3 w-3" />
                            تسجيل Blockchain
                          </p>
                          <a 
                            href={verificationResult.blockchainTxUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary text-sm font-mono break-all hover:underline flex items-center gap-1 justify-end"
                          >
                            عرض المعاملة على Etherscan
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {signatureLogs.length > 0 && (
                    <div className="w-full pt-4 mt-2 border-t">
                      <h4 className="font-bold mb-3 text-right">سجل التوقيعات</h4>
                      <div className="space-y-2 text-right max-h-80 overflow-y-auto">
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
                  <h3 className="text-2xl font-bold text-red-700 dark:text-red-400"> وثيقة غير موثقة</h3>
                  <p className="text-muted-foreground max-w-md">
                    {verificationResult?.message || "لم يتم العثور على سجل لهذه الوثيقة في النظام. يرجى رفع ملف صحيح."}
                  </p>
                  
                  {verificationResult?.blockchainTxUrl && verificationResult.blockchainTxUrl.startsWith('http') && (
                    <div className="w-full mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                      <p className="text-xs text-muted-foreground text-right">🔗 تسجيل Blockchain</p>
                      <a 
                        href={verificationResult.blockchainTxUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary text-sm font-mono break-all hover:underline text-right block"
                      >
                        عرض المعاملة على Etherscan
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}