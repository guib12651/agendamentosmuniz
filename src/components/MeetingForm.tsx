import { useState, useEffect, useMemo, useCallback } from "react";
import { Meeting, RestrictionType, MeetingStatus, MarkingType, MeetingType } from "@/lib/types";
import { addMeeting, updateMeeting, getOccupiedSlots, getBlocks } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { FIXED_TIME_SLOTS, TimeSlotInfo } from "@/lib/timeSlots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface MeetingFormProps {
  onSave: (savedDate?: string) => void;
  editMeeting?: Meeting | null;
  onCancel?: () => void;
  occupiedSlots?: TimeSlotInfo[];
  userId: string;
  userDisplayName: string;
  isAdmin: boolean;
}

const markingTypeLabels: Record<MarkingType, string> = {
  lead_quente: "Lead quente",
  cnpj: "CNPJ",
  lista_fria: "Lista fria",
  instagram: "Instagram",
  indicacao: "Indicação",
};

const emptyForm = {
  leadName: "",
  phone: "",
  date: new Date().toISOString().split("T")[0],
  time: "",
  preSeller: "",
  consultant: "",
  downPayment: "",
  installment: "",
  restriction: "clean" as RestrictionType,
  notes: "",
  status: "pending" as MeetingStatus,
  markingType: "" as MarkingType | "",
  meetingType: "" as MeetingType | "",
};

export default function MeetingForm({ onSave, editMeeting, onCancel, occupiedSlots, userId, userDisplayName, isAdmin }: MeetingFormProps) {
  const [form, setForm] = useState(editMeeting ? { ...editMeeting } : { ...emptyForm, preSeller: userDisplayName });
  const [saving, setSaving] = useState(false);
  const [dateSlots, setDateSlots] = useState<TimeSlotInfo[]>(occupiedSlots || []);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const refreshSlots = useCallback(async () => {
    const [occupied, allBlocks] = await Promise.all([getOccupiedSlots(form.date), getBlocks()]);
    const dayBlocks = allBlocks.filter((b) => b.date === form.date);
    const slots: TimeSlotInfo[] = FIXED_TIME_SLOTS.map((time) => {
      const occForSlot = occupied.filter((o) => o.time === time);
      const count = occForSlot.length;
      const blocked = dayBlocks.some((b) => b.startTime <= time && b.endTime > time);
      if (blocked) return { time, status: "blocked" as const, occupiedCount: 0 };
      if (count >= 2) return { time, status: "occupied" as const, occupiedCount: count, meetingLeadNames: occForSlot.map(o => o.leadName), meetingIds: occForSlot.map(o => o.meetingId) };
      if (count === 1) return { time, status: "partial" as const, occupiedCount: count, meetingLeadNames: occForSlot.map(o => o.leadName), meetingIds: occForSlot.map(o => o.meetingId) };
      return { time, status: "available" as const, occupiedCount: 0 };
    });
    setDateSlots(slots);
    // Clear selected time if it became fully occupied
    if (form.time) {
      const selectedSlot = slots.find(s => s.time === form.time);
      const isEditingThisSlot = editMeeting && editMeeting.time === form.time;
      if (selectedSlot && (selectedSlot.status === "occupied" || selectedSlot.status === "blocked") && !isEditingThisSlot) {
        setForm(f => ({ ...f, time: "" }));
        toast.info("O horário selecionado foi preenchido por outro usuário.");
      }
    }
  }, [form.date]);

  // Recompute slots when date changes
  useEffect(() => {
    refreshSlots();
  }, [form.date, refreshSlots]);

  // Realtime: auto-refresh slots when another user books a meeting
  useEffect(() => {
    const channel = supabase
      .channel('form-meeting-slots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          refreshSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leadName || !form.phone || !form.date || !form.time || !form.preSeller || !form.markingType || !form.meetingType) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const savedDate = form.date;
      if (editMeeting) {
        await updateMeeting({ ...form, id: editMeeting.id } as Meeting);
        toast.success("Reunião atualizada!");
      } else {
        const { id, userId: _uid, ...rest } = form as any;
        await addMeeting(rest, userId);
        toast.success("Reunião agendada com sucesso!");
        setForm({ ...emptyForm, preSeller: userDisplayName });
      }
      onSave(savedDate);
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nome do Lead *</Label>
          <Input value={form.leadName} onChange={(e) => set("leadName", e.target.value)} placeholder="Nome do lead" className="h-12 sm:h-10 text-base sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone *</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(00) 00000-0000" className="h-12 sm:h-10 text-base sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="h-12 sm:h-10 text-base sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label>Pré-vendedor *</Label>
          <Input value={form.preSeller} onChange={(e) => set("preSeller", e.target.value)} placeholder="Nome do pré-vendedor" className="h-12 sm:h-10 text-base sm:text-sm" readOnly={!isAdmin} />
        </div>
        <div className="space-y-1.5">
          <Label>Consultor responsável</Label>
          <Input value={form.consultant} onChange={(e) => set("consultant", e.target.value)} placeholder="Consultor" className="h-12 sm:h-10 text-base sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label>Entrada disponível</Label>
          <Input value={form.downPayment} onChange={(e) => set("downPayment", e.target.value)} placeholder="Ex: R$ 2.000" className="h-12 sm:h-10 text-base sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label>Parcela que consegue pagar</Label>
          <Input value={form.installment} onChange={(e) => set("installment", e.target.value)} placeholder="Ex: R$ 500/mês" className="h-12 sm:h-10 text-base sm:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de Marcação *</Label>
          <Select value={form.markingType} onValueChange={(v) => set("markingType", v)}>
            <SelectTrigger className="h-12 sm:h-10 text-base sm:text-sm">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(markingTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de Reunião *</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["presencial", "online"] as MeetingType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set("meetingType", type)}
                className={`
                  rounded-lg border px-3 py-3 sm:py-2 text-center font-display font-semibold text-sm transition-all
                  ${form.meetingType === type
                    ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"}
                `}
              >
                {type === "presencial" ? "📍 Presencial" : "💻 Online"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Restrição no nome *</Label>
          <Select value={form.restriction} onValueChange={(v) => set("restriction", v)}>
            <SelectTrigger className="h-12 sm:h-10 text-base sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clean">Nome limpo</SelectItem>
              <SelectItem value="up_to_10k">Até R$10 mil</SelectItem>
              <SelectItem value="above_10k">Acima de R$10 mil</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time slot picker */}
      <div className="space-y-2">
        <Label>Horário * {form.time && <span className="text-primary font-bold ml-1">— {form.time}</span>}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dateSlots.map((slot) => {
            const isSelected = form.time === slot.time;
            const isEditingThisSlot = editMeeting && editMeeting.time === slot.time;
            const isAvailable = slot.status === "available" || slot.status === "partial" || isEditingThisSlot;
            const isOccupied = slot.status === "occupied" && !isEditingThisSlot;
            const isBlocked = slot.status === "blocked";
            const isPartial = slot.status === "partial" && !isEditingThisSlot;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={isOccupied || isBlocked}
                onClick={() => set("time", slot.time)}
                className={`
                  rounded-lg border px-3 py-3 sm:py-2 text-center font-display font-bold text-sm transition-all
                  ${isSelected ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30" : ""}
                  ${!isSelected && !isPartial && isAvailable ? "bg-success/10 border-success/30 text-success hover:bg-success/20" : ""}
                  ${!isSelected && isPartial ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20" : ""}
                  ${isOccupied ? "bg-destructive/10 border-destructive/30 text-destructive opacity-60 cursor-not-allowed" : ""}
                  ${isBlocked ? "bg-muted border-border text-muted-foreground opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {slot.time}
                {isPartial && !isSelected && <span className="block text-[10px] font-normal mt-0.5">1/2 vagas</span>}
                {isOccupied && <span className="block text-[10px] font-normal mt-0.5">Lotado</span>}
                {isBlocked && <span className="block text-[10px] font-normal mt-0.5">Bloqueado</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Observações opcionais..." rows={2} className="text-base sm:text-sm" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 h-12 sm:h-10 text-base sm:text-sm" disabled={saving}>
          {saving ? "Salvando..." : editMeeting ? "Salvar alterações" : "Agendar Reunião"}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="h-12 sm:h-10">Cancelar</Button>}
      </div>
    </form>
  );
}
