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
}

export default function AddSaleDialog({ open, onOpenChange }: Props) {
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
      const current = progress.find((p) => p.user_id === userId)?.amount ?? 0;
      const newAmount = Number(current) + value;
      const { error } = await supabase
        .from("monthly_goal_progress")
        .upsert(
          { month: monthKey, user_id: userId, amount: newAmount },
          { onConflict: "month,user_id" }
        );
      if (error) throw error;
      toast.success(
        `+ ${value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} adicionado!`
      );
      await reload();
      setAmount("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar venda");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar venda</DialogTitle>
          <DialogDescription className="capitalize">
            Soma ao realizado de {formatMonthLabel(monthKey)} e aumenta o % da meta.
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
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name} {p.role === "admin" ? "· Admin" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor da venda (R$)</Label>
            <Input
              type="number"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex.: 500000"
            />
            <p className="text-xs text-muted-foreground">
              O valor será somado ao total já realizado pelo vendedor neste mês.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "Adicionando..." : "Adicionar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
