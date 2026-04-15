import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Meeting, TimeBlock } from "@/lib/types";
import { getMeetings, getBlocks, deleteMeeting, deleteBlock, updateMeetingStatus } from "@/lib/store";
import { Plus, Ban, CalendarDays, LogOut, Search, X } from "lucide-react";
import { FIXED_TIME_SLOTS, TimeSlotInfo } from "@/lib/timeSlots";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MeetingForm from "@/components/MeetingForm";
import BlockForm from "@/components/BlockForm";
import MeetingCard from "@/components/MeetingCard";
import BlockCard from "@/components/BlockCard";
import StatsBar from "@/components/StatsBar";
import MeetingsChart from "@/components/MeetingsChart";
import PeriodFilter, { PeriodType, getDateRange } from "@/components/PeriodFilter";
import { toast } from "sonner";
import logo from "@/assets/logo_muniz.png";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { profile, isAdmin, signOut } = useAuth();
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
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

  const reload = useCallback(async () => {
    const [m, b] = await Promise.all([getMeetings(), getBlocks()]);
    setMeetings(m);
    setBlocks(b);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const now = useMemo(() => new Date(), []);

  const dateRange = useMemo(() => getDateRange(period, filterDate, customStart, customEnd), [period, filterDate, customStart, customEnd]);

  // Fetch registered pre-sellers from profiles table
  const [registeredPreSellers, setRegisteredPreSellers] = useState<string[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("profiles")
      .select("display_name, role")
      .eq("role", "pre_seller")
      .then(({ data }) => {
        if (data) setRegisteredPreSellers(data.map((p: any) => p.display_name).sort());
      });
  }, [isAdmin]);

  // Filtered suggestions from registered pre-sellers only
  const searchSuggestions = useMemo(() => {
    if (!preSellerSearch.trim()) return registeredPreSellers;
    const q = preSellerSearch.toLowerCase();
    return registeredPreSellers.filter((n) => n.toLowerCase().includes(q));
  }, [preSellerSearch, registeredPreSellers]);

  // Apply pre-seller filter to meetings
  const filteredMeetings = useMemo(() => {
    if (!isAdmin || !preSellerSearch.trim()) return meetings;
    const q = preSellerSearch.toLowerCase().trim();
    return meetings.filter((m) => m.preSeller.toLowerCase().includes(q));
  }, [meetings, preSellerSearch, isAdmin]);

  // Meetings filtered by the selected period (for stats)
  const periodMeetings = useMemo(() => {
    return filteredMeetings
      .filter((m) => m.date >= dateRange.start && m.date <= dateRange.end)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [filteredMeetings, dateRange]);

  // For the timeline and time slot grid, always use filterDate (daily view)
  const dayMeetings = useMemo(() => {
    return filteredMeetings.filter((m) => m.date === filterDate).sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredMeetings, filterDate]);

  const dayBlocks = useMemo(() => {
    return blocks.filter((b) => b.date === filterDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [blocks, filterDate]);

  const timeSlots: TimeSlotInfo[] = useMemo(() => {
    return FIXED_TIME_SLOTS.map((time) => {
      const meeting = dayMeetings.find((m) => m.time === time);
      if (meeting) return { time, status: "occupied" as const, meetingLeadName: meeting.leadName, meetingId: meeting.id };
      const blocked = dayBlocks.some((b) => b.startTime <= time && b.endTime > time);
      if (blocked) return { time, status: "blocked" as const };
      return { time, status: "available" as const };
    });
  }, [dayMeetings, dayBlocks]);

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
        <div className="container flex items-center justify-between py-3 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="Muniz Consultorias" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
            <div>
              <h1 className="text-base sm:text-lg font-display font-bold text-primary leading-tight">Muniz Consultorias</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {profile?.displayName} • {isAdmin ? "Admin" : "Pré-venda"}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button size="sm" onClick={() => { setEditingMeeting(null); setShowMeetingForm(true); }} className="h-9 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
              <Plus className="w-4 h-4 mr-0.5 sm:mr-1" /> <span className="hidden xs:inline">Reunião</span><span className="xs:hidden">Nova</span>
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => { setEditingBlock(null); setShowBlockForm(true); }} className="h-9 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
                <Ban className="w-4 h-4 mr-0.5 sm:mr-1" /> <span className="hidden sm:inline">Bloquear</span><span className="sm:hidden">Bloq.</span>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={signOut} className="h-9 text-xs px-2">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mt-3 sm:mt-4 space-y-3 sm:space-y-4 px-3 sm:px-6">
        {/* Admin pre-seller search */}
        {isAdmin && (
          <div className="relative">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={preSellerSearch}
                  onChange={(e) => { setPreSellerSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Buscar pré-vendedor..."
                  className="pl-9 h-11 text-base sm:text-sm bg-card border-border"
                />
              </div>
              {preSellerSearch && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setPreSellerSearch(""); setShowSuggestions(false); }}
                  className="h-11 px-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" /> Limpar
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
            onOccupiedClick={(meetingId) => {
              const m = dayMeetings.find((mt) => mt.id === meetingId);
              if (m) setViewingMeeting(m);
            }}
          />
        )}

        {/* 3. Meeting list / timeline */}
        <div className="space-y-3">
          {period !== "daily" && (
            <p className="text-xs text-muted-foreground">
              Mostrando {periodMeetings.length} reunião(ões) de {dateRange.start} a {dateRange.end}
            </p>
          )}
          {preSellerSearch && (
            <p className="text-xs text-primary font-medium">
              Filtrando por: {preSellerSearch}
            </p>
          )}
          {(period === "daily" ? timeline : periodMeetings.map((m) => ({ type: "meeting" as const, data: m, sortKey: m.date + m.time }))).length === 0 && (
            <div className="text-center py-12 sm:py-16 text-muted-foreground">
              <CalendarDays className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-40" />
              <p className="font-display text-base sm:text-lg">Nenhum compromisso neste período</p>
              <p className="text-sm">Agende uma reunião ou bloqueie um horário.</p>
            </div>
          )}
          {period === "daily" ? (
            timeline.map((item) =>
              item.type === "meeting" ? (
                <MeetingCard
                  key={item.data.id}
                  meeting={item.data}
                  isSoon={isSoon(item.data)}
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
            onSave={async (savedDate?: string) => {
              await reload();
              setShowMeetingForm(false);
              if (savedDate) setFilterDate(savedDate);
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
      <Dialog open={!!viewingMeeting} onOpenChange={(open) => { if (!open) setViewingMeeting(null); }}>
        <DialogContent className="max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {viewingMeeting && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground block text-xs">Lead</span><span className="font-semibold">{viewingMeeting.leadName}</span></div>
                <div><span className="text-muted-foreground block text-xs">Telefone</span><span className="font-semibold">{viewingMeeting.phone}</span></div>
                <div><span className="text-muted-foreground block text-xs">Data</span><span className="font-semibold">{viewingMeeting.date}</span></div>
                <div><span className="text-muted-foreground block text-xs">Horário</span><span className="font-semibold">{viewingMeeting.time}</span></div>
                <div><span className="text-muted-foreground block text-xs">Pré-vendedor</span><span className="font-semibold">{viewingMeeting.preSeller}</span></div>
                <div><span className="text-muted-foreground block text-xs">Consultor</span><span className="font-semibold">{viewingMeeting.consultant}</span></div>
                <div><span className="text-muted-foreground block text-xs">Tipo de Reunião</span><span className="font-semibold">{viewingMeeting.meetingType === "presencial" ? "📍 Presencial" : "💻 Online"}</span></div>
                <div><span className="text-muted-foreground block text-xs">Restrição</span><span className="font-semibold">{viewingMeeting.restriction === "clean" ? "Limpo" : viewingMeeting.restriction === "up_to_10k" ? "Até R$10 mil" : "Acima de R$10 mil"}</span></div>
                {viewingMeeting.downPayment && <div><span className="text-muted-foreground block text-xs">Entrada</span><span className="font-semibold">{viewingMeeting.downPayment}</span></div>}
                {viewingMeeting.installment && <div><span className="text-muted-foreground block text-xs">Parcela</span><span className="font-semibold">{viewingMeeting.installment}</span></div>}
              </div>
              {viewingMeeting.notes && (
                <div><span className="text-muted-foreground block text-xs mb-1">Observações</span><p className="text-foreground">{viewingMeeting.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
