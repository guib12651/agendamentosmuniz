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
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="stat-card flex flex-col items-center justify-center p-3 sm:p-5 text-center bg-card/50 border-border/40 backdrop-blur-sm rounded-2xl transition-all hover:border-primary/30">
        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2 opacity-80" />
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-display font-black text-foreground leading-none">{total}</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mt-1.5 truncate">Agendados</p>
        </div>
      </div>
      <div className="stat-card flex flex-col items-center justify-center p-3 sm:p-5 text-center bg-card/50 border-border/40 backdrop-blur-sm rounded-2xl transition-all hover:border-success/30">
        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success mb-2 opacity-80" />
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-display font-black text-success leading-none">{visitas}</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mt-1.5 truncate">Visitas</p>
        </div>
      </div>
      <div className="stat-card flex flex-col items-center justify-center p-3 sm:p-5 text-center bg-card/50 border-border/40 backdrop-blur-sm rounded-2xl transition-all hover:border-destructive/30">
        <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive mb-2 opacity-80" />
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-display font-black text-destructive leading-none">{naoCompareceu}</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mt-1.5 truncate">Faltas</p>
        </div>
      </div>
    </div>
  );
}
