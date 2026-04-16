import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Search, Download, Share2, CheckCircle2, 
  XCircle, RotateCcw, User, FilterX, Loader2, PenTool, Link
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Roles mapping for Arabic display (English to Arabic)
const ROLE_LABELS: Record<string, string> = {
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
  "Accounts": "الحسابات",
  "Document-Creator": "منشئ المستند",
  "Department-Manager": "مدير القسم",
  "General-Administration": "الإدارة العامة",
  "Accountant": "المحاسب",
  "Administrative-Officer": "المسؤول الإداري",
};

// Mapping from English role (URL) to Arabic role (database)
const ROLE_MAPPING: Record<string, string> = {
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
  "Accounts": "الحسابات",
};

interface Document {
  id: number;
  title: string;
  type: string;
  status: string;
  currentStep: number;
  creatorId: number;
  createdAt: string;
  workflow: any[];
  creatorName?: string;
  currentSignerRole?: string;
  documentHash?: string;
  blockchainTxUrl?: string;
}

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export default function RoleDashboard({ params }: { params: { role: string } }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const currentRole = params.role;
  const roleLabel = ROLE_LABELS[currentRole] || currentRole;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockchainLoading, setBlockchainLoading] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [returnModal, setReturnModal] = useState<{ isOpen: boolean; docId: number | null; reason: string }>({
    isOpen: false,
    docId: null,
    reason: "",
  });
  const [viewingDoc, setViewingDoc] = useState<{ isOpen: boolean; doc: Document | null }>({
    isOpen: false,
    doc: null,
  });

  // جلب المستخدمين
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:3000/api/documents/users", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // جلب الوثائق من قاعدة البيانات
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/documents", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // إضافة اسم المنشئ والدور الحالي لكل وثيقة
        const enrichedDocs = data.map((doc: any) => {
          const creator = users.find(u => u.id === doc.creatorId);
          const currentStepRole = doc.workflow?.[doc.currentStep - 1]?.role;
          return {
            ...doc,
            creatorName: creator?.name || "غير معروف",
            currentSignerRole: currentStepRole
          };
        });
        setDocuments(enrichedDocs);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (users.length > 0) {
      fetchDocuments();
    }
  }, [users]);

  // تصفية الوثائق حسب البحث والنوع
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.id.toString().includes(searchQuery);
      const matchesType = typeFilter === "all" || doc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  // الطلبات الواردة: الوثائق التي تنتظر توقيع المستخدم الحالي
  const incomingRequests = useMemo(() => {
    const arabicRole = ROLE_MAPPING[currentRole] || currentRole;
    return filteredDocuments.filter(doc => 
      doc.currentSignerRole === arabicRole && doc.status !== "completed" && doc.status !== "Verified"
    );
  }, [filteredDocuments, currentRole]);

  // الطلبات الصادرة: الوثائق التي وقعها المستخدم الحالي (أكمل دوره فيها)
  const outgoingRequests = useMemo(() => {
    const arabicRole = ROLE_MAPPING[currentRole] || currentRole;
    return filteredDocuments.filter(doc => {
      const creator = users.find(u => u.id === doc.creatorId);
      const isCreator = creator?.role === arabicRole;
      const workflowSteps = doc.workflow || [];
      const userStepIndex = workflowSteps.findIndex((step: any) => step.role === arabicRole);
      const hasSigned = userStepIndex !== -1 && userStepIndex < (doc.currentStep - 1);
      return isCreator || hasSigned;
    });
  }, [filteredDocuments, currentRole, users]);

  // توقيع وثيقة
  const handleSign = async (docId: number, doc: Document) => {
    console.log("=== SIGNING DOCUMENT ===");
    console.log("Doc ID:", docId);
    console.log("Current role:", currentRole);
    
    try {
      const userStr = localStorage.getItem("user");
      const user = JSON.parse(userStr || "{}");
      const token = localStorage.getItem("token");
      
      const response = await fetch(`http://localhost:3000/api/documents/${docId}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          signerId: user.id,
          signerRole: currentRole,
          comment: "تم التوقيع إلكترونياً",
          documentHash: doc.documentHash
        })
      });
      
      if (response.ok) {
        console.log("Sign successful");
        toast({ title: "تم التوقيع بنجاح", description: "تم توقيع الوثيقة ونقلها للمستخدم التالي" });
        await fetchDocuments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "فشل في التوقيع");
      }
    } catch (err: any) {
      console.error("Sign error:", err);
      toast({ title: "خطأ", description: err.message || "حدث خطأ أثناء التوقيع", variant: "destructive" });
    }
  };

  // إعادة وثيقة
  // إعادة وثيقة
const handleReturn = async () => {
  if (!returnModal.docId) return;
  
  try {
    const userStr = localStorage.getItem("user");
    const user = JSON.parse(userStr || "{}");
    const token = localStorage.getItem("token");
    
    console.log("Return request:", {
      docId: returnModal.docId,
      returnerId: user.id,
      returnerRole: currentRole,
      reason: returnModal.reason
    });
    
    const response = await fetch(`http://localhost:3000/api/documents/${returnModal.docId}/return`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        returnerId: user.id,
        returnerRole: currentRole,
        reason: returnModal.reason
      })
    });
    
    const data = await response.json();
    console.log("Return response:", data);
    
    if (response.ok) {
      toast({ 
        title: "✅ تمت الإعادة", 
        description: "تم إعادة الوثيقة إلى شؤون الخريجين للمراجعة",
        className: "bg-yellow-50 border-yellow-200"
      });
      setReturnModal({ isOpen: false, docId: null, reason: "" });
      await fetchDocuments();
    } else {
      throw new Error(data.error || "فشل في الإعادة");
    }
  } catch (error: any) {
    console.error("Return error:", error);
    toast({ 
      title: "❌ خطأ", 
      description: error.message || "حدث خطأ أثناء الإعادة", 
      variant: "destructive" 
    });
  }
};

  // تسجيل الوثيقة على Blockchain
  const handleRegisterOnChain = async (docId: number) => {
    setBlockchainLoading(docId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/documents/${docId}/register-on-chain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "✅ تم التسجيل على Blockchain",
          description: (
            <span>
              تم تسجيل الوثيقة بنجاح.{" "}
              <a href={data.txUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
                عرض المعاملة
              </a>
            </span>
          ) as any,
        });
        await fetchDocuments();
      } else if (response.status === 409) {
        toast({
          title: "ℹ️ مسجّلة مسبقاً",
          description: (
            <span>
              هذه الوثيقة مسجّلة بالفعل على Blockchain.{" "}
              <a href={data.txUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
                عرض المعاملة
              </a>
            </span>
          ) as any,
        });
      } else {
        throw new Error(data.error || "فشل التسجيل على Blockchain");
      }
    } catch (err: any) {
      toast({
        title: "❌ فشل التسجيل",
        description: err.message || "حدث خطأ أثناء التسجيل على Blockchain",
        variant: "destructive"
      });
    } finally {
      setBlockchainLoading(null);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      certificate: "شهادة",
      contract: "عقد",
      invoice: "فاتورة"
    };
    return types[type] || type;
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed" || status === "Verified") {
      return <Badge className="bg-green-100 text-green-700">مكتمل</Badge>;
    } else if (status === "in_progress" || status === "Pending") {
      return <Badge className="bg-blue-100 text-blue-700">قيد التقدم</Badge>;
    } else if (status === "returned" || status === "Returned") {
      return <Badge className="bg-yellow-100 text-yellow-700">معاد</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <Navbar />
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 font-sans text-right" dir="rtl">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto flex-row-reverse">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-sm shrink-0">
              <User className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{roleLabel}</h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80" dir="rtl">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث في الوثائق..." 
                className="pr-10 bg-white border-slate-200 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap" dir="rtl">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] bg-white border-slate-200 rounded-xl">
                  <SelectValue placeholder="نوع المستند" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  <SelectItem value="certificate">شهادة</SelectItem>
                  <SelectItem value="contract">عقد</SelectItem>
                  <SelectItem value="invoice">فاتورة</SelectItem>
                </SelectContent>
              </Select>
              
              {(searchQuery !== "" || typeFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                  }}
                  className="rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="incoming" className="w-full space-y-6">
          <TabsList className="bg-background border p-1 rounded-xl h-auto flex md:inline-flex w-full md:w-auto">
            <TabsTrigger value="incoming" className="flex-1 md:flex-none rounded-lg py-2 px-8 font-bold">
              طلبات واردة ({incomingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="flex-1 md:flex-none rounded-lg py-2 px-8 font-bold">
              طلبات صادرة ({outgoingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming">
            <Card className="shadow-sm border-none overflow-hidden">
              <CardHeader className="border-b bg-background/50 px-6 py-4">
                <CardTitle className="text-xl">وثائق بانتظار توقيعك</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-right py-4 px-6">المستند</TableHead>
                      <TableHead className="text-right py-4">النوع</TableHead>
                      <TableHead className="text-right py-4">الحالة</TableHead>
                      <TableHead className="text-right py-4">تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right py-4">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                          لا توجد طلبات واردة
                        </TableCell>
                      </TableRow>
                    ) : (
                      incomingRequests.map((doc) => (
                        <TableRow key={doc.id} className="group hover:bg-muted/10">
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{doc.title}</span>
                              <span className="text-xs font-mono text-muted-foreground">#{doc.id}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeLabel(doc.type)}</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>{new Date(doc.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-end">
                              {/* زر العرض - يظهر للجميع */}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-primary text-primary hover:bg-primary/5 gap-1" 
                                onClick={() => setViewingDoc({ isOpen: true, doc })}
                              >
                                <FileText className="h-4 w-4" /> عرض
                              </Button>
                              
                              {/* زر التوقيع - يظهر للجميع */}
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 gap-1" 
                                onClick={() => handleSign(doc.id, doc)}
                              >
                                <CheckCircle2 className="h-4 w-4" /> توقيع
                              </Button>
                              
                              {/* زر إعادة - يظهر فقط للمسجل العام */}
                              {currentRole === "General-Registrar" && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 gap-1" 
                                  onClick={() => setReturnModal({ isOpen: true, docId: doc.id, reason: "" })}
                                >
                                  <RotateCcw className="h-4 w-4" /> إعادة
                                </Button>
                              )}
                              
                              {/* زر تعديل - يظهر فقط لشؤون الخريجين */}
                              {currentRole === "Graduate-Affairs" && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1" 
                                  onClick={() => {
                                    toast({ title: "تعديل", description: "سيتم إضافة صفحة التعديل قريباً" });
                                  }}
                                >
                                  <PenTool className="h-4 w-4" /> تعديل
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outgoing">
            <Card className="shadow-sm border-none overflow-hidden">
              <CardHeader className="border-b bg-background/50 px-6 py-4">
                <CardTitle className="text-xl">الطلبات الصادرة</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-right py-4 px-6">المستند</TableHead>
                      <TableHead className="text-right py-4">النوع</TableHead>
                      <TableHead className="text-right py-4">الحالة</TableHead>
                      <TableHead className="text-right py-4">الموقع الحالي</TableHead>
                      <TableHead className="text-right py-4">تاريخ الإنشاء</TableHead>
                      <TableHead className="text-right py-4">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outgoingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                          لا توجد طلبات صادرة
                        </TableCell>
                      </TableRow>
                    ) : (
                      outgoingRequests.map((doc) => (
                        <TableRow key={doc.id} className="group hover:bg-muted/10">
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground">{doc.title}</span>
                              <span className="text-xs font-mono text-muted-foreground">#{doc.id}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeLabel(doc.type)}</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-end">
                              <User className="h-4 w-4 opacity-50" />
                              {ROLE_LABELS[doc.currentSignerRole || ""] || doc.currentSignerRole || "-"}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(doc.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>
                            {doc.status === "Verified" && (
                              doc.blockchainTxUrl ? (
                                <a
                                  href={doc.blockchainTxUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-colors"
                                >
                                  <Link className="h-3 w-3" /> مسجّل على Blockchain
                                </a>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-purple-700 border-purple-200 hover:bg-purple-50 gap-1 text-xs"
                                  onClick={() => handleRegisterOnChain(doc.id)}
                                  disabled={blockchainLoading === doc.id}
                                >
                                  {blockchainLoading === doc.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Link className="h-3 w-3" />
                                  )}
                                  تسجيل في Blockchain
                                </Button>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Return Modal */}
      <Dialog open={returnModal.isOpen} onOpenChange={(open) => setReturnModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>إعادة الوثيقة</DialogTitle>
            <DialogDescription>يرجى كتابة سبب إعادة الوثيقة</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="اكتب سبب الإعادة..."
              className="min-h-[100px] text-right"
              value={returnModal.reason}
              onChange={(e) => setReturnModal(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleReturn} disabled={!returnModal.reason.trim()}>إرسال</Button>
            <Button variant="ghost" onClick={() => setReturnModal({ isOpen: false, docId: null, reason: "" })}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Modal */}
      <Dialog open={viewingDoc.isOpen} onOpenChange={(open) => setViewingDoc(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-3xl text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الوثيقة</DialogTitle>
          </DialogHeader>
          {viewingDoc.doc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">العنوان</p>
                  <p className="font-bold">{viewingDoc.doc.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">النوع</p>
                  <p>{getTypeLabel(viewingDoc.doc.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <p>{getStatusBadge(viewingDoc.doc.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                  <p>{new Date(viewingDoc.doc.createdAt).toLocaleDateString("ar-EG")}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDoc({ isOpen: false, doc: null })}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}