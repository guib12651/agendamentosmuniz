import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarCheck, TrendingUp, Trophy, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getMeetings } from "@/lib/store";
import { Meeting } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MeusAgendamentos() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [preSellers, setPreSellers] = useState<string[]>([]);
  const [selectedPreSeller, setSelectedPreSeller] = useState<string>("");

  useEffect(() => {
    getMeetings().then(setMeetings);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setSelectedPreSeller(profile?.displayName || "");
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, role")
      .eq("role", "pre_seller")
      .then(({ data }) => {
        if (data) {
          const names = data.map((p: any) => p.display_name).sort();
          setPreSellers(names);
          if (!selectedPreSeller) setSelectedPreSeller(names[0] || "");
        }
      });
  }, [isAdmin, profile]);

  const monthStart = useMemo(() => fmt(new Date(year, month, 1)), [year, month]);
  const monthEnd = useMemo(() => fmt(new Date(year, month + 1, 0)), [year, month]);

  const filteredMeetings = useMemo(() => {
    const target = selectedPreSeller.trim().toLowerCase();
    return meetings.filter((m) => {
      if (m.date < monthStart || m.date > monthEnd) return false;
      if (!target) return true;
      return m.preSeller.toLowerCase() === target;
    });
  }, [meetings, monthStart, monthEnd, selectedPreSeller]);

  // Group by date
  const byDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of filteredMeetings) {
      const arr = map.get(m.date) || [];
      arr.push(m);
      map.set(m.date, arr);
    }
    return map;
  }, [filteredMeetings]);

  const total = filteredMeetings.length;
  const daysWithMeetings = byDate.size;
  const bestDay = useMemo(() => {
    let best: { date: string; count: number } | null = null;
    byDate.forEach((arr, date) => {
      if (!best || arr.length > best.count) best = { date, count: arr.length };
    });
    return best;
  }, [byDate]);

  // Avg per business day in the month
  const businessDays = useMemo(() => {
    const last = new Date(year, month + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= last; d++) {
      const wd = new Date(year, month, d).getDay();
      if (wd !== 0 && wd !== 6) count++;
    }
    return count;
  }, [year, month]);
  const avgPerBusinessDay = businessDays ? (total / businessDays).toFixed(1) : "0";

  // Build calendar grid
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0 = sun
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells: ({ date: string; day: number; count: number } | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= lastDate; d++) {
      const date = fmt(new Date(year, month, d));
      cells.push({ date, day: d, count: byDate.get(date)?.length || 0 });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month, byDate]);

  const maxCount = useMemo(() => {
    let max = 0;
    byDate.forEach((arr) => { if (arr.length > max) max = arr.length; });
    return max;
  }, [byDate]);

  const heatClass = (count: number) => {
    if (count === 0) return "bg-card border-border text-muted-foreground";
    const intensity = maxCount ? count / maxCount : 0;
    if (intensity > 0.75) return "bg-primary text-primary-foreground border-primary font-bold";
    if (intensity > 0.5) return "bg-primary/70 text-primary-foreground border-primary/70 font-bold";
    if (intensity > 0.25) return "bg-primary/40 text-foreground border-primary/40 font-semibold";
    return "bg-primary/20 text-foreground border-primary/30 font-semibold";
  };

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  };

  const sortedDays = useMemo(() => {
    return Array.from(byDate.entries())
      .map(([date, arr]) => ({ date, meetings: arr }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [byDate]);

  const formatBR = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  const weekdayOf = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return WEEKDAYS_FULL[new Date(y, m - 1, d).getDay()];
  };

  return (
    <div className="min-h-screen pb-8">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-2 py-3 px-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button size="sm" variant="ghost" onClick={() => navigate("/")} className="h-9 w-9 p-0 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-display font-bold text-primary leading-tight truncate">
                Meus Agendamentos
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Total por dia do mês
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mt-3 sm:mt-4 space-y-4 px-3 sm:px-6">
        {/* Month nav + pre-seller select */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg">
            <Button size="sm" variant="ghost" onClick={goPrev} className="h-9 w-9 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-display font-bold text-sm sm:text-base text-foreground px-2 min-w-[140px] text-center">
              {MONTHS_PT[month]} {year}
            </span>
            <Button size="sm" variant="ghost" onClick={goNext} className="h-9 w-9 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
            className="h-9 text-xs"
          >
            Mês atual
          </Button>

          {isAdmin && (
            <div className="ml-auto min-w-[180px]">
              <Select value={selectedPreSeller} onValueChange={setSelectedPreSeller}>
                <SelectTrigger className="h-9 text-sm bg-card border-border">
                  <SelectValue placeholder="Pré-vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {preSellers.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <CalendarCheck className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{total}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total no mês</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{avgPerBusinessDay}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Média/dia útil</p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <Trophy className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">
                {bestDay ? bestDay.count : 0}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {bestDay ? `Melhor: ${formatBR(bestDay.date).slice(0, 5)}` : "Melhor dia"}
              </p>
            </div>
          </div>
          <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <CalendarDays className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{daysWithMeetings}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Dias com agend.</p>
            </div>
          </div>
        </div>

        {/* Calendar / heatmap */}
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <h2 className="font-display font-bold text-sm sm:text-base mb-3 text-foreground">
            Agendamentos por dia
          </h2>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
            {WEEKDAYS_PT.map((w) => (
              <div key={w} className="text-center text-[10px] sm:text-xs text-muted-foreground font-semibold">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell, i) =>
              cell ? (
                <button
                  key={i}
                  onClick={() => navigate(`/?date=${cell.date}`)}
                  className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 ${heatClass(cell.count)}`}
                  title={`${formatBR(cell.date)}: ${cell.count} agendamento(s)`}
                >
                  <span className="text-[10px] sm:text-xs leading-none">{cell.day}</span>
                  {cell.count > 0 && (
                    <span className="text-xs sm:text-sm leading-tight mt-0.5">{cell.count}</span>
                  )}
                </button>
              ) : (
                <div key={i} className="aspect-square" />
              )
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-3">
            Toque em um dia para abrir a agenda dele.
          </p>
        </div>

        {/* Detailed list */}
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <h2 className="font-display font-bold text-sm sm:text-base mb-3 text-foreground">
            Detalhamento
          </h2>
          {sortedDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum agendamento neste mês.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedDays.map(({ date, meetings: dayMeetings }) => {
                const compareceu = dayMeetings.filter((m) => m.status === "compareceu").length;
                const naoCompareceu = dayMeetings.filter((m) => m.status === "nao_compareceu").length;
                const pendente = dayMeetings.filter((m) => m.status === "pending").length;
                return (
                  <button
                    key={date}
                    onClick={() => navigate(`/?date=${date}`)}
                    className="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 bg-background border border-border rounded-md hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-sm text-foreground">
                        {formatBR(date)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        {weekdayOf(date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-display font-bold text-base sm:text-lg text-primary">
                        {dayMeetings.length}
                      </span>
                      <div className="flex flex-col text-[10px] sm:text-xs leading-tight">
                        <span className="text-success">{compareceu}✓</span>
                        <span className="text-destructive">{naoCompareceu}✗</span>
                        <span className="text-muted-foreground">{pendente}•</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
