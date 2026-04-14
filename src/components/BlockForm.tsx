import { useState } from "react";
import { TimeBlock } from "@/lib/types";
import { addBlock, updateBlock } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BlockFormProps {
  onSave: () => void;
  editBlock?: TimeBlock | null;
  onCancel?: () => void;
}

export default function BlockForm({ onSave, editBlock, onCancel }: BlockFormProps) {
  const [form, setForm] = useState({
    date: editBlock?.date || new Date().toISOString().split("T")[0],
    startTime: editBlock?.startTime || "",
    endTime: editBlock?.endTime || "",
    reason: editBlock?.reason || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime) {
      toast.error("Preencha data e horários.");
      return;
    }
    if (form.startTime >= form.endTime) {
      toast.error("O horário final deve ser após o inicial.");
      return;
    }

    setSaving(true);
    try {
      if (editBlock) {
        await updateBlock({ ...form, id: editBlock.id });
        toast.success("Bloqueio atualizado!");
      } else {
        await addBlock(form);
        toast.success("Horário bloqueado!");
      }
      onSave();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Horário inicial *</Label>
          <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Horário final *</Label>
          <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Motivo (opcional)</Label>
        <Input value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Ex: Almoço, Reunião interna..." />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Salvando..." : editBlock ? "Salvar alterações" : "Bloquear Horário"}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}
