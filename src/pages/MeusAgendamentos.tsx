import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarCheck, TrendingUp, Trophy, CalendarDays, Filter, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getMeetings, updateMeetingStatus, deleteMeeting } from "@/lib/store";
import { Meeting, MeetingStatus, MarkingType, TriggerType } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import MeetingCard from "@/components/MeetingCard";
import { toast } from "sonner";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const markingTypeLabels: Record<MarkingType, string> = {
  lead_quente: "Lead quente",
  cnpj: "CNPJ",
  lista_fria: "Lista fria",
  instagram: "Instagram",
  indicacao: "Indicação",
};
const triggerLabels: Record<TriggerType, string> = {
  imovel: "Imóvel", construcao: "Construção", reforma: "Reforma", carro: "Carro",
  moto: "Moto", caminhao: "Caminhão", maquinario: "Maquinário", rural: "Rural",
};

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Returns the registration date (YYYY-MM-DD) in America/Sao_Paulo timezone.
// Falls back to the meeting date if createdAt is unavailable.
function registrationDate(m: Meeting): string {
  if (!m.createdAt) return m.date;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(m.createdAt));
    return parts; // en-CA returns YYYY-MM-DD
  } catch {
    return m.date;
  }
}

type StatusFilter = "all" | MeetingStatus;
type MarkingFilter = "all" | MarkingType;
type TriggerFilter = "all" | TriggerType;
type MeetingTypeFilter = "all" | "presencial" | "online";

export default function MeusAgendamentos() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [preSellers, setPreSellers] = useState<string[]>([]);
  const [selectedPreSeller, setSelectedPreSeller] = useState<string>("");

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [markingFilter, setMarkingFilter] = useState<MarkingFilter>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<MeetingTypeFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Day detail modal
  const [openDayDate, setOpenDayDate] = useState<string | null>(null);

  const reload = () => getMeetings().then(setMeetings);

  useEffect(() => { reload(); }, []);

  // Realtime: keep tags & list always fresh
  useEffect(() => {
    const channel = supabase
      .channel("realtime-my-meetings")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const usingCustomRange = !!(customStart && customEnd);
  const monthStart = useMemo(() => fmt(new Date(year, month, 1)), [year, month]);
  const monthEnd = useMemo(() => fmt(new Date(year, month + 1, 0)), [year, month]);
  const rangeStart = usingCustomRange ? customStart : monthStart;
  const rangeEnd = usingCustomRange ? customEnd : monthEnd;

  const filteredMeetings = useMemo(() => {
    const target = selectedPreSeller.trim().toLowerCase();
    const lead = leadSearch.trim().toLowerCase();
    return meetings.filter((m) => {
      const regDate = registrationDate(m);
      if (regDate < rangeStart || regDate > rangeEnd) return false;
      if (target && m.preSeller.toLowerCase() !== target) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (markingFilter !== "all" && m.markingType !== markingFilter) return false;
      if (triggerFilter !== "all" && m.trigger !== triggerFilter) return false;
      if (meetingTypeFilter !== "all" && m.meetingType !== meetingTypeFilter) return false;
      if (lead && !m.leadName.toLowerCase().includes(lead) && !m.phone.toLowerCase().includes(lead)) return false;
      return true;
    });
  }, [meetings, rangeStart, rangeEnd, selectedPreSeller, statusFilter, markingFilter, triggerFilter, meetingTypeFilter, leadSearch]);

  // Group by REGISTRATION date (when the appointment was created), not the meeting date.
  const byDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of filteredMeetings) {
      const key = registrationDate(m);
      const arr = map.get(key) || [];
      arr.push(m);
      map.set(key, arr);
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

  // Calendar (only when not in custom range)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
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
    if (count === 0) return "bg-card border-border text-muted-foreground hover:border-border";
    const intensity = maxCount ? count / maxCount : 0;
    if (intensity > 0.75) return "bg-primary text-primary-foreground border-primary font-bold";
    if (intensity > 0.5) return "bg-primary/70 text-primary-foreground border-primary/70 font-bold";
    if (intensity > 0.25) return "bg-primary/40 text-foreground border-primary/40 font-semibold";
    return "bg-primary/20 text-foreground border-primary/30 font-semibold";
  };

  const goPrev = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const goNext = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };

  const sortedDays = useMemo(() => {
    return Array.from(byDate.entries())
      .map(([date, arr]) => ({ date, meetings: arr.sort((a, b) => a.time.localeCompare(b.time)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [byDate]);

  const formatBR = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
  const weekdayOf = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return WEEKDAYS_FULL[new Date(y, m - 1, d).getDay()];
  };

  const clearFilters = () => {
    setLeadSearch(""); setStatusFilter("all"); setMarkingFilter("all");
    setTriggerFilter("all"); setMeetingTypeFilter("all");
    setCustomStart(""); setCustomEnd("");
  };
  const activeFilterCount =
    (leadSearch ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (markingFilter !== "all" ? 1 : 0) +
    (triggerFilter !== "all" ? 1 : 0) + (meetingTypeFilter !== "all" ? 1 : 0) + (usingCustomRange ? 1 : 0);

  // Day modal data — reactive (uses current `meetings` so tags update via realtime)
  const dayModalMeetings = useMemo(() => {
    if (!openDayDate) return [];
    return filteredMeetings
      .filter((m) => m.date === openDayDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [openDayDate, filteredMeetings]);

  const handleStatusChange = async (id: string, status: MeetingStatus) => {
    await updateMeetingStatus(id, status);
    await reload();
    toast.success("Status atualizado!");
  };
  const handleDelete = async (id: string) => {
    try {
      await deleteMeeting(id);
      await reload();
      toast.success("Reunião excluída.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir.");
    }
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
          <Button
            size="sm"
            variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
            onClick={() => setShowFilters((v) => !v)}
            className="h-9 text-xs px-2 sm:px-3"
          >
            <Filter className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-background text-foreground rounded-full text-[10px] px-1.5 py-0.5 font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="container mt-3 sm:mt-4 space-y-4 px-3 sm:px-6">
        {/* Month nav + pre-seller select */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg">
            <Button size="sm" variant="ghost" onClick={goPrev} className="h-9 w-9 p-0" disabled={usingCustomRange}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-display font-bold text-sm sm:text-base text-foreground px-2 min-w-[140px] text-center">
              {MONTHS_PT[month]} {year}
            </span>
            <Button size="sm" variant="ghost" onClick={goNext} className="h-9 w-9 p-0" disabled={usingCustomRange}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); setCustomStart(""); setCustomEnd(""); }}
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

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-foreground">Filtros</h3>
              {activeFilterCount > 0 && (
                <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8 text-xs">
                  <X className="w-3.5 h-3.5 mr-1" /> Limpar
                </Button>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Buscar lead (nome ou telefone)</label>
              <Input
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Ex: João, 11999..."
                className="h-10 sm:h-9 text-base sm:text-sm bg-background"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-9 text-sm bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="compareceu">Compareceu</SelectItem>
                    <SelectItem value="nao_compareceu">Não compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo de marcação</label>
                <Select value={markingFilter} onValueChange={(v) => setMarkingFilter(v as MarkingFilter)}>
                  <SelectTrigger className="h-9 text-sm bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(Object.keys(markingTypeLabels) as MarkingType[]).map((k) => (
                      <SelectItem key={k} value={k}>{markingTypeLabels[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gatilho</label>
                <Select value={triggerFilter} onValueChange={(v) => setTriggerFilter(v as TriggerFilter)}>
                  <SelectTrigger className="h-9 text-sm bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(Object.keys(triggerLabels) as TriggerType[]).map((k) => (
                      <SelectItem key={k} value={k}>{triggerLabels[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modalidade</label>
                <Select value={meetingTypeFilter} onValueChange={(v) => setMeetingTypeFilter(v as MeetingTypeFilter)}>
                  <SelectTrigger className="h-9 text-sm bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data inicial</label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10 sm:h-9 text-base sm:text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data final</label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10 sm:h-9 text-base sm:text-sm bg-background" />
              </div>
            </div>
            {usingCustomRange && (
              <p className="text-[11px] text-primary">
                Usando período personalizado — calendário do mês desativado.
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="stat-card flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <CalendarCheck className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground">{total}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
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
        {!usingCustomRange && (
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
                    onClick={() => cell.count > 0 && setOpenDayDate(cell.date)}
                    disabled={cell.count === 0}
                    className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${cell.count > 0 ? "hover:scale-105 active:scale-95 cursor-pointer" : "cursor-default opacity-60"} ${heatClass(cell.count)}`}
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
              Toque em um dia para ver os leads agendados.
            </p>
          </div>
        )}

        {/* Detailed list */}
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <h2 className="font-display font-bold text-sm sm:text-base mb-3 text-foreground">
            Detalhamento
          </h2>
          {sortedDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum agendamento neste período.
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
                    onClick={() => setOpenDayDate(date)}
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
                    <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
                      <span className="font-display font-bold text-base sm:text-lg text-primary">
                        {dayMeetings.length}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-success/20 text-success text-[10px] font-semibold flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" />{compareceu}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-semibold flex items-center gap-0.5">
                        <XCircle className="w-3 h-3" />{naoCompareceu}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />{pendente}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Day detail modal — leads with live status tags */}
      <Dialog open={!!openDayDate} onOpenChange={(open) => { if (!open) setOpenDayDate(null); }}>
        <DialogContent className="max-w-2xl mx-2 sm:mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {openDayDate && (
                <>
                  Agendamentos de {formatBR(openDayDate)}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({weekdayOf(openDayDate)}) • {dayModalMeetings.length} lead(s)
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dayModalMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum lead encontrado.
              </p>
            ) : (
              dayModalMeetings.map((m) => (
                <MeetingCard
                  key={m.id}
                  meeting={m}
                  isSoon={false}
                  isAdmin={isAdmin}
                  onEdit={() => navigate(`/?date=${m.date}&meeting=${m.id}`)}
                  onDelete={() => handleDelete(m.id)}
                  onStatusChange={(status) => handleStatusChange(m.id, status)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
