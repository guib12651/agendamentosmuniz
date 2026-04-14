import { useState } from "react";
import { Meeting, RestrictionType } from "@/lib/types";
import { addMeeting, isTimeBlocked, updateMeeting } from "@/lib/store";
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
}

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
};

export default function MeetingForm({ onSave, editMeeting, onCancel }: MeetingFormProps) {
  const [form, setForm] = useState(editMeeting ? { ...editMeeting } : { ...emptyForm });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leadName || !form.phone || !form.date || !form.time || !form.preSeller || !form.consultant) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!editMeeting && isTimeBlocked(form.date, form.time)) {
      toast.error("Este horário está indisponível. Escolha outro horário.");
      return;
    }

    if (editMeeting) {
      updateMeeting({ ...form, id: editMeeting.id });
      toast.success("Reunião atualizada!");
    } else {
      addMeeting({ ...form, id: crypto.randomUUID() });
      toast.success("Reunião agendada com sucesso!");
      setForm({ ...emptyForm });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nome do Lead *</Label>
          <Input value={form.leadName} onChange={(e) => set("leadName", e.target.value)} placeholder="Nome do lead" />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone *</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Horário *</Label>
          <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Pré-vendedor *</Label>
          <Input value={form.preSeller} onChange={(e) => set("preSeller", e.target.value)} placeholder="Nome do pré-vendedor" />
        </div>
        <div className="space-y-1.5">
          <Label>Consultor responsável *</Label>
          <Input value={form.consultant} onChange={(e) => set("consultant", e.target.value)} placeholder="Consultor" />
        </div>
        <div className="space-y-1.5">
          <Label>Entrada disponível</Label>
          <Input value={form.downPayment} onChange={(e) => set("downPayment", e.target.value)} placeholder="Ex: R$ 2.000" />
        </div>
        <div className="space-y-1.5">
          <Label>Parcela que consegue pagar</Label>
          <Input value={form.installment} onChange={(e) => set("installment", e.target.value)} placeholder="Ex: R$ 500/mês" />
        </div>
        <div className="space-y-1.5">
          <Label>Restrição no nome *</Label>
          <Select value={form.restriction} onValueChange={(v) => set("restriction", v)}>
            <SelectTrigger>
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
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Observações opcionais..." rows={2} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">{editMeeting ? "Salvar alterações" : "Agendar Reunião"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}
