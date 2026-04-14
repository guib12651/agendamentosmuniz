import { Meeting } from "@/lib/types";
import { Users, CheckCircle, AlertTriangle, UserCheck } from "lucide-react";

interface StatsBarProps {
  meetings: Meeting[];
}

export default function StatsBar({ meetings }: StatsBarProps) {
  const total = meetings.length;
  const clean = meetings.filter((m) => m.restriction === "clean").length;
  const restricted = meetings.filter((m) => m.restriction !== "clean").length;

  const sellerCounts: Record<string, number> = {};
  meetings.forEach((m) => {
    sellerCounts[m.preSeller] = (sellerCounts[m.preSeller] || 0) + 1;
  });
  const topSellers = Object.entries(sellerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="stat-card flex items-center gap-3">
        <Users className="w-5 h-5 text-primary" />
        <div>
          <p className="text-2xl font-display font-bold text-primary">{total}</p>
          <p className="text-xs text-muted-foreground">Total reuniões</p>
        </div>
      </div>
      <div className="stat-card flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-success" />
        <div>
          <p className="text-2xl font-display font-bold text-success">{clean}</p>
          <p className="text-xs text-muted-foreground">Nome limpo</p>
        </div>
      </div>
      <div className="stat-card flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <div>
          <p className="text-2xl font-display font-bold text-destructive">{restricted}</p>
          <p className="text-xs text-muted-foreground">Com restrição</p>
        </div>
      </div>
      <div className="stat-card flex items-center gap-3">
        <UserCheck className="w-5 h-5 text-primary" />
        <div>
          {topSellers.length > 0 ? (
            topSellers.map(([name, count]) => (
              <p key={name} className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{name}</span>: {count}
              </p>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum pré-vendedor</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">Por pré-vendedor</p>
        </div>
      </div>
    </div>
  );
}
