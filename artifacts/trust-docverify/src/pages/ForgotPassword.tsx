import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({ title: "خطأ", description: "الرجاء إدخال البريد الإلكتروني", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsSent(true);
        toast({ title: "تم الإرسال", description: data.message });
      } else {
        throw new Error(data.error || "حدث خطأ");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md text-right">
          <CardHeader>
            <CardTitle className="text-2xl text-center"> تم الإرسال</CardTitle>
            <CardDescription className="text-center">
              تم إرسال رمز التحقق إلى بريدك الإلكتروني
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              الرمز صالح لمدة 10 دقائق
            </p>
            <Link href="/reset-password">
              <Button className="w-full">الذهاب إلى إعادة تعيين كلمة المرور</Button>
            </Link>
            <Link href="/login" className="text-sm text-primary hover:underline block">
              <ArrowLeft className="inline ml-1 h-4 w-4" />
              العودة إلى تسجيل الدخول
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-right">
          <CardTitle className="text-2xl">نسيت كلمة المرور؟</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-right block">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="example@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-4 pl-10"
                  dir="ltr"
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Mail className="h-4 w-4 ml-2" />}
              إرسال رمز التحقق
            </Button>
            
            <Link href="/login" className="text-sm text-primary hover:underline block text-center">
              <ArrowLeft className="inline ml-1 h-4 w-4" />
              العودة إلى تسجيل الدخول
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}