import { useState, useEffect, useRef } from "react";
import { getFunnelDataRange, saveFunnelDay, saveFunnelDistribution, SalesFunnelData } from "@/lib/funnelStore";
import { updateFunnelStage, getMeetings, getCalls, addCall } from "@/lib/store";
import { Meeting, FunnelStage, Call } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      setMeetings(m.filter(item => item.date >= range.start && item.date <= range.end));
      setCalls(c);
      
      // Carrega tempLeads com base na data selecionada atual para edição
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
  }, [selectedDate, period, customStart, customEnd]);

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

    // Busca o dia específico para edição (sempre usa selectedDate)
    const { data: dayData, error: dayError } = await supabase
      .from("sales_funnel_days")
      .select("id")
      .eq("date", selectedDate)
      .maybeSingle();

    if (dayError) {
        console.error("Erro ao buscar dia:", dayError);
        return;
    }

    let dayId = dayData?.id;

    if (!dayId) {
        // Se não existir o dia, cria primeiro
        const newDay = await saveFunnelDay(selectedDate, 0);
        dayId = newDay.id;
    }

    // Busca a distribuição atual para não sobrescrever outros campos se necessário (embora o upsert trate isso se mapearmos tudo)
    const { data: currentDist } = await supabase
        .from("sales_funnel_distribution")
        .select("*")
        .eq("day_id", dayId)
        .eq("user_id", userId)
        .maybeSingle();

    // Mapeia métricas atuais ou usa 0
    const metrics: any = {
        leadsReceived: currentDist?.leads_received || 0,
        callsMade: currentDist?.calls_made || 0,
        appointmentsMade: currentDist?.appointments_made || 0,
        visitsCompleted: currentDist?.visits_completed || 0,
        negotiationsStarted: currentDist?.negotiations_started || 0,
        salesCompleted: currentDist?.sales_completed || 0,
    };

    // Atualiza apenas o campo que mudou
    metrics[field] = value;

    await saveFunnelDistribution(dayId, userId, metrics);
    loadData();
  };

  const stages = [
    { 
      id: "capture", 
      label: "Captação", 
      color: "bg-blue-500", 
      icon: Target, 
      value: (expandedStage === "capture" && isAdmin && period === "daily") ? (localLeadsCaptured !== null ? localLeadsCaptured : tempLeads) : (data?.totalLeadsCaptured || 0) 
    },
    { 
      id: "distribution", 
      label: "Distribuição", 
      color: "bg-indigo-500", 
      icon: Users, 
      value: (data?.distribution || [])
        .filter(d => selectedPreSeller === "all" || d.displayName === selectedPreSeller)
        .reduce((acc, d) => acc + (d.leadsReceived || 0), 0) 
    },
    { 
      id: "calls", 
      label: "Ligações", 
      color: "bg-purple-500", 
      icon: Phone, 
      value: calls.filter(c => {
        const matchesSeller = selectedPreSeller === "all" || c.userDisplayName === selectedPreSeller;
        if (!isAdmin) return c.userId === profile?.id;
        return matchesSeller;
      }).length
    },
    { 
      id: "appointments", 
      label: "Agendamentos", 
      color: "bg-amber-500", 
      icon: Calendar, 
      value: ((data?.distribution || [])
        .filter(d => {
          if (isAdmin) {
            return selectedPreSeller === "all" || d.displayName === selectedPreSeller;
          }
          return d.userId === profile?.id;
        })
        .reduce((acc, d) => acc + (d.appointmentsMade || 0), 0)) + getMeetingsInStageCount("appointments") 
    },
    { 
      id: "visits", 
      label: "Visitas", 
      color: "bg-orange-500", 
      icon: MapPin, 
      value: ((data?.distribution || [])
        .filter(d => {
          if (isAdmin) {
            return selectedPreSeller === "all" || d.displayName === selectedPreSeller;
          }
          return d.userId === profile?.id;
        })
        .reduce((acc, d) => acc + (d.visitsCompleted || 0), 0)) + getMeetingsInStageCount("visits") 
    },
    { 
      id: "negotiations", 
      label: "Negociações", 
      color: "bg-emerald-500", 
      icon: Handshake, 
      value: ((data?.distribution || [])
        .filter(d => {
          if (isAdmin) {
            return selectedPreSeller === "all" || d.displayName === selectedPreSeller;
          }
          return d.userId === profile?.id;
        })
        .reduce((acc, d) => acc + (d.negotiationsStarted || 0), 0)) + getMeetingsInStageCount("negotiations") 
    },
    { 
      id: "sales", 
      label: "Vendas", 
      color: "bg-rose-600", 
      icon: ShoppingCart, 
      value: ((data?.distribution || [])
        .filter(d => {
          if (isAdmin) {
            return selectedPreSeller === "all" || d.displayName === selectedPreSeller;
          }
          return d.userId === profile?.id;
        })
        .reduce((acc, d) => acc + (d.salesCompleted || 0), 0)) + getMeetingsInStageCount("sales") 
    },
  ];

  function getMeetingsInStageCount(stageId: string) {
    const stageMap: Record<string, FunnelStage> = {
        appointments: "appointment",
        visits: "visit",
        negotiations: "negotiation",
        sales: "sale"
    };
    const targetStage = stageMap[stageId];
    return meetings.filter(m => {
        const matchesSeller = selectedPreSeller === "all" || m.preSeller === selectedPreSeller;
        
        // Se não for admin, só vê os seus próprios agendamentos no contador
        const isOwner = m.preSeller === profile?.displayName;
        if (!isAdmin && !isOwner) return false;
        if (isAdmin && !matchesSeller) return false;

        // Para Agendamentos, contamos TODOS os agendamentos no período
        if (stageId === "appointments") {
            return true;
        }
        
        // Para Visitas, contamos apenas quem tem status "compareceu"
        if (stageId === "visits") {
            return m.status === "compareceu" || m.status === "visita_realizada" as any;
        }

        if (stageId === "negotiations") {
            return m.status === "em_negociacao" as any;
        }

        if (stageId === "sales") {
            return m.status === "venda_concluida" as any;
        }

        return m.funnelStage === targetStage;
    }).length;
  }

  const handleStageMove = async (meetingId: string, nextStage: FunnelStage) => {
    try {
      await updateFunnelStage(meetingId, nextStage);
      toast.success("Lead movido no funil!");
      loadData();
    } catch (err) {
      toast.error("Erro ao mover lead.");
    }
  };

  const getMeetingsInStage = (stageId: string) => {
    const stageMap: Record<string, FunnelStage> = {
        appointments: "appointment",
        visits: "visit",
        negotiations: "negotiation",
        sales: "sale"
    };
    const targetStage = stageMap[stageId];
    if (!targetStage) return [];
    
    return meetings.filter(m => {
        let isCorrectStage = false;
        
        if (stageId === "appointments") {
            isCorrectStage = true; // Mostra todos os agendamentos nos detalhes
        } else if (stageId === "visits") {
            isCorrectStage = m.status === "compareceu" || m.status === "visita_realizada" as any; 
        } else if (stageId === "negotiations") {
            isCorrectStage = m.status === "em_negociacao" as any;
        } else if (stageId === "sales") {
            isCorrectStage = m.status === "venda_concluida" as any;
        } else {
            isCorrectStage = m.funnelStage === targetStage;
        }

        const matchesSeller = selectedPreSeller === "all" || m.preSeller === selectedPreSeller;
        
        if (!isAdmin) {
            return isCorrectStage && m.preSeller === profile?.displayName && matchesSeller;
        }
        return isCorrectStage && matchesSeller;
    });
  };

  const toggleStage = (id: string) => {
    setExpandedStage(expandedStage === id ? null : id);
  };

  return (
    <div className="card-meeting space-y-4">
      <div className="flex flex-col gap-4">
        <PeriodFilter 
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
        />
        
        {isAdmin && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Search className="w-3 h-3" /> Filtrar por pré-vendedor
            </label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={selectedPreSeller === "all" ? "default" : "outline"}
                onClick={() => setSelectedPreSeller("all")}
                className="h-8 text-xs px-2.5"
              >
                Todos
              </Button>
              {preSellers.map((ps) => (
                <Button
                  key={ps.id}
                  size="sm"
                  variant={selectedPreSeller === ps.displayName ? "default" : "outline"}
                  onClick={() => setSelectedPreSeller(ps.displayName)}
                  className="h-8 text-xs px-2.5"
                >
                  {ps.displayName}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <h2 className="font-display font-bold text-lg text-primary">Consolidado</h2>
        <span className="text-xs text-muted-foreground">
            {period === 'daily' ? selectedDate.split("-").reverse().join("/") : 'Período Selecionado'}
        </span>
      </div>

      {/* Funnel Visual */}
      <div className="flex flex-col items-center gap-1.5 py-4">
        {stages.map((stage, idx) => {
          if (stage.id === "sales" && !isAdmin) return null;
          
          const width = 100 - (idx * 6);
          const isExpanded = expandedStage === stage.id;

          return (
            <div 
              key={stage.id}
              onClick={() => toggleStage(stage.id)}
              className={`
                group relative cursor-pointer transition-all duration-300 ease-out
                flex items-center justify-between px-6 py-3.5 rounded-xl text-white font-bold
                shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)]
                hover:-translate-y-0.5 active:scale-[0.98]
                ${stage.color}
                ${isExpanded ? 'ring-2 ring-offset-2 ring-offset-background ring-primary/20 scale-[1.02] z-10' : ''}
              `}
              style={{ 
                width: `${width}%`, 
                minWidth: '220px',
                background: `linear-gradient(135deg, ${getHexForColor(stage.color)}, ${getDarkerHex(stage.color)})`
              }}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                  <stage.icon className="w-5 h-5" />
                </div>
                <span className="text-sm md:text-base tracking-tight truncate">{stage.label}</span>
              </div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="text-xl md:text-2xl font-black font-display tabular-nums">
                  <AnimatedCounter value={stage.value} />
                </div>
                {isExpanded ? 
                  <ChevronUp className="w-5 h-5 opacity-70" /> : 
                  <ChevronDown className="w-5 h-5 opacity-70 group-hover:translate-y-0.5 transition-transform" />
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Stage Data */}
      {expandedStage && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
          <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
             {stages.find(s => s.id === expandedStage)?.label} - Detalhes
          </h3>

          {expandedStage === "capture" && isAdmin && (
            <div className="space-y-3">
              <Label>Total de leads captados (Data: {selectedDate.split("-").reverse().join("/")})</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  value={localLeadsCaptured !== null ? (localLeadsCaptured === 0 ? '' : localLeadsCaptured) : (tempLeads === 0 ? '' : tempLeads)} 
                  placeholder="0"
                  onChange={(e) => setLocalLeadsCaptured(parseInt(e.target.value) || 0)}
                  className="h-10"
                />
                <Button onClick={async () => {
                    await handleSaveTotalLeads();
                    setLocalLeadsCaptured(null);
                }}>Salvar</Button>
              </div>
            </div>
          )}

          {expandedStage === "capture" && period !== "daily" && !isAdmin && (
            <p className="text-sm text-center text-muted-foreground">O total captado no período é a soma dos valores diários.</p>
          )}

          {expandedStage !== "capture" && (
            <div className="space-y-4">
              {/* Detailed Real Records View */}
              <div className="grid gap-3">
                {expandedStage === "appointments" && (
                  meetings
                    .filter(m => selectedPreSeller === "all" || m.preSeller === selectedPreSeller)
                    .filter(m => !isAdmin ? m.preSeller === profile?.displayName : true)
                    .map(m => (
                      <div key={m.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-primary">{m.leadName}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            m.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            m.status === 'compareceu' ? 'bg-emerald-100 text-emerald-700' :
                            m.status === 'nao_compareceu' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {m.status === 'pending' ? 'Agendado' : m.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary/60" /> {m.date.split("-").reverse().join("/")}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary/60" /> {m.time}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-primary/60" /> {m.preSeller}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {m.meetingType === 'presencial' ? <MapPin className="w-3.5 h-3.5 text-primary/60" /> : <div className="w-3.5 h-3.5 flex items-center justify-center text-primary/60">💻</div>} {m.meetingType === 'presencial' ? 'Presencial' : 'Online'}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Target className="w-3.5 h-3.5 text-primary/60" /> {m.trigger || 'Não informado'}
                          </div>
                          {m.city && (
                            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                              <MapPin className="w-3.5 h-3.5 text-primary/60" /> {m.city}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}

                {expandedStage === "calls" && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs uppercase tracking-wider opacity-70">Registros de Ligações:</Label>
                      {!isAddingCall && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setIsAddingCall(true)}>
                          <Plus className="w-3.5 h-3.5" /> Registrar Ligação
                        </Button>
                      )}
                    </div>

                    {isAddingCall && (
                      <div className="bg-card p-4 rounded-xl border border-primary/20 shadow-md mb-4 flex flex-col gap-3 animate-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nome do Lead</Label>
                          <Input size="sm" value={newCall.leadName} onChange={e => setNewCall({...newCall, leadName: e.target.value})} placeholder="Ex: Maria Silva" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Resultado da Ligação</Label>
                          <Select value={newCall.result} onValueChange={v => setNewCall({...newCall, result: v})}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Não atendeu">Não atendeu</SelectItem>
                              <SelectItem value="Sem interesse">Sem interesse</SelectItem>
                              <SelectItem value="Agendado">Agendado</SelectItem>
                              <SelectItem value="Retornar depois">Retornar depois</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="flex-1 h-8" onClick={async () => {
                            if (!newCall.leadName) return toast.error("Informe o nome do lead");
                            await addCall({
                              leadName: newCall.leadName,
                              result: newCall.result,
                              userId: profile?.id || '',
                              callTime: new Date().toISOString()
                            });
                            toast.success("Ligação registrada!");
                            setIsAddingCall(false);
                            setNewCall({ leadName: '', result: 'Não atendeu' });
                            loadData();
                          }}>Salvar</Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsAddingCall(false)}>Cancelar</Button>
                        </div>
                      </div>
                    )}

                    {calls
                      .filter(c => selectedPreSeller === "all" || c.userDisplayName === selectedPreSeller)
                      .filter(c => !isAdmin ? c.userId === profile?.id : true)
                      .map(c => (
                        <div key={c.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-primary">{c.leadName}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold uppercase tracking-wider">
                              {c.result}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {c.userDisplayName}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {new Date(c.callTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      ))}
                  </>
                )}

                {expandedStage === "visits" && (
                  meetings
                    .filter(m => m.status === 'compareceu' || m.status === 'visita_realizada')
                    .filter(m => selectedPreSeller === "all" || m.preSeller === selectedPreSeller)
                    .filter(m => !isAdmin ? m.preSeller === profile?.displayName : true)
                    .map(m => (
                      <div key={m.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-primary">{m.leadName}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider">
                            Compareceu
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary/60" /> {m.date.split("-").reverse().join("/")}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary/60" /> {m.time}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Users className="w-3.5 h-3.5 text-primary/60" /> Consultor: {m.consultant || 'Não informado'}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Target className="w-3.5 h-3.5 text-primary/60" /> {m.trigger || 'Não informado'}
                          </div>
                        </div>
                      </div>
                    ))
                )}

                {expandedStage === "negotiations" && (
                  meetings
                    .filter(m => m.status === 'em_negociacao')
                    .filter(m => selectedPreSeller === "all" || m.preSeller === selectedPreSeller)
                    .filter(m => !isAdmin ? m.preSeller === profile?.displayName : true)
                    .map(m => (
                      <div key={m.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-primary">{m.leadName}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">
                            Negociação
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-primary/60" /> {m.consultant}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <TrendingUp className="w-3.5 h-3.5 text-primary/60" /> {m.downPayment || 'R$ -'}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                            <Target className="w-3.5 h-3.5 text-primary/60" /> {m.trigger}
                          </div>
                        </div>
                      </div>
                    ))
                )}

                {expandedStage === "sales" && (
                  meetings
                    .filter(m => m.status === 'venda_concluida')
                    .filter(m => selectedPreSeller === "all" || m.preSeller === selectedPreSeller)
                    .filter(m => !isAdmin ? m.preSeller === profile?.displayName : true)
                    .map(m => (
                      <div key={m.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-primary">{m.leadName}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold uppercase tracking-wider">
                            Venda
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary/60" /> {m.date.split("-").reverse().join("/")}
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-primary/60" /> {m.consultant}
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-emerald-600 col-span-2">
                            <ShoppingCart className="w-3.5 h-3.5" /> Valor: {m.downPayment || 'R$ -'}
                          </div>
                        </div>
                      </div>
                    ))
                )}

                {/* Distribution view - remains manual for ADM or display for others */}
                {expandedStage === "distribution" && (
                  <div className="space-y-3">
                    {isAdmin ? (
                      preSellers.map(ps => {
                        const dist = (data?.distribution || []).find(d => d.userId === ps.id);
                        const val = dist?.leadsReceived || 0;
                        return (
                          <div key={ps.id} className="flex items-center justify-between gap-4 p-2 bg-card rounded-lg border border-border/50">
                            <span className="text-sm font-medium truncate flex-1">{ps.displayName}</span>
                            {period === "daily" ? (
                              <Input 
                                type="number" 
                                className="w-20 h-8 text-right" 
                                defaultValue={val || ''}
                                key={`dist-${ps.id}-${val}-${selectedDate}`}
                                placeholder="0"
                                onBlur={(e) => handleUpdateMetric(ps.id, "leadsReceived", parseInt(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateMetric(ps.id, "leadsReceived", parseInt((e.target as HTMLInputElement).value) || 0);
                                  }
                                }}
                              />
                            ) : (
                              <span className="font-bold text-primary">{val}</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <span className="text-sm font-semibold">Leads Recebidos no período:</span>
                        <span className="text-xl font-black text-primary">
                          {(data?.distribution.find(d => d.userId === profile?.id))?.leadsReceived || 0}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Fallback empty message */}
                {expandedStage !== "capture" && expandedStage !== "distribution" && 
                  ((expandedStage === "appointments" && meetings.length === 0) ||
                   (expandedStage === "calls" && calls.length === 0 && !isAddingCall) ||
                   (expandedStage === "visits" && meetings.filter(m => m.status === 'compareceu' || m.status === 'visita_realizada').length === 0) ||
                   (expandedStage === "negotiations" && meetings.filter(m => m.status === 'em_negociacao').length === 0) ||
                   (expandedStage === "sales" && meetings.filter(m => m.status === 'venda_concluida').length === 0)) && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum registro encontrado para este período.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {expandedStage === "capture" && !isAdmin && (
            <p className="text-sm text-muted-foreground text-center">Apenas administradores podem ver/editar o total captado.</p>
          )}
          {expandedStage === "sales" && !isAdmin && (
            <p className="text-sm text-muted-foreground text-center">Acesso restrito a administradores.</p>
          )}
        </div>
      )}
    </div>
  );
}
