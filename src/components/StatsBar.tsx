import { Meeting } from "@/lib/types";
import { Users, CheckCircle, XCircle } from "lucide-react";

interface StatsBarProps {
  meetings: Meeting[];
}

export default function StatsBar({ meetings }: StatsBarProps) {
  const total = meetings.length;
  const visitas = meetings.filter((m) => m.status === "compareceu").length;
  const naoCompareceu = meetings.filter((m) => m.status === "nao_compareceu").length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="stat-card flex items-center gap-3">
        <Users className="w-5 h-5 text-primary" />
        <div>
          <p className="text-2xl font-display font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground">Total reuniões</p>
        </div>
      </div>
      <div className="stat-card flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-success" />
        <div>
          <p className="text-2xl font-display font-bold text-success">{visitas}</p>
          <p className="text-xs text-muted-foreground">Visitas</p>
        </div>
      </div>
      <div className="stat-card flex items-center gap-3">
        <XCircle className="w-5 h-5 text-destructive" />
        <div>
          <p className="text-2xl font-display font-bold text-destructive">{naoCompareceu}</p>
          <p className="text-xs text-muted-foreground">Não compareceu</p>
        </div>
      </div>
    </div>
  );
}
