import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsData {
  pending: number;
  contacted: number;
  no_answer: number;
  scheduled: number;
}

interface OpportunityStatsProps {
  stats: StatsData;
  onFilterStatus: (status: string) => void;
  activeFilter: string;
}

export default function OpportunityStats({ stats, onFilterStatus, activeFilter }: OpportunityStatsProps) {
  const cards = [
    { key: "pending", label: "Não Contatados", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100", count: stats.pending },
    { key: "contacted", label: "Atenderam", color: "text-green-600", bg: "bg-green-50", border: "border-green-100", count: stats.contacted },
    { key: "no_answer", label: "Não Atenderam", color: "text-red-600", bg: "bg-red-50", border: "border-red-100", count: stats.no_answer },
    { key: "scheduled", label: "Agendados", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", count: stats.scheduled },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.key}
          className={cn(
            "cursor-pointer transition-all hover:scale-[1.02] shadow-sm",
            card.bg,
            card.border,
            activeFilter === card.key ? "ring-2 ring-primary ring-offset-2" : ""
          )}
          onClick={() => onFilterStatus(activeFilter === card.key ? "all" : card.key)}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className={cn("text-xs font-bold uppercase tracking-wider", card.color)}>
              {card.label}
            </span>
            <span className="text-3xl font-black mt-1">{card.count}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
