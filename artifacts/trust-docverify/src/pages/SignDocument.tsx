import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText, PenTool, CheckCircle, Shield, Upload, X, ArrowUp, ArrowDown, User, FileType, Mail, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import CryptoJS from "crypto-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DocumentType = "certificate" | "contract" | "invoice";
type ContractType = "employment" | "purchase" | "partnership";

interface Signatory {
  id: string;
  role: string;
  name: string;
  isExternal?: boolean;
  userId?: number;
}

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

// ✅ صلاحيات إنشاء الوثائق
const CREATE_PERMISSIONS: Record<string, string[]> = {
  "شؤون الخريجين": ["certificate"],
  "مسؤول التوظيف": ["contract_employment"],
  "الأمين العام": ["contract_purchase"],
  "رئيس الجامعة": ["contract_partnership"],
  "مقدم طلب الشراء": ["invoice"],
};

// ✅ صلاحيات إنشاء العقود حسب النوع
const CONTRACT_CREATE_PERMISSIONS: Record<string, string[]> = {
  "employment": ["مسؤول التوظيف"],
  "purchase": ["الأمين العام"],
  "partnership": ["رئيس الجامعة"],
};

// تعريف مسارات التوقيع بالأدوار فقط (بدون أسماء)
const DEFAULT_ROLES: Record<DocumentType, string[]> = {
  certificate: ["شؤون الخريجين", "مسجل الكلية", "عميد الكلية", "المسجل العام", "رئيس الجامعة"],
  contract: [],
  invoice: ["مقدم طلب الشراء", "الأمين العام", "المدير المالي", "المراجع", "الحسابات"],
};

const CONTRACT_ROLES: Record<ContractType, string[]> = {
  employment: ["مسؤول التوظيف", "ممثل جهة خارجية", "رئيس مجلس الأمناء"],
  purchase: ["الأمين العام", "ممثل جهة خارجية", "رئيس مجلس الأمناء"],
  partnership: ["رئيس الجامعة", "ممثل جهة خارجية", "رئيس مجلس الأمناء"],
};

// تحويل الدور العربي إلى مسار إنجليزي
const roleToPath: Record<string, string> = {
  "شؤون الخريجين": "graduate-affairs",
  "مسجل الكلية": "college-registrar",
  "عميد الكلية": "dean",
  "المسجل العام": "general-registrar",
  "رئيس الجامعة": "president",
  "مسؤول التوظيف": "employment",
  "الأمين العام": "secretary",
  "رئيس مجلس الأمناء": "board-chairman",
  "مقدم طلب الشراء": "requester",
  "المدير المالي": "finance",
  "المراجع": "auditor",
  "الحسابات": "accounts"
};

export default function SignDocument() {
  const [docType, setDocType] = useState<DocumentType>("certificate");
  const [contractType, setContractType] = useState<ContractType>("employment");
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [documentHash, setDocumentHash] = useState<string>("");
  
  // حقول الطرف الخارجي
  const [externalEmail, setExternalEmail] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalOrganization, setExternalOrganization] = useState("");
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // ✅ التحقق من صلاحية المستخدم الحالي
  const userStr = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
  let currentUserRole = "";
  let currentUserId = 0;
  if (userStr) {
    const user = JSON.parse(userStr);
    currentUserRole = user.role;
    currentUserId = user.id;
  }

  // ✅ دالة التحقق من صلاحية إنشاء الوثيقة
  const canCreateDocument = (type: DocumentType, contract?: ContractType): boolean => {
    if (type === "certificate") {
      return CREATE_PERMISSIONS[currentUserRole]?.includes("certificate") || false;
    }
    if (type === "contract" && contract) {
      const allowedRoles = CONTRACT_CREATE_PERMISSIONS[contract] || [];
      return allowedRoles.includes(currentUserRole);
    }
    if (type === "invoice") {
      return CREATE_PERMISSIONS[currentUserRole]?.includes("invoice") || false;
    }
    return false;
  };

  // ✅ التحقق من أن المستخدم يمكنه إنشاء نوع معين من العقود
  const getAvailableContractTypes = (): ContractType[] => {
    if (docType !== "contract") return [];
    const types: ContractType[] = ["employment", "purchase", "partnership"];
    return types.filter(type => canCreateDocument("contract", type));
  };

  // جلب المستخدمين من قاعدة البيانات
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:3000/api/documents/users", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // تحديث الأدوار المتاحة حسب نوع الوثيقة
  useEffect(() => {
    let roles: string[] = [];
    if (docType === "contract") {
      roles = CONTRACT_ROLES[contractType];
    } else {
      roles = DEFAULT_ROLES[docType];
    }
    setAvailableRoles(roles);
    setSelectedRoles(roles);
    
    setExternalEmail("");
    setExternalName("");
    setExternalOrganization("");
  }, [docType, contractType]);

  // الحصول على اسم المستخدم الحقيقي من قاعدة البيانات حسب الدور
  const getUserNameByRole = (role: string): string => {
    if (role === "ممثل جهة خارجية") return "جهة خارجية (توقيع عبر رابط)";
    const user = users.find(u => u.role === role);
    return user ? user.name : role;
  };

  // الحصول على معرف المستخدم حسب الدور
  const getUserIdByRole = (role: string): number | undefined => {
    const user = users.find(u => u.role === role);
    return user?.id;
  };

  // بناء قائمة الموقعين مع الأسماء الحقيقية
  const buildSignatories = (): Signatory[] => {
    return selectedRoles.map((role, index) => ({
      id: `${docType}-${index}`,
      role: role,
      name: getUserNameByRole(role),
      isExternal: role === "ممثل جهة خارجية",
      userId: getUserIdByRole(role)
    }));
  };

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const moveRole = (index: number, direction: 'up' | 'down') => {
    const newRoles = [...selectedRoles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRoles.length) return;
    
    [newRoles[index], newRoles[targetIndex]] = [newRoles[targetIndex], newRoles[index]];
    setSelectedRoles(newRoles);
  };

  // حساب Hash الملف عند الرفع
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
      const hash = CryptoJS.SHA256(wordArray).toString();
      setDocumentHash(hash);
      console.log("Document hash:", hash);
    };
    reader.readAsArrayBuffer(file);
  };

  // التحقق من صحة بيانات الطرف الخارجي
  const validateExternalData = (): boolean => {
    if (selectedRoles.includes("ممثل جهة خارجية")) {
      if (!externalEmail) {
        toast({
          title: "خطأ",
          description: "الرجاء إدخال البريد الإلكتروني للطرف الخارجي",
          variant: "destructive",
        });
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(externalEmail)) {
        toast({
          title: "خطأ",
          description: "البريد الإلكتروني غير صحيح",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleConfirmSubmit = async () => {
    if (!uploadedFile) return;
    if (!validateExternalData()) return;
    
    setIsUploading(true);
    setShowConfirm(false);

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        throw new Error("الرجاء تسجيل الدخول أولاً");
      }
      const user = JSON.parse(userStr);
      
      let documentType = "";
      if (docType === "certificate") documentType = "certificate";
      else if (docType === "contract") documentType = "contract";
      else if (docType === "invoice") documentType = "invoice";
      
      const signatories = buildSignatories();
      const workflow = signatories.map((sig, index) => ({
        step: index + 1,
        role: sig.role,
        name: sig.name,
        userId: sig.userId,
        isExternal: sig.isExternal || false
      }));
      
      const hasExternalSigner = selectedRoles.includes("ممثل جهة خارجية");
      const requestBody: any = {
        title: uploadedFile.name,
        type: documentType,
        creatorId: user.id,
        fileUrl: "temp.pdf",
        documentHash: documentHash,
        workflow: workflow,
        currentStep: 1
      };
      
      if (hasExternalSigner) {
        requestBody.externalInvitation = {
          email: externalEmail,
          name: externalName,
          organization: externalOrganization
        };
      }
      
      const response = await fetch("http://localhost:3000/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "فشل في حفظ الوثيقة");
      }
      
      toast({
        title: "تم رفع الوثيقة بنجاح",
        description: hasExternalSigner 
          ? `تم إرسال رابط التوقيع إلى ${externalEmail}`
          : `تم حفظ ${uploadedFile.name} وبدء مسار التوقيع`,
      });
      
      setUploadedFile(null);
      setDocumentHash("");
      setExternalEmail("");
      setExternalName("");
      setExternalOrganization("");
      
      // التوجيه إلى صفحة المستخدم المناسبة حسب دوره
      setTimeout(() => {
        const currentUserStr = localStorage.getItem("user");
        if (currentUserStr) {
          const currentUser = JSON.parse(currentUserStr);
          const path = roleToPath[currentUser.role] || "dashboard";
          window.location.href = `/dashboard/${path}`;
        } else {
          window.location.href = "/dashboard";
        }
      }, 2000);
      
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء رفع الوثيقة",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!uploadedFile) {
      toast({
        title: "خطأ",
        description: "يرجى تحميل الوثيقة أولاً",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedRoles.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد موقع واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    setShowConfirm(true);
  };

  const signatories = buildSignatories();
  const hasExternalSigner = selectedRoles.includes("ممثل جهة خارجية");
  const availableContractTypes = getAvailableContractTypes();
  const hasAnyPermission = canCreateDocument("certificate") || 
                           canCreateDocument("contract", "employment") || 
                           canCreateDocument("contract", "purchase") || 
                           canCreateDocument("contract", "partnership") || 
                           canCreateDocument("invoice");

  // ✅ إذا لم يكن للمستخدم صلاحية إنشاء أي وثيقة
  if (!hasAnyPermission) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">غير مصرح</h2>
            <p className="text-muted-foreground">ليس لديك صلاحية لإنشاء وثائق جديدة.</p>
            <Button className="mt-4" onClick={() => window.location.href = "/dashboard"}>العودة للوحة التحكم</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 font-sans pb-20">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 max-w-6xl text-right" dir="rtl">
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-4xl font-bold text-foreground">إعداد طلب توقيع جديد</h1>
          <p className="text-muted-foreground text-lg">
            اختر نوع الوثيقة، حدد الموقعين، ثم ارفع الملف لبدء العملية الآمنة.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6 text-right">
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary mb-1 justify-end">
                  <FileType className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">الخطوة 1</span>
                </div>
                <CardTitle>نوع الوثيقة</CardTitle>
                <CardDescription>اختر نوع المستند لتحديد سير العمل التلقائي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={docType} onValueChange={(val: DocumentType) => setDocType(val)}>
                  <SelectTrigger className="h-12 text-right">
                    <SelectValue placeholder="اختر نوع الوثيقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {canCreateDocument("certificate") && (
                      <SelectItem value="certificate">شهادة تخرج</SelectItem>
                    )}
                    {(canCreateDocument("contract", "employment") || 
                      canCreateDocument("contract", "purchase") || 
                      canCreateDocument("contract", "partnership")) && (
                      <SelectItem value="contract">عقد / اتفاقية</SelectItem>
                    )}
                    {canCreateDocument("invoice") && (
                      <SelectItem value="invoice">فاتورة مالية</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {docType === "contract" && availableContractTypes.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-bold">نوع العقد المخصص</Label>
                    <Select value={contractType} onValueChange={(val: ContractType) => setContractType(val)}>
                      <SelectTrigger className="h-12 text-right border-primary/30">
                        <SelectValue placeholder="اختر نوع العقد" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableContractTypes.includes("employment") && (
                          <SelectItem value="employment">عقد توظيف</SelectItem>
                        )}
                        {availableContractTypes.includes("purchase") && (
                          <SelectItem value="purchase">عقد شراء</SelectItem>
                        )}
                        {availableContractTypes.includes("partnership") && (
                          <SelectItem value="partnership">عقد شراكة</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary mb-1 justify-end">
                  <User className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">الخطوة 2</span>
                </div>
                <CardTitle>تحديد الموقعين</CardTitle>
                <CardDescription>اختر المستخدمين المشاركين في هذه العملية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {availableRoles.map((role) => (
                      <div 
                        key={role} 
                        className={`flex flex-row-reverse items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedRoles.includes(role) 
                          ? "border-primary bg-primary/5" 
                          : "border-muted bg-background hover:border-primary/30"
                        }`}
                        onClick={() => toggleRole(role)}
                      >
                        <div className="flex flex-row-reverse items-center gap-3">
                          <Checkbox 
                            checked={selectedRoles.includes(role)} 
                            onCheckedChange={() => toggleRole(role)}
                          />
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {role === "ممثل جهة خارجية" && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">توقيع خارجي</Badge>
                              )}
                              <p className="font-bold text-sm">{role}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {getUserNameByRole(role)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {hasExternalSigner && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 border rounded-lg bg-blue-50/30 border-blue-200"
                  >
                    <Label className="text-sm font-bold text-blue-700">بيانات الطرف الخارجي</Label>
                    <div className="space-y-3 mt-2">
                      <Input
                        placeholder="البريد الإلكتروني *"
                        type="email"
                        value={externalEmail}
                        onChange={(e) => setExternalEmail(e.target.value)}
                        className="text-right"
                        required
                      />
                      <Input
                        placeholder="الاسم الكامل (اختياري)"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        className="text-right"
                      />
                      <Input
                        placeholder="اسم الجهة (اختياري)"
                        value={externalOrganization}
                        onChange={(e) => setExternalOrganization(e.target.value)}
                        className="text-right"
                      />
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/10 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-primary mb-1 justify-end">
                  <PenTool className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">الخطوة 3</span>
                </div>
                <CardTitle>سير عمل التوقيع</CardTitle>
                <CardDescription>قم بترتيب الموقعين حسب تسلسل العملية</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRoles.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed rounded-2xl text-muted-foreground">
                    يرجى اختيار موقع واحد على الأقل من القائمة الجانبية
                  </div>
                ) : (
                  <div className="space-y-2">
                    {signatories.map((sig, index) => (
                      <motion.div 
                        layout
                        key={sig.id} 
                        className={`flex flex-row-reverse items-center justify-between p-4 bg-background border rounded-xl group ${sig.isExternal ? 'border-blue-200 bg-blue-50/30' : ''}`}
                      >
                        <div className="flex flex-row-reverse items-center gap-4">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${sig.isExternal ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                            {index + 1}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {sig.isExternal && <Mail className="h-3 w-3 text-blue-500" />}
                              <p className="font-bold text-sm">{sig.role}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{sig.name}</p>
                          </div>
                        </div>
                        <div className="flex flex-row-reverse items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); moveRole(index, 'up'); }}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); moveRole(index, 'down'); }}
                            disabled={index === signatories.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary mb-1 justify-end">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">الخطوة 4</span>
                </div>
                <CardTitle>رفع الوثيقة النهائية</CardTitle>
                <CardDescription>ارفع الملف لبدء عملية التوقيع الرقمي</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-2xl p-10 transition-all text-center flex flex-col items-center justify-center gap-4 ${
                    uploadedFile ? "border-green-500 bg-green-50/30" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {uploadedFile ? (
                    <>
                      <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)} className="text-red-500 hover:text-red-600 gap-1">
                        <X className="h-4 w-4" /> إزالة الملف
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-bold">اسحب الملف هنا أو انقر للاختيار</p>
                        <p className="text-xs text-muted-foreground">PDF, DOCX, PNG (بحد أقصى 10MB)</p>
                      </div>
                      <input type="file" className="hidden" id="file-upload" onChange={handleFileUpload} />
                      <Button asChild variant="outline" className="mt-2 border-primary text-primary hover:bg-primary/5">
                        <label htmlFor="file-upload" className="cursor-pointer">اختيار ملف</label>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-6">
                <Button 
                  className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20" 
                  disabled={!uploadedFile || isUploading || isLoadingUsers}
                  onClick={handleSubmit}
                >
                  {isUploading ? "جاري المعالجة..." : "بدء عملية التوقيع والتوثيق"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 justify-end">
              <Shield className="h-6 w-6 text-primary" />
              تأكيد بدء العملية
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base py-4">
              أنت على وشك إرسال <strong>{uploadedFile?.name}</strong> للبدء في مسار التوقيع. 
              {hasExternalSigner && (
                <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                  سيتم إرسال رابط توقيع خارجي آمن إلى <strong>{externalEmail}</strong>
                </div>
              )}
              هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-3">
            <AlertDialogAction onClick={handleConfirmSubmit} className="bg-primary font-bold px-8">نعم، ابدأ الآن</AlertDialogAction>
            <AlertDialogCancel className="font-bold">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}