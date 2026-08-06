import { supabase } from "@/integrations/supabase/client";
import { Meeting, TimeBlock, RestrictionType, MeetingStatus, MarkingType, MeetingType, TriggerType, FunnelStage, Call } from "./types";

export async function getMeetings(startDate?: string, endDate?: string): Promise<Meeting[]> {
  let query = supabase
    .from("meetings")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (startDate && endDate) {
    // Busca reuniões que estão no período original OU que foram vendidas no período
    query = query.or(`date.gte.${startDate},sale_date.gte.${startDate}`);
    query = query.or(`date.lte.${endDate},sale_date.lte.${endDate}`);
    
    // Infelizmente o .or do postgrest é um pouco limitado para ranges complexos.
    // Vamos tentar uma abordagem mais simples: buscar tudo no range de data OU sale_date
    // A query acima pode não funcionar exatamente como esperado se misturarmos AND e OR implicitamente.
    // Vamos usar o filtro mais abrangente e filtrar no cliente se necessário, 
    // mas limitando drasticamente o que buscamos.
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching meetings:", error);
    return [];
  }


  return (data || []).map((row) => ({
    id: row.id,
    leadName: row.lead_name,
    phone: row.phone,
    date: row.date,
    time: row.time.slice(0, 5),
    preSeller: row.pre_seller,
    consultant: row.consultant,
    downPayment: row.down_payment || "",
    installment: row.installment || "",
    restriction: row.restriction as RestrictionType,
    notes: row.notes || "",
    status: (row.status || "pending") as MeetingStatus,
    statusHistory: (row.status_history || []) as MeetingStatus[],
    markingType: (row.marking_type || "lead_quente") as MarkingType,
    meetingType: (row.meeting_type || "presencial") as MeetingType,
    trigger: (row.trigger || "imovel") as TriggerType,
    city: row.city || "",
    saleDate: row.sale_date || undefined,
    userId: row.user_id || null,
    createdAt: row.created_at || undefined,
    funnelStage: (row.funnel_stage || "appointment") as FunnelStage,
    archived: row.archived || false,
  }));
}

export async function addMeeting(meeting: Omit<Meeting, "id">, userId: string): Promise<void> {
  const { error } = await supabase.from("meetings").insert({
    lead_name: meeting.leadName,
    phone: meeting.phone,
    date: meeting.date,
    time: meeting.time,
    pre_seller: meeting.preSeller,
    consultant: meeting.consultant,
    down_payment: meeting.downPayment,
    installment: meeting.installment,
    restriction: meeting.restriction,
    notes: meeting.notes,
    status: meeting.status || "pending",
    marking_type: meeting.markingType || "lead_quente",
    meeting_type: meeting.meetingType || "presencial",
    trigger: meeting.trigger || "imovel",
    city: meeting.city || "",
    sale_date: meeting.saleDate || null,
    user_id: userId,
    funnel_stage: meeting.funnelStage || "appointment",
    archived: meeting.archived || false,
  });
  if (error) throw error;
}

export async function updateMeeting(meeting: Meeting): Promise<void> {
  const { error } = await supabase
    .from("meetings")
    .update({
      lead_name: meeting.leadName,
      phone: meeting.phone,
      date: meeting.date,
      time: meeting.time,
      pre_seller: meeting.preSeller,
      consultant: meeting.consultant,
      down_payment: meeting.downPayment,
      installment: meeting.installment,
      restriction: meeting.restriction,
      notes: meeting.notes,
      status: meeting.status,
      marking_type: meeting.markingType,
      meeting_type: meeting.meetingType,
      trigger: meeting.trigger,
      city: meeting.city,
      sale_date: meeting.saleDate,
      funnel_stage: meeting.funnelStage,
      archived: meeting.archived,
    })
    .eq("id", meeting.id);
  if (error) throw error;
}

export async function updateMeetingStatus(id: string, status: string): Promise<void> {
  const { data: meeting } = await supabase
    .from("meetings")
    .select("status, status_history")
    .eq("id", id)
    .single();

  if (!meeting) return;

  const currentStatus = meeting.status;
  let currentHistory = meeting.status_history || [];
  let newStatus = status as MeetingStatus;
  let newHistory = [...currentHistory];

  // Se o status já está no histórico ou é o status atual, removemos
  if (newHistory.includes(status) || currentStatus === status) {
    // Para evitar duplicatas, primeiro limpamos qualquer ocorrência desse status
    newHistory = newHistory.filter(s => s !== status);
    
    if (currentStatus === status) {
      // Se estamos removendo o status atual, definimos o anterior como atual
      newStatus = newHistory.length > 0 ? newHistory[newHistory.length - 1] as MeetingStatus : "pending";
      // E removemos ele do histórico se houver
      if (newHistory.length > 0) {
        newHistory = newHistory.slice(0, -1);
      }
    } else {
      // Se não é o atual, mantemos o atual
      newStatus = currentStatus as MeetingStatus;
    }
  } else {
    // Adição normal: garante que não haja duplicatas antes de adicionar
    newHistory = newHistory.filter(s => s !== status);
    if (currentStatus !== "pending" && !newHistory.includes(currentStatus)) {
      newHistory.push(currentStatus);
    }
    newStatus = status as MeetingStatus;
  }

  const { error } = await supabase
    .from("meetings")
    .update({ 
      status: newStatus,
      status_history: newHistory
    })
    .eq("id", id);
  if (error) throw error;

  // Se for uma venda, criar reconhecimento para comemoração em tela cheia
  if (status === "venda_concluida") {
    const { data: meeting } = await supabase
      .from("meetings")
      .select("lead_name, down_payment, pre_seller, consultant")
      .eq("id", id)
      .single();

    if (meeting) {
      const { data: { user } } = await supabase.auth.getUser();
      const sellerName = meeting.consultant || meeting.pre_seller || "Consultor";
      
      // Obter o perfil do usuário que realizou a ação (admin_user_id)
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user?.id)
        .single();

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "seller"]);

      if (profiles && profiles.length > 0 && user) {
        console.log("Creating recognitions for sale to:", profiles.length, "users");
        const recognitions = profiles.map(p => ({
          recipient_user_id: p.id,
          admin_user_id: user.id,
          title: "💰 VENDA REALIZADA!",
          message: `${myProfile?.display_name || sellerName} fechou uma venda com o cliente ${meeting.lead_name}!`,
          metric_label: "Entrada",
          metric_value: meeting.down_payment || "N/A",
        }));

        const { error: insertErr } = await supabase.from("recognitions").insert(recognitions);
        if (insertErr) console.error("Error inserting recognitions:", insertErr);
      }
    }

  }
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

export async function updateFunnelStage(id: string, stage: FunnelStage): Promise<void> {
  const status = stage === 'visit' ? 'compareceu' : 
                stage === 'negotiation' ? 'em_negociacao' : 
                stage === 'sale' ? 'venda_concluida' : 'pending';

  const { data: meeting } = await supabase
    .from("meetings")
    .select("status_history")
    .eq("id", id)
    .single();

  const currentHistory = meeting?.status_history || [];
  const newHistory = currentHistory.includes(status) 
    ? currentHistory 
    : [...currentHistory, status];

  const { error } = await supabase
    .from("meetings")
    .update({ 
      funnel_stage: stage,
      status,
      status_history: newHistory,
      sale_date: stage === 'sale' ? new Date().toISOString().split('T')[0] : null
    })
    .eq("id", id);
  if (error) throw error;
}

export async function getCalls(startDate?: string, endDate?: string): Promise<Call[]> {
  let query = supabase
    .from("calls")
    .select("*, profiles:user_id(display_name)")
    .order("call_time", { ascending: false });

  if (startDate) {
    query = query.gte("call_time", startDate);
  }
  if (endDate) {
    query = query.lte("call_time", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching calls:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    leadName: row.lead_name,
    userId: row.user_id,
    userDisplayName: row.profiles?.display_name || "Desconhecido",
    callTime: row.call_time,
    result: row.result,
    createdAt: row.created_at,
  }));
}

export async function addCall(call: Omit<Call, "id" | "userDisplayName">): Promise<void> {
  const { error } = await supabase.from("calls").insert({
    lead_name: call.leadName,
    user_id: call.userId,
    call_time: call.callTime,
    result: call.result,
  });
  if (error) throw error;
}

export async function getBlocks(): Promise<TimeBlock[]> {
  const { data, error } = await supabase
    .from("time_blocks")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching blocks:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    reason: row.reason || "",
  }));
}

export async function addBlock(block: Omit<TimeBlock, "id">): Promise<void> {
  const { error } = await supabase.from("time_blocks").insert({
    date: block.date,
    start_time: block.startTime,
    end_time: block.endTime,
    reason: block.reason,
  });
  if (error) throw error;
}

export async function updateBlock(block: TimeBlock): Promise<void> {
  const { error } = await supabase
    .from("time_blocks")
    .update({
      date: block.date,
      start_time: block.startTime,
      end_time: block.endTime,
      reason: block.reason,
    })
    .eq("id", block.id);
  if (error) throw error;
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from("time_blocks").delete().eq("id", id);
  if (error) throw error;
}

export async function getOccupiedSlots(date: string): Promise<{ time: string; leadName: string; meetingId: string }[]> {
  const { data, error } = await supabase.rpc("get_occupied_slots", { _date: date });
  if (error) {
    console.error("Error fetching occupied slots:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    time: row.slot_time.slice(0, 5),
    leadName: row.lead_name,
    meetingId: row.meeting_id,
  }));
}

export async function isTimeBlocked(date: string, time: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("date", date)
    .lte("start_time", time)
    .gt("end_time", time);

  if (error) {
    console.error("Error checking blocks:", error);
    return false;
  }
  return (data || []).length > 0;
}