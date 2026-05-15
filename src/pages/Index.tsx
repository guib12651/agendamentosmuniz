import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Meeting, TimeBlock } from "@/lib/types";
import { getMeetings, getBlocks, deleteMeeting, deleteBlock, updateMeetingStatus, getOccupiedSlots } from "@/lib/store";
import { Plus, Ban, CalendarDays, LogOut, Search, X, BarChart3, CalendarCheck, MessageSquare } from "lucide-react";
import { FIXED_TIME_SLOTS, TimeSlotInfo } from "@/lib/timeSlots";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MeetingForm from "@/components/MeetingForm";
import MeetingSuccessModal from "@/components/MeetingSuccessModal";
import BlockForm from "@/components/BlockForm";
import MeetingCard from "@/components/MeetingCard";
import BlockCard from "@/components/BlockCard";
import StatsBar from "@/components/StatsBar";
import MeetingsChart from "@/components/MeetingsChart";
import PeriodFilter, { PeriodType, getDateRange } from "@/components/PeriodFilter";
import { toast } from "sonner";
import logo from "@/assets/logo_muniz.png";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import GoalsBanner from "@/components/goals/GoalsBanner";



export default function Index() {
  const { profile, isAdmin, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [period, setPeriod] = useState<PeriodType>("daily");
  const [customStart, setCustomStart] = useState(new Date().toISOString().split("T")[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split("T")[0]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [preSellerSearch, setPreSellerSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  const [viewingMeetings, setViewingMeetings] = useState<Meeting[]>([]);
  


  const reload = useCallback(async () => {
    const [m, b] = await Promise.all([getMeetings(), getBlocks()]);
    setMeetings(m);
    setBlocks(b);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Handle navigation from notifications: ?date=YYYY-MM-DD&meeting=ID
  useEffect(() => {
    const dateParam = searchParams.get("date");
    const meetingParam = searchParams.get("meeting");
    if (dateParam) {
      setFilterDate(dateParam);
      setPeriod("daily");
    }
    if (meetingParam && meetings.length > 0) {
      const found = meetings.find((m) => m.id === meetingParam);
      if (found) {
        setViewingMeetings([found]);
        // Clear params so reopening doesn't retrigger
        const next = new URLSearchParams(searchParams);
        next.delete("date");
        next.delete("meeting");
        setSearchParams(next, { replace: true });
      }
    } else if (dateParam && !meetingParam) {
      const next = new URLSearchParams(searchParams);
      next.delete("date");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, meetings, setSearchParams]);

  // Realtime: listen for changes on meetings table and auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('realtime-meetings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          reload();
          getOccupiedSlots(filterDate).then(setGlobalOccupiedSlots);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload, filterDate]);

  const now = useMemo(() => new Date(), []);

  const dateRange = useMemo(() => getDateRange(period, filterDate, customStart, customEnd), [period, filterDate, customStart, customEnd]);

  // Fetch registered users (pre-sellers + admins) so admins can search anyone, including themselves
  const [registeredPreSellers, setRegisteredPreSellers] = useState<string[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("profiles")
      .select("display_name, role")
      .in("role", ["pre_seller", "admin"])
      .then(({ data }) => {
        if (data) setRegisteredPreSellers(data.map((p: any) => p.display_name).sort());
      });
  }, [isAdmin]);

  // Filtered suggestions from registered users
  const searchSuggestions = useMemo(() => {
    if (!preSellerSearch.trim()) return registeredPreSellers;
    const q = preSellerSearch.toLowerCase();
    return registeredPreSellers.filter((n) => n.toLowerCase().includes(q));
  }, [preSellerSearch, registeredPreSellers]);

  // Apply pre-seller + lead/notes filter to meetings
  const filteredMeetings = useMemo(() => {
    let result = meetings;
    if (isAdmin && preSellerSearch.trim()) {
      const q = preSellerSearch.toLowerCase().trim();
      result = result.filter((m) => m.preSeller.toLowerCase().includes(q));
    }
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.leadName.toLowerCase().includes(q) ||
          (m.notes || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [meetings, preSellerSearch, leadSearch, isAdmin]);

  // Meetings filtered by the selected period (for stats).
  // When the user is searching for a lead/notes keyword we ignore the date range
  // so all matches across all dates are shown.
  const periodMeetings = useMemo(() => {
    const base = leadSearch.trim()
      ? filteredMeetings
      : filteredMeetings.filter((m) => m.date >= dateRange.start && m.date <= dateRange.end);
    return base.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [filteredMeetings, dateRange, leadSearch]);

  const noShowLeads = useMemo(() => {
    return periodMeetings
      .filter((m) => m.status === "nao_compareceu")
      .map((m) => ({
        lead_name: m.leadName,
        phone: m.phone,
        date: m.date,
      }));
  }, [periodMeetings]);


  // For the timeline and time slot grid, always use filterDate (daily view)
  const dayMeetings = useMemo(() => {
    return filteredMeetings.filter((m) => m.date === filterDate).sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredMeetings, filterDate]);

  const dayBlocks = useMemo(() => {
    return blocks.filter((b) => b.date === filterDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [blocks, filterDate]);

  // Global occupied slots (visible to all users via security definer function)
  const [globalOccupiedSlots, setGlobalOccupiedSlots] = useState<{ time: string; leadName: string; meetingId: string }[]>([]);
  useEffect(() => {
    getOccupiedSlots(filterDate).then(setGlobalOccupiedSlots);
  }, [filterDate, meetings]); // re-fetch when meetings change or date changes

  const timeSlots: TimeSlotInfo[] = useMemo(() => {
    return FIXED_TIME_SLOTS.map((time) => {
      const occupiedForSlot = globalOccupiedSlots.filter((s) => s.time === time);
      const count = occupiedForSlot.length;
      const blocked = dayBlocks.some((b) => b.startTime <= time && b.endTime > time);
      if (blocked) return { time, status: "blocked" as const, occupiedCount: 0 };
      if (count >= 2) return {
        time, status: "occupied" as const, occupiedCount: count,
        meetingLeadNames: occupiedForSlot.map((o) => o.leadName),
        meetingIds: occupiedForSlot.map((o) => o.meetingId),
      };
      if (count === 1) return {
        time, status: "partial" as const, occupiedCount: count,
        meetingLeadNames: occupiedForSlot.map((o) => o.leadName),
        meetingIds: occupiedForSlot.map((o) => o.meetingId),
      };
      return { time, status: "available" as const, occupiedCount: 0 };
    });
  }, [globalOccupiedSlots, dayBlocks]);

  const isSoon = (meeting: Meeting) => {
    if (meeting.date !== now.toISOString().split("T")[0]) return false;
    const [h, m] = meeting.time.split(":").map(Number);
    const meetingMin = h * 60 + m;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return meetingMin >= nowMin && meetingMin <= nowMin + 60;
  };

  const handleDeleteMeeting = async (id: string) => {
    await deleteMeeting(id);
    await reload();
    toast.success("Reunião excluída.");
  };

  const handleDeleteBlock = async (id: string) => {
    await deleteBlock(id);
    await reload();
    toast.success("Bloqueio removido.");
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateMeetingStatus(id, status);
    await reload();
    toast.success("Status atualizado!");
  };

  type TimelineItem =
    | { type: "meeting"; data: Meeting; sortKey: string }
    | { type: "block"; data: TimeBlock; sortKey: string };

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [
      ...dayMeetings.map((m) => ({ type: "meeting" as const, data: m, sortKey: m.time })),
      ...dayBlocks.map((b) => ({ type: "block" as const, data: b, sortKey: b.startTime })),
    ];
    return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [dayMeetings, dayBlocks]);

  return (
    <div className="min-h-screen pb-8">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-2 py-3 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <img src={logo} alt="Muniz Consultorias" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-display font-bold text-primary leading-tight truncate">Muniz Consultorias</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {profile?.displayName} • {isAdmin ? "Admin" : "Pré-venda"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button size="sm" onClick={() => { setEditingMeeting(null); setShowMeetingForm(true); }} className="h-9 w-9 sm:w-auto p-0 sm:px-3 text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90" title="Nova Reunião">
              <Plus className="w-5 h-5 sm:mr-1" /><span className="hidden sm:inline">Reunião</span>
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => { setEditingBlock(null); setShowBlockForm(true); }} className="h-9 w-9 sm:w-auto p-0 sm:px-3 text-xs sm:text-sm" title="Bloquear horário">
                <Ban className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Bloquear</span>
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => navigate("/fechamentos")} className="h-9 w-9 sm:w-auto p-0 sm:px-3 text-xs sm:text-sm" title="Fechamentos">
                <BarChart3 className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Fechamentos</span>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate("/meus-agendamentos")} className="h-9 w-9 sm:w-auto p-0 sm:px-3 text-xs sm:text-sm" title="Meus agendamentos">
              <CalendarCheck className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Por dia</span>
            </Button>
            <NotificationBell userId={profile?.id} />
            <Button size="sm" variant="ghost" onClick={signOut} className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive" title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mt-3 sm:mt-4 space-y-3 sm:space-y-4 px-3 sm:px-6">
        <GoalsBanner />
        {/* Admin pre-seller search */}
        {isAdmin && (
          <div className="relative group">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  value={preSellerSearch}
                  onChange={(e) => { setPreSellerSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Buscar pré-vendedor..."
                  className="pl-10 h-12 sm:h-11 text-base sm:text-sm bg-card border-border/50 rounded-xl"
                />
              </div>
              {preSellerSearch && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setPreSellerSearch(""); setShowSuggestions(false); }}
                  className="h-12 sm:h-11 px-4 text-muted-foreground hover:text-foreground bg-muted/30 border-border/30 rounded-xl sm:rounded-lg"
                >
                  <X className="w-4 h-4 mr-2" /> Limpar filtro
                </Button>
              )}
            </div>
            {/* Autocomplete suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                {searchSuggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => { setPreSellerSearch(name); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lead / notes search (visible to all users) */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              placeholder="Buscar cliente, observação..."
              className="pl-10 h-12 sm:h-11 text-base sm:text-sm bg-card border-border/50 rounded-xl"
            />
          </div>
          {leadSearch && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLeadSearch("")}
              className="h-12 sm:h-11 px-4 text-muted-foreground hover:text-foreground bg-muted/30 border-border/30 rounded-xl sm:rounded-lg"
            >
              <X className="w-4 h-4 mr-2" /> Limpar busca
            </Button>
          )}
        </div>

        {/* Period filter */}
        <PeriodFilter
          selectedDate={filterDate}
          onDateChange={setFilterDate}
          period={period}
          onPeriodChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />

        {/* 1. Stats (top) */}
        <StatsBar meetings={periodMeetings} />



        {/* 2. Time slot grid (prominent, right after stats) */}
        {period === "daily" && (
          <TimeSlotGrid
            slots={timeSlots}
            onOccupiedClick={async (meetingIds) => {
              const foundMeetings: Meeting[] = [];
              for (const mid of meetingIds) {
                const m = dayMeetings.find((mt) => mt.id === mid);
                if (m) {
                  foundMeetings.push(m);
                } else {
                  const slot = globalOccupiedSlots.find((s) => s.meetingId === mid);
                  if (slot) {
                    foundMeetings.push({
                      id: mid,
                      leadName: slot.leadName,
                      phone: "",
                      date: filterDate,
                      time: slot.time,
                      preSeller: "",
                      consultant: "",
                      downPayment: "",
                      installment: "",
                      restriction: "clean" as any,
                      notes: "",
                      status: "pending" as any,
                      markingType: "lead_quente" as any,
                      meetingType: "presencial" as any,
                      trigger: "imovel" as any,
                      userId: null,
                    });
                  }
                }
              }
              if (foundMeetings.length > 0) {
                setViewingMeetings(foundMeetings);
              }
            }}
          />
        )}

        {/* 3. Meeting list / timeline */}
        <div className="space-y-3">
          {(period !== "daily" || leadSearch.trim()) && (
            <p className="text-xs text-muted-foreground">
              {leadSearch.trim()
                ? `Mostrando ${periodMeetings.length} reunião(ões) em todas as datas`
                : `Mostrando ${periodMeetings.length} reunião(ões) de ${dateRange.start} a ${dateRange.end}`}
            </p>
          )}
          {(preSellerSearch || leadSearch) && (
            <p className="text-xs text-primary font-medium">
              Filtrando por: {[preSellerSearch, leadSearch].filter(Boolean).join(" • ")}
            </p>
          )}
          {((period === "daily" && !leadSearch.trim()) ? timeline : periodMeetings.map((m) => ({ type: "meeting" as const, data: m, sortKey: m.date + m.time }))).length === 0 && (
            <div className="text-center py-12 sm:py-16 text-muted-foreground">
              <CalendarDays className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-40" />
              <p className="font-display text-base sm:text-lg">Nenhum compromisso neste período</p>
              <p className="text-sm">Agende uma reunião ou bloqueie um horário.</p>
            </div>
          )}
          {(period === "daily" && !leadSearch.trim()) ? (
            timeline.map((item) =>
              item.type === "meeting" ? (
                <MeetingCard
                  key={item.data.id}
                  meeting={item.data}
                  isSoon={isSoon(item.data)}
                  isAdmin={isAdmin}
                  onEdit={() => { setEditingMeeting(item.data); setShowMeetingForm(true); }}
                  onDelete={() => handleDeleteMeeting(item.data.id)}
                  onStatusChange={(status) => handleStatusChange(item.data.id, status)}
                />
              ) : (
                <BlockCard
                  key={item.data.id}
                  block={item.data}
                  onEdit={() => { setEditingBlock(item.data); setShowBlockForm(true); }}
                  onDelete={() => handleDeleteBlock(item.data.id)}
                />
              )
            )
          ) : (
            periodMeetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                isSoon={false}
                isAdmin={isAdmin}
                onEdit={() => { setEditingMeeting(m); setShowMeetingForm(true); }}
                onDelete={() => handleDeleteMeeting(m.id)}
                onStatusChange={(status) => handleStatusChange(m.id, status)}
              />
            ))
          )}
        </div>

        {/* 4. Chart at the bottom */}
        <MeetingsChart meetings={periodMeetings} period={period} dateRange={dateRange} />
      </main>

      <Dialog open={showMeetingForm} onOpenChange={setShowMeetingForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
          </DialogHeader>
          <MeetingForm
            editMeeting={editingMeeting}
            occupiedSlots={timeSlots}
            userId={profile?.id || ""}
            userDisplayName={profile?.displayName || ""}
            isAdmin={isAdmin}
            onSave={async (savedDate?: string, successInfo?: any) => {
              await reload();
              setShowMeetingForm(false);
              if (savedDate) setFilterDate(savedDate);
              if (successInfo) setSuccessData(successInfo);
            }}
            onCancel={() => setShowMeetingForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockForm} onOpenChange={setShowBlockForm}>
        <DialogContent className="max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{editingBlock ? "Editar Bloqueio" : "Bloquear Horário"}</DialogTitle>
          </DialogHeader>
          <BlockForm
            editBlock={editingBlock}
            onSave={async () => { await reload(); setShowBlockForm(false); }}
            onCancel={() => setShowBlockForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Meeting detail dialog (from time slot click) */}
      <Dialog open={viewingMeetings.length > 0} onOpenChange={(open) => { if (!open) setViewingMeetings([]); }}>
        <DialogContent className="max-w-md mx-2 sm:mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendamentos do Horário ({viewingMeetings.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingMeetings.map((vm, idx) => (
              <div key={vm.id} className="space-y-3 text-sm">
                {viewingMeetings.length > 1 && (
                  <p className="font-display font-bold text-xs text-primary">Reunião {idx + 1}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground block text-xs">Lead</span><span className="font-semibold">{vm.leadName}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Telefone</span><span className="font-semibold">{vm.phone}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Data</span><span className="font-semibold">{vm.date}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Horário</span><span className="font-semibold">{vm.time}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Pré-vendedor</span><span className="font-semibold">{vm.preSeller}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Consultor</span><span className="font-semibold">{vm.consultant}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Tipo de Reunião</span><span className="font-semibold">{vm.meetingType === "presencial" ? "📍 Presencial" : "💻 Online"}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Restrição</span><span className="font-semibold">{vm.restriction === "clean" ? "Limpo" : vm.restriction === "up_to_10k" ? "Até R$10 mil" : "Acima de R$10 mil"}</span></div>
                  {vm.downPayment && <div><span className="text-muted-foreground block text-xs">Entrada</span><span className="font-semibold">{vm.downPayment}</span></div>}
                  {vm.installment && <div><span className="text-muted-foreground block text-xs">Parcela</span><span className="font-semibold">{vm.installment}</span></div>}
                </div>
                {vm.notes && (
                  <div><span className="text-muted-foreground block text-xs mb-1">Observações</span><p className="text-foreground">{vm.notes}</p></div>
                )}
                {idx < viewingMeetings.length - 1 && <hr className="border-border" />}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {successData && (
        <MeetingSuccessModal data={successData} onClose={() => setSuccessData(null)} />
      )}

      <hr className="border-transparent" />
    </div>
  );
}
