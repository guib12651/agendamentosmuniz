import { useState, useCallback, useMemo } from "react";
import { Meeting, TimeBlock } from "@/lib/types";
import { getMeetings, getBlocks, deleteMeeting, deleteBlock } from "@/lib/store";
import { Plus, Ban, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MeetingForm from "@/components/MeetingForm";
import BlockForm from "@/components/BlockForm";
import MeetingCard from "@/components/MeetingCard";
import BlockCard from "@/components/BlockCard";
import StatsBar from "@/components/StatsBar";
import { toast } from "sonner";
import logo from "@/assets/logo_muniz.png";

export default function Index() {
  const [meetings, setMeetings] = useState<Meeting[]>(getMeetings());
  const [blocks, setBlocks] = useState<TimeBlock[]>(getBlocks());
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterConsultant, setFilterConsultant] = useState("");
  const [filterSeller, setFilterSeller] = useState("");
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);

  const reload = useCallback(() => {
    setMeetings(getMeetings());
    setBlocks(getBlocks());
  }, []);

  const now = useMemo(() => new Date(), []);

  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.date === filterDate)
      .filter((m) => !filterConsultant || m.consultant.toLowerCase().includes(filterConsultant.toLowerCase()))
      .filter((m) => !filterSeller || m.preSeller.toLowerCase().includes(filterSeller.toLowerCase()))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [meetings, filterDate, filterConsultant, filterSeller]);

  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => b.date === filterDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [blocks, filterDate]);

  const isSoon = (meeting: Meeting) => {
    if (meeting.date !== now.toISOString().split("T")[0]) return false;
    const [h, m] = meeting.time.split(":").map(Number);
    const meetingMin = h * 60 + m;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return meetingMin >= nowMin && meetingMin <= nowMin + 60;
  };

  const handleDeleteMeeting = (id: string) => {
    deleteMeeting(id);
    reload();
    toast.success("Reunião excluída.");
  };

  const handleDeleteBlock = (id: string) => {
    deleteBlock(id);
    reload();
    toast.success("Bloqueio removido.");
  };

  // Merge meetings and blocks into a unified timeline
  type TimelineItem =
    | { type: "meeting"; data: Meeting; sortKey: string }
    | { type: "block"; data: TimeBlock; sortKey: string };

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [
      ...filteredMeetings.map((m) => ({ type: "meeting" as const, data: m, sortKey: m.time })),
      ...filteredBlocks.map((b) => ({ type: "block" as const, data: b, sortKey: b.startTime })),
    ];
    return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredMeetings, filteredBlocks]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Muniz Consultorias" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-display font-bold text-primary">Muniz Consultorias</h1>
              <p className="text-xs text-muted-foreground">Agendamento de Reuniões</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setEditingMeeting(null); setShowMeetingForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Reunião
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditingBlock(null); setShowBlockForm(true); }}>
              <Ban className="w-4 h-4 mr-1" /> Bloquear
            </Button>
          </div>
        </div>
      </header>

      <main className="container mt-4 space-y-4">
        {/* Stats */}
        <StatsBar meetings={filteredMeetings} />

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data</label>
            <Input type="date" className="w-40" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Consultor</label>
            <Input className="w-36" placeholder="Filtrar..." value={filterConsultant} onChange={(e) => setFilterConsultant(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pré-vendedor</label>
            <Input className="w-36" placeholder="Filtrar..." value={filterSeller} onChange={(e) => setFilterSeller(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => { setFilterDate(today); setFilterConsultant(""); setFilterSeller(""); }}>
            <CalendarDays className="w-4 h-4 mr-1" /> Ver hoje
          </Button>
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {timeline.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-display text-lg">Nenhum compromisso nesta data</p>
              <p className="text-sm">Agende uma reunião ou bloqueie um horário.</p>
            </div>
          )}
          {timeline.map((item) =>
            item.type === "meeting" ? (
              <MeetingCard
                key={item.data.id}
                meeting={item.data}
                isSoon={isSoon(item.data)}
                onEdit={() => { setEditingMeeting(item.data); setShowMeetingForm(true); }}
                onDelete={() => handleDeleteMeeting(item.data.id)}
              />
            ) : (
              <BlockCard
                key={item.data.id}
                block={item.data}
                onEdit={() => { setEditingBlock(item.data); setShowBlockForm(true); }}
                onDelete={() => handleDeleteBlock(item.data.id)}
              />
            )
          )}
        </div>
      </main>

      {/* Meeting Dialog */}
      <Dialog open={showMeetingForm} onOpenChange={setShowMeetingForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
          </DialogHeader>
          <MeetingForm
            editMeeting={editingMeeting}
            onSave={() => { reload(); setShowMeetingForm(false); }}
            onCancel={() => setShowMeetingForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={showBlockForm} onOpenChange={setShowBlockForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBlock ? "Editar Bloqueio" : "Bloquear Horário"}</DialogTitle>
          </DialogHeader>
          <BlockForm
            editBlock={editingBlock}
            onSave={() => { reload(); setShowBlockForm(false); }}
            onCancel={() => setShowBlockForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
