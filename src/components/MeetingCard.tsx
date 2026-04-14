import { Meeting } from "@/lib/types";
import { Phone, User, Briefcase, Edit2, Trash2, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingCardProps {
  meeting: Meeting;
  isSoon: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const restrictionConfig = {
  clean: { label: "Nome limpo", className: "restriction-clean" },
  up_to_10k: { label: "Até R$10 mil", className: "restriction-medium" },
  above_10k: { label: "Acima de R$10 mil", className: "restriction-high" },
};

export default function MeetingCard({ meeting, isSoon, onEdit, onDelete }: MeetingCardProps) {
  const r = restrictionConfig[meeting.restriction];

  return (
    <div className={`card-meeting ${isSoon ? "highlight-soon" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="time-display">{meeting.time}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.className}`}>{r.label}</span>
            {isSoon && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary animate-pulse">
                Em breve
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground truncate">{meeting.leadName}</h3>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{meeting.phone}</span>
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Pré-venda: {meeting.preSeller}</span>
            <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />Consultor: {meeting.consultant}</span>
            {meeting.downPayment && <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Entrada: {meeting.downPayment}</span>}
            {meeting.installment && <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Parcela: {meeting.installment}</span>}
            {meeting.restriction !== "clean" && <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Restrição: {r.label}</span>}
          </div>
          {meeting.notes && <p className="text-xs text-muted-foreground mt-2 italic">Obs: {meeting.notes}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
