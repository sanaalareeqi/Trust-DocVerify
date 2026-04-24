import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Search, Download, Share2, CheckCircle2, 
  XCircle, RotateCcw, User, FilterX, Loader2, PenTool, Link, Eye, Shield
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
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import QRCodeModal from "@/components/ui/QRCodeModal";
import { QrCode } from "lucide-react";

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
  fileUrl?: string;
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
  
  // ✅ متغيرات جديدة لعملية التوقيع داخل نافذة المعاينة
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [showConfirmSign, setShowConfirmSign] = useState(false);
  const [selectedDocForSign, setSelectedDocForSign] = useState<Document | null>(null);
  
  // ✅ حماية إضافية: التحقق من أن المستخدم له صلاحية الوصول لهذه الصفحة
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      window.location.href = "/login";
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
      
      const expectedRole = roleMap[currentRole];
      
      // إذا كان المستخدم ليس له هذا الدور وليس أدمن → يوجه للصفحة الرئيسية
      if (user.role !== expectedRole && user.role !== "مدير النظام") {
        toast({ title: "غير مصرح", description: "ليس لديك صلاحية الوصول لهذه الصفحة", variant: "destructive" });
        window.location.href = "/dashboard";
        return;
      }
    } catch (error) {
      window.location.href = "/login";
    }
  }, [currentRole]);
  
  const isFetchingRef = useRef(false);

  // جلب المستخدمين (مرة واحدة فقط)
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

  // ✅ دالة جلب الوثائق (مع منع التخزين المؤقت)
  const fetchDocuments = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      // ✅ إضافة timestamp لمنع التخزين المؤقت
      const timestamp = Date.now();
      const response = await fetch(`http://localhost:3000/api/documents?_=${timestamp}`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log(" Documents fetched at:", new Date().toLocaleTimeString(), "Count:", data.length);
        
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
      isFetchingRef.current = false;
    }
  }, [users]);

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    if (users.length > 0) {
      fetchDocuments();
    }
  }, [users, fetchDocuments]);

  // ✅ الاستماع لحدث تحديث الوثائق (من صفحة إنشاء وثيقة جديدة)
  useEffect(() => {
    const handleDocumentsUpdate = (event: any) => {
      console.log(" Documents updated event received at:", new Date().toLocaleTimeString());
      fetchDocuments();
    };
    
    window.addEventListener("documents-updated", handleDocumentsUpdate);
    
    return () => {
      window.removeEventListener("documents-updated", handleDocumentsUpdate);
    };
  }, [fetchDocuments]);

  // ✅ تحديث تلقائي كل 5 ثواني (كحل احتياطي)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Auto-refresh check...");
      fetchDocuments();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.id.toString().includes(searchQuery);
      const matchesType = typeFilter === "all" || doc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  const incomingRequests = useMemo(() => {
    const arabicRole = ROLE_MAPPING[currentRole] || currentRole;
    return filteredDocuments.filter(doc => 
      doc.currentSignerRole === arabicRole && doc.status !== "completed" && doc.status !== "Verified"
    );
  }, [filteredDocuments, currentRole]);

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

  // ✅ دالة التحقق من التمرير إلى أسفل الوثيقة
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isBottom) {
      setHasScrolledToBottom(true);
    }
  };

  // ✅ فتح نافذة المعاينة للتوقيع
  const openSignModal = (doc: Document) => {
    setHasScrolledToBottom(false);
    setSelectedDocForSign(doc);
    setViewingDoc({ isOpen: true, doc });
  };

  // ✅ تأكيد التوقيع
  const confirmSign = async () => {
    if (selectedDocForSign) {
      await handleSign(selectedDocForSign.id, selectedDocForSign);
      setShowConfirmSign(false);
      setViewingDoc({ isOpen: false, doc: null });
      setSelectedDocForSign(null);
      setHasScrolledToBottom(false);
    }
  };

  const handleSign = async (docId: number, doc: Document) => {
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
        toast({ title: "تم التوقيع بنجاح", description: "تم توقيع الوثيقة ونقلها للمستخدم التالي" });
        fetchDocuments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "فشل في التوقيع");
      }
    } catch (err: any) {
      console.error("Sign error:", err);
      toast({ title: "خطأ", description: err.message || "حدث خطأ أثناء التوقيع", variant: "destructive" });
    }
  };

  const handleReturn = async () => {
    if (!returnModal.docId) return;
    
    try {
      const userStr = localStorage.getItem("user");
      const user = JSON.parse(userStr || "{}");
      const token = localStorage.getItem("token");
      
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
      
      if (response.ok) {
        toast({ title: " تمت الإعادة", description: "تم إعادة الوثيقة إلى شؤون الخريجين للمراجعة" });
        setReturnModal({ isOpen: false, docId: null, reason: "" });
        fetchDocuments();
      } else {
        throw new Error(data.error || "فشل في الإعادة");
      }
    } catch (error: any) {
      console.error("Return error:", error);
      toast({ title: " خطأ", description: error.message || "حدث خطأ أثناء الإعادة", variant: "destructive" });
    }
  };

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
          title: " تم التسجيل على Blockchain",
          description: (
            <span>
              تم تسجيل الوثيقة بنجاح.{" "}
              <a href={data.txUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
                عرض المعاملة
              </a>
            </span>
          ) as any,
        });
        fetchDocuments();
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

  // ✅ دالة الحالة - تعرض سلسلة التوقيعات بشكل مختصر مع Dropdown
  const getStatusBadge = (doc: Document) => {
    const workflow = doc.workflow || [];
    const currentStep = doc.currentStep || 1;
    
    const signedSigners = workflow.slice(0, currentStep - 1).map(signer => signer.role);
    const currentSigner = workflow[currentStep - 1];
    const remainingSigners = workflow.slice(currentStep);
    
    let shortText = "";
    
    if (doc.status === "Verified" || doc.status === "completed") {
      shortText = "مكتملة";
    } else if (doc.status === "Returned" || doc.status === "returned") {
      shortText = "أعيدت";
    } else if (currentSigner) {
      shortText = `في انتظار ${currentSigner.role}`;
    } else {
      shortText = "قيد التقدم";
    }
    
    const fullDetails = (
      <div className="space-y-1 p-1 min-w-[200px]">
        {signedSigners.length > 0 && (
          <div className="border-b pb-1 mb-1">
            <p className="text-xs font-bold mb-1">تم التوقيع:</p>
            {signedSigners.map((role, idx) => (
              <p key={idx} className="text-xs pr-2">✓ {role}</p>
            ))}
          </div>
        )}
        
        {currentSigner && doc.status !== "Verified" && doc.status !== "completed" && (
          <div className="border-b pb-1 mb-1">
            <p className="text-xs font-bold mb-1">في انتظار:</p>
            <p className="text-xs pr-2">{currentSigner.role}</p>
          </div>
        )}
        
        {remainingSigners.length > 0 && doc.status !== "Verified" && doc.status !== "completed" && (
          <div>
            <p className="text-xs font-bold mb-1">ثم ينتقل إلى:</p>
            {remainingSigners.map((signer, idx) => (
              <p key={idx} className="text-xs pr-2">
                {idx === 0 ? "↓ " : "   "}{signer.role}
              </p>
            ))}
          </div>
        )}
        
        {doc.status === "Verified" && (
          <div>
            <p className="text-xs font-bold mb-1">سلسلة التوقيعات:</p>
            {workflow.map((signer, idx) => (
              <p key={idx} className="text-xs pr-2">
                {idx + 1}. {signer.role} ✓
              </p>
            ))}
          </div>
        )}
      </div>
    );
    
    return (
      <div className="relative group">
        <div className="cursor-help border-b border-dashed border-gray-300 pb-0.5">
          {shortText}
        </div>
        <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[220px] top-full right-0 mt-1">
          {fullDetails}
        </div>
      </div>
    );
  };

  // ✅ دالة لعرض الوثيقة بشكل صحيح
  const renderDocumentPreview = (doc: Document) => {
    const fileUrl = doc.fileUrl;
    
    if (!fileUrl || fileUrl === "temp.pdf") {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>لا توجد معاينة متاحة لهذه الوثيقة</p>
          <p className="text-xs mt-1">(الملف الأصلي غير مخزن في النظام)</p>
        </div>
      );
    }
    
    if (fileUrl.startsWith('data:image/')) {
      return (
        <div className="mt-4 border rounded-lg p-4 bg-muted/20">
          <img 
            src={fileUrl} 
            alt={doc.title}
            className="max-w-full max-h-96 mx-auto rounded-lg shadow-md"
            onError={(e) => {
              console.error("Image failed to load");
              e.currentTarget.src = "https://placehold.co/400x300/f0f0f0/cccccc?text=خطأ+في+تحميل+الصورة";
            }}
          />
        </div>
      );
    }
    
    if (fileUrl.startsWith('data:application/pdf')) {
      return (
        <div className="mt-4 border rounded-lg p-4 bg-muted/20">
          <iframe 
            src={fileUrl} 
            className="w-full h-96 border rounded"
            title={doc.title}
          />
          <div className="text-center mt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = doc.title;
                link.click();
              }}
            >
              تحميل PDF
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-4 border rounded-lg p-4 text-center bg-muted/20">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="mb-2">لا يمكن معاينة هذا النوع من الملفات مباشرة</p>
        <Button 
          variant="outline"
          onClick={() => {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = doc.title;
            link.click();
          }}
        >
          تحميل الملف
        </Button>
      </div>
    );
  };

  if (isLoading && documents.length === 0) {
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
                          <TableCell>{getStatusBadge(doc)}</TableCell>
                          <TableCell>{new Date(doc.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>
  <div className="flex items-center gap-2 justify-end">
    {/* ✅ زر عرض فقط - لون أزرق */}
    <Button 
      size="sm" 
      variant="outline" 
      className="border-primary text-primary hover:bg-primary/5 gap-1" 
      onClick={() => openSignModal(doc)}
    >
      <Eye className="h-4 w-4" /> عرض
    </Button>
    
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
                          <TableCell>{getStatusBadge(doc)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-end">
                              <User className="h-4 w-4 opacity-50" />
                              {ROLE_LABELS[doc.currentSignerRole || ""] || doc.currentSignerRole || "-"}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(doc.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-primary text-primary hover:bg-primary/5 gap-1" 
                                onClick={() => setViewingDoc({ isOpen: true, doc })}
                              >
                                <Eye className="h-4 w-4" /> عرض
                              </Button>
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

      {/* ✅ View Document Modal - مع زر التوقيع داخل النافذة */}
      <Dialog open={viewingDoc.isOpen} onOpenChange={(open) => {
        setViewingDoc(prev => ({ ...prev, isOpen: open }));
        if (!open) {
          setHasScrolledToBottom(false);
          setSelectedDocForSign(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-end">
              <FileText className="h-5 w-5 text-primary" />
              <span>معاينة المستند: {viewingDoc.doc?.title}</span>
            </DialogTitle>
          </DialogHeader>
          
          {viewingDoc.doc && (
            <div className="space-y-4">
              {/* معلومات الوثيقة */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">رقم الوثيقة</p>
                  <p className="font-bold text-sm">#{viewingDoc.doc.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">النوع</p>
                  <p className="font-bold text-sm">{getTypeLabel(viewingDoc.doc.type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الحالة</p>
                  <p>{getStatusBadge(viewingDoc.doc)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="font-bold text-sm">{new Date(viewingDoc.doc.createdAt).toLocaleDateString("ar-EG")}</p>
                </div>
              </div>
              
              {/* رابط Blockchain إذا وجد */}
              {viewingDoc.doc.blockchainTxUrl && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                  <p className="text-xs text-muted-foreground text-right">🔗 تسجيل Blockchain</p>
                  <a 
                    href={viewingDoc.doc.blockchainTxUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary text-sm font-mono break-all hover:underline text-right block"
                  >
                    عرض المعاملة على Etherscan
                  </a>
                </div>
              )}
              
              {/* ✅ معاينة الوثيقة مع كشف التمرير */}
              <div 
                className="border rounded-lg overflow-hidden bg-white max-h-[400px] overflow-y-auto"
                onScroll={handleScroll}
              >
                <div className="bg-muted/30 px-4 py-2 border-b sticky top-0">
                  <p className="text-sm font-bold">معاينة المستند</p>
                </div>
                <div className="p-4">
                  {renderDocumentPreview(viewingDoc.doc)}
                </div>
              </div>
              
              {/* ✅ زر التوقيع - يظهر فقط بعد التمرير إلى الأسفل */}
              {hasScrolledToBottom && viewingDoc.doc.status !== "Verified" && (
                <div className="flex justify-center pt-4 border-t">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 gap-2 px-8 py-2 text-lg"
                    onClick={() => setShowConfirmSign(true)}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    توقيع المستند
                  </Button>
                </div>
              )}
              
              {/* ✅ رسالة تحذير إذا لم يمرر المستخدم */}
              {!hasScrolledToBottom && viewingDoc.doc.status !== "Verified" && (
                <div className="flex justify-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    ⚠️ يرجى التمرير إلى أسفل الوثيقة لقراءتها بالكامل قبل التوقيع
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex-row-reverse gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setViewingDoc({ isOpen: false, doc: null });
              setHasScrolledToBottom(false);
            }}>
              إغلاق
            </Button>
            {viewingDoc.doc?.fileUrl && viewingDoc.doc.fileUrl !== "temp.pdf" && (
              <Button onClick={() => {
                const url = viewingDoc.doc?.fileUrl;
                const title = viewingDoc.doc?.title;
                if (url && title) {
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = title;
                  link.click();
                }
              }}>
                <Download className="h-4 w-4 ml-2" />
                تحميل الملف
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ رسالة تأكيد التوقيع */}
      <Dialog open={showConfirmSign} onOpenChange={setShowConfirmSign}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-end">
              <Shield className="h-5 w-5 text-primary" />
              تأكيد التوقيع
            </DialogTitle>
            <DialogDescription className="text-right pt-4">
              <p>هل أنت متأكد من توقيع المستند التالي؟</p>
              <p className="font-bold mt-2">{selectedDocForSign?.title}</p>
              <p className="text-sm text-muted-foreground mt-2">
                بعد التوقيع، سيتم نقل المستند إلى الموقع التالي في مسار التوقيع.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={confirmSign} className="bg-green-600 hover:bg-green-700">
              نعم، أوقع الآن
            </Button>
            <Button variant="outline" onClick={() => setShowConfirmSign(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}