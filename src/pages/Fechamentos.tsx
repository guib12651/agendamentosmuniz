import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, XCircle, Clock, TrendingUp, Users } from "lucide-react";
import { MarkingType } from "@/lib/types";
import logo from "@/assets/logo_muniz.png";

interface MeetingRow {
  id: string;
  date: string;
  pre_seller: string;
  marking_type: string;
  status: string;
}

const markingLabels: Record<string, string> = {
  lead_quente: "Lead quente",
  cnpj: "CNPJ",
  lista_fria: "Lista fria",
  instagram: "Instagram",
  indicacao: "Indicação",
};

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Fechamentos() {
  const { isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [start, setStart] = useState<string>(daysAgoISO(7));
  const [end, setEnd] = useState<string>(todayISO());
  const [preSeller, setPreSeller] = useState<string>("all");
  const [markingType, setMarkingType] = useState<string>("all");

  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [preSellers, setPreSellers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("role", "pre_seller")
      .then(({ data }) => {
        if (data) setPreSellers(data.map((p: any) => p.display_name).sort());
      });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    let q = supabase
      .from("meetings")
      .select("id, date, pre_seller, marking_type, status")
      .gte("date", start)
      .lte("date", end);

    if (preSeller !== "all") q = q.eq("pre_seller", preSeller);
    if (markingType !== "all") q = q.eq("marking_type", markingType);

    q.order("date", { ascending: false }).then(({ data, error }) => {
      if (!error && data) setMeetings(data as MeetingRow[]);
      setLoading(false);
    });
  }, [isAdmin, start, end, preSeller, markingType]);

  const totals = useMemo(() => {
    const total = meetings.length;
    const ok = meetings.filter((m) => m.status === "compareceu").length;
    const no = meetings.filter((m) => m.status === "nao_compareceu").length;
    const pending = meetings.filter((m) => m.status === "pending").length;
    const rate = total > 0 ? Math.round((ok / total) * 100) : 0;
    const noRate = total > 0 ? Math.round((no / total) * 100) : 0;
    return { total, ok, no, pending, rate, noRate };
  }, [meetings]);

  const byDay = useMemo(() => {
    const map = new Map<string, MeetingRow[]>();
    for (const m of meetings) {
      const arr = map.get(m.date) ?? [];
      arr.push(m);
      map.set(m.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [meetings]);

  const bySeller = useMemo(() => {
    const map = new Map<string, { total: number; ok: number; no: number; pending: number }>();
    for (const m of meetings) {
      const s = map.get(m.pre_seller) ?? { total: 0, ok: 0, no: 0, pending: 0 };
      s.total += 1;
      if (m.status === "compareceu") s.ok += 1;
      else if (m.status === "nao_compareceu") s.no += 1;
      else s.pending += 1;
      map.set(m.pre_seller, s);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [meetings]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6 text-center">
        Acesso restrito a administradores.
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <header className="border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-3 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="Muniz Consultorias" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
            <div>
              <h1 className="text-base sm:text-lg font-display font-bold text-primary leading-tight">Fechamentos</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{profile?.displayName} • Admin</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/")} className="h-9 text-xs">
              <ArrowLeft className="w-4 h-4 mr-1" /> Agenda
            </Button>
          </div>
        </div>
      </header>

      <main className="container mt-4 space-y-4 px-3 sm:px-6">
        {/* Filtros */}
        <div className="card-meeting space-y-3">
          <h2 className="font-display font-semibold text-sm text-primary">Filtros</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-10 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-10 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Pré-vendedor</Label>
              <Select value={preSeller} onValueChange={setPreSeller}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {preSellers.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo de marcação</Label>
              <Select value={markingType} onValueChange={setMarkingType}>
                <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(markingLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <StatCard icon={<Users className="w-4 h-4" />} label="Total" value={totals.total} color="text-foreground" />
          <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Compareceram" value={totals.ok} color="text-success" />
          <StatCard icon={<XCircle className="w-4 h-4" />} label="Faltaram" value={totals.no} color="text-destructive" />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Pendentes" value={totals.pending} color="text-muted-foreground" />
          <div className="card-meeting py-3 px-3">
            <div className="flex items-center gap-1.5 text-primary">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Taxa</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl font-display font-bold text-success">{totals.rate}%</p>
              <p className="text-base sm:text-lg font-display font-bold text-destructive">{totals.noRate}%</p>
            </div>
          </div>
        </div>

        {/* Por pré-vendedor */}
        {bySeller.length > 0 && (
          <div className="card-meeting space-y-3">
            <h2 className="font-display font-semibold text-sm text-primary">Por pré-vendedor</h2>
            <div className="space-y-2">
              {bySeller.map(([name, s]) => {
                const decided = s.ok + s.no;
                const rate = decided > 0 ? Math.round((s.ok / decided) * 100) : 0;
                return (
                  <div key={name} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30 text-sm">
                    <span className="font-medium truncate flex-1 min-w-0">{name}</span>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
                      <span className="text-muted-foreground hidden sm:inline">{s.total} total</span>
                      <span className="text-success">{s.ok}✓</span>
                      <span className="text-destructive">{s.no}✗</span>
                      {s.pending > 0 && <span className="text-muted-foreground">{s.pending}•</span>}
                      <span className="text-primary font-bold w-9 text-right">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resumo diário */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-sm text-primary">Resumo diário</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : byDay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum fechamento no período.</p>
          ) : (
            byDay.map(([date, list]) => {
              const ok = list.filter((m) => m.status === "compareceu").length;
              const no = list.filter((m) => m.status === "nao_compareceu").length;
              const pending = list.filter((m) => m.status === "pending").length;
              const decided = ok + no;
              const rate = decided > 0 ? Math.round((ok / decided) * 100) : 0;
              return (
                <button
                  key={date}
                  onClick={() => navigate(`/?date=${date}`)}
                  className="card-meeting w-full text-left hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm sm:text-base">{formatDateBR(date)}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">{list.length} reunião(ões)</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm shrink-0">
                      <span className="text-success flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{ok}</span>
                      <span className="text-destructive flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{no}</span>
                      {pending > 0 && <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pending}</span>}
                      <span className="text-primary font-bold text-sm sm:text-base">{rate}%</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="card-meeting py-3 px-3">
      <div className={`flex items-center gap-1.5 ${color}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className={`mt-1 text-xl sm:text-2xl font-display font-bold ${color}`}>{value}</p>
    </div>
  );
}
