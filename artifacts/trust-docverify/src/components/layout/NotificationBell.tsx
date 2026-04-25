import { useState, useEffect } from "react";
import { Bell, Clock, ExternalLink, X, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  recipientId: number;
  documentId: number;
  message: string;
  reason?: string;
  isRead: boolean;
  createdAt: string;
  document?: {
    id: number;
    title: string;
    type: string;
    documentNumber?: string;
  };
  returner?: {
    id: number;
    name: string;
    role: string;
  };
}

export default function NotificationBell() {
  const { toast } = useToast();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // جلب الإشعارات من API
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch("/api/notifications", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("فشل في جلب الإشعارات");
      return response.json();
    },
    refetchInterval: 30000, // تحديث كل 30 ثانية
  });

  // تحديث حالة الإشعار كمقروء
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("فشل في تحديث الإشعار");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  const handleOpenNotification = async (notif: Notification) => {
    setSelectedNotification(notif);
    setIsDialogOpen(true);
    
    // تحديث حالة الإشعار كمقروء
    if (!notif.isRead) {
      await markAsReadMutation.mutateAsync(notif.id);
    }
  };

  // تحويل نوع الوثيقة إلى نص عربي
  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      certificate: "شهادة",
      contract: "عقد",
      invoice: "فاتورة",
    };
    return types[type] || type;
  };

  // تنسيق الوقت
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground border-2 border-background animate-in zoom-in"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0 text-right">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30" dir="rtl">
            <h3 className="font-bold text-sm">التنبيهات</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {unreadCount} جديد
              </span>
            )}
          </div>
          <ScrollArea className="h-[350px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 mb-2 animate-spin" />
                <p className="text-sm">جاري التحميل...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">لا توجد تنبيهات جديدة</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif: Notification) => (
                  <div 
                    key={notif.id}
                    className={`px-4 py-3 border-b last:border-0 transition-colors hover:bg-muted/50 cursor-pointer ${!notif.isRead ? 'bg-primary/5' : ''}`}
                    onClick={() => handleOpenNotification(notif)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm">إشعار</span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(notif.createdAt)}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {notif.message}
                    </p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-primary font-bold text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNotification(notif);
                      }}
                    >
                      فتح التفاصيل
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-2 border-t text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-muted-foreground"
              onClick={() => refetch()}
            >
              تحديث
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-end">
              <span>تفاصيل الإشعار</span>
              <Bell className="h-5 w-5 text-primary" />
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4 py-4">
              <div className="space-y-1 bg-muted/30 p-4 rounded-xl">
                <p className="text-sm leading-relaxed text-foreground">
                  {selectedNotification.message}
                </p>
              </div>
              
              {selectedNotification.document && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground tracking-wider uppercase">رقم المستند</p>
                    <p className="font-bold text-sm">{selectedNotification.document.documentNumber || selectedNotification.document.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground tracking-wider uppercase">نوع الوثيقة</p>
                    <p className="font-bold text-sm">{getDocumentTypeLabel(selectedNotification.document.type)}</p>
                  </div>
                </div>
              )}
              
              {selectedNotification.reason && (
                <div className="space-y-1 bg-red-50 p-4 rounded-xl border border-red-200">
                  <p className="text-xs text-red-600 mb-1 font-bold">سبب الإعادة</p>
                  <p className="text-sm leading-relaxed text-red-800">
                    {selectedNotification.reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row-reverse gap-2">
            <Button 
              className="flex-1 font-bold gap-2"
              onClick={() => {
                setIsDialogOpen(false);
                if (selectedNotification?.documentId) {
                  window.location.href = `/sign?docId=${selectedNotification.documentId}`;
                }
              }}
            >
              <ExternalLink className="h-4 w-4" />
              فتح المستند
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}