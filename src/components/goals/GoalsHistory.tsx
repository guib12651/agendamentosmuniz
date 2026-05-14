import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMonthLabel, getMonthKey } from "@/hooks/useMonthlyGoal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { History } from "lucide-react";

interface GoalRow {
  id: string;
  month: string;
  total_goal: number;
  split_count: number | null;
}
interface ProgressRow {
  month: string;
  amount: number;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function GoalsHistory() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const currentMonth = getMonthKey();

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [g, p] = await Promise.all([
        supabase.from("monthly_goals").select("*").order("month", { ascending: false }),
        supabase.from("monthly_goal_progress").select("month, amount"),
      ]);
      if (cancel) return;
      setGoals(((g.data as any) ?? []) as GoalRow[]);
      setProgress(((p.data as any) ?? []) as ProgressRow[]);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const past = goals.filter((g) => g.month < currentMonth);
  if (past.length === 0) return null;

  const realizedByMonth = progress.reduce<Record<string, number>>((acc, r) => {
    acc[r.month] = (acc[r.month] ?? 0) + Number(r.amount || 0);
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
                const realized = realizedByMonth[g.month] ?? 0;
                const pct = g.total_goal > 0 ? (realized / g.total_goal) * 100 : 0;
                return (
                  <li key={g.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">
                        {formatMonthLabel(g.month)}
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
