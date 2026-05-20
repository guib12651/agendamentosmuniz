import { useState, useEffect } from "react";
import { getFunnelDataRange, saveFunnelDay, saveFunnelDistribution, SalesFunnelData } from "@/lib/funnelStore";
import { updateFunnelStage, getMeetings } from "@/lib/store";
import { Meeting, FunnelStage } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Filter, Users, Phone, Calendar, MapPin, Handshake, ShoppingCart, Target, Search } from "lucide-react";

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
      
      const [result, m] = await Promise.all([
        getFunnelDataRange(range.start, range.end),
        getMeetings()
      ]);
      setData(result);
      // Filtramos reuniões no intervalo
      setMeetings(m.filter(item => item.date >= range.start && item.date <= range.end));
      
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
      value: (data?.distribution || [])
        .filter(d => {
          if (isAdmin) {
            return selectedPreSeller === "all" || d.displayName === selectedPreSeller;
          }
          return d.userId === profile?.id;
        })
        .reduce((acc, d) => acc + (d.callsMade || 0), 0) 
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
            return m.status === "compareceu";
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
            isCorrectStage = m.status === "compareceu"; // Mostra apenas quem compareceu nos detalhes de Visitas
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
      <div className="flex flex-col items-center gap-1">
        {stages.map((stage, idx) => {
          if (stage.id === "sales" && !isAdmin) return null;
          
          const width = 100 - (idx * 8);
          return (
            <div 
              key={stage.id}
              onClick={() => toggleStage(stage.id)}
              className={`
                relative cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]
                flex items-center justify-between px-4 py-3 rounded-md text-white font-bold shadow-sm
                ${stage.color}
              `}
              style={{ width: `${width}%`, minWidth: '200px' }}
            >
              <div className="flex items-center gap-2">
                <stage.icon className="w-4 h-4" />
                <span className="text-sm truncate">{stage.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{stage.value}</span>
                {expandedStage === stage.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
              {/* Seção de Listagem de Leads para a etapa atual */}
              {getMeetingsInStage(expandedStage).length > 0 && (
                <div className="space-y-3 mb-6">
                    <Label className="text-xs uppercase tracking-wider opacity-70">Leads nesta etapa:</Label>
                    <div className="grid gap-2">
                        {getMeetingsInStage(expandedStage).map(m => (
                            <div key={m.id} className="p-3 bg-card border border-border rounded-md flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sm">{m.leadName}</p>
                                        <p className="text-[10px] text-muted-foreground">{m.preSeller} • {m.time}</p>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                        {m.markingType === 'reagendamento' ? 'Reagendamento' : 'Novo'}
                                    </span>
                                </div>
                                
                                <div className="flex gap-1 mt-1">
                                    {expandedStage !== "visits" && (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 text-[10px] px-2 border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                                            onClick={() => handleStageMove(m.id, 'visit')}
                                        >
                                            Visita
                                        </Button>
                                    )}
                                    {expandedStage !== "negotiations" && (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 text-[10px] px-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                            onClick={() => handleStageMove(m.id, 'negotiation')}
                                        >
                                            Negociação
                                        </Button>
                                    )}
                                    {isAdmin && expandedStage !== "sales" && (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-7 text-[10px] px-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                                            onClick={() => handleStageMove(m.id, 'sale')}
                                        >
                                            Venda
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <hr className="border-border/50 my-4" />
                </div>
              )}

              {expandedStage !== "distribution" && !isAdmin && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Suas métricas para hoje:</p>
                    {(() => {
                        const myDist = data?.distribution.find(d => d.userId === profile?.id);
                        const fieldMap: any = {
                            calls: "callsMade",
                            appointments: "appointmentsMade",
                            visits: "visitsCompleted",
                            negotiations: "negotiationsStarted"
                        };
                        const getVal = () => {
                            if (expandedStage === "calls") return myDist?.callsMade || 0;
                            if (expandedStage === "appointments") return myDist?.appointmentsMade || 0;
                            if (expandedStage === "visits") return myDist?.visitsCompleted || 0;
                            if (expandedStage === "negotiations") return myDist?.negotiationsStarted || 0;
                            return 0;
                        };
                        
                        return (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm">Quantidade</span>
                                {period === "daily" ? (
                                    <Input 
                                        type="number" 
                                        className="w-20 h-9 text-right" 
                                        defaultValue={getVal() || ''}
                                        key={`${profile?.id}-${expandedStage}-${getVal()}-${selectedDate}`}
                                        placeholder="0"
                                        onBlur={(e) => handleUpdateMetric(profile?.id || '', fieldMap[expandedStage], parseInt(e.target.value) || 0)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleUpdateMetric(profile?.id || '', fieldMap[expandedStage], parseInt((e.target as HTMLInputElement).value) || 0);
                                            }
                                        }}
                                    />
                                ) : (
                                    <span className="font-bold text-primary">{getVal()}</span>
                                )}
                            </div>
                        );
                    })()}
                </div>
              )}

              {isAdmin && (
                preSellers.map(ps => {
                    const dist = (data?.distribution || []).find(d => d.userId === ps.id);
                    const fieldMap: any = {
                        distribution: "leadsReceived",
                        calls: "callsMade",
                        appointments: "appointmentsMade",
                        visits: "visitsCompleted",
                        negotiations: "negotiationsStarted",
                        sales: "salesCompleted"
                    };
                    const getVal = () => {
                        if (expandedStage === "distribution") return dist?.leadsReceived || 0;
                        if (expandedStage === "calls") return dist?.callsMade || 0;
                        if (expandedStage === "appointments") return dist?.appointmentsMade || 0;
                        if (expandedStage === "visits") return dist?.visitsCompleted || 0;
                        if (expandedStage === "negotiations") return dist?.negotiationsStarted || 0;
                        if (expandedStage === "sales") return dist?.salesCompleted || 0;
                        return 0;
                    };

                    return (
                        <div key={ps.id} className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium truncate flex-1">{ps.displayName}</span>
                            {period === "daily" ? (
                                <Input 
                                    type="number" 
                                    className="w-20 h-8 text-right" 
                                    defaultValue={getVal() || ''}
                                    key={`${ps.id}-${expandedStage}-${getVal()}-${selectedDate}`}
                                    placeholder="0"
                                    onBlur={(e) => handleUpdateMetric(ps.id, fieldMap[expandedStage], parseInt(e.target.value) || 0)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleUpdateMetric(ps.id, fieldMap[expandedStage], parseInt((e.target as HTMLInputElement).value) || 0);
                                        }
                                    }}
                                />
                            ) : (
                                <span className="font-bold text-primary">{getVal()}</span>
                            )}
                        </div>
                    );
                })
              )}

              {/* Se for apenas pré-vendedor e estiver na aba de distribuição, mostrar apenas como leitura */}
              {!isAdmin && expandedStage === "distribution" && (
                <div className="flex items-center justify-between">
                    <span className="text-sm">Leads Recebidos</span>
                    <span className="font-bold text-primary">
                        {(data?.distribution.find(d => d.userId === profile?.id))?.leadsReceived || 0}
                    </span>
                </div>
              )}

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
