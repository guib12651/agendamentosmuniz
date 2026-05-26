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
  ArrowUpRight
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
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState("");
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
    if (!clientName || !companyId || !groupNumber || !quotaNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const quotaData = {
        client_name: clientName,
        phone,
        company_id: companyId,
        group_number: groupNumber,
        quota_number: quotaNumber,
        credit_value: parseFloat(creditValue) || 0,
        installment_value: parseFloat(installmentValue) || 0,
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

  const handleDeleteQuota = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta cota?")) return;
    try {
      const { error } = await supabase.from("quotas").delete().eq("id", id);
      if (error) throw error;
      toast.success("Cota excluída!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir cota");
    }
  };

  const resetForm = () => {
    setEditingQuota(null);
    setClientName("");
    setPhone("");
    setCompanyId("");
    setGroupNumber("");
    setQuotaNumber("");
    setCreditValue("");
    setInstallmentValue("");
    setStatus("pending");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="min-h-screen pb-12 bg-[#F8FAFC]">
      <header className="border-b border-border sticky top-0 z-40 bg-white/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm border border-border/50" />
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Cotas de Consórcio</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gestão Operacional</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={profile?.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 transition-colors">
                  <Menu className="w-5 h-5 text-slate-600" />
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
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm backdrop-blur-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente, cota ou grupo..." 
              className="pl-11 h-12 bg-slate-50/50 border-slate-200 rounded-2xl focus:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-44 h-12 bg-slate-50/50 border-slate-200 rounded-2xl font-semibold text-slate-700">
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
              <Plus className="w-5 h-5" /> Nova Cota
            </Button>
          </div>
        </div>

        {/* Quotas List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotas.map((quota) => (
            <QuotaCard 
              key={quota.id} 
              quota={quota} 
              onEdit={() => {
                setEditingQuota(quota);
                setClientName(quota.clientName);
                setPhone(quota.phone || "");
                setCompanyId(quota.companyId);
                setGroupNumber(quota.groupNumber);
                setQuotaNumber(quota.quotaNumber);
                setCreditValue(quota.creditValue.toString());
                setInstallmentValue(quota.installmentValue.toString());
                setStatus(quota.status);
                setIsQuotaModalOpen(true);
              }}
              onDelete={() => handleDeleteQuota(quota.id)}
              onAddBid={() => navigate(`/lances?quota=${quota.id}`)}
              formatCurrency={formatCurrency}
              companyName={companies.find(c => c.id === quota.companyId)?.name || "N/A"}
            />
          ))}
          {loading && <div className="col-span-full text-center py-20 text-slate-400 font-medium">Carregando cotas...</div>}
          {!loading && filteredQuotas.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-black">Nenhuma cota encontrada</h3>
              <p className="text-slate-500 text-sm">Tente ajustar seus filtros ou crie uma nova cota.</p>
            </div>
          )}
        </div>
      </main>

      {/* Quota Modal */}
      <Dialog open={isQuotaModalOpen} onOpenChange={setIsQuotaModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-slate-900 p-6 text-white">
            <DialogTitle className="text-xl font-black">{editingQuota ? "Editar Cota" : "Nova Cota de Consórcio"}</DialogTitle>
            <p className="text-slate-400 text-sm font-medium">Preencha os dados operacionais da cota</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Cliente</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome completo" className="pl-10 bg-slate-50 border-slate-200 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="pl-10 bg-slate-50 border-slate-200 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Administradora</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    {companies.length === 0 && <SelectItem value="none" disabled>Nenhuma cadastrada</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Grupo</Label>
                <Input value={groupNumber} onChange={e => setGroupNumber(e.target.value)} placeholder="0000" className="bg-slate-50 border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Cota</Label>
                <Input value={quotaNumber} onChange={e => setQuotaNumber(e.target.value)} placeholder="000" className="bg-slate-50 border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Valor do Crédito</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                  <Input type="number" value={creditValue} onChange={e => setCreditValue(e.target.value)} placeholder="0.00" className="pl-10 bg-slate-50 border-slate-200 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Valor da Parcela</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                  <Input type="number" value={installmentValue} onChange={e => setInstallmentValue(e.target.value)} placeholder="0.00" className="pl-10 bg-slate-50 border-slate-200 rounded-xl" />
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Status da Cota</Label>
                <Select value={status} onValueChange={v => setStatus(v as QuotaStatus)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
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
            <DialogFooter className="pt-4">
              <Button variant="ghost" onClick={() => setIsQuotaModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button onClick={handleSaveQuota} disabled={submitting} className="bg-primary hover:bg-primary/90 rounded-xl font-bold min-w-[120px]">
                {submitting ? "Salvando..." : (editingQuota ? "Salvar Alterações" : "Criar Cota")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, onClick }: any) {
  return (
    <Card 
      className="transition-all duration-300 hover:scale-[1.02] border border-border shadow-sm bg-white"
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center">
        <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm", color)}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{value}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
            {title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuotaCard({ quota, onEdit, onDelete, onAddBid, formatCurrency, companyName }: any) {
  const config = statusConfig[quota.status as QuotaStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="group bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{quota.clientName}</h3>
              <ArrowUpRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{companyName}</span>
              <span>•</span>
              <span>G: {quota.groupNumber}</span>
              <span>•</span>
              <span>C: {quota.quotaNumber}</span>
            </div>
          </div>
          <div className={cn("px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm", config.color)}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Crédito</p>
            <p className="text-sm font-black text-primary tracking-tight">{formatCurrency(quota.creditValue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Parcela</p>
            <p className="text-sm font-black text-slate-900 tracking-tight">{formatCurrency(quota.installmentValue)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</span>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                <User className="w-3 h-3 text-slate-500" />
              </div>
              <span className="text-xs font-bold text-slate-700">{quota.sellerName}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onAddBid} className="h-9 w-9 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl" title="Adicionar Lance">
              <Gavel className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit} className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl" title="Editar">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl" title="Excluir">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
