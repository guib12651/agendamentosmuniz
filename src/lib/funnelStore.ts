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
