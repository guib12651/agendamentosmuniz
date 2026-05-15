import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyGoal {
  id: string;
  month: string; // YYYY-MM-DD
  total_goal: number;
  split_count: number | null;
}

export interface ProgressRow {
  id: string;
  month: string;
  user_id: string;
  amount: number;
  target_amount?: number;
}

export function getMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function useMonthlyGoal(month: string = getMonthKey()) {
  const { profile, isAdmin } = useAuth();
  const [goal, setGoal] = useState<MonthlyGoal | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [g, p] = await Promise.all([
      supabase.from("monthly_goals").select("*").eq("month", month).maybeSingle(),
      supabase.from("monthly_goal_progress").select("*").eq("month", month),
    ]);
    setGoal((g.data as any) ?? null);
    setProgress(((p.data as any) ?? []) as ProgressRow[]);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  useEffect(() => {
    const ch = supabase
      .channel(`goals-${month}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_goals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_goal_progress" }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [month, reload]);

  const totalGoal = goal?.total_goal ?? 0;
  const splitCount = goal?.split_count ?? 0;
  
  // Custom individual goal for current user if set, otherwise fallback to total / split
  const myProgressRow = profile ? progress.find((r) => r.user_id === profile.id) : null;
  const individualGoal = (myProgressRow?.target_amount && myProgressRow.target_amount > 0)
    ? myProgressRow.target_amount
    : (splitCount > 0 ? totalGoal / splitCount : totalGoal);

  // For admin: total realized = sum of all progress; for user: their own only (RLS filters anyway)
  const totalRealized = progress.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const myProgress = profile ? progress.find((r) => r.user_id === profile.id)?.amount ?? 0 : 0;

  return {
    goal,
    progress,
    loading,
    isAdmin,
    totalGoal,
    splitCount,
    individualGoal,
    totalRealized,
    myProgress: Number(myProgress),
    reload,
  };
}
