import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Search, ArrowUpDown, Trophy, PartyPopper } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EmployeeMetrics } from "@/lib/performanceQueries";
import { CongratulateDialog } from "./CongratulateDialog";

type SortKey = "name" | "meetings" | "visits" | "calls" | "sales" | "goalsAchieved";

interface Props {
  employees: EmployeeMetrics[];
  onSelect: (e: EmployeeMetrics) => void;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  seller: "Vendedor",
  pre_seller: "Pré-vendedor",
};

export function EmployeeList({ employees, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const roles = useMemo(() => {
    const set = new Set(employees.map((e) => e.role));
    return Array.from(set);
  }, [employees]);

  const filtered = useMemo(() => {
    let list = employees;
    if (roleFilter !== "all") list = list.filter((e) => e.role === roleFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((e) => e.displayName.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.displayName.localeCompare(b.displayName));
    else sorted.sort((a, b) => (b[sort] as number) - (a[sort] as number));
    return sorted;
  }, [employees, roleFilter, query, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar funcionário..."
            className="pl-9 h-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px] h-10">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabels[r] || r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[190px] h-10">
            <ArrowUpDown className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="meetings">Mais reuniões</SelectItem>
            <SelectItem value="visits">Mais visitas</SelectItem>
            <SelectItem value="calls">Mais ligações</SelectItem>
            <SelectItem value="sales">Mais vendas</SelectItem>
            <SelectItem value="goalsAchieved">Mais metas atingidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {filtered.map((e) => (
          <Card key={e.userId} className="p-3 flex items-center gap-3">
            <UserAvatar avatarUrl={e.avatarUrl} displayName={e.displayName} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{e.displayName}</div>
              <div className="text-xs text-muted-foreground">{roleLabels[e.role] || e.role}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                <span>Reuniões: <b className="text-foreground">{e.meetings}</b></span>
                <span>Visitas: <b className="text-foreground">{e.visits}</b></span>
                <span>Ligações: <b className="text-foreground">{e.calls}</b></span>
                <span>Vendas: <b className="text-foreground">{e.sales}</b></span>
                {e.goalsAchieved > 0 && (
                  <span className="text-primary font-bold flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {e.goalsAchieved}
                  </span>
                )}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onSelect(e)}>
              Detalhes
            </Button>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            Nenhum funcionário encontrado.
          </Card>
        )}
      </div>
    </div>
  );
}
