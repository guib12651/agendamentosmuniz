import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PeriodGoal {
  id: string;
  start_date: string;
  end_date: string;
  total_goal: number;
  split_count: number | null;
}

export interface ProgressRow {
  id: string;
  start_date: string;
  end_date: string;
  user_id: string;
  amount: number;
  target_amount?: number;
}

export function getCurrentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}

export function formatPeriodLabel(start: string, end: string) {
  const formatDate = (s: string) => {
    const [y, m, d] = s.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("pt-BR");
  };
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function usePeriodGoal() {
  const { profile, isAdmin } = useAuth();
  const [goal, setGoal] = useState<PeriodGoal | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    // Busca a meta específica solicitada (01/05 a 31/05) ou a última meta ativa
    const targetStart = '2026-05-01';
    const targetEnd = '2026-05-31';
    
    // Tenta buscar a meta específica de Maio
    let { data: targetGoal, error: gErr } = await supabase
      .from("period_goals")
      .select("*")
      .eq("start_date", targetStart)
      .eq("end_date", targetEnd)
      .maybeSingle();

    // Se não encontrar a meta de Maio, busca a meta mais recente baseada na data de fim
    if (!targetGoal && !gErr) {
      const { data: latestGoal, error: lErr } = await supabase
        .from("period_goals")
        .select("*")
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      targetGoal = latestGoal;
      gErr = lErr;
    }

    if (gErr) {
      console.error("Error fetching goal:", gErr);
      setLoading(false);
      return;
    }

    if (targetGoal) {
      const { data: progressData, error: pErr } = await supabase
        .from("period_goal_progress")
        .select("*")
        .eq("start_date", targetGoal.start_date)
        .eq("end_date", targetGoal.end_date);
      
      if (pErr) console.error("Error fetching progress:", pErr);
      
      setGoal(targetGoal as any);
      setProgress((progressData as any) ?? []);
    } else {
      setGoal(null);
      setProgress([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  useEffect(() => {
    const ch = supabase
      .channel(`goals-realtime-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "period_goals" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "period_goal_progress" }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [reload]);

  const totalGoal = goal?.total_goal ?? 0;
  const splitCount = goal?.split_count ?? 0;
  
  const myProgressRow = profile ? progress.find((r) => r.user_id === profile.id) : null;
  const individualGoal = (myProgressRow?.target_amount && myProgressRow.target_amount > 0)
    ? myProgressRow.target_amount
    : (splitCount > 0 ? totalGoal / splitCount : totalGoal);

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
