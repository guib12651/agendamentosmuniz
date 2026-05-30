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
  Trash2,
  Pencil,
  FileText,
  Gavel
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
import SaleToQuotaModal from "@/components/SaleToQuotaModal";
import QuotaForm from "@/components/QuotaForm";
import TimelineSheet from "@/components/TimelineSheet";

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
  const [autoSelectAgendamentos, setAutoSelectAgendamentos] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [customStart, setCustomStart] = useState(new Date().toISOString().split("T")[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split("T")[0]);
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [createdMeetings, setCreatedMeetings] = useState<Meeting[]>([]);
  const [createdAppointmentsCount, setCreatedAppointmentsCount] = useState(0);
  const [calls, setCalls] = useState<Call[]>([]);
  const [funnelData, setFunnelData] = useState<SalesFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<Meeting | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [leadToArchive, setLeadToArchive] = useState<Meeting | null>(null);

  // Modal States
  const [isRegisterLeadsOpen, setIsRegisterLeadsOpen] = useState(false);
  const [isDistributeLeadsOpen, setIsDistributeLeadsOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
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
  const [editingCapturedLead, setEditingCapturedLead] = useState<any | null>(null);

  // Daily Calls state
  const [isRegisterCallsOpen, setIsRegisterCallsOpen] = useState(false);
  const [isCallsListOpen, setIsCallsListOpen] = useState(false);
  const [dailyCallsList, setDailyCallsList] = useState<any[]>([]);
  const [editingDailyCall, setEditingDailyCall] = useState<any | null>(null);
  const [callAmount, setCallAmount] = useState<string>("0");
  const [callDate, setCallDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [callObs, setCallObs] = useState<string>("");

  // Sale to Quota states
  const [showSaleToQuotaModal, setShowSaleToQuotaModal] = useState(false);
  const [showQuotaForm, setShowQuotaForm] = useState(false);
  const [lastSoldMeeting, setLastSoldMeeting] = useState<Meeting | null>(null);

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

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name");
    if (!error && data) setUsers(data);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch appointments (meetings) for the period
      // For "Appointments Created", we count meetings created in the period
      const { count: createdCount, error: createdError } = await supabase
        .from("meetings")
        .select("id", { count: 'exact', head: true })
        .gte("created_at", dateRange.start + "T00:00:00Z")
        .lte("created_at", dateRange.end + "T23:59:59Z");
      
      if (createdError) throw createdError;
      setCreatedAppointmentsCount(createdCount || 0);

      // For Result cards (Attended, No Show, Negotiations, Sales), we look at meetings
      // scheduled for the period, regardless of when they were created.
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);
      
      if (meetingsError) throw meetingsError;
      
      const mappedMeetings: Meeting[] = (meetingsData || []).map((row) => ({
        id: row.id,
        leadName: row.lead_name,
        phone: row.phone,
        date: row.date,
        time: row.time.slice(0, 5),
        preSeller: row.pre_seller,
        consultant: row.consultant,
        downPayment: row.down_payment || "",
        installment: row.installment || "",
        restriction: row.restriction as any,
        notes: row.notes || "",
        status: (row.status || "pending") as any,
        markingType: (row.marking_type || "lead_quente") as any,
        meetingType: (row.meeting_type || "presencial") as any,
        trigger: (row.trigger || "imovel") as any,
        city: row.city || "",
        saleDate: row.sale_date || undefined,
        userId: row.user_id || null,
        createdAt: row.created_at || undefined,
        funnelStage: (row.funnel_stage || "appointment") as any,
        archived: row.archived || false,
      }));
      setMeetings(mappedMeetings);

      // 2. Fetch Manual Data (Leads and Calls) - NOT automatic as per instructions
      const { data: leadsData, error: leadsError } = await supabase
        .from("operational_leads")
        .select("id, amount, source, date, observations, created_by, profiles!operational_leads_created_by_fkey(display_name)")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);
      
      if (leadsError) throw leadsError;
      const totalCaptured = (leadsData as any[]).reduce((acc, l) => acc + l.amount, 0);
      setCapturedLeadsList(leadsData);

      const { data: dailyCallsData, error: dailyCallsError } = await supabase
        .from("daily_calls")
        .select("id, amount, date, observations, user_id, profiles!daily_calls_profiles_fkey(display_name)")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);
      
      if (dailyCallsError) throw dailyCallsError;
      setDailyCallsList(dailyCallsData);

      // 3. Fetch Distributions
      const { data: distData, error: distError } = await supabase
        .from("leads_distribution")
        .select("amount, user_id, profiles!leads_distribution_user_id_fkey(display_name)")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);

      if (distError) throw distError;

      const userMap = new Map<string, any>();
      distData.forEach(d => {
        const userId = d.user_id;
        const name = d.profiles?.display_name || "Desconhecido";
        const existing = userMap.get(userId) || {
          userId,
          displayName: name,
          leadsReceived: 0,
        };
        userMap.set(userId, { ...existing, leadsReceived: existing.leadsReceived + d.amount });
      });

      setFunnelData({
        totalLeadsCaptured: totalCaptured,
        distribution: Array.from(userMap.values())
      });

      // 4. Individual Calls (Manual as well)
      const c = await getCalls(dateRange.start + "T00:00:00Z", dateRange.end + "T23:59:59Z");
      setCalls(c);

    } catch (err) {
      console.error("Error loading operational data:", err);
      toast.error("Erro ao carregar dados operacionais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (isAdmin) fetchAllUsers();
    
    // Configura o Realtime para atualizar automaticamente
    const channel = supabase
      .channel('central-operacional-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meetings' }, (payload) => {
        console.log("Realtime: new meeting detected", payload.new);
        const newMeeting = payload.new as Meeting;
        
        // Sempre seleciona a aba de agendamentos para qualquer nova reunião
        setSelectedStage("agendamentos");
        
        // Ajusta o período se a reunião for para uma data fora do range atual
        const meetingDate = newMeeting.date;
        if (meetingDate < dateRange.start || meetingDate > dateRange.end) {
          // Se estiver fora do range, mudamos para a data específica da reunião 
          // ou simplesmente recarregamos para garantir que apareça se o usuário mudar o filtro
          setPeriod("custom");
          setFilterDate(meetingDate);
          setCustomStart(meetingDate);
          setCustomEnd(meetingDate);
        }

        toast.info(`Novo agendamento: ${newMeeting.leadName}`, {
          description: `Marcado para ${newMeeting.date} às ${newMeeting.time}`,
          action: {
            label: "Ver",
            onClick: () => {
              setSelectedStage("agendamentos");
              setSearchTerm(newMeeting.leadName);
            }
          }
        });
        loadData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetings' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meetings' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_leads' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_calls' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_distribution' }, () => {
        loadData();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
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

  const handleDeleteCapturedLead = async (id: string) => {
    try {
      const { error } = await supabase.from("operational_leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Registro excluído!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir registro");
    }
  };

  const handleEditCapturedLead = async () => {
    if (!editingCapturedLead || !leadAmount || parseInt(leadAmount) <= 0 || !leadSource) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("operational_leads").update({
        amount: parseInt(leadAmount),
        source: leadSource,
        date: leadDate,
        observations: leadObs,
      }).eq("id", editingCapturedLead.id);

      if (error) throw error;

      toast.success("Lead atualizado com sucesso!");
      setEditingCapturedLead(null);
      setIsRegisterLeadsOpen(false);
      // Reset form
      setLeadAmount("0");
      setLeadSource("");
      setLeadObs("");
      setLeadDate(new Date().toISOString().split("T")[0]);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar lead");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterDailyCalls = async () => {
    if (!callAmount || parseInt(callAmount) <= 0) {
      toast.error("Preencha a quantidade de ligações");
      return;
    }

    setSubmitting(true);
    try {
      if (editingDailyCall) {
        const { error } = await supabase.from("daily_calls").update({
          amount: parseInt(callAmount),
          date: callDate,
          observations: callObs,
        }).eq("id", editingDailyCall.id);
        if (error) throw error;
        toast.success("Registro atualizado!");
      } else {
        const { error } = await supabase.from("daily_calls").insert({
          amount: parseInt(callAmount),
          date: callDate,
          observations: callObs,
          user_id: profile?.id
        });
        if (error) throw error;
        toast.success("Ligações registradas!");
      }

      setIsRegisterCallsOpen(false);
      setEditingDailyCall(null);
      setCallAmount("0");
      setCallObs("");
      setCallDate(new Date().toISOString().split("T")[0]);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar registro");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDailyCall = async (id: string) => {
    try {
      const { error } = await supabase.from("daily_calls").delete().eq("id", id);
      if (error) throw error;
      toast.success("Registro excluído!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir registro");
    }
  };

  const stats = useMemo(() => {
    const totalLeads = funnelData?.totalLeadsCaptured || 0;
    const distributed = funnelData?.distribution.reduce((acc, d) => acc + (d.leadsReceived || 0), 0) || 0;
    const activeMeetings = meetings.filter(m => !m.archived);
    const individualCallsCount = calls.length;
    const dailyCallsCount = dailyCallsList.reduce((acc, c) => acc + c.amount, 0);
    const callsMade = individualCallsCount + dailyCallsCount;
    
    // Produção: Agendamentos criados no período
    const appointments = createdAppointmentsCount;
    
    // Resultado: Ações que ocorreram nas reuniões marcadas para o período
    const attended = activeMeetings.filter(m => ['compareceu', 'visita_realizada', 'em_negociacao', 'venda_concluida'].includes(m.status)).length;
    const noShow = activeMeetings.filter(m => m.status === 'nao_compareceu').length;
    const negotiations = activeMeetings.filter(m => ['em_negociacao', 'venda_concluida'].includes(m.status)).length;
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
  }, [funnelData, calls, meetings, dailyCallsList, createdAppointmentsCount]);

  const filteredLeads = useMemo(() => {
    let list = meetings;
    
    // Filter by archived status
    list = list.filter(m => showArchived ? m.archived === true : m.archived === false);

    if (selectedStage) {
      if (selectedStage === 'agendamentos') {
        // Show all active meetings as they are all considered "appointments" in stats
      }
      else if (selectedStage === 'compareceram') list = list.filter(m => ['compareceu', 'visita_realizada', 'em_negociacao', 'venda_concluida'].includes(m.status));
      else if (selectedStage === 'faltas') list = list.filter(m => m.status === 'nao_compareceu');
      else if (selectedStage === 'negociacoes') list = list.filter(m => ['em_negociacao', 'venda_concluida'].includes(m.status));
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

  const leadHistory = useMemo(() => {
    if (!selectedLead) return [];
    
    const history = [];
    
    // Appointment event
    history.push({
      event: "Agendamento realizado",
      date: selectedLead.createdAt || selectedLead.date,
      icon: Calendar,
      isMain: true
    });

    // Visit event
    if (selectedLead.status === 'compareceu' || selectedLead.status === 'visita_realizada' || selectedLead.status === 'em_negociacao' || selectedLead.status === 'venda_concluida') {
      history.push({
        event: "Visita realizada",
        date: selectedLead.date,
        icon: CheckCircle2,
        isMain: true
      });
    }

    // Negotiation event
    if (selectedLead.status === 'em_negociacao' || selectedLead.status === 'venda_concluida') {
      history.push({
        event: "Início da negociação",
        date: selectedLead.date, // We don't have a specific date for negotiation start, using lead date
        icon: Handshake,
        isMain: true
      });
    }

    // Sale event
    if (selectedLead.status === 'venda_concluida') {
      history.push({
        event: "Venda realizada",
        date: selectedLead.saleDate || selectedLead.date,
        icon: ShoppingCart,
        isGoal: true,
        isMain: true
      });
    }

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedLead]);

  const handleLeadClick = (lead: Meeting) => {
    setSelectedLead(lead);
    setIsTimelineOpen(true);
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

  const handleUpdateLeadStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("meetings")
        .update({ status })
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Status atualizado!");
      loadData();
      
      if (status === "venda_concluida" && isAdmin) {
        const lead = meetings.find(m => m.id === id);
        if (lead) {
          setLastSoldMeeting(lead);
          setShowSaleToQuotaModal(true);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar status");
    }
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
                <DropdownMenuItem onClick={() => navigate("/quotas")}>
                  <FileText className="w-4 h-4 mr-2" /> Cotas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/lances")}>
                  <Gavel className="w-4 h-4 mr-2" /> Lances
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

      <main className="container-fluid max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* 1. TOP FILTERS */}
        <section className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
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
              <div className="grid grid-cols-1 sm:flex sm:items-center gap-3 w-full xl:w-auto">
                <Button 
                  onClick={() => setIsRegisterLeadsOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 sm:h-9 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" /> Registrar Leads
                </Button>
                <Button 
                  onClick={() => setIsDistributeLeadsOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 sm:h-9 rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-95 w-full sm:w-auto"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Distribuir Leads
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:flex sm:items-center gap-3 w-full xl:w-auto">
              <Button 
                onClick={() => setIsRegisterCallsOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-11 sm:h-9 rounded-xl shadow-lg shadow-amber-900/20 transition-all active:scale-95 w-full sm:w-auto"
              >
                <Phone className="w-4 h-4 mr-2" /> Registrar Ligações
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-display font-bold uppercase tracking-wider">
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

        {/* 2. OPERATIONAL DASHBOARD BLOCKS */}
        <section className="space-y-12">
          {/* BLOCO 1: PRODUÇÃO DO DIA */}
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4 py-1">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Produção do Dia</h2>
              <p className="text-sm text-muted-foreground font-medium">Tudo que a equipe produziu durante o período selecionado.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard 
                title="Leads Captados" 
                value={stats.captured} 
                icon={Target} 
                color="bg-slate-100 text-slate-600" 
                valueColor="text-slate-900"
                active={selectedStage === 'captados'}
                onClick={() => setIsLeadsListOpen(true)}
              />
              <StatCard 
                title="Leads Distribuídos" 
                value={stats.distributed} 
                icon={UserPlus} 
                color="bg-blue-50 text-blue-600"
                valueColor="text-blue-700"
                active={selectedStage === 'distribuicao'}
                onClick={() => setSelectedStage(selectedStage === 'distribuicao' ? null : 'distribuicao')}
              />
              <StatCard 
                title="Ligações" 
                value={stats.calls} 
                icon={Phone} 
                color="bg-slate-100 text-slate-600" 
                valueColor="text-slate-900"
                active={selectedStage === 'ligacoes'}
                onClick={() => setIsCallsListOpen(true)}
              />
              <StatCard 
                title="Agendamentos Criados" 
                value={stats.appointments} 
                icon={Calendar} 
                color="bg-blue-50 text-blue-600"
                valueColor="text-blue-700"
                active={selectedStage === 'agendamentos'}
                onClick={() => setSelectedStage(selectedStage === 'agendamentos' ? null : 'agendamentos')}
              />
            </div>
          </div>

          {/* BLOCO 2: RESULTADO DO DIA */}
          <div className="space-y-6">
            <div className="border-l-4 border-emerald-500 pl-4 py-1">
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Resultado do Dia</h2>
              <p className="text-sm text-muted-foreground font-medium">Tudo que efetivamente aconteceu na operação durante o período selecionado.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard 
                title="Compareceram" 
                value={stats.attended} 
                icon={CheckCircle2} 
                color="bg-emerald-50 text-emerald-600" 
                valueColor="text-emerald-600"
                active={selectedStage === 'compareceram'}
                onClick={() => setSelectedStage(selectedStage === 'compareceram' ? null : 'compareceram')}
              />
              <StatCard 
                title="Faltaram" 
                value={stats.noShow} 
                icon={XCircle} 
                color="bg-rose-50 text-rose-600" 
                valueColor="text-rose-600"
                active={selectedStage === 'faltas'}
                onClick={() => setSelectedStage(selectedStage === 'faltas' ? null : 'faltas')}
              />
              <StatCard 
                title="Negociações" 
                value={stats.negotiations} 
                icon={Handshake} 
                color="bg-blue-50 text-blue-600" 
                valueColor="text-blue-600"
                active={selectedStage === 'negociacoes'}
                onClick={() => setSelectedStage(selectedStage === 'negociacoes' ? null : 'negociacoes')}
              />
              <StatCard 
                title="Vendas" 
                value={stats.sales} 
                icon={ShoppingCart} 
                color="bg-emerald-600 text-white" 
                valueColor="text-emerald-700"
                isHighlight={true}
                active={selectedStage === 'vendas'}
                onClick={() => setSelectedStage(selectedStage === 'vendas' ? null : 'vendas')}
              />
            </div>
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

          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden overflow-x-auto">
            <div className="min-w-[1000px]">
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
                    <div key={idx} className={cn(
                      "flex gap-4 group",
                      item.isMain && "scale-[1.02] origin-left"
                    )}>
                      <div className={cn(
                        "relative z-10 w-12 h-12 rounded-lg border flex items-center justify-center shadow-sm transition-all",
                        item.isGoal ? "bg-yellow-500 border-yellow-400 text-white shadow-yellow-500/20" : 
                        item.isMain ? "bg-primary border-primary text-white" : "bg-card border-border text-muted-foreground group-hover:border-primary"
                      )}>
                        <item.icon className={cn("w-5 h-5", !item.isMain && !item.isGoal && "group-hover:text-primary")} />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={cn(
                          "text-sm font-bold",
                          item.isGoal ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"
                        )}>{item.event}</p>
                        <p className="text-[11px] text-muted-foreground font-medium uppercase">
                          {item.date.includes('T') || item.date.includes(' ') 
                            ? new Date(item.date).toLocaleString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : item.date.split('-').reverse().join('/')
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                  {leadHistory.length > 1 && leadHistory.some(h => h.event === "Venda realizada") && (
                    <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 shadow-inner">
                      <p className="text-xs font-black text-yellow-700 dark:text-yellow-400 flex items-center gap-2 uppercase tracking-wider">
                        <TrendingUp className="w-4 h-4" />
                        {(() => {
                          const sale = leadHistory.find(h => h.event === "Venda realizada")?.date;
                          const appt = leadHistory.find(h => h.event === "Agendamento realizado")?.date;
                          if (sale && appt) {
                            const days = Math.ceil((new Date(sale).getTime() - new Date(appt).getTime()) / (1000 * 60 * 60 * 24));
                            return `Jornada: ${days} ${days === 1 ? 'dia' : 'dias'} do agendamento à venda`;
                          }
                          return "Jornada em andamento";
                        })()}
                      </p>
                    </div>
                  )}
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
                  <InfoItem label="Usuário" value={selectedLead?.preSeller || "-"} />
                </div>
                {selectedLead?.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Observações</p>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">{selectedLead.notes}</p>
                  </div>
                )}
                {isAdmin && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Alterar Status</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => handleUpdateLeadStatus(selectedLead!.id, 'em_negociacao')}>Negociação</Button>
                      <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold text-rose-500 border-rose-500/20" onClick={() => handleUpdateLeadStatus(selectedLead!.id, 'venda_concluida')}>Vendido</Button>
                      <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => handleUpdateLeadStatus(selectedLead!.id, 'compareceu')}>Compareceu</Button>
                      <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold text-destructive" onClick={() => handleUpdateLeadStatus(selectedLead!.id, 'nao_compareceu')}>Falta</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* 6. MODALS FOR ADMIN ACTIONS */}
      <Dialog open={isRegisterLeadsOpen} onOpenChange={(open) => {
        setIsRegisterLeadsOpen(open);
        if (!open) setEditingCapturedLead(null);
      }}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">
              {editingCapturedLead ? "📝 Editar Leads" : "➕ Registrar Leads"}
            </DialogTitle>
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
              onClick={editingCapturedLead ? handleEditCapturedLead : handleRegisterLeads} 
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {submitting ? "Salvando..." : editingCapturedLead ? "Salvar Alterações" : "Confirmar Registro"}
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
              <Label htmlFor="employee" className="font-bold">Membro da Equipe</Label>
              <Select value={distEmployee} onValueChange={setDistEmployee}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
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
        <SheetContent side="bottom" className="h-[85vh] sm:h-[70vh] bg-card border-border rounded-t-3xl p-0 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border bg-muted/20">
            <h3 className="text-lg sm:text-xl font-black text-foreground">Detalhamento de Leads Captados</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{dateRange.start.split('-').reverse().join('/')} - {dateRange.end.split('-').reverse().join('/')}</p>
          </div>
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 pb-24 sm:pb-12">
              <div className="sm:hidden space-y-4">
                {capturedLeadsList.map((item, idx) => (
                  <Card key={idx} className="bg-muted/30 border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-2xl font-black text-primary">{item.amount}</p>
                          <p className="text-xs text-muted-foreground">{item.date.split('-').reverse().join('/')}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingCapturedLead(item);
                              setLeadAmount(item.amount.toString());
                              setLeadSource(item.source);
                              setLeadDate(item.date);
                              setLeadObs(item.observations || "");
                              setIsRegisterLeadsOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (window.confirm("Deseja realmente excluir este registro?")) {
                                handleDeleteCapturedLead(item.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Origem</p>
                          <Badge variant="secondary" className="font-bold text-[10px]">{item.source}</Badge>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Responsável</p>
                          <p className="font-medium truncate">{item.profiles?.display_name || "N/A"}</p>
                        </div>
                      </div>
                      {item.observations && (
                        <div className="mt-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Observações</p>
                          <p className="text-xs text-muted-foreground italic">{item.observations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {capturedLeadsList.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">Nenhum registro encontrado.</div>
                )}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-bold text-center w-[80px]">Qtde</TableHead>
                      <TableHead className="font-bold">Origem</TableHead>
                      <TableHead className="font-bold">Data</TableHead>
                      <TableHead className="font-bold">Responsável</TableHead>
                      <TableHead className="font-bold">Observações</TableHead>
                      <TableHead className="font-bold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capturedLeadsList.map((item, idx) => (
                      <TableRow key={idx} className="border-border hover:bg-muted/30">
                        <TableCell className="font-display font-black text-lg text-primary text-center">{item.amount}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-bold">{item.source}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.date.split('-').reverse().join('/')}</TableCell>
                        <TableCell className="font-medium text-sm">{item.profiles?.display_name || "N/A"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground italic max-w-[150px] truncate">{item.observations || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => {
                                setEditingCapturedLead(item);
                                setLeadAmount(item.amount.toString());
                                setLeadSource(item.source);
                                setLeadDate(item.date);
                                setLeadObs(item.observations || "");
                                setIsRegisterLeadsOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm("Deseja realmente excluir este registro?")) {
                                  handleDeleteCapturedLead(item.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {capturedLeadsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* 8. REGISTER DAILY CALLS DIALOG */}
      <Dialog open={isRegisterCallsOpen} onOpenChange={setIsRegisterCallsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">
              {editingDailyCall ? "Editar Registro de Ligações" : "Registrar Ligações Diárias"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="call-amount" className="font-bold text-sm">Quantidade de Ligações</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="call-amount"
                  type="number"
                  placeholder="0"
                  className="pl-10 bg-muted border-border font-black text-lg h-12"
                  value={callAmount}
                  onChange={(e) => setCallAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="call-date" className="font-bold text-sm">Data</Label>
              <Input
                id="call-date"
                type="date"
                value={callDate}
                onChange={(e) => setCallDate(e.target.value)}
                className="bg-muted border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="call-obs" className="font-bold text-sm">Observações (Opcional)</Label>
              <Textarea
                id="call-obs"
                value={callObs}
                onChange={(e) => setCallObs(e.target.value)}
                placeholder="Notas sobre o desempenho do dia..."
                className="bg-muted border-border resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleRegisterDailyCalls} 
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-11"
            >
              {submitting ? "Salvando..." : editingDailyCall ? "Atualizar Registro" : "Confirmar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. DAILY CALLS LIST SHEET */}
      <Sheet open={isCallsListOpen} onOpenChange={setIsCallsListOpen}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[70vh] bg-card border-border rounded-t-3xl p-0 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border bg-muted/20">
            <h3 className="text-lg sm:text-xl font-black text-foreground">Detalhamento de Ligações Registradas</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{dateRange.start.split('-').reverse().join('/')} - {dateRange.end.split('-').reverse().join('/')}</p>
          </div>
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6 pb-24 sm:pb-12">
              <div className="sm:hidden space-y-4">
                {dailyCallsList.map((item, idx) => (
                  <Card key={idx} className="bg-muted/30 border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-2xl font-black text-amber-500">{item.amount}</p>
                          <p className="text-xs text-muted-foreground">{item.date.split('-').reverse().join('/')}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingDailyCall(item);
                              setCallAmount(item.amount.toString());
                              setCallDate(item.date);
                              setCallObs(item.observations || "");
                              setIsRegisterCallsOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (window.confirm("Deseja realmente excluir este registro?")) {
                                handleDeleteDailyCall(item.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Responsável</p>
                        <p className="font-medium">{item.profiles?.display_name || "N/A"}</p>
                      </div>
                      {item.observations && (
                        <div className="mt-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Observações</p>
                          <p className="text-xs text-muted-foreground italic">{item.observations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {dailyCallsList.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">Nenhum registro de ligações encontrado.</div>
                )}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="font-bold text-center w-[80px]">Qtde</TableHead>
                      <TableHead className="font-bold">Data</TableHead>
                      <TableHead className="font-bold">Responsável</TableHead>
                      <TableHead className="font-bold">Observações</TableHead>
                      <TableHead className="font-bold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyCallsList.map((item, idx) => (
                      <TableRow key={idx} className="border-border hover:bg-muted/30">
                        <TableCell className="font-display font-black text-lg text-amber-500 text-center">{item.amount}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.date.split('-').reverse().join('/')}</TableCell>
                        <TableCell className="font-medium text-sm">{item.profiles?.display_name || "N/A"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground italic max-w-[200px] truncate">{item.observations || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => {
                                setEditingDailyCall(item);
                                setCallAmount(item.amount.toString());
                                setCallDate(item.date);
                                setCallObs(item.observations || "");
                                setIsRegisterCallsOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm("Deseja realmente excluir este registro?")) {
                                  handleDeleteDailyCall(item.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dailyCallsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum registro de ligações encontrado.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <SaleToQuotaModal 
        isOpen={showSaleToQuotaModal} 
        onClose={() => setShowSaleToQuotaModal(false)}
        onCreateQuota={() => {
          setShowSaleToQuotaModal(false);
          setShowQuotaForm(true);
        }}
        clientName={lastSoldMeeting?.leadName || ""}
      />

      <QuotaForm 
        isOpen={showQuotaForm}
        onClose={() => setShowQuotaForm(false)}
        onSuccess={() => {
          setShowQuotaForm(false);
          toast.success("Cota vinculada com sucesso!");
        }}
        preFill={lastSoldMeeting || undefined}
        userId={profile?.id}
        userName={profile?.displayName}
      />
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

function StatCard({ title, value, icon: Icon, color, valueColor, active, onClick, isHighlight }: any) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98] border border-border overflow-hidden group",
        active ? "ring-2 ring-primary bg-card" : "bg-card",
        isHighlight && "border-emerald-500/50 shadow-emerald-500/10"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch h-full min-h-[110px]">
          <div className={cn(
            "w-16 sm:w-20 flex items-center justify-center transition-colors duration-300 group-hover:brightness-95",
            color
          )}>
            <Icon className={cn("w-7 h-7 sm:w-8 sm:h-8", isHighlight ? "text-white" : "text-current")} />
          </div>
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center bg-card">
            <p className={cn("text-3xl sm:text-4xl font-display font-black tracking-tighter mb-0.5", valueColor)}>
              {value}
            </p>
            <p className="text-[10px] sm:text-[11px] font-black text-muted-foreground uppercase tracking-wider leading-tight">
              {title}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
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
