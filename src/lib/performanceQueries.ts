import { supabase } from "@/integrations/supabase/client";

export interface EmployeeMetrics {
  userId: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  meetings: number;
  visits: number;
  calls: number;
  sales: number;
  salesAmount: number;
  goalsAchieved: number;
}

export interface OverviewMetrics {
  meetings: number;
  visits: number;
  calls: number;
  sales: number;
  salesAmount: number;
  goalsAchieved: number;
}

export interface GoalStatus {
  progressId: string;
  goalId: string;
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  achieved: boolean;
  label: string;
}

const VISIT_STATUSES = ["compareceu", "visita_realizada", "em_negociacao", "venda_concluida"];

export async function fetchPerformanceData(startDate: string, endDate: string) {
  const [profilesRes, meetingsRes, callsRes, dailyCallsRes, productionRes, progressRes] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name, role, avatar_url, is_blocked"),
      supabase
        .from("meetings")
        .select("user_id, status, date")
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from("calls")
        .select("user_id, call_time")
        .gte("call_time", `${startDate}T00:00:00`)
        .lte("call_time", `${endDate}T23:59:59`),
      supabase
        .from("daily_calls")
        .select("user_id, amount, date")
        .gte("date", startDate)
        .lte("date", endDate),
      supabase
        .from("production_sales")
        .select("user_id, total_price, production_date")
        .gte("production_date", startDate)
        .lte("production_date", endDate),
      supabase
        .from("period_goal_progress")
        .select("id, user_id, amount, target_amount, start_date, end_date"),
    ]);

  const profiles = (profilesRes.data || []).filter((p: any) => !p.is_blocked);

  const byUser: Record<string, EmployeeMetrics> = {};
  for (const p of profiles) {
    byUser[p.id] = {
      userId: p.id,
      displayName: p.display_name,
      role: p.role,
      avatarUrl: p.avatar_url,
      meetings: 0,
      visits: 0,
      calls: 0,
      sales: 0,
      salesAmount: 0,
      goalsAchieved: 0,
    };
  }

  for (const m of meetingsRes.data || []) {
    const u = m.user_id && byUser[m.user_id];
    if (!u) continue;
    u.meetings += 1;
    if (VISIT_STATUSES.includes(m.status)) u.visits += 1;
    if (m.status === "venda_concluida") u.sales += 1;
  }

  for (const c of callsRes.data || []) {
    const u = c.user_id && byUser[c.user_id];
    if (u) u.calls += 1;
  }
  for (const c of dailyCallsRes.data || []) {
    const u = c.user_id && byUser[c.user_id];
    if (u) u.calls += Number(c.amount) || 0;
  }

  for (const s of productionRes.data || []) {
    const u = s.user_id && byUser[s.user_id];
    if (!u) continue;
    u.sales += 1;
    u.salesAmount += Number(s.total_price) || 0;
  }

  // Goals achieved: progress rows overlapping the selected period whose amount >= target.
  const goalsByUser: Record<string, GoalStatus[]> = {};
  for (const g of progressRes.data || []) {
    // period overlap
    if (g.end_date < startDate || g.start_date > endDate) continue;
    const achieved = Number(g.amount) >= Number(g.target_amount) && Number(g.target_amount) > 0;
    const arr = (goalsByUser[g.user_id] ||= []);
    arr.push({
      progressId: g.id,
      goalId: g.id,
      target: Number(g.target_amount),
      current: Number(g.amount),
      startDate: g.start_date,
      endDate: g.end_date,
      achieved,
      label: `Meta de vendas (${g.start_date} a ${g.end_date})`,
    });
    if (achieved && byUser[g.user_id]) byUser[g.user_id].goalsAchieved += 1;
  }

  const employees = Object.values(byUser).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const overview: OverviewMetrics = employees.reduce(
    (acc, e) => ({
      meetings: acc.meetings + e.meetings,
      visits: acc.visits + e.visits,
      calls: acc.calls + e.calls,
      sales: acc.sales + e.sales,
      salesAmount: acc.salesAmount + e.salesAmount,
      goalsAchieved: acc.goalsAchieved + e.goalsAchieved,
    }),
    { meetings: 0, visits: 0, calls: 0, sales: 0, salesAmount: 0, goalsAchieved: 0 }
  );

  return { employees, overview, goalsByUser };
}

export async function sendRecognition(params: {
  recipientUserId: string;
  adminUserId: string;
  goalProgressId: string | null;
  recipientName: string;
  metricLabel: string;
  metricValue: string;
}) {
  const firstName = params.recipientName.split(" ")[0];
  const title = `Parabéns, ${firstName}!`;
  const message = `Você atingiu ${params.metricLabel}: ${params.metricValue}. Continue fazendo um excelente trabalho!`;
  return supabase.from("recognitions").insert({
    recipient_user_id: params.recipientUserId,
    admin_user_id: params.adminUserId,
    goal_progress_id: params.goalProgressId,
    title,
    message,
    metric_label: params.metricLabel,
    metric_value: params.metricValue,
  });
}

export async function fetchRecognitionHistory(limit = 20) {
  const { data } = await supabase
    .from("recognitions")
    .select("id, recipient_user_id, admin_user_id, title, message, metric_label, metric_value, seen_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}
