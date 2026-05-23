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
  UserPlus
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
import PeriodFilter, { PeriodType, getDateRange } from "@/components/PeriodFilter";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo_muniz.png";
import { cn } from "@/lib/utils";

const statusConfig = {
  pending: { label: "Agendado", color: "bg-amber-100 text-amber-700", icon: Clock },
  compareceu: { label: "Compareceu", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  nao_compareceu: { label: "Não Compareceu", color: "bg-rose-100 text-rose-700", icon: XCircle },
  em_negociacao: { label: "Negociação", color: "bg-purple-100 text-purple-700", icon: Handshake },
  venda_concluida: { label: "Vendido", color: "bg-yellow-100 text-yellow-700", icon: ShoppingCart },
  visita_realizada: { label: "Compareceu", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

export default function CentralOperacional() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>("daily");
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

  const dateRange = useMemo(() => 
    getDateRange(period, filterDate, customStart, customEnd), 
    [period, filterDate, customStart, customEnd]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, c, f] = await Promise.all([
        getMeetings(dateRange.start, dateRange.end),
        getCalls(dateRange.start + "T00:00:00Z", dateRange.end + "T23:59:59Z"),
        getFunnelDataRange(dateRange.start, dateRange.end)
      ]);
      setMeetings(m);
      setCalls(c);
      setFunnelData(f);
    } catch (err) {
      console.error("Error loading operational data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('central-operacional-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dateRange]);

  const stats = useMemo(() => {
    const totalLeads = funnelData?.totalLeadsCaptured || 0;
    const distributed = funnelData?.distribution.reduce((acc, d) => acc + (d.leadsReceived || 0), 0) || 0;
    const callsMade = calls.length;
    const appointments = meetings.length;
    const attended = meetings.filter(m => m.status === 'compareceu' || m.status === 'visita_realizada').length;
    const noShow = meetings.filter(m => m.status === 'nao_compareceu').length;
    const negotiations = meetings.filter(m => m.status === 'em_negociacao').length;
    const sales = meetings.filter(m => m.status === 'venda_concluida').length;

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
  }, [meetings, selectedStage, searchTerm]);

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

  const calculateConversion = (val1: number, val2: number) => {
    if (val1 === 0) return 0;
    return Math.round((val2 / val1) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Central Operacional</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Visão em tempo real</p>
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
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <PeriodFilter
            selectedDate={filterDate}
            onDateChange={setFilterDate}
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </section>

        {/* 2. OPERATIONAL CARDS */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard 
            title="Leads Captados" 
            value={stats.captured} 
            icon={Target} 
            color="bg-blue-500" 
            active={selectedStage === 'captados'}
            onClick={() => setSelectedStage(selectedStage === 'captados' ? null : 'captados')}
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
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
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
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Lista Operacional 
              {selectedStage && <Badge variant="secondary" className="capitalize">{selectedStage}</Badge>}
            </h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Pesquisar leads..." 
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">Telefone</TableHead>
                  <TableHead className="font-bold">Cidade</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Responsável</TableHead>
                  <TableHead className="font-bold">Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleLeadClick(lead)}
                  >
                    <TableCell className="font-medium">{lead.leadName}</TableCell>
                    <TableCell className="text-slate-500">{lead.phone}</TableCell>
                    <TableCell>{lead.city || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{lead.preSeller}</span>
                        <span className="text-[10px] text-slate-400 uppercase">Consultor: {lead.consultant || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs">{lead.date.split('-').reverse().join('/')}</span>
                        <span className="text-[10px] text-slate-400">{lead.time}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                      Nenhum lead encontrado para este filtro.
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
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-slate-600" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-xl font-black">{selectedLead?.leadName}</SheetTitle>
                <p className="text-sm text-slate-500 font-medium">{selectedLead?.phone}</p>
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
                <div className="absolute left-6 top-2 bottom-0 w-px bg-slate-200" />
                <div className="space-y-8 relative">
                  {leadHistory.map((item, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <div className="relative z-10 w-12 h-12 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm group-hover:border-primary transition-colors">
                        <item.icon className="w-5 h-5 text-slate-600 group-hover:text-primary" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-bold text-slate-900">{item.event}</p>
                        <p className="text-[11px] text-slate-400 font-medium uppercase">
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

              <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Informações Adicionais</h4>
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Origem" value={selectedLead?.markingType || "-"} />
                  <InfoItem label="Interesse" value={selectedLead?.trigger || "-"} />
                  <InfoItem label="Entrada" value={selectedLead?.downPayment || "-"} />
                  <InfoItem label="Parcela" value={selectedLead?.installment || "-"} />
                  <InfoItem label="Consultor" value={selectedLead?.consultant || "-"} />
                  <InfoItem label="Pré-vendedor" value={selectedLead?.preSeller || "-"} />
                </div>
                {selectedLead?.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Observações</p>
                    <p className="text-xs text-slate-600 italic leading-relaxed">{selectedLead.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, active, onClick }: any) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-none shadow-sm",
        active ? "ring-2 ring-primary bg-white shadow-md" : "bg-white"
      )}
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

function ConversionStep({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-black text-slate-900">{value}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ConversionArrow({ percentage }: { percentage: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <div className="flex items-center text-emerald-500 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full">
        <ArrowRight className="w-3 h-3 mr-0.5" />
        {percentage}%
      </div>
      <div className="h-px w-8 sm:w-16 bg-slate-200" />
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
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-sm font-bold text-slate-700 truncate">{value}</p>
    </div>
  );
}
