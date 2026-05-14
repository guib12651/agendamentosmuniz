import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
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
  mode?: "add" | "remove";
}

export default function AddSaleDialog({ open, onOpenChange, mode = "add" }: Props) {
  const isRemove = mode === "remove";
  const monthKey = getMonthKey();
  const { progress, reload } = useMonthlyGoal(monthKey);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    supabase
      .from("profiles")
      .select("id, display_name, username, role")
      .order("display_name")
      .then(({ data }) => {
        const list = (data as any) ?? [];
        setProfiles(list);
        if (list.length && !userId) setUserId(list[0].id);
      });
  }, [open]);

  async function handleAdd() {
    const value = Number(amount);
    if (!userId || !value || isNaN(value) || value <= 0) {
      toast.error("Informe um valor válido e selecione o vendedor.");
      return;
    }
    setSaving(true);
    try {
      const current = Number(progress.find((p) => p.user_id === userId)?.amount ?? 0);
      const delta = isRemove ? -value : value;
      const newAmount = Math.max(0, current + delta);
      const { error } = await supabase
        .from("monthly_goal_progress")
        .upsert(
          { month: monthKey, user_id: userId, amount: newAmount },
          { onConflict: "month,user_id" }
        );
      if (error) throw error;
      const formatted = value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
      toast.success(isRemove ? `- ${formatted} removido!` : `+ ${formatted} adicionado!`);
      await reload();
      setAmount("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || (isRemove ? "Erro ao remover venda" : "Erro ao adicionar venda"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isRemove ? "Remover venda" : "Adicionar venda"}</DialogTitle>
          <DialogDescription className="capitalize">
            {isRemove
              ? `Subtrai do realizado de ${formatMonthLabel(monthKey)} e diminui o % da meta.`
              : `Soma ao realizado de ${formatMonthLabel(monthKey)} e aumenta o % da meta.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Vendedor</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => {
                  const cur = Number(progress.find((x) => x.user_id === p.id)?.amount ?? 0);
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name} {p.role === "admin" ? "· Admin" : ""}
                      {isRemove && ` · atual ${cur.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex.: 500000"
            />
            <p className="text-xs text-muted-foreground">
              {isRemove
                ? "O valor será subtraído do total realizado pelo vendedor neste mês (mínimo zero)."
                : "O valor será somado ao total já realizado pelo vendedor neste mês."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={saving}
            variant={isRemove ? "destructive" : "default"}
          >
            {saving ? (isRemove ? "Removendo..." : "Adicionando...") : isRemove ? "Remover venda" : "Adicionar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
