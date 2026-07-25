import { Card } from "@/components/ui/card";
import { CalendarCheck, CheckCircle, Phone, TrendingUp, Trophy } from "lucide-react";
import type { OverviewMetrics } from "@/lib/performanceQueries";

interface Props {
  overview: OverviewMetrics;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function PerformanceOverview({ overview }: Props) {
  const cards = [
    { icon: CalendarCheck, label: "Reuniões", value: overview.meetings },
    { icon: CheckCircle, label: "Visitas", value: overview.visits },
    { icon: Phone, label: "Ligações", value: overview.calls },
    {
      icon: TrendingUp,
      label: "Vendas",
      value: overview.sales,
      hint: overview.salesAmount > 0 ? formatBRL(overview.salesAmount) : undefined,
    },
    { icon: Trophy, label: "Metas atingidas", value: overview.goalsAchieved },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <c.icon className="w-4 h-4 text-primary" />
            {c.label}
          </div>
          <div className="text-2xl font-display font-black text-foreground">{c.value}</div>
          {c.hint && <div className="text-xs text-primary font-bold mt-1">{c.hint}</div>}
        </Card>
      ))}
    </div>
  );
}
