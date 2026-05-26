import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Quota, QuotaStatus, Company } from "@/lib/types";
import { 
  Plus, 
  Search, 
  Filter, 
  Menu, 
  LogOut,
  Users as UsersIcon,
  LayoutDashboard,
  TrendingUp,
  FileText,
  Gavel,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  ArrowUpRight,
  History,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo_muniz.png";
import { cn } from "@/lib/utils";
import TimelineSheet from "@/components/TimelineSheet";

const statusConfig: Record<QuotaStatus, { label: string; color: string; icon: any }> = {
  active: { label: "Ativa", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: CheckCircle2 },
  contemplated: { label: "Contemplada", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: TrendingUp },
  cancelled: { label: "Cancelada", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: XCircle },
  pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
};

export default function Quotas() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotaStatus | "all">("all");
  
  // Modal states
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [quotaToDelete, setQuotaToDelete] = useState<string | null>(null);
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedTimelineLeadId, setSelectedTimelineLeadId] = useState<string | undefined>(undefined);
  const [selectedTimelinePhone, setSelectedTimelinePhone] = useState<string | undefined>(undefined);

  // Form states
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [quotaNumber, setQuotaNumber] = useState("");
  const [creditValue, setCreditValue] = useState("");
  const [installmentValue, setInstallmentValue] = useState("");
  const [status, setStatus] = useState<QuotaStatus>("pending");

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: quotasData, error: quotasError }, { data: companiesData, error: companiesError }] = await Promise.all([
        supabase.from("quotas").select("*").order("created_at", { ascending: false }),
        supabase.from("companies").select("*").order("name")
      ]);

      if (quotasError) throw quotasError;
      if (companiesError) throw companiesError;

      setQuotas((quotasData || []).map(q => ({
        id: q.id,
        companyId: q.company_id,
        companyName: q.company_name,
        clientName: q.client_name,
        phone: q.phone,
        groupNumber: q.group_number,
        quotaNumber: q.quota_number,
        creditValue: Number(q.credit_value),
        installmentValue: Number(q.installment_value),
        sellerId: q.seller_id,
        sellerName: q.seller_name,
        saleId: q.sale_id,
        status: q.status as QuotaStatus,
        createdAt: q.created_at,
        updatedAt: q.updated_at
      })));
      setCompanies((companiesData || []).map(c => ({
        id: c.id,
        name: c.name,
        createdAt: c.created_at
      })));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredQuotas = useMemo(() => {
    return quotas.filter(q => {
      const matchesSearch = q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           q.quotaNumber.includes(searchTerm) || 
                           q.groupNumber.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotas, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: quotas.length,
    active: quotas.filter(q => q.status === "active").length,
    contemplated: quotas.filter(q => q.status === "contemplated").length,
    cancelled: quotas.filter(q => q.status === "cancelled").length,
  }), [quotas]);

  const handleSaveQuota = async () => {
    if (!clientName || !companyName || !groupNumber || !quotaNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const quotaData = {
        client_name: clientName,
        phone,
        company_name: companyName,
        group_number: groupNumber,
        quota_number: quotaNumber,
        credit_value: parseFloat(creditValue.replace(',', '.')) || 0,
        installment_value: parseFloat(installmentValue.replace(',', '.')) || 0,
        status,
        seller_id: profile?.id,
        seller_name: profile?.displayName,
      };

      if (editingQuota) {
        const { error } = await supabase.from("quotas").update(quotaData).eq("id", editingQuota.id);
        if (error) throw error;
        toast.success("Cota atualizada!");
      } else {
        const { error } = await supabase.from("quotas").insert(quotaData);
        if (error) throw error;
        toast.success("Cota criada!");
      }

      setIsQuotaModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar cota");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: QuotaStatus) => {
    try {
      const { error } = await supabase.from("quotas").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      toast.success("Status da cota atualizado!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleShowTimeline = (quota: Quota) => {
    setSelectedTimelineLeadId(quota.saleId);
    setSelectedTimelinePhone(quota.phone);
    setIsTimelineOpen(true);
  };

  const handleDeleteQuota = async (id: string) => {
    setQuotaToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteQuota = async () => {
    if (!quotaToDelete) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from("quotas").delete().eq("id", quotaToDelete);
      if (error) throw error;
      toast.success("Cota excluída!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir cota");
    } finally {
      setSubmitting(false);
      setIsDeleteConfirmOpen(false);
      setQuotaToDelete(null);
    }
  };

  const resetForm = () => {
    setEditingQuota(null);
    setClientName("");
    setPhone("");
    setCompanyName("");
    setGroupNumber("");
    setQuotaNumber("");
    setCreditValue("");
    setInstallmentValue("");
    setStatus("pending");
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm border border-border/50" />
            <div>
              <h1 className="text-lg font-black text-foreground tracking-tight">Cotas de Consórcio</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Gestão Operacional</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={profile?.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-card transition-colors">
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-border/50 shadow-xl">
                <DropdownMenuItem onClick={() => navigate("/")} className="rounded-lg gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/central-operacional")} className="rounded-lg gap-2">
                  <FileText className="w-4 h-4" /> Central Operacional
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/lances")} className="rounded-lg gap-2">
                  <Gavel className="w-4 h-4" /> Lances
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/usuarios")} className="rounded-lg gap-2">
                      <UsersIcon className="w-4 h-4" /> Usuários
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="rounded-lg gap-2 text-rose-500 focus:text-rose-500">
                  <LogOut className="w-4 h-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total de Cotas" value={stats.total} icon={FileText} color="bg-slate-500" />
          <StatCard title="Ativas" value={stats.active} icon={CheckCircle2} color="bg-blue-500" />
          <StatCard title="Contempladas" value={stats.contemplated} icon={TrendingUp} color="bg-emerald-500" />
          <StatCard title="Canceladas" value={stats.cancelled} icon={XCircle} color="bg-rose-500" />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-6 rounded-3xl border border-border/60 shadow-sm backdrop-blur-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por cliente, cota ou grupo..." 
              className="pl-11 h-12 bg-background border-border rounded-2xl focus:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-44 h-12 bg-background border-border rounded-2xl font-semibold text-foreground">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="contemplated">Contemplada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { resetForm(); setIsQuotaModalOpen(true); }} className="h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl px-6 gap-2 font-black shadow-lg shadow-primary/25 transition-all active:scale-95">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Nova Cota
            </Button>
          </div>
        </div>

        {/* Quotas List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredQuotas.map((quota) => (
            <QuotaCard 
              key={quota.id} 
              quota={quota} 
              onEdit={() => {
                setEditingQuota(quota);
                setClientName(quota.clientName);
                setPhone(quota.phone || "");
                setCompanyName(quota.companyName || "");
                setGroupNumber(quota.groupNumber);
                setQuotaNumber(quota.quotaNumber);
                setCreditValue(quota.creditValue.toString());
                setInstallmentValue(quota.installmentValue.toString());
                setStatus(quota.status);
                setIsQuotaModalOpen(true);
              }}
              onDelete={() => handleDeleteQuota(quota.id)}
              onAddBid={() => navigate(`/lances?quota=${quota.id}`)}
              onShowTimeline={() => handleShowTimeline(quota)}
              onUpdateStatus={handleUpdateStatus}
              formatCurrency={formatCurrency}
              companyName={quota.companyName || "N/A"}
            />
          ))}
          {loading && <div className="col-span-full text-center py-20 text-slate-400 font-medium">Carregando cotas...</div>}
          {!loading && filteredQuotas.length === 0 && (
            <div className="col-span-full text-center py-20 bg-card rounded-3xl border border-dashed border-border">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-slate-900 font-black">Nenhuma cota encontrada</h3>
              <p className="text-slate-500 text-sm">Tente ajustar seus filtros ou crie uma nova cota.</p>
            </div>
          )}
        </div>
      </main>

      {/* Quota Modal */}
      <Dialog open={isQuotaModalOpen} onOpenChange={setIsQuotaModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card rounded-3xl border border-border shadow-2xl overflow-hidden p-0">
          <div className="bg-slate-900 p-6 text-white">
            <DialogTitle className="text-xl font-black">{editingQuota ? "Editar Cota" : "Nova Cota de Consórcio"}</DialogTitle>
            <p className="text-slate-400 text-sm font-medium">Preencha os dados operacionais da cota</p>
          </div>
          <div className="p-0 overflow-y-auto max-h-[70vh]">
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Cliente</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome completo" className="pl-10 bg-background border-border rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="pl-10 bg-background border-border rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Administradora</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Porto Seguro" className="pl-10 bg-background border-border rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Grupo</Label>
                  <Input value={groupNumber} onChange={e => setGroupNumber(e.target.value)} placeholder="0000" className="bg-background border-border rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Cota</Label>
                  <Input value={quotaNumber} onChange={e => setQuotaNumber(e.target.value)} placeholder="000" className="bg-background border-border rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Valor do Crédito</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                    <Input type="text" value={creditValue} onChange={e => setCreditValue(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="0,00" className="pl-10 bg-background border-border rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Valor da Parcela</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                    <Input type="text" value={installmentValue} onChange={e => setInstallmentValue(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="0,00" className="pl-10 bg-background border-border rounded-xl" />
                  </div>
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-500">Status da Cota</Label>
                  <Select value={status} onValueChange={v => setStatus(v as QuotaStatus)}>
                    <SelectTrigger className="bg-background border-border rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente (🟡)</SelectItem>
                      <SelectItem value="active">Ativa (🔵)</SelectItem>
                      <SelectItem value="contemplated">Contemplada (🟢)</SelectItem>
                      <SelectItem value="cancelled">Cancelada (🔴)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-4 pb-2">
                <Button variant="ghost" onClick={() => setIsQuotaModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                <Button onClick={handleSaveQuota} disabled={submitting} className="bg-primary hover:bg-primary/90 rounded-xl font-bold min-w-[120px]">
                  {submitting ? "Salvando..." : (editingQuota ? "Salvar Alterações" : "Criar Cota")}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <TimelineSheet 
        isOpen={isTimelineOpen} 
        onClose={() => setIsTimelineOpen(false)} 
        leadId={selectedTimelineLeadId} 
        phone={selectedTimelinePhone}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, onClick }: any) {
  return (
    <Card 
      className="transition-all duration-300 hover:scale-[1.02] border border-border shadow-sm bg-card"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-5 flex flex-col items-center text-center">
        <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm", color)}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className="text-lg sm:text-2xl font-black text-foreground tracking-tight">{value}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
            {title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuotaCard({ quota, onEdit, onDelete, onAddBid, onShowTimeline, onUpdateStatus, formatCurrency, companyName }: any) {
  const config = statusConfig[quota.status as QuotaStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="group bg-card rounded-[2.5rem] border border-border/60 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
      <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-tight line-clamp-1">{quota.clientName}</h3>
              <ArrowUpRight className="w-4 h-4 text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase tracking-wider">
              <span className="bg-background px-1.5 py-0.5 rounded text-[10px]">{companyName}</span>
              <span>•</span>
              <span>G: {quota.groupNumber}</span>
              <span>•</span>
              <span>C: {quota.quotaNumber}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn("px-2 sm:px-3 py-1 sm:py-1.5 h-auto rounded-xl border text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm transition-all hover:scale-105", config.color)}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border bg-card">
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "pending")} className="gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Pendente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "active")} className="gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" /> Ativa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "contemplated")} className="gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Contemplada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "cancelled")} className="gap-2">
                <XCircle className="w-4 h-4 text-rose-500" /> Cancelada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-background border border-border shadow-inner">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Crédito</p>
            <p className="text-sm sm:text-base font-black text-primary tracking-tight">{formatCurrency(quota.creditValue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Parcela</p>
            <p className="text-sm sm:text-base font-black text-foreground tracking-tight">{formatCurrency(quota.installmentValue)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Responsável</span>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-xs font-bold text-foreground">{quota.sellerName}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
            <Button size="icon" variant="ghost" onClick={onShowTimeline} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" title="Timeline">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onAddBid} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50/10 rounded-xl" title="Adicionar Lance">
              <Gavel className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" title="Editar">
              <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl" title="Excluir">
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-muted-foreground font-medium">
            Tem certeza que deseja excluir esta cota? Esta ação não pode ser desfeita.
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-xl font-bold">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteQuota} disabled={submitting} className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600">
              {submitting ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
