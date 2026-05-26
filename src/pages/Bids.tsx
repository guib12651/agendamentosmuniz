import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bid, BidType, BidStatus, Quota, Company } from "@/lib/types";
import { 
  Plus, 
  Search, 
  Filter, 
  Menu, 
  LogOut,
  LayoutDashboard,
  FileText,
  Gavel,
  Trash2,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
  ChevronRight,
  TrendingUp,
  Users as UsersIcon,
  History
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
import { Card, CardContent } from "@/components/ui/card";
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

const bidTypeConfig: Record<BidType, { label: string; color: string }> = {
  free: { label: "Livre", color: "bg-blue-500/10 text-blue-600" },
  fixed: { label: "Fixo", color: "bg-purple-500/10 text-purple-600" },
  embedded: { label: "Embutido", color: "bg-amber-500/10 text-amber-600" },
};

const bidStatusConfig: Record<BidStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-amber-500 bg-amber-500/10", icon: Clock },
  contemplated: { label: "Contemplado", color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
  not_contemplated: { label: "Não Contemplado", color: "text-rose-500 bg-rose-500/10", icon: XCircle },
};

export default function Bids() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bids, setBids] = useState<Bid[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedTimelineLeadId, setSelectedTimelineLeadId] = useState<string | undefined>(undefined);
  const [selectedTimelinePhone, setSelectedTimelinePhone] = useState<string | undefined>(undefined);

  // Form states
  const [quotaId, setQuotaId] = useState(searchParams.get("quota") || "");
  const [quotaSearch, setQuotaSearch] = useState("");
  const [showQuotaSuggestions, setShowQuotaSuggestions] = useState(false);
  const [bidType, setBidType] = useState<BidType>("free");
  const [bidValue, setBidValue] = useState("");
  const [percentage, setPercentage] = useState("");
  const [assemblyDate, setAssemblyDate] = useState("");
  const [status, setStatus] = useState<BidStatus>("pending");
  const [observations, setObservations] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: bidsData }, { data: quotasData }, { data: companiesData }] = await Promise.all([
        supabase.from("bids").select("*").order("created_at", { ascending: false }),
        supabase.from("quotas").select("*").order("client_name"),
        supabase.from("companies").select("*")
      ]);

      setBids((bidsData || []).map(b => ({
        id: b.id,
        companyId: b.company_id,
        companyName: b.company_name,
        quotaId: b.quota_id,
        clientName: b.client_name,
        bidType: b.bid_type as BidType,
        bidValue: Number(b.bid_value),
        percentage: Number(b.percentage),
        assemblyDate: b.assembly_date,
        status: b.status as BidStatus,
        createdAt: b.created_at
      })));

      setQuotas((quotasData || []).map(q => ({
        id: q.id,
        companyId: q.company_id,
        companyName: q.company_name,
        clientName: q.client_name,
        groupNumber: q.group_number,
        quotaNumber: q.quota_number,
        creditValue: Number(q.credit_value),
        installmentValue: Number(q.installment_value),
        sellerId: q.seller_id,
        sellerName: q.seller_name,
        status: q.status as any,
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
      toast.error("Erro ao carregar lances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBid = async () => {
    if (!quotaId || !bidValue || !assemblyDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const selectedQuota = quotas.find(q => q.id === quotaId);
      if (!selectedQuota) throw new Error("Cota não encontrada");

      const bidData = {
        quota_id: quotaId,
        company_id: selectedQuota.companyId,
        company_name: selectedQuota.companyName,
        client_name: selectedQuota.clientName,
        bid_type: bidType,
        bid_value: parseFloat(bidValue.replace(',', '.')) || 0,
        percentage: parseFloat(percentage) || 0,
        assembly_date: assemblyDate,
        status: status,
        observations: observations,
      };

      const { error } = await supabase.from("bids").insert(bidData);
      if (error) throw error;

      // Automation: If bid is contemplated, update quota status
      if (status === "contemplated") {
        await supabase
          .from("quotas")
          .update({ status: "contemplated" })
          .eq("id", quotaId);
      }

      toast.success("Lance registrado com sucesso!");
      setIsBidModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar lance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBid = async (id: string) => {
    if (!confirm("Excluir este lance?")) return;
    try {
      const { error } = await supabase.from("bids").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lance removido");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover lance");
    }
  };

  const handleShowTimeline = (bid: Bid) => {
    const quota = quotas.find(q => q.id === bid.quotaId);
    setSelectedTimelineLeadId(quota?.saleId);
    setSelectedTimelinePhone(quota?.phone);
    setIsTimelineOpen(true);
  };

  const handleUpdateStatus = async (id: string, newStatus: BidStatus) => {
    try {
      const { error } = await supabase.from("bids").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      
      // Automation: If bid is contemplated, update quota status
      if (newStatus === "contemplated") {
        const bid = bids.find(b => b.id === id);
        if (bid) {
          await supabase
            .from("quotas")
            .update({ status: "contemplated" })
            .eq("id", bid.quotaId);
        }
      }
      
      toast.success("Status do lance atualizado!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar status do lance");
    }
  };

  const resetForm = () => {
    setQuotaId("");
    setQuotaSearch("");
    setShowQuotaSuggestions(false);
    setBidType("free");
    setBidValue("");
    setPercentage("");
    setAssemblyDate("");
    setStatus("pending");
    setObservations("");
  };

  const filteredBids = useMemo(() => {
    return bids.filter(b => b.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [bids, searchTerm]);

  const filteredQuotas = useMemo(() => {
    if (!quotaSearch.trim()) return [];
    const q = quotaSearch.toLowerCase();
    return quotas.filter(quota => 
      quota.clientName.toLowerCase().includes(q) || 
      quota.quotaNumber.includes(q) || 
      quota.groupNumber.includes(q)
    ).slice(0, 5);
  }, [quotas, quotaSearch]);

  const selectedQuotaDisplay = useMemo(() => {
    const q = quotas.find(q => q.id === quotaId);
    return q ? `${q.clientName} (G: ${q.groupNumber} C: ${q.quotaNumber})` : "";
  }, [quotas, quotaId]);

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm border border-border/50" />
            <div>
              <h1 className="text-lg font-black text-foreground tracking-tight line-clamp-1">Central de Lances</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Acompanhamento de Assembleias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={profile?.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-card transition-colors">
                  <Menu className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-border/50 shadow-xl">
                <DropdownMenuItem onClick={() => navigate("/")} className="rounded-lg gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/quotas")} className="rounded-lg gap-2">
                  <FileText className="w-4 h-4" /> Cotas de Consórcio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/central-operacional")} className="rounded-lg gap-2">
                  <TrendingUp className="w-4 h-4" /> Central Operacional
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Lances" value={bids.length} icon={Gavel} color="bg-slate-500" />
          <StatCard title="Contemplados" value={bids.filter(b => b.status === "contemplated").length} icon={CheckCircle2} color="bg-emerald-500" />
          <StatCard title="Pendentes" value={bids.filter(b => b.status === "pending").length} icon={Clock} color="bg-amber-500" />
          <StatCard title="Não Contemplados" value={bids.filter(b => b.status === "not_contemplated").length} icon={XCircle} color="bg-rose-500" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-6 rounded-3xl border border-border/60 shadow-sm backdrop-blur-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por cliente..." 
              className="pl-11 h-12 bg-background border-border rounded-2xl focus:ring-primary/20 transition-all text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsBidModalOpen(true)} className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-6 gap-2 font-black shadow-lg shadow-primary/25 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> Novo Lance
          </Button>
        </div>

        <div className="space-y-4">
          {filteredBids.map(bid => {
            const quota = quotas.find(q => q.id === bid.quotaId);
            const status = bidStatusConfig[bid.status];
            const type = bidTypeConfig[bid.bidType];
            const StatusIcon = status.icon;

            return (
              <Card key={bid.id} className="border border-border/60 shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-card">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="p-5 flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-black text-foreground tracking-tight line-clamp-1">{bid.clientName}</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              {bid.companyName || "Administradora"} • G: {quota?.groupNumber} C: {quota?.quotaNumber}
                            </p>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className={cn("px-3 py-1 h-auto rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 transition-all hover:scale-105", status.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-border bg-card">
                            <DropdownMenuItem onClick={() => handleUpdateStatus(bid.id, "pending")} className="gap-2">
                              <Clock className="w-4 h-4 text-amber-500" /> Pendente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(bid.id, "contemplated")} className="gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Contemplado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(bid.id, "not_contemplated")} className="gap-2">
                              <XCircle className="w-4 h-4 text-rose-500" /> Não Contemplado
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <BidDetail label="Tipo de Lance" value={type.label} valueClass={type.color} />
                        <BidDetail label="Valor do Lance" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bid.bidValue)} />
                        <BidDetail label="Percentual" value={`${bid.percentage}%`} icon={Percent} />
                        <BidDetail label="Assembleia" value={new Date(bid.assemblyDate).toLocaleDateString('pt-BR')} icon={Calendar} />
                      </div>
                    </div>
                    <div className="bg-background/50 p-4 sm:p-5 flex flex-row md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-border/50">
                      <Button variant="ghost" size="icon" onClick={() => handleShowTimeline(bid)} className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl">
                        <History className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteBid(bid.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/quotas?id=${bid.quotaId}`)} className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredBids.length === 0 && !loading && (
            <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
              <Gavel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium tracking-tight">Nenhum lance registrado</p>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isBidModalOpen} onOpenChange={setIsBidModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border border-border shadow-2xl bg-card">
          <div className="bg-slate-900 p-6 text-white">
            <DialogTitle className="text-xl font-black">Registrar Novo Lance</DialogTitle>
            <p className="text-slate-400 text-sm">Informe os detalhes para a próxima assembleia</p>
          </div>
          <div className="p-0 overflow-y-auto max-h-[70vh]">
            <div className="p-6 space-y-4">
              <div className="space-y-2 relative">
                <Label className="text-[10px] font-black uppercase text-slate-500">Procurar Cliente / Cota</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={quotaId ? selectedQuotaDisplay : quotaSearch} 
                    onChange={e => {
                      setQuotaSearch(e.target.value);
                      setQuotaId("");
                      setShowQuotaSuggestions(true);
                    }}
                    onFocus={() => !quotaId && setShowQuotaSuggestions(true)}
                    placeholder="Digite o nome do cliente ou número da cota..." 
                    className="pl-10 bg-background border-border rounded-xl"
                    readOnly={!!quotaId}
                  />
                  {quotaId && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setQuotaId(""); setQuotaSearch(""); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-slate-100"
                    >
                      <XCircle className="w-4 h-4 text-slate-400" />
                    </Button>
                  )}
                </div>
                
                {showQuotaSuggestions && filteredQuotas.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {filteredQuotas.map(q => (
                      <button
                        key={q.id}
                        onClick={() => {
                          setQuotaId(q.id);
                          setShowQuotaSuggestions(false);
                        }}
                        className="w-full text-left p-3 hover:bg-muted transition-colors flex flex-col gap-0.5"
                      >
                        <span className="text-sm font-bold text-foreground">{q.clientName}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          G: {q.groupNumber} • C: {q.quotaNumber} • {q.companyName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Tipo de Lance</Label>
                  <Select value={bidType} onValueChange={v => setBidType(v as BidType)}>
                    <SelectTrigger className="bg-background border-border rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Livre</SelectItem>
                      <SelectItem value="fixed">Fixo</SelectItem>
                      <SelectItem value="embedded">Embutido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Valor do Lance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                    <Input type="text" value={bidValue} onChange={e => setBidValue(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="0,00" className="pl-10 bg-background border-border rounded-xl text-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Percentual (%)</Label>
                  <Input type="number" value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="0.00" className="bg-background border-border rounded-xl text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Data da Assembleia</Label>
                  <Input type="date" value={assemblyDate} onChange={e => setAssemblyDate(e.target.value)} className="bg-background border-border rounded-xl text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as BidStatus)}>
                  <SelectTrigger className="bg-background border-border rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente (🟡)</SelectItem>
                    <SelectItem value="contemplated">Contemplado (🟢)</SelectItem>
                    <SelectItem value="not_contemplated">Não Contemplado (🔴)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Observações</Label>
                <Input value={observations} onChange={e => setObservations(e.target.value)} placeholder="Ex: Informações sobre a assembleia..." className="bg-background border-border rounded-xl text-foreground" />
              </div>
              <DialogFooter className="pt-4 pb-2">
                <Button variant="ghost" onClick={() => setIsBidModalOpen(false)} className="font-bold">Cancelar</Button>
                <Button onClick={handleSaveBid} disabled={submitting} className="bg-primary hover:bg-primary/90 rounded-xl font-bold min-w-[120px]">
                  {submitting ? "Registrando..." : "Registrar Lance"}
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
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className="text-lg sm:text-2xl font-black text-foreground tracking-tight line-clamp-1">{value}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
            {title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BidDetail({ label, value, icon: Icon, valueClass }: any) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className={cn("text-xs font-bold tracking-tight", valueClass || "text-foreground")}>{value}</p>
    </div>
  );
}
