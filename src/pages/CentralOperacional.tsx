import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Meeting, Call } from "@/lib/types";
import { getMeetings, getCalls } from "@/lib/store";
import { getFunnelDataRange, SalesFunnelData } from "@/lib/funnelStore";
import { 
  Plus, 
  Search, 
  X, 
  Filter, 
  Menu, 
  LogOut,
  Users as UsersIcon,
  Phone,
  Calendar,
  MapPin,
  Handshake,
  ShoppingCart,
  Target,
  ArrowRight,
  Clock,
  History,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  TrendingUp,
  UserPlus,
  ChevronDown,
  Archive,
  RefreshCcw,
  Trash2
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import PeriodFilter, { PeriodType, getDateRange } from "@/components/PeriodFilter";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo_muniz.png";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const leadSources = [
  "Instagram",
  "Meta Ads",
  "Lista fria",
  "Indicação",
  "Orgânico",
  "Google",
  "WhatsApp",
  "Evento",
  "Outro"
];

const statusConfig = {
  pending: { label: "Agendado", color: "bg-muted text-muted-foreground", icon: Clock },
  compareceu: { label: "Compareceu", color: "bg-success/20 text-success", icon: CheckCircle2 },
  nao_compareceu: { label: "Não Compareceu", color: "bg-destructive/20 text-destructive", icon: XCircle },
  em_negociacao: { label: "Negociação", color: "bg-emerald-500/20 text-emerald-500", icon: Handshake },
  venda_concluida: { label: "Vendido", color: "bg-rose-500/20 text-rose-500", icon: ShoppingCart },
  visita_realizada: { label: "Compareceu", color: "bg-success/20 text-success", icon: CheckCircle2 },
};

export default function CentralOperacional() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType | "today" | "yesterday" | "last7" | "last30">("today");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [customStart, setCustomStart] = useState(new Date().toISOString().split("T")[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split("T")[0]);
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [funnelData, setFunnelData] = useState<SalesFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<Meeting | null>(null);
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [leadToArchive, setLeadToArchive] = useState<Meeting | null>(null);

  // Modal States
  const [isRegisterLeadsOpen, setIsRegisterLeadsOpen] = useState(false);
  const [isDistributeLeadsOpen, setIsDistributeLeadsOpen] = useState(false);
  const [preSellers, setPreSellers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form States - Register Leads
  const [leadAmount, setLeadAmount] = useState<string>("0");
  const [leadSource, setLeadSource] = useState<string>("");
  const [leadDate, setLeadDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [leadObs, setLeadObs] = useState<string>("");

  // Form States - Distribute Leads
  const [distAmount, setDistAmount] = useState<string>("0");
  const [distEmployee, setDistEmployee] = useState<string>("");
  const [distSource, setDistSource] = useState<string>("");
  const [distDate, setDistDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [distObs, setDistObs] = useState<string>("");

  // Captured leads list for the card click
  const [isLeadsListOpen, setIsLeadsListOpen] = useState(false);
  const [capturedLeadsList, setCapturedLeadsList] = useState<any[]>([]);

  const dateRange = useMemo(() => {
    if (period === "today") {
      const today = new Date().toISOString().split("T")[0];
      return { start: today, end: today };
    }
    if (period === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];
      return { start: yStr, end: yStr };
    }
    if (period === "last7") {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
    }
    if (period === "last30") {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
    }
    return getDateRange(period as any, filterDate, customStart, customEnd);
  }, [period, filterDate, customStart, customEnd]);

  const fetchPreSellers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "pre_seller");
    if (!error && data) setPreSellers(data);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch meetings and calls
      const [m, c] = await Promise.all([
        getMeetings(dateRange.start, dateRange.end),
        getCalls(dateRange.start + "T00:00:00Z", dateRange.end + "T23:59:59Z"),
      ]);
      setMeetings(m);
      setCalls(c);

      // Fetch captured leads sum
      const { data: leadsData, error: leadsError } = await supabase
        .from("operational_leads")
        .select("amount, source, date, observations, created_by, profiles!operational_leads_created_by_fkey(display_name)")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);
      
      if (leadsError) throw leadsError;
      const totalCaptured = (leadsData as any[]).reduce((acc, l) => acc + l.amount, 0);
      setCapturedLeadsList(leadsData);

      // Fetch distributions
      const { data: distData, error: distError } = await supabase
        .from("leads_distribution")
        .select("amount, user_id, profiles!leads_distribution_user_id_fkey(display_name)")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);

      if (distError) throw distError;
      const totalDistributed = distData.reduce((acc, d) => acc + d.amount, 0);

      // Map distributions to team members for the detailed metrics
      const userMap = new Map<string, any>();
      distData.forEach(d => {
        const userId = d.user_id;
        const name = d.profiles?.display_name || "Desconhecido";
        const existing = userMap.get(userId) || {
          userId,
          displayName: name,
          leadsReceived: 0,
          callsMade: 0,
          appointmentsMade: 0,
          visitsCompleted: 0,
          negotiationsStarted: 0,
          salesCompleted: 0,
        };
        userMap.set(userId, { ...existing, leadsReceived: existing.leadsReceived + d.amount });
      });

      // Integrate with existing meetings/calls for other funnel steps
      // This part simplifies the getFunnelDataRange logic to use our new tables
      setFunnelData({
        totalLeadsCaptured: totalCaptured,
        distribution: Array.from(userMap.values())
      });

    } catch (err) {
      console.error("Error loading operational data:", err);
      toast.error("Erro ao carregar dados operacionais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (isAdmin) fetchPreSellers();
    
    const channel = supabase
      .channel('central-operacional-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_leads' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_distribution' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dateRange]);

  const handleRegisterLeads = async () => {
    if (!leadAmount || parseInt(leadAmount) <= 0 || !leadSource) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("operational_leads").insert({
        amount: parseInt(leadAmount),
        source: leadSource,
        date: leadDate,
        observations: leadObs,
        created_by: profile?.id
      });

      if (error) throw error;

      toast.success("Leads registrados com sucesso!");
      setIsRegisterLeadsOpen(false);
      // Reset form
      setLeadAmount("0");
      setLeadSource("");
      setLeadObs("");
      setLeadDate(new Date().toISOString().split("T")[0]);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar leads");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDistributeLeads = async () => {
    if (!distAmount || parseInt(distAmount) <= 0 || !distEmployee) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("leads_distribution").insert({
        amount: parseInt(distAmount),
        user_id: distEmployee,
        source: distSource || null,
        date: distDate,
        observations: distObs,
        created_by: profile?.id
      });

      if (error) throw error;

      toast.success("Leads distribuídos com sucesso!");
      setIsDistributeLeadsOpen(false);
      // Reset form
      setDistAmount("0");
      setDistEmployee("");
      setDistSource("");
      setDistObs("");
      setDistDate(new Date().toISOString().split("T")[0]);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao distribuir leads");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const totalLeads = funnelData?.totalLeadsCaptured || 0;
    const distributed = funnelData?.distribution.reduce((acc, d) => acc + (d.leadsReceived || 0), 0) || 0;
    const activeMeetings = meetings.filter(m => !m.archived);
    const callsMade = calls.length;
    const appointments = activeMeetings.length;
    const attended = activeMeetings.filter(m => m.status === 'compareceu' || m.status === 'visita_realizada').length;
    const noShow = activeMeetings.filter(m => m.status === 'nao_compareceu').length;
    const negotiations = activeMeetings.filter(m => m.status === 'em_negociacao').length;
    const sales = activeMeetings.filter(m => m.status === 'venda_concluida').length;

    return {
      captured: totalLeads,
      distributed,
      calls: callsMade,
      appointments,
      attended,
      noShow,
      negotiations,
      sales
    };
  }, [funnelData, calls, meetings]);

  const filteredLeads = useMemo(() => {
    let list = meetings;
    
    // Filter by archived status
    list = list.filter(m => showArchived ? m.archived === true : m.archived === false);

    if (selectedStage) {
      if (selectedStage === 'agendamentos') list = list.filter(m => m.status === 'pending');
      else if (selectedStage === 'compareceram') list = list.filter(m => m.status === 'compareceu' || m.status === 'visita_realizada');
      else if (selectedStage === 'faltas') list = list.filter(m => m.status === 'nao_compareceu');
      else if (selectedStage === 'negociacoes') list = list.filter(m => m.status === 'em_negociacao');
      else if (selectedStage === 'vendas') list = list.filter(m => m.status === 'venda_concluida');
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(m => 
        m.leadName.toLowerCase().includes(q) || 
        m.phone.includes(q) ||
        (m.city || "").toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [meetings, selectedStage, searchTerm, showArchived]);

  const fetchLeadHistory = async (lead: Meeting) => {
    // In a real app, this would be a dedicated history table
    // For now, we simulate based on meeting status transitions if tracked, 
    // or just show the current event flow.
    const history = [];
    
    // 1. Captured
    history.push({ date: lead.createdAt || lead.date, event: "Lead captado", icon: Target });
    
    // 2. Distributed (simulation)
    if (lead.preSeller) {
      history.push({ date: lead.createdAt || lead.date, event: `Distribuído para ${lead.preSeller}`, icon: UserPlus });
    }

    // 3. Calls
    const leadCalls = calls.filter(c => c.leadName === lead.leadName);
    leadCalls.forEach(c => {
      history.push({ date: c.callTime, event: `Ligação realizada: ${c.result}`, icon: Phone });
    });

    // 4. Meeting Scheduled
    history.push({ date: `${lead.date}T${lead.time}`, event: "Reunião agendada", icon: Calendar });

    // 5. Outcome
    if (lead.status === 'compareceu' || lead.status === 'visita_realizada') {
      history.push({ date: lead.date, event: "Compareceu", icon: CheckCircle2 });
    } else if (lead.status === 'nao_compareceu') {
      history.push({ date: lead.date, event: "Não Compareceu", icon: XCircle });
    }

    if (lead.status === 'em_negociacao') {
      history.push({ date: lead.date, event: "Negociação iniciada", icon: Handshake });
    }

    if (lead.status === 'venda_concluida') {
      history.push({ date: lead.saleDate || lead.date, event: "Venda concluída", icon: ShoppingCart });
    }

    setLeadHistory(history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  };

  const handleLeadClick = (lead: Meeting) => {
    setSelectedLead(lead);
    fetchLeadHistory(lead);
  };

  const handleDeleteLead = async () => {
    if (!leadToArchive) return;
    
    try {
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", leadToArchive.id);

      if (error) throw error;
      
      toast.success("Lead excluído com sucesso");
      setIsArchiveModalOpen(false);
      setLeadToArchive(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir lead");
    }
  };

  const handleRestoreLead = async (lead: Meeting) => {
    try {
      const { error } = await supabase
        .from("meetings")
        .update({ archived: false })
        .eq("id", lead.id);

      if (error) throw error;
      
      toast.success("Lead restaurado com sucesso");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao restaurar lead");
    }
  };

  const calculateConversion = (val1: number, val2: number) => {
    if (val1 === 0) return 0;
    return Math.round((val2 / val1) * 100);
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-lg shadow-sm" />
            <div>
              <h1 className="text-sm sm:text-lg font-display font-bold text-primary leading-tight">Central Operacional</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate uppercase tracking-wider">Visão em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={profile?.id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard Principal
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/usuarios")}>
                      <UsersIcon className="w-4 h-4 mr-2" /> Usuários
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/fechamentos")}>
                      <TrendingUp className="w-4 h-4 mr-2" /> Fechamentos
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-rose-600">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6 space-y-8">
        {/* 1. TOP FILTERS */}
        <section className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <FilterButton label="Hoje" active={period === "today"} onClick={() => setPeriod("today")} />
              <FilterButton label="Ontem" active={period === "yesterday"} onClick={() => setPeriod("yesterday")} />
              <FilterButton label="Últimos 7 dias" active={period === "last7"} onClick={() => setPeriod("last7")} />
              <FilterButton label="Últimos 30 dias" active={period === "last30"} onClick={() => setPeriod("last30")} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={["monthly", "quarterly", "semiannual", "annual"].includes(period as string) ? "default" : "outline"} size="sm" className="h-9 rounded-xl font-bold">
                    Mais Períodos <ChevronDown className="ml-1 w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setPeriod("monthly")}>Mensal</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("quarterly")}>Trimestral</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("semiannual")}>Semestral</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("annual")}>Anual</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriod("custom")}>Personalizado</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setIsRegisterLeadsOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" /> Registrar Leads
                </Button>
                <Button 
                  onClick={() => setIsDistributeLeadsOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 rounded-xl shadow-lg shadow-purple-900/20 transition-all hover:scale-105"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Distribuir Leads
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {dateRange.start.split('-').reverse().join('/')} - {dateRange.end.split('-').reverse().join('/')}
              </span>
            </div>
            {period === "custom" && (
              <div className="flex gap-2">
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 text-xs" />
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 text-xs" />
              </div>
            )}
            {!["today", "yesterday", "last7", "last30", "custom"].includes(period as string) && (
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9 text-xs w-40" />
            )}
          </div>
        </section>

        {/* 2. OPERATIONAL CARDS */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard 
            title="Leads Captados" 
            value={stats.captured} 
            icon={Target} 
            color="bg-blue-500" 
            active={selectedStage === 'captados'}
            onClick={() => setIsLeadsListOpen(true)}
          />
          <StatCard 
            title="Distribuição" 
            value={stats.distributed} 
            icon={UserPlus} 
            color="bg-slate-800"
            active={selectedStage === 'distribuicao'}
            onClick={() => setSelectedStage(selectedStage === 'distribuicao' ? null : 'distribuicao')}
          />
          <StatCard 
            title="Ligações" 
            value={stats.calls} 
            icon={Phone} 
            color="bg-amber-400" 
            active={selectedStage === 'ligacoes'}
            onClick={() => setSelectedStage(selectedStage === 'ligacoes' ? null : 'ligacoes')}
          />
          <StatCard 
            title="Agendamentos" 
            value={stats.appointments} 
            icon={Calendar} 
            color="bg-emerald-500" 
            active={selectedStage === 'agendamentos'}
            onClick={() => setSelectedStage(selectedStage === 'agendamentos' ? null : 'agendamentos')}
          />
          <StatCard 
            title="Compareceram" 
            value={stats.attended} 
            icon={CheckCircle2} 
            color="bg-emerald-600" 
            active={selectedStage === 'compareceram'}
            onClick={() => setSelectedStage(selectedStage === 'compareceram' ? null : 'compareceram')}
          />
          <StatCard 
            title="Faltas" 
            value={stats.noShow} 
            icon={XCircle} 
            color="bg-rose-500" 
            active={selectedStage === 'faltas'}
            onClick={() => setSelectedStage(selectedStage === 'faltas' ? null : 'faltas')}
          />
          <StatCard 
            title="Negociações" 
            value={stats.negotiations} 
            icon={Handshake} 
            color="bg-purple-600" 
            active={selectedStage === 'negociacoes'}
            onClick={() => setSelectedStage(selectedStage === 'negociacoes' ? null : 'negociacoes')}
          />
          <StatCard 
            title="Vendas" 
            value={stats.sales} 
            icon={ShoppingCart} 
            color="bg-yellow-500" 
            active={selectedStage === 'vendas'}
            onClick={() => setSelectedStage(selectedStage === 'vendas' ? null : 'vendas')}
          />
        </section>

        {/* 3. CONVERSION LINE */}
        <section className="bg-card p-8 rounded-lg border border-border shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[800px] px-4">
            <ConversionStep label="Captados" value={stats.captured} />
            <ConversionArrow percentage={calculateConversion(stats.captured, stats.distributed)} />
            <ConversionStep label="Distribuídos" value={stats.distributed} />
            <ConversionArrow percentage={calculateConversion(stats.distributed, stats.calls)} />
            <ConversionStep label="Ligações" value={stats.calls} />
            <ConversionArrow percentage={calculateConversion(stats.calls, stats.appointments)} />
            <ConversionStep label="Agendados" value={stats.appointments} />
            <ConversionArrow percentage={calculateConversion(stats.appointments, stats.attended)} />
            <ConversionStep label="Compareceram" value={stats.attended} />
            <ConversionArrow percentage={calculateConversion(stats.attended, stats.negotiations)} />
            <ConversionStep label="Negociação" value={stats.negotiations} />
            <ConversionArrow percentage={calculateConversion(stats.negotiations, stats.sales)} />
            <ConversionStep label="Vendas" value={stats.sales} />
          </div>
        </section>

        {/* 4. DYNAMIC LIST */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {showArchived ? "Leads Arquivados" : "Lista Operacional"}
                {selectedStage && <Badge variant="secondary" className="capitalize">{selectedStage}</Badge>}
              </h3>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className={cn(
                    "h-8 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    showArchived ? "bg-primary/10 border-primary text-primary" : "text-muted-foreground"
                  )}
                >
                  <Archive className="w-3 h-3 mr-1" />
                  {showArchived ? "Ver Ativos" : "Ver Arquivados"}
                </Button>
              )}
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar leads..." 
                className="pl-10 h-10 bg-card border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">Telefone</TableHead>
                  <TableHead className="font-bold">Cidade</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Responsável</TableHead>
                  <TableHead className="font-bold">Data/Hora</TableHead>
                  <TableHead className="font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className={cn(
                      "cursor-pointer hover:bg-muted/30 transition-colors border-border",
                      lead.archived && "opacity-75"
                    )}
                    onClick={() => handleLeadClick(lead)}
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {lead.leadName}
                        {lead.archived && <Archive className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.phone}</TableCell>
                    <TableCell>{lead.city || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{lead.preSeller}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Consultor: {lead.consultant || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground">{lead.date.split('-').reverse().join('/')}</span>
                        <span className="text-[10px] text-muted-foreground">{lead.time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-2">
                          {lead.status === 'venda_concluida' && !lead.archived && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setLeadToArchive(lead);
                                setIsArchiveModalOpen(true);
                              }}
                              title="Excluir lead vendido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {lead.archived && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => handleRestoreLead(lead)}
                              title="Restaurar lead"
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {showArchived ? "Nenhum lead arquivado encontrado." : "Nenhum lead encontrado para este filtro."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      {/* 5. LEAD TIMELINE SHEET */}
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent className="sm:max-w-md w-full">
          <SheetHeader className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-xl font-black text-foreground">{selectedLead?.leadName}</SheetTitle>
                <p className="text-sm text-muted-foreground font-medium">{selectedLead?.phone}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <StatusBadge status={selectedLead?.status} />
              <Badge variant="outline">{selectedLead?.city || "Cidade não inf."}</Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-200px)] pr-4">
            <div className="space-y-8">
              <div className="relative">
                <div className="absolute left-6 top-2 bottom-0 w-px bg-border" />
                <div className="space-y-8 relative">
                  {leadHistory.map((item, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <div className="relative z-10 w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm group-hover:border-primary transition-colors">
                        <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-bold text-foreground">{item.event}</p>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase">
                          {new Date(item.date).toLocaleString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-3">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Informações Adicionais</h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Origem" value={selectedLead?.markingType || "-"} />
                  <InfoItem label="Interesse" value={selectedLead?.trigger || "-"} />
                  <InfoItem label="Entrada" value={selectedLead?.downPayment || "-"} />
                  <InfoItem label="Parcela" value={selectedLead?.installment || "-"} />
                  <InfoItem label="Consultor" value={selectedLead?.consultant || "-"} />
                  <InfoItem label="Pré-vendedor" value={selectedLead?.preSeller || "-"} />
                </div>
                {selectedLead?.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Observações</p>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">{selectedLead.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* 6. MODALS FOR ADMIN ACTIONS */}
      <Dialog open={isRegisterLeadsOpen} onOpenChange={setIsRegisterLeadsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">➕ Registrar Leads</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount" className="font-bold">Quantidade de Leads</Label>
              <Input
                id="amount"
                type="number"
                value={leadAmount}
                onChange={(e) => setLeadAmount(e.target.value)}
                placeholder="Ex: 50"
                className="bg-muted border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source" className="font-bold">Origem dos Leads</Label>
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date" className="font-bold">Data</Label>
              <Input
                id="date"
                type="date"
                value={leadDate}
                onChange={(e) => setLeadDate(e.target.value)}
                className="bg-muted border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="obs" className="font-bold">Observações (Opcional)</Label>
              <Textarea
                id="obs"
                value={leadObs}
                onChange={(e) => setLeadObs(e.target.value)}
                placeholder="Ex: Campanha de tráfego..."
                className="bg-muted border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleRegisterLeads} 
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {submitting ? "Salvando..." : "Confirmar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDistributeLeadsOpen} onOpenChange={setIsDistributeLeadsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">🟪 Distribuir Leads</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dist-amount" className="font-bold">Quantidade de Leads</Label>
              <Input
                id="dist-amount"
                type="number"
                value={distAmount}
                onChange={(e) => setDistAmount(e.target.value)}
                placeholder="Ex: 20"
                className="bg-muted border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee" className="font-bold">Membro da Equipe (Pré-venda)</Label>
              <Select value={distEmployee} onValueChange={setDistEmployee}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {preSellers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-source" className="font-bold">Origem (Opcional)</Label>
              <Select value={distSource} onValueChange={setDistSource}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-date" className="font-bold">Data</Label>
              <Input
                id="dist-date"
                type="date"
                value={distDate}
                onChange={(e) => setDistDate(e.target.value)}
                className="bg-muted border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-obs" className="font-bold">Observações (Opcional)</Label>
              <Textarea
                id="dist-obs"
                value={distObs}
                onChange={(e) => setDistObs(e.target.value)}
                placeholder="Notas sobre a entrega..."
                className="bg-muted border-border resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleDistributeLeads} 
              disabled={submitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {submitting ? "Salvando..." : "Confirmar Distribuição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">Excluir Lead Vendido</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja realmente excluir este lead permanentemente? Esta ação não poderá ser desfeita.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsArchiveModalOpen(false)}
              className="flex-1 font-bold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteLead}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold"
            >
              Excluir Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. CAPTURED LEADS LIST SHEET */}
      <Sheet open={isLeadsListOpen} onOpenChange={setIsLeadsListOpen}>
        <SheetContent side="bottom" className="h-[70vh] bg-card border-border rounded-t-3xl p-0 overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20">
            <h3 className="text-xl font-black text-foreground">Detalhamento de Leads Captados</h3>
            <p className="text-sm text-muted-foreground">{dateRange.start.split('-').reverse().join('/')} - {dateRange.end.split('-').reverse().join('/')}</p>
          </div>
          <ScrollArea className="h-full">
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="font-bold">Quantidade</TableHead>
                    <TableHead className="font-bold">Origem</TableHead>
                    <TableHead className="font-bold">Data</TableHead>
                    <TableHead className="font-bold">Responsável</TableHead>
                    <TableHead className="font-bold">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capturedLeadsList.map((item, idx) => (
                    <TableRow key={idx} className="border-border hover:bg-muted/30">
                      <TableCell className="font-black text-lg text-primary">{item.amount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold">{item.source}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.date.split('-').reverse().join('/')}</TableCell>
                      <TableCell className="font-medium">{item.profiles?.display_name || "N/A"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground italic max-w-xs truncate">{item.observations || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {capturedLeadsList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <Button 
      variant={active ? "default" : "outline"} 
      size="sm" 
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg font-bold transition-all",
        active ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "bg-card border-border hover:bg-muted"
      )}
    >
      {label}
    </Button>
  );
}

function StatCard({ title, value, icon: Icon, color, active, onClick }: any) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-border shadow-sm",
        active ? "ring-2 ring-primary bg-card shadow-md" : "bg-card"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center">
        <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center mb-3 shadow-sm", color)}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{value}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
            {title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversionStep({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-black text-primary drop-shadow-sm">{value}</span>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ConversionArrow({ percentage }: { percentage: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <div className="flex items-center text-success font-bold text-[10px] bg-success/15 px-2 py-0.5 rounded-full border border-success/20">
        <ArrowRight className="w-3 h-3 mr-0.5" />
        {percentage}%
      </div>
      <div className="h-px w-8 sm:w-16 bg-border" />
    </div>
  );
}

function StatusBadge({ status }: { status: any }) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  return (
    <Badge className={cn("border-none shadow-none font-bold uppercase text-[10px] tracking-widest px-2.5 py-1", config.color)}>
      <config.icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function InfoItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-bold text-foreground truncate">{value}</p>
    </div>
  );
}
