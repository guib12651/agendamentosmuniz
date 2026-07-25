import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, PartyPopper, Check } from "lucide-react";
import { toast } from "sonner";
import type { EmployeeMetrics, GoalStatus } from "@/lib/performanceQueries";
import { sendRecognition } from "@/lib/performanceQueries";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  employee: EmployeeMetrics | null;
  goals: GoalStatus[];
  onClose: () => void;
  onSent?: () => void;
  alreadySentIds: Set<string>;
}

export function EmployeeDetailSheet({ employee, goals, onClose, onSent, alreadySentIds }: Props) {
  const { profile } = useAuth();
  const [sending, setSending] = useState<string | null>(null);
  const [sentThisSession, setSentThisSession] = useState<Set<string>>(new Set());

  const handleRecognize = async (goal: GoalStatus) => {
    if (!employee || !profile) return;
    setSending(goal.progressId);
    const { error } = await sendRecognition({
      recipientUserId: employee.userId,
      adminUserId: profile.id,
      goalProgressId: goal.progressId,
      recipientName: employee.displayName,
      metricLabel: goal.label,
      metricValue: `${goal.current} de ${goal.target}`,
    });
    setSending(null);
    if (error) {
      if (error.code === "23505") {
        toast.error("Esse funcionário já foi parabenizado por esta meta.");
        setSentThisSession((prev) => new Set(prev).add(goal.progressId));
      } else {
        toast.error("Não foi possível enviar o reconhecimento.");
      }
      return;
    }
    toast.success(`🎉 Parabéns enviado para ${employee.displayName.split(" ")[0]}!`);
    setSentThisSession((prev) => new Set(prev).add(goal.progressId));
    onSent?.();
  };

  return (
    <Sheet open={!!employee} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        {employee && (
          <>
            <SheetHeader>
              <SheetTitle>{employee.displayName}</SheetTitle>
              <p className="text-xs text-muted-foreground">{employee.role}</p>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Reuniões</div>
                  <div className="text-xl font-black">{employee.meetings}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Visitas</div>
                  <div className="text-xl font-black">{employee.visits}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Ligações</div>
                  <div className="text-xl font-black">{employee.calls}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Vendas</div>
                  <div className="text-xl font-black">{employee.sales}</div>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-bold mb-2">Metas do período</h4>
                {goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Dados não disponíveis para este período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {goals.map((g) => {
                      const already = alreadySentIds.has(g.progressId) || sentThisSession.has(g.progressId);
                      const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
                      return (
                        <Card key={g.progressId} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate">{g.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {g.current} de {g.target} ({pct}%)
                              </div>
                            </div>
                            {g.achieved ? (
                              <span className="text-primary font-bold flex items-center gap-1 text-xs">
                                <Trophy className="w-4 h-4" /> Meta atingida
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Em andamento</span>
                            )}
                          </div>
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {g.achieved && (
                            <div className="mt-3">
                              {already ? (
                                <Button size="sm" variant="outline" disabled className="w-full">
                                  <Check className="w-4 h-4 mr-1" /> Parabéns enviado
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="w-full"
                                  disabled={sending === g.progressId}
                                  onClick={() => handleRecognize(g)}
                                >
                                  <PartyPopper className="w-4 h-4 mr-1" />
                                  {sending === g.progressId ? "Enviando..." : "Parabenizar"}
                                </Button>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
