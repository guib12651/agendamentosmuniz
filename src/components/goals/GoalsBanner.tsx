import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMonthlyGoal, formatMonthLabel, getMonthKey } from "@/hooks/useMonthlyGoal";
import { useCountUp } from "@/hooks/useCountUp";
import { Button } from "@/components/ui/button";
import { Settings2, Trophy, Sparkles, Plus } from "lucide-react";
import GoalsAdminDialog from "./GoalsAdminDialog";
import AddSaleDialog from "./AddSaleDialog";
import GoalsHistory from "./GoalsHistory";
import { cn } from "@/lib/utils";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function motivationalMessage(pct: number) {
  if (pct >= 100) return "🎉 PARABÉNS! META BATIDA!";
  if (pct >= 75) return "Você está muito perto da meta 🎯";
  if (pct >= 50) return "Metade da meta já foi! Continue 👏";
  if (pct >= 25) return "Você está evoluindo muito 🔥";
  return "Seu mês começou! Vamos pra cima 🚀";
}

export default function GoalsBanner() {
  const monthKey = getMonthKey();
  const { isAdmin, totalGoal, individualGoal, totalRealized, myProgress, goal } =
    useMonthlyGoal(monthKey);
  const [adminOpen, setAdminOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);

  const generalPct = totalGoal > 0 ? Math.min(100, (totalRealized / totalGoal) * 100) : 0;
  const generalPctRaw = totalGoal > 0 ? (totalRealized / totalGoal) * 100 : 0;
  const individualPct = individualGoal > 0 ? Math.min(100, (myProgress / individualGoal) * 100) : 0;
  const individualPctRaw = individualGoal > 0 ? (myProgress / individualGoal) * 100 : 0;

  const animTotalRealized = useCountUp(totalRealized);
  const animTotalGoal = useCountUp(totalGoal);
  const animMyProgress = useCountUp(myProgress);
  const animIndividualGoal = useCountUp(individualGoal);

  const generalHit = generalPctRaw >= 100;

  // Banner aparece para todos os usuários autenticados (admin e pré-venda)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-display font-semibold tracking-tight capitalize">
          {formatMonthLabel(monthKey)}
        </h2>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setSaleOpen(true)} className="gap-1.5">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Adicionar venda</span>
              <span className="sm:hidden">Venda</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdminOpen(true)} className="gap-1.5">
              <Settings2 className="size-4" />
              <span className="hidden sm:inline">Gerenciar metas</span>
              <span className="sm:hidden">Metas</span>
            </Button>
          </div>
        )}
      </div>

      {!goal ? (
        isAdmin ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-muted-foreground mb-3">
              Nenhuma meta definida para este mês.
            </p>
            <Button onClick={() => setAdminOpen(true)} className="gap-2">
              <Sparkles className="size-4" />
              Definir meta do mês
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-muted-foreground">
              Aguardando definição da meta do mês ⏳
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* META GERAL */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm",
              "transition-all duration-300 hover:shadow-lg hover:border-primary/40",
              generalHit && "animate-glow border-primary/60"
            )}
          >
            <div
              aria-hidden
              className="absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl"
            />
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <Trophy className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Meta geral do mês
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Acompanhe o desempenho geral da operação 🚀
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-primary">
                    {Math.round(generalPctRaw)}%
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-display font-bold">
                    {formatBRL(animTotalRealized)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    de <span className="font-semibold text-foreground">{formatBRL(animTotalGoal)}</span>
                  </span>
                </div>
              </div>

              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${generalPct}%` }}
                />
              </div>

              {generalHit && (
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Sparkles className="size-4" />
                  🎉 META GERAL BATIDA!
                </div>
              )}
            </div>
          </div>

          {/* META INDIVIDUAL */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-6 sm:p-8 shadow-sm",
              "transition-all duration-300 hover:shadow-lg hover:border-primary/40"
            )}
          >
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Sua meta do mês
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    {motivationalMessage(individualPctRaw)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-display font-bold">
                    {Math.round(individualPctRaw)}%
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-display font-bold">
                    {formatBRL(animMyProgress)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    de <span className="font-semibold text-foreground">{formatBRL(animIndividualGoal)}</span>
                  </span>
                </div>
              </div>

              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary to-amber-300 transition-all duration-1000 ease-out"
                  style={{ width: `${individualPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <GoalsHistory />

      {isAdmin && <GoalsAdminDialog open={adminOpen} onOpenChange={setAdminOpen} />}
    </section>
  );
}
