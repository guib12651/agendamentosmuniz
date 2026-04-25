import { Bell, Check, Trash2, Smartphone, BellOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface NotificationBellProps {
  userId: string | undefined;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteAll } =
    useNotifications(userId);
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } =
    usePushSubscription(userId);

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast({ title: "Notificações no celular desativadas" });
    } else {
      const { error } = await subscribe();
      if (error) {
        toast({
          title: "Não foi possível ativar",
          description:
            permission === "denied"
              ? "Você precisa permitir notificações nas configurações do navegador."
              : error,
          variant: "destructive",
        });
      } else {
        toast({ title: "Notificações no celular ativadas!" });
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="relative h-9 w-9 p-0">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0">
        {isSupported && (
          <button
            onClick={handleTogglePush}
            disabled={isLoading}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 text-xs border-b border-border hover:bg-muted/50 transition-colors disabled:opacity-50",
              isSubscribed ? "text-muted-foreground" : "text-primary"
            )}
          >
            {isSubscribed ? <BellOff className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span className="font-medium">
              {isLoading
                ? "Aguarde..."
                : isSubscribed
                ? "Desativar notificações no celular"
                : "Ativar notificações no celular"}
            </span>
          </button>
        )}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm">Notificações</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllAsRead} className="h-7 px-2 text-xs">
                <Check className="w-3 h-3 mr-1" /> Ler todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={deleteAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted/50 transition-colors flex gap-3",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      !n.read ? "bg-primary" : "bg-transparent"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
