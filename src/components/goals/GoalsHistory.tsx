import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPeriodLabel, getCurrentPeriod } from "@/hooks/usePeriodGoal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { History } from "lucide-react";

interface GoalRow {
  id: string;
  start_date: string;
  end_date: string;
  total_goal: number;
  split_count: number | null;
}
interface ProgressRow {
  start_date: string;
  end_date: string;
  amount: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function GoalsHistory() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const current = getCurrentPeriod();

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [g, p] = await Promise.all([
        supabase.from("period_goals" as any).select("*").order("start_date", { ascending: false }),
        supabase.from("period_goal_progress" as any).select("start_date, end_date, amount"),
      ]);
      if (cancel) return;
      setGoals(((g.data as any) ?? []) as GoalRow[]);
      setProgress(((p.data as any) ?? []) as ProgressRow[]);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const past = goals.filter((g) => g.start_date !== current.start || g.end_date !== current.end);
  if (past.length === 0) return null;

  const realizedByPeriod = progress.reduce<Record<string, number>>((acc, r) => {
    const key = `${r.start_date}_${r.end_date}`;
    acc[key] = (acc[key] ?? 0) + Number(r.amount || 0);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-6">
      <Accordion type="single" collapsible>
        <AccordionItem value="history" className="border-none">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-primary" />
              Histórico de metas
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="divide-y divide-border">
              {past.map((g) => {
                const key = `${g.start_date}_${g.end_date}`;
                const realized = realizedByPeriod[key] ?? 0;
                const pct = g.total_goal > 0 ? (realized / g.total_goal) * 100 : 0;
                return (
                  <li key={g.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">
                        {formatPeriodLabel(g.start_date, g.end_date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(realized)} de {formatBRL(g.total_goal)}
                      </p>
                    </div>
                    <span
                      className={
                        "text-sm font-display font-bold " +
                        (pct >= 100 ? "text-primary" : "text-foreground")
                      }
                    >
                      {Math.round(pct)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
