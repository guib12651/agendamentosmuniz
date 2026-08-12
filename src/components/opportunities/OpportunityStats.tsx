import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsData {
  pending: number;
  contacted: number;
  no_answer: number;
  no_whatsapp: number;
  scheduled: number;
}

interface OpportunityStatsProps {
  stats: StatsData;
  onFilterStatus: (status: string) => void;
  activeFilter: string;
}

export default function OpportunityStats({ stats, onFilterStatus, activeFilter }: OpportunityStatsProps) {
  const cards = [
    { key: "pending", label: "Não Contatados", color: "text-yellow-600", bg: "bg-[#FFF9E6]", border: "border-yellow-200", count: stats.pending },
    { key: "contacted", label: "Atenderam", color: "text-green-600", bg: "bg-[#F2FAF5]", border: "border-green-200", count: stats.contacted },
    { key: "no_answer", label: "Não Atenderam", color: "text-red-600", bg: "bg-[#FFF5F5]", border: "border-red-200", count: stats.no_answer },
    { key: "no_whatsapp", label: "Sem WhatsApp", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-100", count: stats.no_whatsapp },
    { key: "scheduled", label: "Agendados", color: "text-blue-600", bg: "bg-[#F0F7FF]", border: "border-blue-200", count: stats.scheduled },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            <span className="text-3xl font-black mt-1 text-slate-800">{card.count}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
