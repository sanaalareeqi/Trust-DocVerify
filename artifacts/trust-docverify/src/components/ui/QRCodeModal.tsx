import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: number;
  docTitle: string;
}


export default function QRCodeModal({ isOpen, onClose, docId, docTitle }: QRCodeModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && docId) {
      setIsLoading(true);
      // إنشاء رابط التحقق باستخدام معرف الوثيقة
      const verifyUrl = `${window.location.origin}/verify/${docId}`;
      
      QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then(url => {
          setQrCodeUrl(url);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error generating QR code:", err);
          setIsLoading(false);
        });
    }
  }, [isOpen, docId]);

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `QR-${docId}.png`;
      link.click();
    }
  };

  const handlePrint = () => {
    if (qrCodeUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>QR Code - ${docTitle}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  text-align: center;
                  padding: 50px;
                  direction: rtl;
                }
                img {
                  max-width: 300px;
                  margin: 20px auto;
                }
                .info {
                  margin-top: 20px;
                  font-size: 14px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <h2>رمز التحقق السريع (QR Code)</h2>
              <p><strong>الوثيقة:</strong> ${docTitle}</p>
              <p><strong>رقم الوثيقة:</strong> ${docId}</p>
              <img src="${qrCodeUrl}" alt="QR Code" />
              <div class="info">
                <p>امسح الرابط للتحقق من صحة الوثيقة</p>
                <p>رابط التحقق: ${window.location.origin}/verify/${docId}</p>
              </div>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">رمز التحقق السريع (QR Code)</DialogTitle>
        </DialogHeader>
        
        <div className="py-6 flex flex-col items-center">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  <strong>الوثيقة:</strong> {docTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>رقم الوثيقة:</strong> {docId}
                </p>
                <p className="text-xs text-muted-foreground mt-2 break-all">
                  {window.location.origin}/verify/{docId}
                </p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button onClick={handleDownload} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  تحميل QR Code
                </Button>
                <Button onClick={handlePrint} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}