import { useState, useEffect, useRef } from "react";
import { getFunnelDataRange, saveFunnelDay, saveFunnelDistribution, SalesFunnelData } from "@/lib/funnelStore";
import { updateFunnelStage, getMeetings, getCalls, addCall } from "@/lib/store";
import { Meeting, FunnelStage, Call } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Filter, Users, Phone, Calendar, MapPin, Handshake, ShoppingCart, Target, Search, MoreHorizontal, Plus, Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

// Helper components for animation and styles
function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      const start = prevValueRef.current;
      const end = value;
      const duration = 600;
      let startTime: number | null = null;

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        setDisplayValue(current);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          prevValueRef.current = value;
        }
      };
      requestAnimationFrame(animate);
    }
  }, [value]);

  return <span>{displayValue}</span>;
}

const getHexForColor = (colorClass: string) => {
  const map: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-indigo-500': '#6366f1',
    'bg-purple-500': '#a855f7',
    'bg-amber-500': '#f59e0b',
    'bg-orange-500': '#f97316',
    'bg-emerald-500': '#10b981',
    'bg-rose-600': '#e11d48',
  };
  return map[colorClass] || '#3b82f6';
};

const getDarkerHex = (colorClass: string) => {
  const map: Record<string, string> = {
    'bg-blue-500': '#2563eb',
    'bg-indigo-500': '#4f46e5',
    'bg-purple-500': '#9333ea',
    'bg-amber-500': '#d97706',
    'bg-orange-500': '#ea580c',
    'bg-emerald-500': '#059669',
    'bg-rose-600': '#be123c',
  };
  return map[colorClass] || '#2563eb';
};

import PeriodFilter, { PeriodType, getDateRange } from "./PeriodFilter";

export default function SalesFunnel({ date: initialDate }: { date: string }) {
  const { isAdmin, profile } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [period, setPeriod] = useState<PeriodType>("daily");
  const [customStart, setCustomStart] = useState(initialDate);
  const [customEnd, setCustomEnd] = useState(initialDate);

  const [data, setData] = useState<SalesFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tempLeads, setTempLeads] = useState(0);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [localLeadsCaptured, setLocalLeadsCaptured] = useState<number | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [isAddingCall, setIsAddingCall] = useState(false);
  const [newCall, setNewCall] = useState({ leadName: '', result: 'Não atendeu' });

  const [preSellers, setPreSellers] = useState<{ id: string; displayName: string }[]>([]);
  const [selectedPreSeller, setSelectedPreSeller] = useState<string>("all");

  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("profiles")
        .select("id, display_name, role")
        .or("role.eq.pre_seller,display_name.eq.Ketullen")
        .then(({ data }) => {
          if (data) setPreSellers(data.map((p: any) => ({ id: p.id, displayName: p.display_name })));
        });
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const range = getDateRange(period, selectedDate, customStart, customEnd);
      
      const [result, m, c] = await Promise.all([
        getFunnelDataRange(range.start, range.end),
        getMeetings(),
        getCalls(range.start + "T00:00:00Z", range.end + "T23:59:59Z")
      ]);
      setData(result);
      setMeetings(m.filter(item => {
        const itemDate = item.date.trim();
        return itemDate >= range.start && itemDate <= range.end;
      }));
      setCalls(c);
      
      const { data: currentDay } = await supabase
        .from("sales_funnel_days")
        .select("total_leads_captured")
        .eq("date", selectedDate)
        .maybeSingle();
      
      if (currentDay) {
        setTempLeads(currentDay.total_leads_captured || 0);
      } else {
        setTempLeads(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("realtime-funnel")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_funnel_days" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_funnel_distribution" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, period, customStart, customEnd, selectedPreSeller]);

  const handleSaveTotalLeads = async () => {
    try {
      await saveFunnelDay(selectedDate, localLeadsCaptured !== null ? localLeadsCaptured : tempLeads);
      toast.success("Total de leads captados atualizado!");
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleUpdateMetric = async (userId: string, field: string, value: number) => {
    if (period !== "daily" && !isAdmin) {
        toast.error("Edição de métricas em períodos consolidados permitida apenas para administradores.");
        return;
    }

    const { data: dayData, error: dayError } = await supabase
      .from("sales_funnel_days")
      .select("id")
      .eq("date", selectedDate)
      .maybeSingle();

    if (dayError) return;

    let dayId = dayData?.id;
    if (!dayId) {
        const newDay = await saveFunnelDay(selectedDate, 0);
        dayId = newDay.id;
    }

    const { data: currentDist } = await supabase
        .from("sales_funnel_distribution")
        .select("*")
        .eq("day_id", dayId)
        .eq("user_id", userId)
        .maybeSingle();

    const metrics: any = {
        leadsReceived: currentDist?.leads_received || 0,
        callsMade: currentDist?.calls_made || 0,
        appointmentsMade: currentDist?.appointments_made || 0,
        visitsCompleted: currentDist?.visits_completed || 0,
        negotiationsStarted: currentDist?.negotiations_started || 0,
        salesCompleted: currentDist?.sales_completed || 0,
    };

    metrics[field] = value;
    await saveFunnelDistribution(dayId, userId, metrics);
    loadData();
  };

  const stages = [
    { id: "capture", label: "Captação", color: "bg-slate-800", icon: Target, value: data?.totalLeadsCaptured || 0 },
    { 
      id: "distribution", label: "Distribuição", color: "bg-slate-700", icon: Users, 
      value: (data?.distribution || []).filter(d => selectedPreSeller === "all" || d.displayName?.trim() === selectedPreSeller?.trim()).reduce((acc, d) => acc + (d.leadsReceived || 0), 0) 
    },
    { 
      id: "calls", label: "Ligações", color: "bg-slate-600", icon: Phone, 
      value: calls.filter(c => {
        const matchesSeller = selectedPreSeller === "all" || c.userDisplayName?.trim() === selectedPreSeller?.trim();
        if (!isAdmin) return c.userId === profile?.id;
        return matchesSeller;
      }).length
    },
    { id: "appointments", label: "Agendamentos", color: "bg-amber-500", icon: Calendar, value: getMeetingsInStageCount("appointments") },
    { id: "visits", label: "Visitas", color: "bg-primary", icon: MapPin, value: getMeetingsInStageCount("visits") },
    { id: "negotiations", label: "Negociações", color: "bg-blue-600", icon: Handshake, value: getMeetingsInStageCount("negotiations") },
    { id: "sales", label: "Vendas", color: "bg-emerald-600", icon: ShoppingCart, value: getMeetingsInStageCount("sales") },
  ];

  function getMeetingsInStageCount(stageId: string) {
    const stageMap: Record<string, FunnelStage> = { appointments: "appointment", visits: "visit", negotiations: "negotiation", sales: "sale" };
    return meetings.filter(m => {
        const matchesSeller = selectedPreSeller === "all" || m.preSeller?.trim() === selectedPreSeller?.trim();
        const isOwner = m.preSeller?.trim() === profile?.displayName?.trim();
        
        if (!isAdmin && !isOwner) return false;
        if (isAdmin && selectedPreSeller !== "all" && !matchesSeller) return false;

        const status = m.status?.toLowerCase().trim();
        
        // Operational rule: a lead is in ONLY ONE stage at a time in the counter
        if (stageId === "sales") return status === "venda_concluida";
        if (stageId === "negotiations") return status === "em_negociacao";
        if (stageId === "visits") return status === "compareceu" || status === "visita_realizada";
        if (stageId === "appointments") return status === "pending";

        return false;
    }).length;
  }

  const getMeetingsInStage = (stageId: string) => {
    return meetings.filter(m => {
        let isCorrectStage = false;
        const status = m.status?.toLowerCase().trim();
        
        if (stageId === "appointments") isCorrectStage = status === "pending";
        else if (stageId === "visits") isCorrectStage = status === "compareceu" || status === "visita_realizada"; 
        else if (stageId === "negotiations") isCorrectStage = status === "em_negociacao";
        else if (stageId === "sales") isCorrectStage = status === "venda_concluida";

        const matchesSeller = selectedPreSeller === "all" || m.preSeller?.trim() === selectedPreSeller?.trim();
        const isOwner = m.preSeller?.trim() === profile?.displayName?.trim();

        if (!isAdmin) return isCorrectStage && isOwner;
        return isCorrectStage && (selectedPreSeller === "all" || matchesSeller);
    });
  };

  const toggleStage = (id: string) => setExpandedStage(expandedStage === id ? null : id);

  return (
    <div className="card-meeting space-y-4">
      <div className="flex flex-col gap-4">
        <PeriodFilter selectedDate={selectedDate} onDateChange={setSelectedDate} period={period} onPeriodChange={setPeriod} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
        {isAdmin && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Search className="w-3 h-3" /> Filtrar por pré-vendedor</label>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant={selectedPreSeller === "all" ? "default" : "outline"} onClick={() => setSelectedPreSeller("all")} className="h-8 text-xs px-2.5">Todos</Button>
              {preSellers.map((ps) => (
                <Button key={ps.id} size="sm" variant={selectedPreSeller === ps.displayName ? "default" : "outline"} onClick={() => setSelectedPreSeller(ps.displayName)} className="h-8 text-xs px-2.5">{ps.displayName}</Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <h2 className="font-display font-bold text-lg text-primary">Consolidado</h2>
        <span className="text-xs text-muted-foreground">{period === 'daily' ? selectedDate.split("-").reverse().join("/") : 'Período Selecionado'}</span>
      </div>

      <div className="flex flex-col items-center gap-1.5 py-4">
        {stages.map((stage, idx) => {
          if (stage.id === "sales" && !isAdmin) return null;
          const width = 100 - (idx * 6);
          const isExpanded = expandedStage === stage.id;
          return (
            <div key={stage.id} onClick={() => toggleStage(stage.id)} className={`group relative cursor-pointer transition-all duration-300 ease-out flex items-center justify-between px-6 py-3.5 rounded-xl text-white font-bold shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:scale-[0.98] ${stage.color} ${isExpanded ? 'ring-2 ring-offset-2 ring-offset-background ring-primary/20 scale-[1.02] z-10' : ''}`} style={{ width: `${width}%`, minWidth: '220px', background: `linear-gradient(135deg, ${getHexForColor(stage.color)}, ${getDarkerHex(stage.color)})` }}>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300"><stage.icon className="w-5 h-5" /></div>
                <span className="text-sm md:text-base tracking-tight truncate">{stage.label}</span>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="text-xl md:text-2xl font-black font-display tabular-nums"><AnimatedCounter value={stage.value} /></div>
                {isExpanded ? <ChevronUp className="w-5 h-5 opacity-70" /> : <ChevronDown className="w-5 h-5 opacity-70 group-hover:translate-y-0.5 transition-transform" />}
              </div>
            </div>
          );
        })}
      </div>

      {expandedStage && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
          <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">{stages.find(s => s.id === expandedStage)?.label} - Detalhes</h3>
          {expandedStage === "capture" && isAdmin && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-bold">Quantidade captada</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={localLeadsCaptured !== null ? (localLeadsCaptured === 0 ? '' : localLeadsCaptured) : (tempLeads === 0 ? '' : tempLeads)} placeholder="0" onChange={(e) => setLocalLeadsCaptured(parseInt(e.target.value) || 0)} className="h-11 rounded-xl border-slate-200 focus:ring-primary shadow-sm" />
                    <Button className="h-11 px-6 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm" onClick={async () => {
                        const finalLeads = localLeadsCaptured !== null ? localLeadsCaptured : tempLeads;
                        await handleSaveTotalLeads();
                        setTempLeads(finalLeads);
                        setLocalLeadsCaptured(null);
                    }}>Salvar</Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Label className="text-slate-900 font-bold block mb-3">Origem dos Leads</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Instagram", "Meta Ads", "Indicação", "Lista fria", "CNPJ", "Orgânico", "Outros"].map(source => (
                      <div key={source} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-600">
                        {source}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between text-[11px] text-muted-foreground italic">
                  <span>Data: {selectedDate.split("-").reverse().join("/")}</span>
                  <span>Responsável: {profile?.displayName || 'Administrador'}</span>
                </div>
              </div>
            </div>
          )}

          {expandedStage !== "capture" && expandedStage !== "distribution" && expandedStage !== "calls" && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {getMeetingsInStage(expandedStage).map(m => (
                  <div key={m.id} className="bg-white p-5 rounded-2xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 text-base">{m.leadName}</h4>
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${
                             m.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                             m.status === 'compareceu' ? 'bg-emerald-100 text-emerald-700' : 
                             m.status === 'nao_compareceu' ? 'bg-rose-100 text-rose-700' : 
                             'bg-blue-100 text-blue-700'
                           }`}>
                            {m.status === 'pending' ? 'Agendado' : m.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold">
                            {m.meetingType === 'presencial' ? 'Presencial' : 'Online'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-primary/10 p-2 rounded-xl text-primary">
                        {expandedStage === 'appointments' && <Calendar className="w-5 h-5" />}
                        {expandedStage === 'visits' && <MapPin className="w-5 h-5" />}
                        {expandedStage === 'negotiations' && <Handshake className="w-5 h-5" />}
                        {expandedStage === 'sales' && <ShoppingCart className="w-5 h-5" />}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600 font-medium"><Calendar className="w-4 h-4 text-primary" /> {m.date.split("-").reverse().join("/")}</div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium"><Clock className="w-4 h-4 text-primary" /> {m.time}</div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium"><Users className="w-4 h-4 text-primary" /> {m.preSeller}</div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium truncate"><Target className="w-4 h-4 text-primary" /> {m.trigger || 'Não informado'}</div>
                      {m.city && <div className="flex items-center gap-2 text-slate-600 font-medium col-span-2"><MapPin className="w-4 h-4 text-primary" /> {m.city}</div>}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {m.status === 'pending' && (
                        <>
                          <Button size="sm" className="flex-1 h-9 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm" onClick={() => supabase.from("meetings").update({ status: 'compareceu' }).eq("id", m.id).then(() => loadData())}>
                            Confirmar Comparecimento
                          </Button>
                          <Button size="sm" variant="ghost" className="h-9 rounded-xl font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => supabase.from("meetings").update({ status: 'nao_compareceu' }).eq("id", m.id).then(() => loadData())}>
                            Faltou
                          </Button>
                        </>
                      )}
                      {m.status === 'compareceu' && (
                        <Button size="sm" className="w-full h-10 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md flex items-center justify-center gap-2" onClick={() => supabase.from("meetings").update({ status: 'em_negociacao' }).eq("id", m.id).then(() => loadData())}>
                          Entrou em Negociação <ChevronDown className="w-4 h-4" />
                        </Button>
                      )}
                      {m.status === 'em_negociacao' && (
                        <Button size="sm" className="w-full h-10 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md flex items-center justify-center gap-2" onClick={() => supabase.from("meetings").update({ status: 'venda_concluida' }).eq("id", m.id).then(() => loadData())}>
                          Venda Concluída <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedStage === "calls" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-slate-900 font-bold">Registro de Ligações</Label>
                {!isAddingCall && (
                  <Button size="sm" className="h-9 gap-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm" onClick={() => setIsAddingCall(true)}>
                    <Plus className="w-4 h-4" /> Registrar Ligação
                  </Button>
                )}
              </div>
              {isAddingCall && (
                <div className="bg-white p-5 rounded-2xl border border-primary/20 shadow-lg mb-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Nome do Lead</Label>
                    <Input className="h-10 rounded-xl border-slate-200" value={newCall.leadName} onChange={e => setNewCall({...newCall, leadName: e.target.value})} placeholder="Ex: Maria Silva" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Resultado da Ligação</Label>
                    <Select value={newCall.result} onValueChange={v => setNewCall({...newCall, result: v})}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Não atendeu">Não atendeu</SelectItem>
                        <SelectItem value="Sem interesse">Sem interesse</SelectItem>
                        <SelectItem value="Agendado">Agendado</SelectItem>
                        <SelectItem value="Retornar depois">Retornar depois</SelectItem>
                        <SelectItem value="Número inválido">Número inválido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1 h-11 rounded-xl font-bold bg-primary" onClick={async () => {
                      if (!newCall.leadName) return toast.error("Informe o nome do lead");
                      await addCall({ leadName: newCall.leadName, result: newCall.result, userId: profile?.id || '', callTime: new Date().toISOString() });
                      toast.success("Ligação registrada!");
                      setIsAddingCall(false);
                      setNewCall({ leadName: '', result: 'Não atendeu' });
                      loadData();
                    }}>Salvar Registro</Button>
                    <Button variant="ghost" className="h-11 rounded-xl font-bold" onClick={() => setIsAddingCall(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {calls.filter(c => selectedPreSeller === "all" || c.userDisplayName?.trim() === selectedPreSeller?.trim()).filter(c => !isAdmin ? c.userId === profile?.id : true).map(c => (
                  <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-primary/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900">{c.leadName}</h4>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${
                        c.result === 'Agendado' ? 'bg-emerald-100 text-emerald-700' : 
                        c.result === 'Sem interesse' ? 'bg-rose-100 text-rose-700' : 
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {c.result}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary/60" /> {c.userDisplayName}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary/60" /> {new Date(c.callTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(c.callTime).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedStage === "distribution" && (
            <div className="space-y-4">
              {isAdmin ? (
                <div className="grid gap-3">
                  {preSellers.map(ps => {
                    const dist = (data?.distribution || []).find(d => d.userId === ps.id);
                    const val = dist?.leadsReceived || 0;
                    return (
                      <div key={ps.id} className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                            {ps.displayName.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{ps.displayName}</span>
                        </div>
                        {period === "daily" ? (
                          <div className="flex items-center gap-2">
                             <Label className="text-[10px] font-bold text-slate-400 uppercase">Leads:</Label>
                             <Input type="number" className="w-20 h-10 text-center font-bold rounded-xl border-slate-200" defaultValue={val || ''} key={`dist-${ps.id}-${val}-${selectedDate}`} placeholder="0" onBlur={(e) => handleUpdateMetric(ps.id, "leadsReceived", parseInt(e.target.value) || 0)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateMetric(ps.id, "leadsReceived", parseInt((e.target as HTMLInputElement).value) || 0); }} />
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-primary">{val}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Total no período</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2">
                  <span className="text-slate-500 text-sm font-medium">Leads Recebidos no período:</span>
                  <span className="text-4xl font-black text-primary">{(data?.distribution.find(d => d.userId === profile?.id))?.leadsReceived || 0}</span>
                </div>
              )}
            </div>
          )}
          
          {expandedStage !== "capture" && expandedStage !== "distribution" && expandedStage !== "calls" && getMeetingsInStage(expandedStage).length === 0 && (
            <div className="py-8 text-center"><p className="text-sm text-muted-foreground">Nenhum registro encontrado para este período.</p></div>
          )}
          {expandedStage === "calls" && calls.length === 0 && !isAddingCall && (
            <div className="py-8 text-center"><p className="text-sm text-muted-foreground">Nenhum registro de ligação encontrado para este período.</p></div>
          )}
          {expandedStage === "capture" && !isAdmin && <p className="text-sm text-muted-foreground text-center">Apenas administradores podem ver/editar o total captado.</p>}
          {expandedStage === "sales" && !isAdmin && <p className="text-sm text-muted-foreground text-center">Acesso restrito a administradores.</p>}
        </div>
      )}
    </div>
  );
}
