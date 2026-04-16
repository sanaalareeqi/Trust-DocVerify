import { db } from "./db";
import { users, documents, signatureLogs, notifications, workflows, workflowSteps } from "@shared/schema";

async function seed() {
  console.log("Starting database seed with updated workflows and contract types...");

  try {
    // Clear existing data (keeping original logic)
    await db.delete(workflowSteps);
    await db.delete(workflows);
    await db.delete(notifications);
    await db.delete(signatureLogs);
    await db.delete(documents);
    await db.delete(users);

    // 1. Create Workflows
    const createdWorkflows = await db
      .insert(workflows)
      .values([
        { name: "مسار الشهادات", documentType: "Certificate" },
        { name: "مسار الفواتير", documentType: "Invoice" },
        { name: "عقد توظيف", documentType: "Contract", contractType: "employment" },
        { name: "عقد شراء", documentType: "Contract", contractType: "purchase" },
        { name: "عقد شراكة", documentType: "Contract", contractType: "partnership" },
      ])
      .returning();

    // 2. Create Workflow Steps
    const steps = [
      // Certificate steps
      { workflowId: createdWorkflows[0].id, stepOrder: 1, roleName: "شؤون الخريجين" },
      { workflowId: createdWorkflows[0].id, stepOrder: 2, roleName: "مسجل الكلية" },
      { workflowId: createdWorkflows[0].id, stepOrder: 3, roleName: "عميد الكلية" },
      { workflowId: createdWorkflows[0].id, stepOrder: 4, roleName: "المسجل العام" },
      { workflowId: createdWorkflows[0].id, stepOrder: 5, roleName: "رئيس الجامعة" },
      
      // Invoice steps
      { workflowId: createdWorkflows[1].id, stepOrder: 1, roleName: "مقدم طلب الشراء" },
      { workflowId: createdWorkflows[1].id, stepOrder: 2, roleName: "الأمين العام" },
      { workflowId: createdWorkflows[1].id, stepOrder: 3, roleName: "المدير المالي" },
      { workflowId: createdWorkflows[1].id, stepOrder: 4, roleName: "المراجع" },
      { workflowId: createdWorkflows[1].id, stepOrder: 5, roleName: "الحسابات" },

      // Employment Contract
      { workflowId: createdWorkflows[2].id, stepOrder: 1, roleName: "مسؤول التوظيف" },
      { workflowId: createdWorkflows[2].id, stepOrder: 2, roleName: "ممثل جهة خارجية", isExternal: true },
      { workflowId: createdWorkflows[2].id, stepOrder: 3, roleName: "رئيس مجلس الأمناء" },

      // Purchase Contract
      { workflowId: createdWorkflows[3].id, stepOrder: 1, roleName: "الأمين العام" },
      { workflowId: createdWorkflows[3].id, stepOrder: 2, roleName: "ممثل جهة خارجية", isExternal: true },
      { workflowId: createdWorkflows[3].id, stepOrder: 3, roleName: "رئيس مجلس الأمناء" },

      // Partnership Contract
      { workflowId: createdWorkflows[4].id, stepOrder: 1, roleName: "رئيس الجامعة" },
      { workflowId: createdWorkflows[4].id, stepOrder: 2, roleName: "ممثل جهة خارجية", isExternal: true },
      { workflowId: createdWorkflows[4].id, stepOrder: 3, roleName: "رئيس مجلس الأمناء" },
    ];

    await db.insert(workflowSteps).values(steps);
    console.log("Inserted workflows and steps successfully.");

    // 3. Create initial users (Updated roles)
    const createdUsers = await db
      .insert(users)
      .values([
        {
          username: "admin",
          password: "password123",
          name: "مدير النظام",
          role: "رئيس الجامعة",
          isAdmin: true,
        },
        {
          username: "board_chair",
          password: "password123",
          name: "رئيس مجلس الأمناء",
          role: "رئيس مجلس الأمناء",
          isAdmin: false,
        },
        {
          username: "recruiter",
          password: "password123",
          name: "مسؤول التوظيف",
          role: "مسؤول التوظيف",
          isAdmin: false,
        },
        {
          username: "requester",
          password: "password123",
          name: "فهد العبدالله",
          role: "مقدم طلب الشراء",
          isAdmin: false,
        },
        {
          username: "auditor",
          password: "password123",
          name: "سالم المنصور",
          role: "المراجع",
          isAdmin: false,
        },
        {
          username: "accountant",
          password: "password123",
          name: "قسم الحسابات",
          role: "الحسابات",
          isAdmin: false,
        },
      ])
      .returning();

    console.log(`Created ${createdUsers.length} users`);
    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
() => {
    if (e.target.files?.[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleConfirmSubmit = () => {
    setIsUploading(true);
    setShowConfirm(false);

    setTimeout(() => {
      setIsUploading(false);
      
      const nextSignatory = selectedSignatories[0];
      
      toast({
        title: "تم توقيع الوثيقة وحفظها",
        description: nextSignatory.isExternal 
          ? `تم إرسال رابط التوقيع الخارجي إلى البريد الإلكتروني - [${nextSignatory.name}]`
          : `انتقلت الوثيقة للمرحلة التالية - [${nextSignatory.name}]`,
      });
      
      setUploadedFile(null);
    }, 1500);
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
    
    if (selectedSignatories.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد موقع واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    setShowConfirm(true);
  };

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
                <div className="grid gap-3">
                  {availableSignatories.map((sig) => (
                    <div 
                      key={sig.id} 
                      className={`flex flex-row-reverse items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        selectedSignatories.find(s => s.id === sig.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-muted bg-background hover:border-primary/30"
                      }`}
                      onClick={() => toggleSignatory(sig)}
                    >
                      <div className="flex flex-row-reverse items-center gap-3">
                        <Checkbox 
                          checked={!!selectedSignatories.find(s => s.id === sig.id)} 
                          onCheckedChange={() => toggleSignatory(sig)}
                        />
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {sig.isExternal && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">توقيع خارجي</Badge>}
                            <p className="font-bold text-sm">{sig.role}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{sig.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                {selectedSignatories.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed rounded-2xl text-muted-foreground">
                    يرجى اختيار موقع واحد على الأقل من القائمة الجانبية
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSignatories.map((sig, index) => (
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
                            onClick={(e) => { e.stopPropagation(); moveSignatory(index, 'up'); }}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); moveSignatory(index, 'down'); }}
                            disabled={index === selectedSignatories.length - 1}
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
                  disabled={!uploadedFile || isUploading}
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
              {selectedSignatories.some(s => s.isExternal) && (
                <div className="mt-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                  سيتم إرسال رابط توقيع خارجي آمن للموقعين الخارجيين في المسار المختار.
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
