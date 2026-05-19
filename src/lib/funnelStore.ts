import { supabase } from "@/integrations/supabase/client";

export interface SalesFunnelData {
  id?: string;
  totalLeadsCaptured: number;
  distribution: {
    userId: string;
    displayName: string;
    leadsReceived: number;
    callsMade: number;
    appointmentsMade: number;
    visitsCompleted: number;
    negotiationsStarted: number;
    salesCompleted: number;
  }[];
}

export async function getFunnelDataRange(startDate: string, endDate: string): Promise<SalesFunnelData | null> {
  // 1. Obter todos os dias no intervalo
  const { data: daysData, error: dayError } = await supabase
    .from("sales_funnel_days")
    .select("id, total_leads_captured")
    .gte("date", startDate)
    .lte("date", endDate);

  if (dayError) throw dayError;
  
  // 2. Obter todas as distribuições para esses dias
  const dayIds = (daysData || []).map(d => d.id);
  
  let distData: any[] = [];
  if (dayIds.length > 0) {
    const { data, error: distError } = await supabase
      .from("sales_funnel_distribution")
      .select("*, profiles:user_id(display_name)")
      .in("day_id", dayIds);
    if (distError) throw distError;
    distData = data || [];
  }

  const totalCaptured = (daysData || []).reduce((acc, d) => acc + (d.total_leads_captured || 0), 0);

  // Agrupar por usuário
  const userMap = new Map<string, any>();
  distData.forEach(d => {
    const userId = d.user_id;
    const existing = userMap.get(userId) || {
      userId,
      displayName: d.profiles?.display_name || "Desconhecido",
      leadsReceived: 0,
      callsMade: 0,
      appointmentsMade: 0,
      visitsCompleted: 0,
      negotiationsStarted: 0,
      salesCompleted: 0,
    };
    
    userMap.set(userId, {
      ...existing,
      leadsReceived: existing.leadsReceived + (d.leads_received || 0),
      callsMade: existing.callsMade + (d.calls_made || 0),
      appointmentsMade: existing.appointmentsMade + (d.appointments_made || 0),
      visitsCompleted: existing.visitsCompleted + (d.visits_completed || 0),
      negotiationsStarted: existing.negotiationsStarted + (d.negotiations_started || 0),
      salesCompleted: existing.salesCompleted + (d.sales_completed || 0),
    });
  });

  return {
    totalLeadsCaptured: totalCaptured,
    distribution: Array.from(userMap.values()),
  };
}

export async function getFunnelData(date: string): Promise<SalesFunnelData | null> {
  const { data: dayData, error: dayError } = await supabase
    .from("sales_funnel_days")
    .select("id, total_leads_captured")
    .eq("date", date)
    .maybeSingle();

  if (dayError) throw dayError;
  if (!dayData) return null;

  const { data: distData, error: distError } = await supabase
    .from("sales_funnel_distribution")
    .select("*, profiles:user_id(display_name)")
    .eq("day_id", dayData.id);

  if (distError) throw distError;

  return {
    id: dayData.id,
    totalLeadsCaptured: dayData.total_leads_captured || 0,
    distribution: (distData || []).map((d: any) => ({
      userId: d.user_id,
      displayName: d.profiles?.display_name || "Desconhecido",
      leadsReceived: d.leads_received || 0,
      callsMade: d.calls_made || 0,
      appointmentsMade: d.appointments_made || 0,
      visitsCompleted: d.visits_completed || 0,
      negotiationsStarted: d.negotiations_started || 0,
      salesCompleted: d.sales_completed || 0,
    })),
  };
}

export async function saveFunnelDay(date: string, totalLeadsCaptured: number) {
  const { data, error } = await supabase
    .from("sales_funnel_days")
    .upsert({ date, total_leads_captured: totalLeadsCaptured }, { onConflict: "date" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveFunnelDistribution(dayId: string, userId: string, metrics: Partial<SalesFunnelData["distribution"][0]>) {
  const { error } = await supabase
    .from("sales_funnel_distribution")
    .upsert({
      day_id: dayId,
      user_id: userId,
      leads_received: metrics.leadsReceived,
      calls_made: metrics.callsMade,
      appointments_made: metrics.appointmentsMade,
      visits_completed: metrics.visitsCompleted,
      negotiations_started: metrics.negotiationsStarted,
      sales_completed: metrics.salesCompleted,
    }, { onConflict: "day_id,user_id" });

  if (error) throw error;
}
