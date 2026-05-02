import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, FileText, Loader2, Eye, Send } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import CertificateTemplate from "@/components/CertificateTemplate";

// ✅ ملاحظة: تم إزالة الاستيرادات المكررة

interface CertificateRequest {
  id: number;
  student_name_ar: string;
  student_name_en: string;
  nationality_ar: string;
  nationality_en: string;
  birthplace_ar: string;
  birthplace_en: string;
  birth_year: number;
  major_ar: string;
  major_en: string;
  college_ar: string;
  college_en: string;
  status: "pending" | "approved" | "rejected" | "issued";
  request_date: string;
  reviewed_by?: number;
  reviewed_at?: string;
  rejection_reason?: string;
  document_id?: number;
}

export default function GraduateAffairs() {
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CertificateRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<number | null>(null);
  
  // ✅ حالات جديدة لعرض الشهادة
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRequest | null>(null);
  const [isSendingToWorkflow, setIsSendingToWorkflow] = useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/certificate-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/certificate-requests/${requestId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({ title: "✅ تم الموافقة", description: "تمت الموافقة على الطلب بنجاح" });
        fetchRequests();
      } else {
        const error = await response.json();
        throw new Error(error.error || "فشل في الموافقة");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectRequestId) return;
    if (!rejectionReason) {
      toast({ title: "خطأ", description: "يرجى كتابة سبب الرفض", variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/certificate-requests/${rejectRequestId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        toast({ title: "❌ تم الرفض", description: "تم رفض الطلب" });
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        setRejectRequestId(null);
        fetchRequests();
      } else {
        const error = await response.json();
        throw new Error(error.error || "فشل في الرفض");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
  };

  const handleIssueCertificate = async (request: CertificateRequest) => {
    setIsIssuing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/certificate-requests/issue-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: request.id }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({ 
          title: "🎓 تم إصدار الشهادة", 
          description: `تم إصدار الشهادة بنجاح ومعرفها: ${data.documentId}` 
        });
        fetchRequests();
      } else {
        const error = await response.json();
        throw new Error(error.error || "فشل في إصدار الشهادة");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsIssuing(false);
    }
  };

  // ✅ دالة إرسال الشهادة للتوقيع
  const handleSendToWorkflow = async (request: CertificateRequest) => {
    setIsSendingToWorkflow(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/certificate-requests/send-to-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestId: request.id }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({ 
          title: "✅ تم الإرسال", 
          description: `تم إرسال الشهادة للتوقيع. رقم المستند: ${data.documentId}` 
        });
        setCertificateDialogOpen(false);
        fetchRequests();
      } else {
        const error = await response.json();
        throw new Error(error.error || "فشل في إرسال الشهادة");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSendingToWorkflow(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700">⏳ قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-700">✓ تمت الموافقة</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">✗ مرفوض</Badge>;
      case "issued":
        return <Badge className="bg-green-100 text-green-700">✅ تم الإصدار</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-right text-2xl">طلبات الشهادات - شؤون الخريجين</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">لا توجد طلبات حالياً</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right w-12">#</TableHead>
                      <TableHead className="text-right">اسم الطالب</TableHead>
                      <TableHead className="text-right">الكلية</TableHead>
                      <TableHead className="text-right">تاريخ الطلب</TableHead>
                      <TableHead className="text-right w-24">الحالة</TableHead>
                      <TableHead className="text-right w-64">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req, idx) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-right">{idx + 1}</TableCell>
                        <TableCell className="text-right font-medium">{req.student_name_ar}</TableCell>
                        <TableCell className="text-right">{req.college_ar}</TableCell>
                        <TableCell className="text-right">{new Date(req.request_date).toLocaleDateString("ar")}</TableCell>
                        <TableCell className="text-right">{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-start flex-wrap">
                            {/* زر عرض التفاصيل */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedRequest(req)}>
                                  <Eye className="h-4 w-4 ml-1" /> عرض
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl text-right" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>تفاصيل طلب الشهادة</DialogTitle>
                                </DialogHeader>
                                {selectedRequest && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="font-bold">الاسم (عربي):</Label>
                                        <div className="mt-1">{selectedRequest.student_name_ar}</div>
                                      </div>
                                      <div>
                                        <Label className="font-bold">الاسم (English):</Label>
                                        <div className="mt-1">{selectedRequest.student_name_en}</div>
                                      </div>
                                      <div>
                                        <Label className="font-bold">الجنسية:</Label>
                                        <div className="mt-1">{selectedRequest.nationality_ar}</div>
                                      </div>
                                      <div>
                                        <Label className="font-bold">مكان الميلاد:</Label>
                                        <div className="mt-1">{selectedRequest.birthplace_ar}</div>
                                      </div>
                                      <div>
                                        <Label className="font-bold">سنة الميلاد:</Label>
                                        <div className="mt-1">{selectedRequest.birth_year}</div>
                                      </div>
                                      <div>
                                        <Label className="font-bold">الكلية:</Label>
                                        <div className="mt-1">{selectedRequest.college_ar}</div>
                                      </div>
                                      <div>
                                        <Label className="font-bold">تاريخ الطلب:</Label>
                                        <div className="mt-1">{new Date(selectedRequest.request_date).toLocaleDateString("ar")}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            {req.status === "pending" && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req.id)}>
                                  <CheckCircle className="h-4 w-4 ml-1" /> موافقة
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                  setRejectRequestId(req.id);
                                  setIsRejectDialogOpen(true);
                                }}>
                                  <XCircle className="h-4 w-4 ml-1" /> رفض
                                </Button>
                              </>
                            )}

                            {req.status === "approved" && (
                              <>
                                {/* ✅ زر فتح المستند وعرض الشهادة */}
                                <Dialog open={certificateDialogOpen && selectedCertificate?.id === req.id} onOpenChange={(open) => {
                                  if (!open) setCertificateDialogOpen(false);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                                      setSelectedCertificate(req);
                                      setCertificateDialogOpen(true);
                                    }}>
                                      <Eye className="h-4 w-4" /> فتح المستند
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                                    <DialogHeader>
                                      <DialogTitle className="text-right">معاينة الشهادة</DialogTitle>
                                    </DialogHeader>
                                    {selectedCertificate && (
                                      <CertificateTemplate
                                        data={{
                                          id: selectedCertificate.id,
                                          student_name_ar: selectedCertificate.student_name_ar,
                                          student_name_en: selectedCertificate.student_name_en,
                                          nationality_ar: selectedCertificate.nationality_ar,
                                          nationality_en: selectedCertificate.nationality_en,
                                          birthplace_ar: selectedCertificate.birthplace_ar,
                                          birthplace_en: selectedCertificate.birthplace_en,
                                          birth_year: selectedCertificate.birth_year,
                                          college_ar: selectedCertificate.college_ar,
                                          college_en: selectedCertificate.college_en,
                                          request_date: selectedCertificate.request_date,
                                        }}
                                        onSendToWorkflow={() => handleSendToWorkflow(selectedCertificate)}
                                        isSending={isSendingToWorkflow}
                                      />
                                    )}
                                  </DialogContent>
                                </Dialog>
                                
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleIssueCertificate(req)} disabled={isIssuing}>
                                  <FileText className="h-4 w-4 ml-1" />
                                  {isIssuing ? "جاري الإصدار..." : "إنشاء الشهادة"}
                                </Button>
                              </>
                            )}

                            {req.status === "issued" && req.document_id && (
                              <Badge className="bg-green-100 text-green-700">تم الإصدار ✓</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ✅ حوار رفض الطلب */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>سبب الرفض</DialogTitle>
            <DialogDescription>
              يرجى كتابة سبب رفض طلب الشهادة ليتم إبلاغ الطالب
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-right block mb-2">سبب الرفض</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض هنا..."
              className="min-h-[100px] text-right"
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleReject} variant="destructive" className="gap-2">
              <XCircle className="h-4 w-4" /> تأكيد الرفض
            </Button>
            <Button variant="outline" onClick={() => {
              setIsRejectDialogOpen(false);
              setRejectionReason("");
              setRejectRequestId(null);
            }}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}