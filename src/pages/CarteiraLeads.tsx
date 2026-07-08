import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Archive, ArchiveRestore, Pencil, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_BADGE, LEAD_STATUSES, LEAD_INTERESTS, LEAD_SOURCES, LeadStatus } from "@/lib/leadsTypes";
import { getLeads, archiveLead, restoreLead, updateLead } from "@/lib/leadsStore";
import LeadFormDialog from "@/components/leads/LeadFormDialog";
import LeadDetailsSheet from "@/components/leads/LeadDetailsSheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CarteiraLeads() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  const [users, setUsers] = useState<{ id: string; display_name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [toArchive, setToArchive] = useState<Lead | null>(null);

  const load = async () => {
    setLoading(true);
    setLeads(await getLeads(showArchived));
    setLoading(false);
  };

  useEffect(() => { load(); }, [showArchived]);
  useEffect(() => {
    if (isAdmin) {
      supabase.from("profiles").select("id, display_name").then(({ data }) => setUsers((data || []) as any));
    }
  }, [isAdmin]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const s = search.toLowerCase();
        if (!l.name.toLowerCase().includes(s) && !l.phone.includes(s)) return false;
      }
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (interestFilter !== "all" && l.interest !== interestFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (isAdmin && responsibleFilter !== "all" && l.responsible_user_id !== responsibleFilter) return false;
      return true;
    });
  }, [leads, search, statusFilter, interestFilter, sourceFilter, responsibleFilter, isAdmin]);

  const stats = useMemo(() => {
    const byStatus = (s: LeadStatus) => filtered.filter((l) => l.status === s).length;
    return {
      total: filtered.length,
      novo: byStatus("novo"),
      em_atendimento: byStatus("em_atendimento"),
      agendado: byStatus("agendado"),
      nao_respondeu: byStatus("nao_respondeu"),
      fechado: byStatus("fechado"),
    };
  }, [filtered]);

  const changeStatus = async (l: Lead, status: LeadStatus) => {
    try {
      await updateLead(l.id, { status }, profile!.id, l);
      toast.success("Status atualizado");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const doArchive = async () => {
    if (!toArchive) return;
    try {
      if (toArchive.is_archived) await restoreLead(toArchive.id, profile!.id);
      else await archiveLead(toArchive.id, profile!.id);
      toast.success(toArchive.is_archived ? "Lead restaurado" : "Lead arquivado");
      setToArchive(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-14 px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="font-semibold text-base sm:text-lg">Carteira de Leads</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {isAdmin ? "Acompanhe os leads cadastrados por toda a equipe." : "Organize e acompanhe seus contatos comerciais."}
              </p>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo Lead
          </Button>
        </div>
      </header>

      <main className="container px-3 sm:px-6 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { l: isAdmin ? "Total da equipe" : "Minha carteira", v: stats.total },
            { l: "Novos", v: stats.novo },
            { l: "Em atendimento", v: stats.em_atendimento },
            { l: "Agendados", v: stats.agendado },
            { l: "Sem resposta", v: stats.nao_respondeu },
            { l: "Fechados", v: stats.fechado },
          ].map((s) => (
            <div key={s.l} className="border border-border rounded-lg p-3 bg-card">
              <div className="text-xs text-muted-foreground">{s.l}</div>
              <div className="text-2xl font-semibold">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou telefone" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={interestFilter} onValueChange={setInterestFilter}>
            <SelectTrigger><SelectValue placeholder="Interesse" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os interesses</SelectItem>
              {LEAD_INTERESTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {LEAD_SOURCES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Vendo arquivados" : "Ver arquivados"}
          </Button>
          <span className="text-xs text-muted-foreground">{filtered.length} lead(s)</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-lg">
            Nenhum lead encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((l) => (
              <div key={l.id} className="border border-border rounded-lg p-3 bg-card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs border shrink-0 ${LEAD_STATUS_BADGE[l.status]}`}>
                    {LEAD_STATUS_LABELS[l.status]}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {l.interest} • {l.source}
                  {isAdmin && l.responsible_name && <> • Resp.: {l.responsible_name}</>}
                </div>
                {l.next_follow_up_at && (
                  <div className="text-xs">Retorno: {new Date(l.next_follow_up_at).toLocaleString("pt-BR")}</div>
                )}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <Select value={l.status} onValueChange={(v) => changeStatus(l, v as LeadStatus)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => setViewing(l)}><Eye className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(l); setShowForm(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setToArchive(l)}>
                    {l.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <LeadFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        lead={editing}
        userId={profile!.id}
        isAdmin={isAdmin}
        onSaved={load}
      />
      <LeadDetailsSheet open={!!viewing} onOpenChange={(v) => !v && setViewing(null)} lead={viewing} />

      <AlertDialog open={!!toArchive} onOpenChange={(v) => !v && setToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toArchive?.is_archived ? "Restaurar lead?" : "Arquivar lead?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {toArchive?.is_archived
                ? "O lead voltará para a carteira ativa."
                : "Ele sairá da sua carteira principal, mas poderá ser consultado novamente nos arquivados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doArchive}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
