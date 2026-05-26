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
  ChevronRight
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

  // Form states
  const [quotaId, setQuotaId] = useState(searchParams.get("quota") || "");
  const [bidType, setBidType] = useState<BidType>("free");
  const [bidValue, setBidValue] = useState("");
  const [percentage, setPercentage] = useState("");
  const [assemblyDate, setAssemblyDate] = useState("");
  const [status, setStatus] = useState<BidStatus>("pending");

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
        client_name: selectedQuota.clientName,
        bid_type: bidType,
        bid_value: parseFloat(bidValue),
        percentage: parseFloat(percentage) || 0,
        assembly_date: assemblyDate,
        status: status,
      };

      const { error } = await supabase.from("bids").insert(bidData);
      if (error) throw error;

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

  const resetForm = () => {
    setQuotaId("");
    setBidType("free");
    setBidValue("");
    setPercentage("");
    setAssemblyDate("");
    setStatus("pending");
  };

  const filteredBids = useMemo(() => {
    return bids.filter(b => b.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [bids, searchTerm]);

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      <header className="border-b border-slate-200 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-lg font-black text-slate-900">Central de Lances</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Acompanhamento de Assembleias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={profile?.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu className="w-5 h-5 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                <DropdownMenuItem onClick={() => navigate("/")} className="gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/quotas")} className="gap-2">
                  <FileText className="w-4 h-4" /> Cotas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="gap-2 text-rose-500">
                  <LogOut className="w-4 h-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por cliente..." 
              className="pl-10 bg-white border-slate-200 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsBidModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2 font-bold w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Novo Lance
          </Button>
        </div>

        <div className="space-y-4">
          {filteredBids.map(bid => {
            const quota = quotas.find(q => q.id === bid.quotaId);
            const company = companies.find(c => c.id === bid.companyId);
            const status = bidStatusConfig[bid.status];
            const type = bidTypeConfig[bid.bidType];
            const StatusIcon = status.icon;

            return (
              <Card key={bid.id} className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <div className="p-5 flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 tracking-tight">{bid.clientName}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {company?.name || "Administradora"} • G: {quota?.groupNumber} C: {quota?.quotaNumber}
                            </p>
                          </div>
                        </div>
                        <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5", status.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <BidDetail label="Tipo de Lance" value={type.label} valueClass={type.color} />
                        <BidDetail label="Valor do Lance" value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bid.bidValue)} />
                        <BidDetail label="Percentual" value={`${bid.percentage}%`} icon={Percent} />
                        <BidDetail label="Assembleia" value={new Date(bid.assemblyDate).toLocaleDateString('pt-BR')} icon={Calendar} />
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 sm:p-5 flex sm:flex-col justify-end gap-2 border-t sm:border-t-0 sm:border-l border-slate-100">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteBid(bid.id)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/quotas?id=${bid.quotaId}`)} className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredBids.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <Gavel className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium tracking-tight">Nenhum lance registrado</p>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isBidModalOpen} onOpenChange={setIsBidModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-6 text-white">
            <DialogTitle className="text-xl font-black">Registrar Novo Lance</DialogTitle>
            <p className="text-slate-400 text-sm">Informe os detalhes para a próxima assembleia</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500">Selecionar Cota</Label>
              <Select value={quotaId} onValueChange={setQuotaId}>
                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Escolha o cliente/cota" />
                </SelectTrigger>
                <SelectContent>
                  {quotas.map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.clientName} (G: {q.groupNumber} C: {q.quotaNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Tipo de Lance</Label>
                <Select value={bidType} onValueChange={v => setBidType(v as BidType)}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
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
                  <Input type="number" value={bidValue} onChange={e => setBidValue(e.target.value)} placeholder="0.00" className="pl-10 bg-slate-50 border-slate-200 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Percentual (%)</Label>
                <Input type="number" value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="0.00" className="bg-slate-50 border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500">Data da Assembleia</Label>
                <Input type="date" value={assemblyDate} onChange={e => setAssemblyDate(e.target.value)} className="bg-slate-50 border-slate-200 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as BidStatus)}>
                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente (🟡)</SelectItem>
                  <SelectItem value="contemplated">Contemplado (🟢)</SelectItem>
                  <SelectItem value="not_contemplated">Não Contemplado (🔴)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="ghost" onClick={() => setIsBidModalOpen(false)} className="font-bold">Cancelar</Button>
              <Button onClick={handleSaveBid} disabled={submitting} className="bg-primary hover:bg-primary/90 rounded-xl font-bold min-w-[120px]">
                {submitting ? "Registrando..." : "Registrar Lance"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BidDetail({ label, value, icon: Icon, valueClass }: any) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className={cn("text-xs font-bold tracking-tight", valueClass || "text-slate-900")}>{value}</p>
    </div>
  );
}
