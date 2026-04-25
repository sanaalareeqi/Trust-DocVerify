import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FileText, PenTool, CheckCircle, Shield, Upload, X, ArrowUp, ArrowDown, User, FileType, Mail, Loader2, Plus, Trash2 } from "lucide-react";
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
  const [defaultRoles, setDefaultRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [documentHash, setDocumentHash] = useState<string>("");
  
  // حقول إضافة مستخدم جديد
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // حقول الطرف الخارجي (للعقود فقط)
  const [externalEmail, setExternalEmail] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalOrganization, setExternalOrganization] = useState("");
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // ✅ حماية: فقط مدير النظام يمكنه الوصول
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      window.location.href = "/login";
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      if (user.role !== "مدير النظام") {
        window.location.href = "/dashboard";
        return;
      }
    } catch (error) {
      window.location.href = "/login";
    }
  }, []);

  // جلب المستخدمين من قاعدة البيانات
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/documents/users", {
          headers: { "Authorization": `Bearer ${token}` }
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

  // تحديث الأدوار حسب نوع الوثيقة
  useEffect(() => {
    let roles: string[] = [];
    if (docType === "contract") {
      roles = CONTRACT_ROLES[contractType];
    } else {
      roles = DEFAULT_ROLES[docType];
    }
    setDefaultRoles(roles);
    setSelectedRoles(roles);
    
    // إعادة تعيين حقول الطرف الخارجي
    setExternalEmail("");
    setExternalName("");
    setExternalOrganization("");
  }, [docType, contractType]);

  // إضافة مستخدم جديد
  const addUserToWorkflow = () => {
    if (!selectedUserId) {
      toast({ title: "خطأ", description: "الرجاء اختيار مستخدم", variant: "destructive" });
      return;
    }
    
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;
    
    // التحقق من عدم وجود الدور مسبقاً
    if (selectedRoles.includes(user.role)) {
      toast({ title: "تنبيه", description: `الدور ${user.role} موجود بالفعل`, variant: "destructive" });
      return;
    }
    
    // إضافة الدور الجديد
    setSelectedRoles([...selectedRoles, user.role]);
    setSelectedUserId(null);
    setShowAddUserDialog(false);
    toast({ title: "✅ تم الإضافة", description: `تم إضافة ${user.name} (${user.role}) إلى مسار التوقيع` });
  };

  // حذف دور من القائمة
  const removeRole = (roleToRemove: string) => {
    setSelectedRoles(selectedRoles.filter(r => r !== roleToRemove));
    toast({ title: "تم الحذف", description: `تم إزالة ${roleToRemove} من مسار التوقيع` });
  };

  // التحقق مما إذا كان الدور من الأدوار الافتراضية
  const isDefaultRole = (role: string): boolean => {
    return defaultRoles.includes(role);
  };

  // الحصول على اسم المستخدم
  const getUserNameByRole = (role: string): string => {
    if (role === "ممثل جهة خارجية") return "جهة خارجية (توقيع عبر رابط)";
    const user = users.find(u => u.role === role);
    return user ? user.name : role;
  };

  const getUserIdByRole = (role: string): number | undefined => {
    const user = users.find(u => u.role === role);
    return user?.id;
  };

  const buildSignatories = (): Signatory[] => {
    return selectedRoles.map((role, index) => ({
      id: `${docType}-${index}-${role}`,
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

  // حساب Hash الملف
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

  const validateExternalData = (): boolean => {
    if (docType === "contract" && selectedRoles.includes("ممثل جهة خارجية")) {
      if (!externalEmail) {
        toast({ title: "خطأ", description: "الرجاء إدخال البريد الإلكتروني للطرف الخارجي", variant: "destructive" });
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(externalEmail)) {
        toast({ title: "خطأ", description: "البريد الإلكتروني غير صحيح", variant: "destructive" });
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
    // ✅ استخدام FileReader بدلاً من arrayBuffer + spread operator (لحل مشكلة Maximum call stack)
    const fileUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(uploadedFile);
    });
    
    const userStr = localStorage.getItem("user");
    if (!userStr) throw new Error("الرجاء تسجيل الدخول أولاً");
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
    
    const hasExternalSigner = docType === "contract" && selectedRoles.includes("ممثل جهة خارجية");
    const requestBody: any = {
      title: uploadedFile.name,
      type: documentType,
      creatorId: user.id,
      fileUrl: fileUrl,
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
    
    const response = await fetch("/api/documents", {
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
    
    // ✅ إرسال حدث لتحديث القوائم
    window.dispatchEvent(new CustomEvent("documents-updated"));
    
    setUploadedFile(null);
    setDocumentHash("");
    setExternalEmail("");
    setExternalName("");
    setExternalOrganization("");
    setSelectedRoles([]);
    
    // ✅ إعادة تحميل الصفحة بعد 1.5 ثانية
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
  } catch (error: any) {
    console.error("Error:", error);
    toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء رفع الوثيقة", variant: "destructive" });
  } finally {
    setIsUploading(false);
  }
};

  const handleSubmit = () => {
    if (!uploadedFile) {
      toast({ title: "خطأ", description: "يرجى تحميل الوثيقة أولاً", variant: "destructive" });
      return;
    }
    
    if (selectedRoles.length === 0) {
      toast({ title: "خطأ", description: "يرجى تحديد موقع واحد على الأقل", variant: "destructive" });
      return;
    }

    setShowConfirm(true);
  };

  const signatories = buildSignatories();
  const hasExternalSigner = docType === "contract" && selectedRoles.includes("ممثل جهة خارجية");
  
  // دمج الأدوار الافتراضية والأدوار المضافة للعرض
  const allRolesToDisplay = [...new Set([...defaultRoles, ...selectedRoles])];
  
  // المستخدمين المتاحين للإضافة
  const availableUsers = users.filter(u => !selectedRoles.includes(u.role) && u.role !== "مدير النظام" && u.role !== "ممثل جهة خارجية");

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
                    <SelectItem value="certificate">شهادة تخرج</SelectItem>
                    <SelectItem value="contract">عقد / اتفاقية</SelectItem>
                    <SelectItem value="invoice">فاتورة مالية</SelectItem>
                  </SelectContent>
                </Select>

                {docType === "contract" && (
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
                        <SelectItem value="employment">عقد توظيف</SelectItem>
                        <SelectItem value="purchase">عقد شراء</SelectItem>
                        <SelectItem value="partnership">عقد شراكة</SelectItem>
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
                    {/* عرض جميع الأدوار (الافتراضية + المضافة) */}
                    {allRolesToDisplay.map((role) => {
                      const isSelected = selectedRoles.includes(role);
                      const isDefault = defaultRoles.includes(role);
                      
                      return (
                        <div 
                          key={role} 
                          className={`flex flex-row-reverse items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-muted bg-background hover:border-primary/30"
                          }`}
                          onClick={() => toggleRole(role)}
                        >
                          <div className="flex flex-row-reverse items-center gap-3">
                            <Checkbox 
                              checked={isSelected} 
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
                          
                          {/* زر حذف - يظهر فقط للأدوار المضافة (غير الافتراضية) */}
                          {isSelected && !isDefault && role !== "ممثل جهة خارجية" && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                removeRole(role); 
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* زر إضافة مستخدم */}
                    <div className="mt-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-1"
                        onClick={() => setShowAddUserDialog(true)}
                        disabled={availableUsers.length === 0}
                      >
                        <Plus className="h-4 w-4" />
                        إضافة مستخدم
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Dialog لإضافة مستخدم */}
                {showAddUserDialog && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddUserDialog(false)}>
                    <div className="bg-background rounded-lg p-6 w-[400px] max-w-[90%]" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-lg font-bold mb-4 text-center">إضافة مستخدم إلى مسار التوقيع</h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {availableUsers.map(user => (
                          <div 
                            key={user.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedUserId === user.id ? "border-primary bg-primary/5" : "border-muted hover:border-primary/30"}`}
                            onClick={() => setSelectedUserId(user.id)}
                          >
                            <p className="font-bold">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.role}</p>
                          </div>
                        ))}
                        {availableUsers.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">لا يوجد مستخدمين متاحين للإضافة</p>
                        )}
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Button onClick={addUserToWorkflow} className="flex-1">إضافة</Button>
                        <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>إلغاء</Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* الطرف الخارجي - للعقود فقط */}
                {docType === "contract" && hasExternalSigner && (
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
                    يرجى اختيار موقع واحد على الأقل
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
                            onClick={() => moveRole(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => moveRole(index, 'down')}
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
                        <p className="text-xs text-muted-foreground">PDF, PNG, JPG (بحد أقصى 10MB)</p>
                      </div>
                      <input type="file" className="hidden" id="file-upload" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg" />
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