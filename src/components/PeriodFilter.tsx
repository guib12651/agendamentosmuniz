import { useState } from "react";
import { Calendar, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PeriodType = "daily" | "monthly" | "quarterly" | "semi_annual" | "annual" | "custom";

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
  monthly: "Mensal",
  quarterly: "Trimestral",
  semi_annual: "Semestral",
  annual: "Anual",
  custom: "Personalizado",
};

export function getDateRange(period: PeriodType, selectedDate: string, customStart: string, customEnd: string): { start: string; end: string } {
  const ref = new Date(selectedDate + "T12:00:00");

  switch (period) {
    case "daily":
      return { start: selectedDate, end: selectedDate };
    case "monthly": {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    case "quarterly": {
      const end = new Date(ref);
      const start = new Date(ref);
      start.setMonth(start.getMonth() - 2);
      start.setDate(1);
      return { start: fmt(start), end: fmt(end) };
    }
    case "semi_annual": {
      const end = new Date(ref);
      const start = new Date(ref);
      start.setMonth(start.getMonth() - 5);
      start.setDate(1);
      return { start: fmt(start), end: fmt(end) };
    }
    case "annual": {
      const end = new Date(ref);
      const start = new Date(ref);
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
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
    <div className="space-y-2">
      {/* Period buttons */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(periodLabels) as PeriodType[]).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? "default" : "outline"}
            onClick={() => onPeriodChange(p)}
            className={`h-8 text-xs px-2.5 ${period === p ? "bg-primary text-primary-foreground" : ""}`}
          >
            {periodLabels[p]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs px-2.5 ml-auto"
          onClick={() => { onDateChange(today); onPeriodChange("daily"); }}
        >
          <CalendarDays className="w-3.5 h-3.5 mr-1" /> Hoje
        </Button>
      </div>

      {/* Date inputs */}
      <div className="flex flex-wrap items-end gap-2">
        {period === "custom" ? (
          <>
            <div className="space-y-1 flex-1 min-w-[130px]">
              <label className="text-xs text-muted-foreground">Data inicial</label>
              <Input type="date" className="h-10 sm:h-9 text-base sm:text-sm" value={customStart} onChange={(e) => onCustomStartChange(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1 min-w-[130px]">
              <label className="text-xs text-muted-foreground">Data final</label>
              <Input type="date" className="h-10 sm:h-9 text-base sm:text-sm" value={customEnd} onChange={(e) => onCustomEndChange(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="space-y-1 flex-1 min-w-[130px]">
            <label className="text-xs text-muted-foreground">
              {period === "daily" ? "Data" : "Data de referência"}
            </label>
            <Input type="date" className="h-10 sm:h-9 text-base sm:text-sm" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}
