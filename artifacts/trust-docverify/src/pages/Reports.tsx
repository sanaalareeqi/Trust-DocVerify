import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle2, XCircle, Clock, TrendingUp, Users, Activity, BarChart3, PieChart as PieChartIcon, Printer, Download, Filter, Loader2 } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import "jspdf-autotable";

interface Document {
  id: number;
  title: string;
  type: string;
  status: string;
  currentStep: number;
  creatorId: number;
  createdAt: string;
  workflow: any[];
}

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export default function Reports() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();

  // ✅ حماية: فقط المستخدمين المسجلين يمكنهم الوصول
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      window.location.href = "/login";
      return;
    }
  }, []);

  // جلب المستخدم الحالي
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUserRole(user.role);
      setCurrentUserId(user.id);
    }
  }, []);

  // جلب البيانات
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        
        // جلب المستخدمين
        const usersRes = await fetch("http://localhost:3000/api/documents/users", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
        
        // جلب الوثائق
        const docsRes = await fetch("http://localhost:3000/api/documents", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // تصفية الوثائق حسب التاريخ
  const filteredDocuments = documents.filter(doc => {
    if (dateFrom && new Date(doc.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(doc.createdAt) > new Date(dateTo)) return false;
    return true;
  });

  // الوثائق التي تخص المستخدم الحالي (الواردة والصادرة)
  const userDocuments = filteredDocuments.filter(doc => {
    const workflow = doc.workflow || [];
    const userInWorkflow = workflow.some((step: any) => step.role === currentUserRole);
    const isCreator = doc.creatorId === currentUserId;
    return userInWorkflow || isCreator;
  });

  // إحصائيات عامة
  const totalDocs = userDocuments.length;
  const approvedDocs = userDocuments.filter(d => d.status === "Verified" || d.status === "completed").length;
  const rejectedDocs = userDocuments.filter(d => d.status === "Returned" || d.status === "rejected").length;
  const pendingDocs = totalDocs - approvedDocs - rejectedDocs;

  // إحصائيات حسب نوع الوثيقة
  const certificateCount = userDocuments.filter(d => d.type === "certificate").length;
  const contractCount = userDocuments.filter(d => d.type === "contract").length;
  const invoiceCount = userDocuments.filter(d => d.type === "invoice").length;

  const typeData = [
    { name: "شهادات", value: certificateCount, color: "#3B82F6" },
    { name: "عقود", value: contractCount, color: "#10B981" },
    { name: "فواتير", value: invoiceCount, color: "#F59E0B" },
  ].filter(t => t.value > 0);

  // بيانات الحالات
  const statusData = [
    { name: "موثقة", value: approvedDocs, color: "#10B981" },
    { name: "مرفوضة", value: rejectedDocs, color: "#EF4444" },
    { name: "قيد التقدم", value: pendingDocs, color: "#F59E0B" },
  ].filter(s => s.value > 0);

  // بيانات الأداء الزمني (حسب الشهر)
  const getMonthData = () => {
    const monthMap: Record<string, { docs: number; avgTime: number; totalTime: number }> = {};
    
    userDocuments.forEach(doc => {
      const date = new Date(doc.createdAt);
      const month = date.toLocaleString('ar-EG', { month: 'long' });
      
      if (!monthMap[month]) {
        monthMap[month] = { docs: 0, avgTime: 0, totalTime: 0 };
      }
      monthMap[month].docs++;
    });
    
    return Object.entries(monthMap).map(([month, data]) => ({
      month,
      docs: data.docs,
      avgTime: data.avgTime || 1.5,
    }));
  };

  const timeData = getMonthData();

  // بيانات أداء المستخدمين
  const userPerformance = users
    .filter(u => u.role !== 'مدير النظام')
    .map(user => {
      const userDocs = userDocuments.filter(d => {
        const workflow = d.workflow || [];
        return workflow.some((step: any) => step.role === user.role) || d.creatorId === user.id;
      });
      const signed = userDocs.filter(d => d.status === "Verified" || d.status === "completed").length;
      const rejected = userDocs.filter(d => d.status === "Returned").length;
      const total = signed + rejected;
      const rate = total > 0 ? Math.round((signed / total) * 100) : 0;
      return { name: user.name, role: user.role, signed, rejected, rate };
    })
    .filter(u => u.signed > 0 || u.rejected > 0)
    .sort((a, b) => b.signed - a.signed);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.text("TrustDoc - تقرير الإحصائيات", 40, 40);
    doc.text(`إجمالي المستندات: ${totalDocs}`, 40, 70);
    doc.text(`الموثقة: ${approvedDocs}`, 40, 90);
    doc.text(`المرفوضة: ${rejectedDocs}`, 40, 110);
    doc.text(`قيد التقدم: ${pendingDocs}`, 40, 130);
    doc.save("trustdoc-report.pdf");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <Navbar />
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans" dir="rtl">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 print:py-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">التقارير والإحصائيات</h1>
            <p className="text-slate-500 mt-2">تحليل أداء المستندات الخاصة بك</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border shadow-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 border-none shadow-none w-[130px] p-0 text-sm focus-visible:ring-0" 
              />
              <span className="text-slate-400">-</span>
              <Input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 border-none shadow-none w-[130px] p-0 text-sm focus-visible:ring-0" 
              />
            </div>
            <Button variant="outline" className="bg-white gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button className="gap-2" onClick={handleExportPDF}>
              <Download className="h-4 w-4" /> تصدير PDF
            </Button>
          </div>
        </div>

        {/* الإحصائيات العامة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1">إجمالي المستندات</p>
                  <h3 className="text-3xl font-bold text-slate-900">{totalDocs}</h3>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1">المستندات الموثقة</p>
                  <h3 className="text-3xl font-bold text-slate-900">{approvedDocs}</h3>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1">المستندات المرفوضة</p>
                  <h3 className="text-3xl font-bold text-slate-900">{rejectedDocs}</h3>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl text-rose-600">
                  <XCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1">قيد التقدم</p>
                  <h3 className="text-3xl font-bold text-slate-900">{pendingDocs}</h3>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border shadow-sm p-1 rounded-xl h-auto grid grid-cols-2 md:grid-cols-4 w-full lg:w-auto lg:inline-flex print:hidden">
            <TabsTrigger value="overview" className="rounded-lg py-2.5 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">نظرة عامة</TabsTrigger>
            <TabsTrigger value="types" className="rounded-lg py-2.5 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">أنواع المستندات</TabsTrigger>
            <TabsTrigger value="time" className="rounded-lg py-2.5 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">الأداء الزمني</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg py-2.5 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">أداء المستخدمين</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-in fade-in-50 duration-500 print:block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    حالات المستندات
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[350px]">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground">لا توجد بيانات كافية</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    عدد المستندات شهرياً
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {timeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <RechartsTooltip />
                        <Bar dataKey="docs" name="عدد المستندات" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full text-muted-foreground">لا توجد بيانات كافية</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="types" className="space-y-6 animate-in fade-in-50 duration-500 print:block">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    توزيع المستندات حسب النوع
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[350px]">
                  {typeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {typeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted-foreground">لا توجد بيانات كافية</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-6 animate-in fade-in-50 duration-500">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  حجم المستندات شهرياً
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[350px]">
                {timeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="docs" name="عدد المستندات" stroke="#3B82F6" fillOpacity={1} fill="url(#colorDocs)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full text-muted-foreground">لا توجد بيانات كافية</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6 animate-in fade-in-50 duration-500">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  أداء المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userPerformance.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-y border-slate-200">
                          <th className="p-4 font-medium">الموظف</th>
                          <th className="p-4 font-medium">الدور</th>
                          <th className="p-4 font-medium">موقعة</th>
                          <th className="p-4 font-medium">مرفوضة</th>
                          <th className="p-4 font-medium">معدل الإنجاز</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPerformance.map((user, index) => (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-bold text-slate-900">{user.name}</td>
                            <td className="p-4 text-slate-600">{user.role}</td>
                            <td className="p-4 font-bold text-emerald-600">{user.signed}</td>
                            <td className="p-4 font-bold text-rose-600">{user.rejected}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700">{user.rate}%</span>
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${user.rate}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">لا توجد بيانات كافية</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}