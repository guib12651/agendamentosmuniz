import { useState, useEffect } from "react";
import { getFunnelData, getFunnelDataRange, saveFunnelDay, saveFunnelDistribution, SalesFunnelData } from "@/lib/funnelStore";
import { updateFunnelStage, getMeetings } from "@/lib/store";
import { Meeting, FunnelStage } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Filter, Users, Phone, Calendar, MapPin, Handshake, ShoppingCart, Target } from "lucide-react";

import PeriodFilter, { PeriodType, getDateRange } from "./PeriodFilter";

export default function SalesFunnel({ date: initialDate }: { date: string }) {
  const { isAdmin, profile } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [period, setPeriod] = useState<PeriodType>("daily");
  const [customStart, setCustomStart] = useState(initialDate);
  const [customEnd, setCustomEnd] = useState(initialDate);

  const [data, setData] = useState<SalesFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLeads, setEditingLeads] = useState(false);
  const [tempLeads, setTempLeads] = useState(0);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [preSellers, setPreSellers] = useState<{ id: string; displayName: string }[]>([]);

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
      const [result, m] = await Promise.all([
        getFunnelData(date),
        getMeetings()
      ]);
      setData(result);
      // Filtramos apenas reuniões daquela data para o funil diário
      setMeetings(m.filter(item => item.date === date));
      if (result) setTempLeads(result.totalLeadsCaptured);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Inscrição em tempo real para atualizações no funil
    const channel = supabase
      .channel("realtime-funnel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_funnel_days" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_funnel_distribution" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

  const handleSaveTotalLeads = async () => {
    try {
      await saveFunnelDay(date, tempLeads);
      toast.success("Total de leads captados atualizado!");
      setEditingLeads(false);
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleUpdateMetric = async (userId: string, field: string, value: number) => {
    if (!data?.id) {
        // Se não existir o dia, cria primeiro
        const day = await saveFunnelDay(date, 0);
        await saveFunnelDistribution(day.id, userId, { [field]: value });
    } else {
        await saveFunnelDistribution(data.id, userId, { [field]: value });
    }
    loadData();
  };

  const stages = [
    { 
      id: "capture", 
      label: "Captação", 
      color: "bg-blue-500", 
      icon: Target, 
      value: (expandedStage === "capture" && isAdmin) ? tempLeads : (data?.totalLeadsCaptured || 0) 
    },
    { id: "distribution", label: "Distribuição", color: "bg-indigo-500", icon: Users, value: data?.distribution.reduce((acc, d) => acc + d.leadsReceived, 0) || 0 },
    { id: "calls", label: "Ligações", color: "bg-purple-500", icon: Phone, value: data?.distribution.reduce((acc, d) => acc + d.callsMade, 0) || 0 },
    { id: "appointments", label: "Agendamentos", color: "bg-amber-500", icon: Calendar, value: data?.distribution.reduce((acc, d) => acc + d.appointmentsMade, 0) || 0 },
    { id: "visits", label: "Visitas", color: "bg-orange-500", icon: MapPin, value: data?.distribution.reduce((acc, d) => acc + d.visitsCompleted, 0) || 0 },
    { id: "negotiations", label: "Negociações", color: "bg-emerald-500", icon: Handshake, value: data?.distribution.reduce((acc, d) => acc + d.negotiationsStarted, 0) || 0 },
    { id: "sales", label: "Vendas", color: "bg-rose-600", icon: ShoppingCart, value: data?.distribution.reduce((acc, d) => acc + d.salesCompleted, 0) || meetings.filter(m => m.funnelStage === 'sale').length },
  ];

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
        const isCorrectStage = m.funnelStage === targetStage;
        if (!isAdmin) {
            return isCorrectStage && m.preSeller === profile?.displayName;
        }
        return isCorrectStage;
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
              <Label>Total de leads captados no dia</Label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  value={tempLeads} 
                  onChange={(e) => setTempLeads(parseInt(e.target.value) || 0)}
                  className="h-10"
                />
                <Button onClick={handleSaveTotalLeads}>Salvar</Button>
              </div>
            </div>
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

              {isAdmin ? (
                preSellers.map(ps => {
                    const dist = data?.distribution.find(d => d.userId === ps.id);
                    const getVal = () => {
                        if (expandedStage === "distribution") return dist?.leadsReceived || 0;
                        if (expandedStage === "calls") return dist?.callsMade || 0;
                        if (expandedStage === "appointments") return dist?.appointmentsMade || 0;
                        if (expandedStage === "visits") return dist?.visitsCompleted || 0;
                        if (expandedStage === "negotiations") return dist?.negotiationsStarted || 0;
                        if (expandedStage === "sales") return dist?.salesCompleted || 0;
                        return 0;
                    };
                    const fieldMap: any = {
                        distribution: "leadsReceived",
                        calls: "callsMade",
                        appointments: "appointmentsMade",
                        visits: "visitsCompleted",
                        negotiations: "negotiationsStarted",
                        sales: "salesCompleted"
                    };

                    return (
                        <div key={ps.id} className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium truncate flex-1">{ps.displayName}</span>
                            {period === "daily" ? (
                                <Input 
                                    type="number" 
                                    className="w-20 h-8 text-right" 
                                    value={getVal()} 
                                    onChange={(e) => handleUpdateMetric(ps.id, fieldMap[expandedStage], parseInt(e.target.value) || 0)}
                                />
                            ) : (
                                <span className="font-bold text-primary">{getVal()}</span>
                            )}
                        </div>
                    );
                })
              ) : (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Suas métricas para hoje:</p>
                    {(() => {
                        const myDist = data?.distribution.find(d => d.userId === profile?.id);
                        const fieldMap: any = {
                            distribution: "leadsReceived",
                            calls: "callsMade",
                            appointments: "appointmentsMade",
                            visits: "visitsCompleted",
                            negotiations: "negotiationsStarted"
                        };
                        const getVal = () => {
                            if (expandedStage === "distribution") return myDist?.leadsReceived || 0;
                            if (expandedStage === "calls") return myDist?.callsMade || 0;
                            if (expandedStage === "appointments") return myDist?.appointmentsMade || 0;
                            if (expandedStage === "visits") return myDist?.visitsCompleted || 0;
                            if (expandedStage === "negotiations") return myDist?.negotiationsStarted || 0;
                            return 0;
                        };
                        
                        if (expandedStage === "distribution") return (
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Leads Recebidos</span>
                                <span className="font-bold text-primary">{getVal()}</span>
                            </div>
                        );

                        return (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm">Quantidade</span>
                                {period === "daily" ? (
                                    <Input 
                                        type="number" 
                                        className="w-20 h-9 text-right" 
                                        value={getVal()} 
                                        onChange={(e) => handleUpdateMetric(profile?.id || "", fieldMap[expandedStage], parseInt(e.target.value) || 0)}
                                    />
                                ) : (
                                    <span className="font-bold text-primary">{getVal()}</span>
                                )}
                            </div>
                        );
                    })()}
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
