import { Meeting, MeetingStatus, MarkingType } from "@/lib/types";
import { Phone, User, Briefcase, Edit2, Trash2, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingCardProps {
  meeting: Meeting;
  isSoon: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: MeetingStatus) => void;
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

export default function MeetingCard({ meeting, isSoon, onEdit, onDelete, onStatusChange }: MeetingCardProps) {
  const r = restrictionConfig[meeting.restriction];
  const s = statusConfig[meeting.status || "pending"];
  const StatusIcon = s.icon;

  return (
    <div className={`card-meeting ${isSoon ? "highlight-soon" : ""}`}>
      {/* Mobile: vertical stack / Desktop: horizontal */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Time + badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="time-display text-xl sm:text-2xl">{meeting.time}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.className}`}>{r.label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${s.className}`}>
              <StatusIcon className="w-3 h-3" />
              {s.label}
            </span>
            {isSoon && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary animate-pulse">
                Em breve
              </span>
            )}
          </div>

          {/* Lead name */}
          <h3 className="font-display text-lg font-semibold text-foreground truncate">{meeting.leadName}</h3>

          {/* Info grid */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" />{meeting.phone}</span>
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 shrink-0" />Pré-venda: {meeting.preSeller}</span>
            <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 shrink-0" />Consultor: {meeting.consultant}</span>
            {meeting.downPayment && <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 shrink-0" />Entrada: {meeting.downPayment}</span>}
            {meeting.installment && <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 shrink-0" />Parcela: {meeting.installment}</span>}
            {meeting.restriction !== "clean" && <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />Restrição: {r.label}</span>}
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              Tipo: {markingTypeLabels[meeting.markingType] || meeting.markingType}
            </span>
          </div>

          {meeting.notes && <p className="text-xs text-muted-foreground mt-2 italic">Obs: {meeting.notes}</p>}

          {/* Status buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {meeting.status !== "compareceu" && (
              <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10 h-10 sm:h-8 text-sm px-3" onClick={() => onStatusChange("compareceu")}>
                <CheckCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1" /> Compareceu
              </Button>
            )}
            {meeting.status !== "nao_compareceu" && (
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 h-10 sm:h-8 text-sm px-3" onClick={() => onStatusChange("nao_compareceu")}>
                <XCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1" /> Não compareceu
              </Button>
            )}
            {meeting.status !== "pending" && (
              <Button size="sm" variant="outline" className="text-muted-foreground h-10 sm:h-8 text-sm px-3" onClick={() => onStatusChange("pending")}>
                <Clock className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1" /> Pendente
              </Button>
            )}
          </div>
        </div>

        {/* Edit/Delete - horizontal on mobile, vertical on desktop */}
        <div className="flex sm:flex-col gap-2 sm:gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} className="h-10 w-10 sm:h-8 sm:w-8">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="h-10 w-10 sm:h-8 sm:w-8 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
