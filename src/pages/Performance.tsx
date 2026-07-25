import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import PeriodFilter, { PeriodType, getDateRange } from "@/components/PeriodFilter";
import { PerformanceOverview } from "@/components/performance/PerformanceOverview";
import { EmployeeList } from "@/components/performance/EmployeeList";
import { EmployeeDetailSheet } from "@/components/performance/EmployeeDetailSheet";
import { RecognitionHistory } from "@/components/performance/RecognitionHistory";
import {
  fetchPerformanceData,
  fetchRecognitionHistory,
  type EmployeeMetrics,
  type GoalStatus,
  type OverviewMetrics,
} from "@/lib/performanceQueries";

export default function Performance() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriod] = useState<PeriodType>("monthly");
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const [employees, setEmployees] = useState<EmployeeMetrics[]>([]);
  const [overview, setOverview] = useState<OverviewMetrics>({
    meetings: 0, visits: 0, calls: 0, sales: 0, salesAmount: 0, goalsAchieved: 0,
  });
  const [goalsByUser, setGoalsByUser] = useState<Record<string, GoalStatus[]>>({});
  const [selected, setSelected] = useState<EmployeeMetrics | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(
    () => getDateRange(period, selectedDate, customStart, customEnd),
    [period, selectedDate, customStart, customEnd]
  );

  const reload = async () => {
    setLoading(true);
    const [perf, hist] = await Promise.all([
      fetchPerformanceData(range.start, range.end),
      fetchRecognitionHistory(20),
    ]);
    setEmployees(perf.employees);
    setOverview(perf.overview);
    setGoalsByUser(perf.goalsByUser);

    // enrich history with names
    const nameMap = new Map(perf.employees.map((e) => [e.userId, e.displayName]));
    setHistory(
      hist.map((h: any) => ({
        ...h,
        recipient_name: nameMap.get(h.recipient_user_id) || "Funcionário",
        admin_name: nameMap.get(h.admin_user_id) || "Admin",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const alreadySentIds = useMemo(() => {
    const set = new Set<string>();
    for (const h of history) if (h.goal_progress_id) set.add(h.goal_progress_id);
    return set;
  }, [history]);

  return (
    <div className="min-h-screen pb-8">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex items-center gap-2 py-3 px-3 sm:px-6">
          <Button size="sm" variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-display font-bold">Performance</h1>
          </div>
        </div>
      </header>

      <main className="container mt-4 px-3 sm:px-6 space-y-5">
        <p className="text-sm text-muted-foreground">
          Acompanhe a performance da equipe e reconheça quem está fazendo a diferença.
        </p>

        <PeriodFilter
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          period={period}
          onPeriodChange={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />

        <PerformanceOverview overview={overview} />

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Funcionários
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <EmployeeList employees={employees} onSelect={setSelected} onSent={reload} />
          )}
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Reconhecimentos recentes
          </h2>
          <RecognitionHistory items={history} />
        </section>
      </main>

      <EmployeeDetailSheet
        employee={selected}
        goals={selected ? goalsByUser[selected.userId] || [] : []}
        onClose={() => setSelected(null)}
        onSent={reload}
        alreadySentIds={alreadySentIds}
      />
    </div>
  );
}
