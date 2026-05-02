import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FileText, Lock, Shield, GraduationCap } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@assets/generated_images/abstract_blue_and_white_digital_security_blockchain_background.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans" dir="rtl">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-right space-y-8 animate-in slide-in-from-bottom-5 duration-700 fade-in">
              <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                أمان وموثوقية <span className="text-primary">مستنداتك</span> في مكان واحد
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl ms-auto">
                نظام TrustDoc يوفر بيئة آمنة للتحقق من الشهادات، العقود، والفواتير باستخدام تقنية البلوك تشين والتوقيع الرقمي المعتمد.
              </p>
              
              {/* ✅ مجموعة الأزرار - زر إنشاء طلب شهادة وزر التحقق */}
              <div className="flex flex-wrap gap-4 justify-end">
                <Link href="/student-request">
                  <Button size="lg" className="text-lg px-8 h-14 font-bold rounded-xl shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white transition-all">
                    <GraduationCap className="h-5 w-5 ml-2" />
                    إنشاء طلب شهادة
                  </Button>
                </Link>
                <Link href="/verify">
                  <Button size="lg" variant="outline" className="text-lg px-8 h-14 font-bold rounded-xl border-primary/30 hover:bg-primary/5 transition-all">
                    <FileText className="h-5 w-5 ml-2" />
                    تحقق من وثيقة
                  </Button>
                </Link>
              </div>
              
              <div className="pt-8 flex items-center justify-end gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>تشفير عالي الأمان</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>معتمد قانونياً</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>موثق بـ Blockchain</span>
                </div>
              </div>
            </div>

            <div className="relative animate-in zoom-in-50 duration-1000 fade-in delay-200">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl blur-3xl -z-10" />
              <img 
                src={heroImage} 
                alt="Digital Security" 
                className="rounded-3xl shadow-2xl border border-primary/10 object-cover w-full h-[500px] hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">خدماتنا المميزة</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              نقدم حلولاً متكاملة لجميع أنواع المستندات لضمان حقوق الأفراد والمؤسسات
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: "الشهادات الجامعية",
                desc: "توثيق الشهادات الأكاديمية وحمايتها من التزوير لتسهيل عملية التحقق للمؤسسات والشركات.",
                action: "طلب شهادة جديدة"
              },
              {
                icon: Shield,
                title: "العقود والاتفاقيات",
                desc: "توقيع وحفظ العقود رقمياً مع ضمان عدم القابلية للتعديل بعد التوقيع وحفظ السجل الزمني.",
                action: "إنشاء عقد"
              },
              {
                icon: Lock,
                title: "الفواتير والإيصالات",
                desc: "إصدار فواتير موثقة تمنع التلاعب المالي وتضمن حقوق البائع والمشتري بشكل فوري.",
                action: "إنشاء فاتورة"
              }
            ].map((feature, i) => (
              <Card key={i} className="group hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 bg-background/50 backdrop-blur">
                <CardContent className="p-8 text-right space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <feature.icon className="h-7 w-7 text-primary group-hover:text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                  {i === 0 && (
                    <Link href="/student-request">
                      <Button variant="link" className="text-primary gap-1 px-0">
                        {feature.action} ←
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ قسم إضافي: كيف تبدأ؟ */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">كيف تبدأ؟</h2>
            <p className="text-muted-foreground text-lg">ثلاث خطوات بسيطة للحصول على وثيقتك الموثقة</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mx-auto">1</div>
              <h3 className="text-xl font-bold">قدّم طلبك</h3>
              <p className="text-muted-foreground">املأ بياناتك في نموذج طلب الشهادة</p>
            </div>
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mx-auto">2</div>
              <h3 className="text-xl font-bold">مراجعة البيانات</h3>
              <p className="text-muted-foreground">يتولى فريقنا مراجعة بياناتك والتحقق منها</p>
            </div>
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mx-auto">3</div>
              <h3 className="text-xl font-bold">استلام الشهادة</h3>
              <p className="text-muted-foreground">تصدر الشهادة وتوقّع رقمياً وتصل إلى حسابك</p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/student-request">
              <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8">
                <GraduationCap className="h-5 w-5" />
                ابدأ الآن - إنشاء طلب شهادة
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}