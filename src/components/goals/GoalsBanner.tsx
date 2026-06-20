import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePeriodGoal, formatPeriodLabel, getCurrentPeriod } from "@/hooks/usePeriodGoal";
import { useCountUp } from "@/hooks/useCountUp";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Settings2,
  Trophy,
  Sparkles,
  Plus,
  Undo2,
  Printer,
  CheckCircle2,
  Target,
  ChevronDown,
} from "lucide-react";
import GoalsAdminDialog from "./GoalsAdminDialog";
import AddSaleDialog from "./AddSaleDialog";
import GoalsHistory from "./GoalsHistory";
import NoShowPrintDialog from "../NoShowPrintDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { isAdmin, totalGoal, individualGoal, totalRealized, myProgress, goal, reload } =
    usePeriodGoal();
  const [adminOpen, setAdminOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [removeSaleOpen, setRemoveSaleOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [concluding, setConcluding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmConcludeOpen, setConfirmConcludeOpen] = useState(false);
  const isMobile = useIsMobile();

  async function handleConcludeGoal() {
    if (!goal || concluding) return;
    setConcluding(true);
    try {
      const { error } = await supabase
        .from("period_goals")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", goal.id);

      if (error) throw error;

      toast.success("Meta concluída com sucesso!");
      setConfirmConcludeOpen(false);
      setMenuOpen(false);
      await reload();
    } catch (error: any) {
      console.error("Error concluding goal:", error);
      toast.error("Erro ao concluir meta");
    } finally {
      setConcluding(false);
    }
  }

  function openWithGuard(open: () => void, requireGoal = true) {
    if (requireGoal && !goal) {
      toast.warning("Crie ou selecione uma meta antes de registrar vendas.");
      return;
    }
    setMenuOpen(false);
    open();
  }

  const MenuBody = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        {goal ? (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Meta do período
            </p>
            <p className="text-sm font-semibold mt-0.5">
              {formatBRL(totalRealized)}{" "}
              <span className="text-muted-foreground font-normal">de {formatBRL(totalGoal)}</span>
            </p>
            <p className="text-xs text-primary font-semibold mt-0.5">
              {Math.round(generalPctRaw)}% concluída
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma meta ativa para este período.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
          Vendas
        </p>
        <button
          onClick={() => openWithGuard(() => setSaleOpen(true))}
          disabled={!goal}
          className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left transition-colors bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:hover:bg-primary/10 disabled:cursor-not-allowed"
        >
          <Plus className="size-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Registrar venda</p>
            <p className="text-xs text-muted-foreground">Adicionar valor ao realizado do vendedor</p>
          </div>
        </button>
        <button
          onClick={() => openWithGuard(() => setRemoveSaleOpen(true))}
          disabled={!goal}
          className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <Undo2 className="size-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Corrigir / estornar venda</p>
            <p className="text-xs text-muted-foreground">Use para corrigir lançamentos ou estornos</p>
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
          Gestão da meta
        </p>
        <button
          onClick={() => { setMenuOpen(false); setAdminOpen(true); }}
          className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted"
        >
          <Settings2 className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Gerenciar metas</p>
            <p className="text-xs text-muted-foreground">Criar, editar ou definir metas individuais</p>
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
          Relatórios
        </p>
        <button
          onClick={() => { setMenuOpen(false); setPrintOpen(true); }}
          className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted"
        >
          <Printer className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Exportar faltas</p>
            <p className="text-xs text-muted-foreground">Gerar folha de no-shows do período</p>
          </div>
        </button>
      </div>

      {goal && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Encerramento
          </p>
          <button
            onClick={() => { setMenuOpen(false); setConfirmConcludeOpen(true); }}
            className="w-full flex items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-emerald-600/10"
          >
            <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Concluir meta do período</p>
              <p className="text-xs text-muted-foreground">Move a meta para o histórico</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );


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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2">
        <h2 className="text-lg sm:text-xl font-display font-semibold tracking-tight capitalize">
          {goal ? formatPeriodLabel(goal.start_date, goal.end_date) : "Metas"}
        </h2>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setSaleOpen(true)} className="flex-1 sm:flex-none gap-1.5 h-10 sm:h-9">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Adicionar venda</span>
              <span className="sm:hidden">Venda</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRemoveSaleOpen(true)}
              className="flex-1 sm:flex-none gap-1.5 h-10 sm:h-9"
            >
              <Minus className="size-4" />
              <span className="hidden sm:inline">Remover venda</span>
              <span className="sm:hidden">Remover</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPrintOpen(true)} className="flex-1 sm:flex-none gap-1.5 h-10 sm:h-9 border-destructive/20 text-destructive hover:bg-destructive/10">
              <Printer className="size-4" />
              <span className="hidden sm:inline">Imprimir Faltas</span>
              <span className="sm:hidden">Faltas</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdminOpen(true)} className="flex-1 sm:flex-none gap-1.5 h-10 sm:h-9">
              <Settings2 className="size-4" />
              <span className="hidden sm:inline">Gerenciar metas</span>
              <span className="sm:hidden">Metas</span>
            </Button>
            {goal && (
              <Button 
                size="sm" 
                variant="default" 
                onClick={handleConcludeGoal} 
                disabled={concluding}
                className="flex-1 sm:flex-none gap-1.5 h-10 sm:h-9 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
              >
                <CheckCircle2 className="size-4" />
                <span className="hidden sm:inline">{concluding ? "Concluindo..." : "Concluir meta"}</span>
                <span className="sm:hidden">{concluding ? "..." : "Concluir"}</span>
              </Button>
            )}
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
                  <div className="text-2xl sm:text-3xl font-display font-black text-primary">
                    {Math.round(generalPctRaw)}%
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-display font-black">
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
                  <div className="text-2xl sm:text-3xl font-display font-black">
                    {Math.round(individualPctRaw)}%
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-display font-black">
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
      {isAdmin && <AddSaleDialog open={saleOpen} onOpenChange={setSaleOpen} />}
      {isAdmin && (
        <AddSaleDialog open={removeSaleOpen} onOpenChange={setRemoveSaleOpen} mode="remove" />
      )}
      {isAdmin && <NoShowPrintDialog open={printOpen} onOpenChange={setPrintOpen} />}
    </section>
  );
}
