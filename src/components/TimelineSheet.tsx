import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Phone, 
  Handshake, 
  ShoppingCart, 
  FileText, 
  Gavel, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  date: string;
  event: string;
  icon: any;
  isMain?: boolean;
  isGoal?: boolean;
  observations?: string;
  color?: string;
}

interface TimelineSheetProps {
  isOpen: boolean;
  onClose: () => void;
  leadId?: string;
  clientName?: string;
  phone?: string;
}

export default function TimelineSheet({ isOpen, onClose, leadId, clientName, phone }: TimelineSheetProps) {
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && (leadId || phone || clientName)) {
      fetchHistory();
    }
  }, [isOpen, leadId, phone, clientName]);

  const fetchHistory = async () => {
    setLoading(true);
    const events: TimelineEvent[] = [];

    try {
      let mainLeadId = leadId;

      // If we don't have leadId but have phone, find the meeting
      if (!mainLeadId && phone) {
        const { data: meeting } = await supabase
          .from("meetings")
          .select("id")
          .eq("phone", phone)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (meeting) mainLeadId = meeting.id;
      }

      // 1. Fetch Meeting data
      if (mainLeadId) {
        const { data: meeting } = await supabase
          .from("meetings")
          .select("*")
          .eq("id", mainLeadId)
          .single();

        if (meeting) {
          // Lead created (conceptualized as meeting created_at)
          events.push({
            date: meeting.created_at,
            event: "Lead no sistema",
            icon: Users,
            color: "bg-blue-500",
            isMain: true
          });

          // Appointment
          events.push({
            date: meeting.created_at,
            event: "Agendamento marcado",
            icon: Calendar,
            color: "bg-blue-500"
          });

          // Calls - find calls for this lead name
          const { data: calls } = await supabase
            .from("calls")
            .select("*")
            .eq("lead_name", meeting.lead_name)
            .order("call_time", { ascending: true });
          
          if (calls) {
            calls.forEach(c => {
              events.push({
                date: c.call_time,
                event: "Ligação realizada",
                icon: Phone,
                color: "bg-blue-500",
                observations: c.result
              });
            });
          }

          // Status changes (we can only infer current status or major milestones)
          if (meeting.status === "compareceu" || meeting.status === "visita_realizada" || meeting.status === "em_negociacao" || meeting.status === "venda_concluida") {
            events.push({
              date: meeting.date,
              event: "Cliente compareceu",
              icon: CheckCircle2,
              color: "bg-blue-500"
            });
          }

          if (meeting.status === "em_negociacao" || meeting.status === "venda_concluida") {
            events.push({
              date: meeting.date,
              event: "Negociação iniciada",
              icon: Handshake,
              color: "bg-blue-500"
            });
          }

          if (meeting.status === "venda_concluida" && meeting.sale_date) {
            events.push({
              date: meeting.sale_date,
              event: "Venda concluída",
              icon: ShoppingCart,
              color: "bg-emerald-500",
              isMain: true,
              isGoal: true
            });
          }

          // Quotas & Bids
          const { data: quotas } = await supabase
            .from("quotas")
            .select("*")
            .eq("sale_id", mainLeadId);
          
          if (quotas) {
            for (const q of quotas) {
              events.push({
                date: q.created_at,
                event: "Cota criada",
                icon: FileText,
                color: "bg-blue-500",
                isMain: true
              });

              const { data: bids } = await supabase
                .from("bids")
                .select("*")
                .eq("quota_id", q.id);
              
              if (bids) {
                bids.forEach(b => {
                  events.push({
                    date: b.created_at,
                    event: `Lance registrado (${b.bid_type})`,
                    icon: Gavel,
                    color: "bg-amber-500",
                    observations: `Assembleia: ${b.assembly_date.split('-').reverse().slice(0, 2).join('/')}`
                  });

                  if (b.status === "contemplated") {
                    events.push({
                      date: b.created_at,
                      event: "Lance contemplado! 🏆",
                      icon: TrendingUp,
                      color: "bg-emerald-500",
                      isMain: true,
                      isGoal: true
                    });
                  }
                });
              }
            }
          }
        }
      }

      setHistory(events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-l border-border p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-6 bg-slate-900 text-white">
          <SheetTitle className="text-xl font-black flex items-center gap-2 text-white">
            <Clock className="w-5 h-5 text-primary" />
            Timeline do Cliente
          </SheetTitle>
          <p className="text-slate-400 text-sm font-medium">Histórico operacional completo</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <Clock className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum histórico encontrado</p>
            </div>
          ) : (
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
              {history.map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-4 group">
                  <div className={cn(
                    "absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-card transition-all duration-300 z-10",
                    item.color || "bg-slate-700",
                    item.isGoal ? "scale-110 shadow-lg shadow-primary/20" : "scale-100"
                  )}>
                    <item.icon className={cn("w-5 h-5 text-white", item.isGoal && "animate-pulse")} />
                  </div>
                  <div className="flex-1 ml-12 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <h4 className={cn(
                        "font-black tracking-tight",
                        item.isMain ? "text-foreground text-base" : "text-muted-foreground text-sm"
                      )}>
                        {item.event}
                      </h4>
                      <time className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">
                        {format(new Date(item.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </time>
                    </div>
                    {item.observations && (
                      <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50 italic">
                        {item.observations}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}