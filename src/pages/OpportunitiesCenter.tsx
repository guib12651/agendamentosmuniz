import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Opportunity, OpportunityStatus } from "@/lib/types";
import { Target, Upload, Loader2, LayoutGrid, Users as UsersIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { subDays, startOfDay, isWithinInterval, parseISO } from "date-fns";
import { addCall } from "@/lib/store";

// Components
import OpportunityStats from "@/components/opportunities/OpportunityStats";
import OpportunityFilters from "@/components/opportunities/OpportunityFilters";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import ImportOpportunitiesModal from "@/components/opportunities/ImportOpportunitiesModal";
import ScheduleModal from "@/components/opportunities/ScheduleModal";

export default function OpportunitiesCenter() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOpportunities();

    const channel = supabase
      .channel('realtime-opportunities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => fetchOpportunities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOpportunities = async () => {
    let query = supabase
      .from("opportunities")
      .select("*, profiles!opportunities_assigned_user_id_fkey(display_name)")
      .order("created_at", { ascending: false });

    // If not admin, filter by assigned_user_id (though RLS already handles this, it's good practice)
    if (!isAdmin && profile?.id) {
      query = query.eq("assigned_user_id", profile.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar oportunidades:", error);
      toast.error("Erro ao carregar dados.");
    } else {
      setOpportunities(data as any[]);
    }
    setIsLoading(false);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const opp = opportunities.find(o => o.id === id);
    if (!opp) return;

    try {
      const { error } = await supabase
        .from("opportunities")
        .update({ 
          status, 
          contact_attempts: opp.contact_attempts + 1,
          last_contact_date: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      // Registrar chamada na Central Operacional se for Atendeu ou Não Atendeu
      if (status === "contacted" || status === "no_answer") {
        await addCall({
          leadName: opp.lead_name,
          userId: profile?.id || "",
          callTime: new Date().toISOString(),
          result: status === "contacted" ? "Atendeu" : "Não Atendeu"
        });
      }

      toast.success("Status atualizado!");
      fetchOpportunities();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta oportunidade?")) return;

    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir oportunidade.");
    } else {
      toast.success("Oportunidade excluída.");
      fetchOpportunities();
    }
  };

  const handleConfirmSchedule = async (id: string, date: string, time: string, notes: string) => {
    const opp = opportunities.find(o => o.id === id);
    if (!opp) return;

    try {
      // 1. Update opportunity status
      const { error: oppError } = await supabase
        .from("opportunities")
        .update({ 
          status: "scheduled",
          contact_attempts: opp.contact_attempts + 1,
          last_contact_date: new Date().toISOString(),
          notes: notes ? (opp.notes ? opp.notes + "\n" + notes : notes) : opp.notes
        })
        .eq("id", id);

      if (oppError) throw oppError;

      // 2. Create meeting in Agenda (optional but requested)
      const { error: meetingError } = await supabase
        .from("meetings")
        .insert({
          lead_name: opp.lead_name,
          phone: opp.phone,
          date,
          time,
          pre_seller: profile?.displayName || "Desconhecido",
          consultant: "A definir",
          status: "pending",
          marking_type: "lead_quente",
          meeting_type: "presencial",
          trigger: opp.opportunity_type?.toLowerCase().includes("imóvel") ? "imovel" : "carro",
          city: opp.city,
          notes: `Agendado via Central de Oportunidades. Obs: ${notes}`,
          user_id: profile?.id,
          down_payment: opp.available_down_payment,
          installment: opp.desired_installment,
          restriction: "clean"
        });

      if (meetingError) throw meetingError;

      toast.success("Reunião agendada com sucesso!");
      fetchOpportunities();
    } catch (error) {
      console.error("Erro ao agendar:", error);
      toast.error("Erro ao realizar agendamento.");
    }
  };

  const cities = useMemo(() => {
    const uniqueCities = Array.from(new Set(opportunities.map(o => o.city).filter(Boolean)));
    return uniqueCities.sort();
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const matchStatus = filterStatus === "all" || (filterStatus === "pending" ? (opp.status === "pending" || opp.status === "contacted" || opp.status === "no_answer") : opp.status === filterStatus);
      const matchType = filterType === "all" || (opp.opportunity_type || "").toLowerCase().includes(filterType.toLowerCase());
      const matchCity = filterCity === "all" || opp.city === filterCity;
      
      const matchSearch = !searchTerm || 
        opp.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.phone.includes(searchTerm) ||
        (opp.city || "").toLowerCase().includes(searchTerm.toLowerCase());

      let matchPeriod = true;
      const now = new Date();
      const oppDate = new Date(opp.created_at);

      if (filterPeriod === "today") {
        matchPeriod = oppDate >= startOfDay(now);
      } else if (filterPeriod === "yesterday") {
        const yesterday = subDays(now, 1);
        matchPeriod = oppDate >= startOfDay(yesterday) && oppDate < startOfDay(now);
      } else if (filterPeriod === "7days") {
        matchPeriod = oppDate >= subDays(now, 7);
      } else if (filterPeriod === "30days") {
        matchPeriod = oppDate >= subDays(now, 30);
      }

      return matchStatus && matchType && matchCity && matchSearch && matchPeriod;
    });
  }, [opportunities, filterStatus, filterType, filterCity, searchTerm, filterPeriod]);

  const stats = useMemo(() => {
    return {
      pending: opportunities.filter(o => o.status === "pending").length,
      contacted: opportunities.filter(o => o.status === "contacted").length,
      no_answer: opportunities.filter(o => o.status === "no_answer").length,
      scheduled: opportunities.filter(o => o.status === "scheduled").length,
    };
  }, [opportunities]);

  const productivityData = useMemo(() => {
    if (!isAdmin) return [];
    
    const users: Record<string, any> = {};
    opportunities.forEach(opp => {
      const userName = opp.profiles?.display_name || "Desconhecido";
      if (!users[userName]) {
        users[userName] = { name: userName, pending: 0, contacted: 0, no_answer: 0, scheduled: 0 };
      }
      if (opp.status in users[userName]) {
        users[userName][opp.status]++;
      } else if (opp.status === "pending") {
        users[userName].pending++;
      } else if (opp.status === "contacted") {
        users[userName].contacted++;
      } else if (opp.status === "no_answer") {
        users[userName].no_answer++;
      } else if (opp.status === "scheduled") {
        users[userName].scheduled++;
      }
    });
    
    return Object.values(users);
  }, [opportunities, isAdmin]);

  return (
    <div className="min-h-screen bg-muted/20 pb-10">
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="container py-4 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="mr-1"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <div className="p-2 rounded-lg bg-primary text-white">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary leading-tight">Central de Oportunidades</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Gerencie leads e acompanhe o fluxo de vendas em tempo real.</p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsImportOpen(true)} className="flex items-center gap-2">
              <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Importar Oportunidades</span>
              <span className="sm:hidden">Importar</span>
            </Button>
          )}
        </div>
      </header>

      <main className="container mt-6 px-4 sm:px-6 space-y-6">
        <OpportunityStats 
          stats={stats} 
          onFilterStatus={setFilterStatus} 
          activeFilter={filterStatus}
        />

        <Tabs defaultValue="list" className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> Leads
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="productivity" className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" /> Produtividade
                </TabsTrigger>
              )}
            </TabsList>
            
            <div className="w-full sm:w-auto">
              <OpportunityFilters 
                status={filterStatus} onStatusChange={setFilterStatus}
                type={filterType} onTypeChange={setFilterType}
                city={filterCity} onCityChange={setFilterCity}
                period={filterPeriod} onPeriodChange={setFilterPeriod}
                search={searchTerm} onSearchChange={setSearchTerm}
                cities={cities}
              />
            </div>
          </div>

          <TabsContent value="list" className="space-y-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground">Carregando oportunidades...</p>
              </div>
            ) : filteredOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOpportunities.map((opp) => (
                  <OpportunityCard 
                    key={opp.id} 
                    opportunity={opp} 
                    onUpdateStatus={handleUpdateStatus}
                    onSchedule={(o) => { setSelectedOpportunity(o); setIsScheduleOpen(true); }}
                    onDelete={handleDeleteOpportunity}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-card rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">Nenhuma oportunidade encontrada com os filtros selecionados.</p>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="productivity">
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Pré-vendedor</th>
                      <th className="px-4 py-3 text-center">🟡 Pendentes</th>
                      <th className="px-4 py-3 text-center">🟢 Atenderam</th>
                      <th className="px-4 py-3 text-center">🔴 Não Atenderam</th>
                      <th className="px-4 py-3 text-center">📅 Agendados</th>
                      <th className="px-4 py-3 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productivityData.map((user) => (
                      <tr key={user.name} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-center">{user.pending}</td>
                        <td className="px-4 py-3 text-center">{user.contacted}</td>
                        <td className="px-4 py-3 text-center">{user.no_answer}</td>
                        <td className="px-4 py-3 text-center">{user.scheduled}</td>
                        <td className="px-4 py-3 text-center font-bold">
                          {user.pending + user.contacted + user.no_answer + user.scheduled}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <ImportOpportunitiesModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchOpportunities}
      />

      <ScheduleModal 
        isOpen={isScheduleOpen}
        opportunity={selectedOpportunity}
        onClose={() => setIsScheduleOpen(false)}
        onConfirm={handleConfirmSchedule}
      />
    </div>
  );
}
