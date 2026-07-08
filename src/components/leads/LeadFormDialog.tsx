import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead, LEAD_INTERESTS, LEAD_SOURCES, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leadsTypes";
import { createLead, updateLead, checkDuplicatePhone } from "@/lib/leadsStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead | null;
  userId: string;
  isAdmin: boolean;
  onSaved: () => void;
}

const empty = {
  name: "", phone: "", interest: "", source: "", status: "novo" as any,
  desired_credit_value: "", desired_installment: "", available_down_payment: "",
  has_restriction: "", profession: "", income: "", decides_alone: "",
  next_follow_up_at: "", notes: "", responsible_user_id: "",
};

export default function LeadFormDialog({ open, onOpenChange, lead, userId, isAdmin, onSaved }: Props) {
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [dup, setDup] = useState<any>(null);
  const [users, setUsers] = useState<{ id: string; display_name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    if (lead) {
      setForm({
        name: lead.name, phone: lead.phone, interest: lead.interest, source: lead.source,
        status: lead.status,
        desired_credit_value: lead.desired_credit_value ?? "",
        desired_installment: lead.desired_installment ?? "",
        available_down_payment: lead.available_down_payment ?? "",
        has_restriction: lead.has_restriction ?? "",
        profession: lead.profession ?? "",
        income: lead.income ?? "",
        decides_alone: lead.decides_alone ?? "",
        next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : "",
        notes: lead.notes ?? "",
        responsible_user_id: lead.responsible_user_id,
      });
    } else {
      setForm({ ...empty, responsible_user_id: userId });
    }
    setDup(null);
    if (isAdmin) {
      supabase.from("profiles").select("id, display_name").eq("is_blocked", false).then(({ data }) => {
        setUsers((data || []) as any);
      });
    }
  }, [open, lead, userId, isAdmin]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onPhoneBlur = async () => {
    if (!form.phone) return;
    const found = await checkDuplicatePhone(form.phone, lead?.id);
    setDup(found);
  };

  const submit = async () => {
    if (!form.name || !form.phone || !form.interest || !form.source) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        interest: form.interest,
        source: form.source,
        status: form.status,
        desired_credit_value: form.desired_credit_value === "" ? null : Number(form.desired_credit_value),
        desired_installment: form.desired_installment === "" ? null : Number(form.desired_installment),
        available_down_payment: form.available_down_payment === "" ? null : Number(form.available_down_payment),
        has_restriction: form.has_restriction || null,
        profession: form.profession || null,
        income: form.income === "" ? null : Number(form.income),
        decides_alone: form.decides_alone || null,
        next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null,
        notes: form.notes || null,
        responsible_user_id: isAdmin ? form.responsible_user_id : userId,
      };
      if (lead) {
        await updateLead(lead.id, payload, userId, lead);
        toast.success("Lead atualizado");
      } else {
        await createLead(payload, userId, isAdmin);
        toast.success("Lead cadastrado com sucesso.");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>Nome do lead *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Telefone / WhatsApp *</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} onBlur={onPhoneBlur} placeholder="(00) 00000-0000" />
            {dup && dup.id !== lead?.id && (
              <p className="text-xs text-amber-400 mt-1">
                {isAdmin
                  ? `Já existe: ${dup.name} — status ${dup.status}`
                  : "Já existe um lead cadastrado com este telefone. Verifique antes de continuar."}
              </p>
            )}
          </div>
          <div>
            <Label>Interesse *</Label>
            <Select value={form.interest} onValueChange={(v) => set("interest", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{LEAD_INTERESTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origem *</Label>
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{LEAD_SOURCES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status *</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div>
              <Label>Responsável</Label>
              <Select value={form.responsible_user_id} onValueChange={(v) => set("responsible_user_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Valor de crédito desejado</Label>
            <Input type="number" value={form.desired_credit_value} onChange={(e) => set("desired_credit_value", e.target.value)} />
          </div>
          <div>
            <Label>Parcela desejada</Label>
            <Input type="number" value={form.desired_installment} onChange={(e) => set("desired_installment", e.target.value)} />
          </div>
          <div>
            <Label>Entrada disponível</Label>
            <Input type="number" value={form.available_down_payment} onChange={(e) => set("available_down_payment", e.target.value)} />
          </div>
          <div>
            <Label>Restrição no nome</Label>
            <Select value={form.has_restriction} onValueChange={(v) => set("has_restriction", v)}>
              <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="nao_informado">Não informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Profissão</Label>
            <Input value={form.profession} onChange={(e) => set("profession", e.target.value)} />
          </div>
          <div>
            <Label>Renda aproximada</Label>
            <Input type="number" value={form.income} onChange={(e) => set("income", e.target.value)} />
          </div>
          <div>
            <Label>Decide sozinho?</Label>
            <Select value={form.decides_alone} onValueChange={(v) => set("decides_alone", v)}>
              <SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="nao_informado">Não informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Próximo retorno</Label>
            <Input type="datetime-local" value={form.next_follow_up_at} onChange={(e) => set("next_follow_up_at", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
