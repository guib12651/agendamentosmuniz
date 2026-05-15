import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getMonthKey, formatMonthLabel, useMonthlyGoal } from "@/hooks/useMonthlyGoal";

interface ProfileLite {
  id: string;
  display_name: string;
  username: string;
  role: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function GoalsAdminDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const [month, setMonth] = useState<string>(() => getMonthKey().slice(0, 7));
  const monthKey = `${month}-01`;
  const { goal, progress, reload } = useMonthlyGoal(monthKey);

  const [totalGoal, setTotalGoal] = useState<string>("");
  const [splitCount, setSplitCount] = useState<string>("");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, display_name, username, role")
      .order("display_name")
      .then(({ data }) => setProfiles((data as any) ?? []));
  }, [open]);

  useEffect(() => {
    setTotalGoal(goal ? String(goal.total_goal) : "");
    setSplitCount(goal?.split_count ? String(goal.split_count) : "");
  }, [goal]);

  useEffect(() => {
    const map: Record<string, string> = {};
    const tMap: Record<string, string> = {};
    progress.forEach((p) => {
      map[p.user_id] = String(p.amount);
      tMap[p.user_id] = String(p.target_amount ?? "");
    });
    setAmounts(map);
    setTargets(tMap);
  }, [progress]);

  const totalNum = Number(totalGoal) || 0;
  const splitNum = Number(splitCount) || 0;
  const perPerson = splitNum > 0 ? totalNum / splitNum : totalNum;

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const { error: gErr } = await supabase
        .from("monthly_goals")
        .upsert(
          {
            month: monthKey,
            total_goal: totalNum,
            split_count: splitNum > 0 ? splitNum : null,
            created_by: profile.id,
          },
          { onConflict: "month" }
        );
      if (gErr) throw gErr;

      const userIds = Array.from(new Set([...Object.keys(amounts), ...Object.keys(targets)]));
      const rows = userIds
        .map(user_id => {
          const amount = Number(amounts[user_id]) || 0;
          const target_amount = Number(targets[user_id]) || 0;
          return { month: monthKey, user_id, amount, target_amount };
        })
        .filter(row => row.amount > 0 || row.target_amount > 0);
      if (rows.length) {
        const { error: pErr } = await supabase
          .from("monthly_goal_progress")
          .upsert(rows, { onConflict: "month,user_id" });
        if (pErr) throw pErr;
      }

      toast.success("Metas atualizadas!");
      await reload();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">
            Gerenciar metas — {formatMonthLabel(monthKey)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mês</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta total (R$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={totalGoal}
                onChange={(e) => setTotalGoal(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dividir para quantos funcionários (opcional)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={splitCount}
                onChange={(e) => setSplitCount(e.target.value)}
                placeholder="5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meta por funcionário</Label>
              <div className="h-10 flex items-center px-3 rounded-md bg-muted text-foreground font-semibold">
                {formatBRL(perPerson)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base">Metas e Realizado por funcionário</Label>
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.display_name}</div>
                    <div className="text-xs text-muted-foreground">
                      @{p.username} · {p.role === "admin" ? "Admin" : "Pré-vendedor"}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground ml-1">Meta (R$)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="w-28 sm:w-32 h-9"
                        placeholder={String(perPerson)}
                        value={targets[p.id] ?? ""}
                        onChange={(e) =>
                          setTargets((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground ml-1">Realizado (R$)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="w-28 sm:w-32 h-9 border-primary/20 focus-visible:ring-primary/30"
                        placeholder="0"
                        value={amounts[p.id] ?? ""}
                        onChange={(e) =>
                          setAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
