import { supabase } from "@/integrations/supabase/client";
import { Lead, LeadHistoryEntry, LeadStatus, normalizePhone } from "./leadsTypes";

export async function getLeads(includeArchived = false): Promise<Lead[]> {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (!includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }

  const ids = Array.from(new Set((data || []).map((l: any) => l.responsible_user_id)));
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    (profs || []).forEach((p: any) => { names[p.id] = p.display_name; });
  }
  return (data || []).map((l: any) => ({ ...l, responsible_name: names[l.responsible_user_id] })) as Lead[];
}

export async function createLead(input: Partial<Lead> & { name: string; phone: string; interest: string; source: string }, userId: string, isAdmin: boolean) {
  const responsible = isAdmin && input.responsible_user_id ? input.responsible_user_id : userId;
  const payload = {
    created_by: userId,
    responsible_user_id: responsible,
    name: input.name,
    phone: input.phone,
    normalized_phone: normalizePhone(input.phone),
    interest: input.interest,
    source: input.source,
    status: (input.status || "novo") as LeadStatus,
    desired_credit_value: input.desired_credit_value ?? null,
    desired_installment: input.desired_installment ?? null,
    available_down_payment: input.available_down_payment ?? null,
    has_restriction: input.has_restriction ?? null,
    profession: input.profession ?? null,
    income: input.income ?? null,
    decides_alone: input.decides_alone ?? null,
    next_follow_up_at: input.next_follow_up_at ?? null,
    notes: input.notes ?? null,
  };
  const { data, error } = await supabase.from("leads").insert(payload).select().single();
  if (error) throw error;
  await addHistory(data.id, userId, "created", null, null, "Lead criado");
  return data;
}

export async function updateLead(id: string, patch: Partial<Lead>, userId: string, previous?: Lead) {
  const update: any = { ...patch };
  if (patch.phone) update.normalized_phone = normalizePhone(patch.phone);
  delete update.responsible_name;
  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) throw error;

  if (previous) {
    if (patch.status && patch.status !== previous.status) {
      await addHistory(id, userId, "status_changed", previous.status, patch.status, `Status alterado`);
    }
    if (patch.next_follow_up_at !== undefined && patch.next_follow_up_at !== previous.next_follow_up_at) {
      await addHistory(id, userId, "follow_up_changed", previous.next_follow_up_at, patch.next_follow_up_at, "Próximo retorno atualizado");
    }
    if (patch.responsible_user_id && patch.responsible_user_id !== previous.responsible_user_id) {
      await addHistory(id, userId, "responsible_changed", previous.responsible_user_id, patch.responsible_user_id, "Responsável alterado");
    }
  }
}

export async function archiveLead(id: string, userId: string) {
  const { error } = await supabase.from("leads").update({ is_archived: true, archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await addHistory(id, userId, "archived", null, null, "Lead arquivado");
}

export async function restoreLead(id: string, userId: string) {
  const { error } = await supabase.from("leads").update({ is_archived: false, archived_at: null }).eq("id", id);
  if (error) throw error;
  await addHistory(id, userId, "restored", null, null, "Lead restaurado");
}

export async function addHistory(leadId: string, userId: string, action: string, oldValue: string | null, newValue: string | null, description: string) {
  await supabase.from("lead_history").insert({
    lead_id: leadId, user_id: userId, action, old_value: oldValue, new_value: newValue, description,
  });
}

export async function getLeadHistory(leadId: string): Promise<LeadHistoryEntry[]> {
  const { data, error } = await supabase.from("lead_history").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  const ids = Array.from(new Set((data || []).map((h: any) => h.user_id)));
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    (profs || []).forEach((p: any) => { names[p.id] = p.display_name; });
  }
  return (data || []).map((h: any) => ({ ...h, user_name: names[h.user_id] })) as LeadHistoryEntry[];
}

export async function checkDuplicatePhone(phone: string, excludeId?: string) {
  const norm = normalizePhone(phone);
  if (!norm) return null;
  let q = supabase.from("leads").select("id, name, status, responsible_user_id, created_at").eq("normalized_phone", norm).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return (data && data[0]) || null;
}
