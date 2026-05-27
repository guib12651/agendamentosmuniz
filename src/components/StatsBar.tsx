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
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <Users className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-display font-black text-foreground">{total}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total reuniões</p>
        </div>
      </div>
      <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <CheckCircle className="w-5 h-5 text-success shrink-0" />
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-display font-black text-success">{visitas}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Visitas</p>
        </div>
      </div>
      <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
        <XCircle className="w-5 h-5 text-destructive shrink-0" />
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-display font-black text-destructive">{naoCompareceu}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Não compareceu</p>
        </div>
      </div>
    </div>
  );
}
