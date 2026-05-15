import { useState } from "react";
import { Calendar, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PeriodType = "daily" | "weekly" | "monthly" | "annual" | "custom";

interface PeriodFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}

const periodLabels: Record<PeriodType, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  annual: "Anual",
  custom: "Personalizado",
};

export function getDateRange(period: PeriodType, selectedDate: string, customStart: string, customEnd: string): { start: string; end: string } {
  const ref = new Date(selectedDate + "T12:00:00");

  switch (period) {
    case "daily":
      return { start: selectedDate, end: selectedDate };
    case "weekly": {
      const day = ref.getDay();
      const diffToMonday = (day + 6) % 7;
      const start = new Date(ref);
      start.setDate(ref.getDate() - diffToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: fmt(start), end: fmt(end) };
    }
    case "monthly": {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case "annual": {
      const start = new Date(ref.getFullYear(), 0, 1);
      const end = new Date(ref.getFullYear(), 11, 31);
      return { start: fmt(start), end: fmt(end) };
    }
    case "custom":
      return { start: customStart || selectedDate, end: customEnd || selectedDate };
  }
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function PeriodFilter({
  selectedDate,
  onDateChange,
  period,
  onPeriodChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: PeriodFilterProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Date inputs (Moved UP for better usability) */}
      <div className="flex flex-wrap items-end gap-2">
        {period === "custom" ? (
          <>
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Data inicial</label>
              <Input type="date" className="h-11 sm:h-9 text-base sm:text-sm bg-card border-border/50" value={customStart} onChange={(e) => onCustomStartChange(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Data final</label>
              <Input type="date" className="h-11 sm:h-9 text-base sm:text-sm bg-card border-border/50" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="space-y-1.5 flex-1">
            <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
              {period === "daily" ? "Data selecionada" : "Data de referência"}
            </label>
            <Input type="date" className="h-11 sm:h-9 text-base sm:text-sm bg-card border-border/50" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} />
          </div>
        )}
      </div>

      {/* Period buttons - Scrollable on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar -mx-1 px-1">
          {(Object.keys(periodLabels) as PeriodType[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => onPeriodChange(p)}
              className={`h-9 text-xs px-4 rounded-full transition-all shrink-0 ${
                period === p 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                  : "bg-card border-border/50 hover:border-primary/50"
              }`}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
        
        <Button
          size="sm"
          variant="secondary"
          className="h-9 text-xs px-4 rounded-full sm:ml-auto shrink-0 bg-muted/50 border border-border/30 hover:bg-muted"
          onClick={() => { onDateChange(today); onPeriodChange("daily"); }}
        >
          <CalendarDays className="w-3.5 h-3.5 mr-2" /> Ir para Hoje
        </Button>
      </div>
    </div>
  );
}
