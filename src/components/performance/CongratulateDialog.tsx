import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EmployeeMetrics } from "@/lib/performanceQueries";

interface Props {
  employee: EmployeeMetrics | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSent?: () => void;
}

export function CongratulateDialog({ employee, open, onOpenChange, onSent }: Props) {
  const { profile } = useAuth();
  const firstName = employee?.displayName.split(" ")[0] || "";
  const defaultMsg = `Você está fazendo um trabalho excelente! Continue assim, ${firstName}. 🚀`;
  const [message, setMessage] = useState(defaultMsg);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!employee || !profile) return;
    const text = message.trim() || defaultMsg;
    setSending(true);
    const { error } = await supabase.from("recognitions").insert({
      recipient_user_id: employee.userId,
      admin_user_id: profile.id,
      goal_progress_id: null,
      title: `Parabéns, ${firstName}!`,
      message: text,
      metric_label: "Reconhecimento",
      metric_value: "",
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar o reconhecimento.");
      return;
    }
    toast.success(`🎉 Parabéns enviado para ${firstName}!`);
    setMessage(defaultMsg);
    onOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setMessage(defaultMsg);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-primary" />
            Parabenizar {firstName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="msg" className="text-xs">
            Mensagem (aparecerá em tela cheia com fogos para o funcionário)
          </Label>
          <Textarea
            id="msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={280}
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {message.length}/280
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <PartyPopper className="w-4 h-4 mr-1" />
            {sending ? "Enviando..." : "Enviar parabéns"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
