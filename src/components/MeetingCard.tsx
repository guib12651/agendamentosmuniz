import { Meeting, MeetingStatus, MarkingType, TriggerType } from "@/lib/types";
import { Phone, User, Briefcase, Edit2, Trash2, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock, Tag, MapPin, Video, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingCardProps {
  meeting: Meeting;
  isSoon: boolean;
  isAdmin?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: MeetingStatus) => void;
}

function canDelete(meeting: Meeting, isAdmin: boolean): { allowed: boolean; reason?: string } {
  if (isAdmin) return { allowed: true };
  const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
  const now = new Date();
  const diffMs = meetingDateTime.getTime() - now.getTime();
  const diffMin = diffMs / 1000 / 60;
  if (diffMin <= 30) {
    return { allowed: false, reason: "Não é possível excluir com menos de 30 min de antecedência." };
  }
  return { allowed: true };
}

const restrictionConfig = {
  clean: { label: "Nome limpo", className: "restriction-clean" },
  up_to_10k: { label: "Até R$10 mil", className: "restriction-medium" },
  above_10k: { label: "Acima de R$10 mil", className: "restriction-high" },
};

const statusConfig = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground", icon: Clock },
  compareceu: { label: "Compareceu", className: "bg-success/20 text-success", icon: CheckCircle },
  nao_compareceu: { label: "Não compareceu", className: "bg-destructive/20 text-destructive", icon: XCircle },
};

const markingTypeLabels: Record<MarkingType, string> = {
  lead_quente: "Lead quente",
  cnpj: "CNPJ",
  lista_fria: "Lista fria",
  instagram: "Instagram",
  indicacao: "Indicação",
};

const triggerLabels: Record<TriggerType, string> = {
  imovel: "Imóvel",
  construcao: "Construção",
  reforma: "Reforma",
  carro: "Carro",
  moto: "Moto",
  caminhao: "Caminhão",
  maquinario: "Maquinário",
  rural: "Rural",
};

export default function MeetingCard({ meeting, isSoon, isAdmin = false, onEdit, onDelete, onStatusChange }: MeetingCardProps) {
  const r = restrictionConfig[meeting.restriction];
  const s = statusConfig[meeting.status || "pending"];
  const StatusIcon = s.icon;
  const { allowed: canRemove, reason: removeReason } = canDelete(meeting, isAdmin);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:border-primary/30 group",
      isSoon && "ring-2 ring-primary animate-pulse"
    )}>
      {isSoon && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-primary" />
      )}
      
      <div className="flex flex-col gap-4">
        {/* Header: Time, Status and Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-2xl sm:text-3xl font-display font-black text-primary tracking-tight leading-none">
              {meeting.time}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {meeting.date.split("-").reverse().join("/")}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
              s.className
            )}>
              <StatusIcon className="w-3.5 h-3.5" />
              {s.label}
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border",
              r.className === "restriction-clean" ? "border-success/30 text-success bg-success/5" : 
              r.className === "restriction-medium" ? "border-amber-500/30 text-amber-500 bg-amber-500/5" :
              "border-destructive/30 text-destructive bg-destructive/5"
            )}>
              {r.label}
            </div>
          </div>
        </div>

        {/* Client Name & Quick Info */}
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight">
            {meeting.leadName}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary/60" />{meeting.phone}</span>
            <span className="flex items-center gap-1.5">
              {meeting.meetingType === "online" ? <Video className="w-3.5 h-3.5 text-purple-400" /> : <MapPin className="w-3.5 h-3.5 text-blue-400" />}
              {meeting.meetingType === "online" ? "Online" : "Presencial"}
            </span>
          </div>
        </div>

        {/* Detailed Info Grid - Collapsible/Compact on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border/30 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Pré-venda</span>
              <span className="font-bold text-foreground">{meeting.preSeller}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Consultor</span>
              <span className="font-bold text-foreground">{meeting.consultant}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Tipo</span>
              <span className="font-bold text-foreground">{markingTypeLabels[meeting.markingType] || meeting.markingType}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Interesse</span>
              <span className="font-bold text-foreground">{triggerLabels[meeting.trigger] || meeting.trigger}</span>
            </div>
          </div>
          {(meeting.downPayment || meeting.installment) && (
            <div className="col-span-full pt-1 mt-1 border-t border-border/20 flex gap-4">
              {meeting.downPayment && (
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Entrada</span>
                  <span className="font-bold text-foreground">{meeting.downPayment}</span>
                </div>
              )}
              {meeting.installment && (
                <div className="flex-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Parcela</span>
                  <span className="font-bold text-foreground">{meeting.installment}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {meeting.notes && (
          <div className="p-2.5 rounded-lg bg-primary/5 border-l-2 border-primary text-[11px] text-muted-foreground italic">
            "{meeting.notes}"
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          <div className="flex flex-1 gap-2">
            {meeting.status !== "compareceu" && (
              <Button 
                size="sm" 
                className="flex-1 h-11 sm:h-9 gap-2 bg-success/10 hover:bg-success text-success hover:text-white border-0 transition-all font-bold" 
                onClick={() => onStatusChange("compareceu")}
              >
                <CheckCircle className="w-4 h-4" /> Compareceu
              </Button>
            )}
            {meeting.status !== "nao_compareceu" && (
              <Button 
                size="sm" 
                className="flex-1 h-11 sm:h-9 gap-2 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border-0 transition-all font-bold" 
                onClick={() => onStatusChange("nao_compareceu")}
              >
                <XCircle className="w-4 h-4" /> Faltou
              </Button>
            )}
            {meeting.status !== "pending" && (
              <Button 
                size="sm" 
                variant="secondary" 
                className="flex-1 h-11 sm:h-9 gap-2 bg-muted/50 font-bold" 
                onClick={() => onStatusChange("pending")}
              >
                <Clock className="w-4 h-4" /> Resetar
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={onEdit} className="flex-1 sm:flex-none h-11 w-11 sm:h-9 sm:w-9 rounded-xl hover:bg-primary/10">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onDelete} 
              disabled={!canRemove} 
              title={!canRemove ? removeReason : undefined} 
              className="flex-1 sm:flex-none h-11 w-11 sm:h-9 sm:w-9 rounded-xl hover:bg-destructive/10 text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
