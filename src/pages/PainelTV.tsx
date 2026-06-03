import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Users, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Handshake, 
  ShoppingCart, 
  Maximize2, 
  Minimize2,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { formatPeriodLabel, usePeriodGoal } from "@/hooks/usePeriodGoal";
import logo from "@/assets/logo_muniz.png";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getMeetings, getCalls } from "@/lib/store";
import { Meeting } from "@/lib/types";

import { Button } from "@/components/ui/button";
const formatBRL = (v: number) =>

  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function PainelTV() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { goal, totalGoal, totalRealized } = usePeriodGoal();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Data states
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [dailyStats, setDailyStats] = useState({
    leads: 0,
    distributed: 0,
    calls: 0,
    appointments: 0,
    present: 0,
    absent: 0,
    negotiating: 0,
    sales: 0
  });
  const [sellerRanking, setSellerRanking] = useState<any[]>([]);
  const [preSellerRanking, setPreSellerRanking] = useState<any[]>([]);
  const [latestSales, setLatestSales] = useState<any[]>([]);
  const [showSaleCelebration, setShowSaleCelebration] = useState<any>(null);
  const [showMeetingCelebration, setShowMeetingCelebration] = useState<any>(null);
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const startOfLocalDay = new Date(today + "T00:00:00").toISOString();
    const endOfLocalDay = new Date(today + "T23:59:59").toISOString();
    
    try {
      // 1. Fetch Meetings
      const m = await getMeetings(today, today);
      setMeetings(m);

      // 2. Daily Stats
      const stats = {
        leads: 0,
        distributed: 0,
        calls: 0,
        appointments: m.length,
        present: m.filter(x => x.status === 'compareceu' || x.status === 'visita_realizada').length,
        absent: m.filter(x => x.status === 'nao_compareceu').length,
        negotiating: m.filter(x => x.status === 'em_negociacao').length,
        sales: m.filter(x => x.status === 'venda_concluida').length
      };

      // Fetch manual leads
      const { data: leadsData } = await supabase
        .from("operational_leads")
        .select("amount")
        .eq("date", today);
      stats.leads = (leadsData || []).reduce((acc, l) => acc + l.amount, 0);

      // Fetch distributed leads
      const { data: distData } = await supabase
        .from("leads_distribution")
        .select("amount")
        .eq("date", today);
      stats.distributed = (distData || []).reduce((acc, l) => acc + l.amount, 0);

      // Fetch manual daily calls
      const { data: callsData } = await supabase
        .from("daily_calls")
        .select("amount")
        .eq("date", today);
      const manualCalls = (callsData || []).reduce((acc, l) => acc + l.amount, 0);

      // Fetch automatic calls
      const individualCalls = await getCalls(startOfLocalDay, endOfLocalDay);
      stats.calls = manualCalls + individualCalls.length;

      setDailyStats(stats);

      // 3. Rankings (Month-to-date)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startISO = startOfMonth.toISOString().split("T")[0];
      
      const { data: monthMeetings } = await supabase
        .from("meetings")
        .select("*")
        .gte("date", startISO)
        .lte("date", today);

      if (monthMeetings) {
        // Seller Ranking
        const sellers: Record<string, number> = {};
        monthMeetings.filter(x => x.status === 'venda_concluida').forEach(x => {
          sellers[x.consultant] = (sellers[x.consultant] || 0) + 1;
        });
        const sRanking = Object.entries(sellers)
          .map(([name, sales]) => ({ name, sales }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);
        setSellerRanking(sRanking);

        // Pre-seller Ranking
        const preSellers: Record<string, any> = {};
        monthMeetings.forEach(x => {
          const name = x.pre_seller;
          if (!preSellers[name]) preSellers[name] = { name, appointments: 0, present: 0 };
          preSellers[name].appointments += 1;
          if (x.status === 'compareceu' || x.status === 'visita_realizada' || x.status === 'venda_concluida' || x.status === 'em_negociacao') {
            preSellers[name].present += 1;
          }
        });
        const psRanking = Object.values(preSellers)
          .filter((ps: any) => ps.name !== "AnaKesia")
          .map((ps: any) => ({
            ...ps,
            conversion: ps.appointments > 0 ? Math.round((ps.present / ps.appointments) * 100) : 0
          }))
          .sort((a, b) => b.appointments - a.appointments)
          .slice(0, 5);
        setPreSellerRanking(psRanking);
      }

      // 4. Latest Sales (Overall)
      const { data: salesData } = await supabase
        .from("meetings")
        .select("*")
        .eq("status", "venda_concluida")
        .order("updated_at", { ascending: false })
        .limit(5);
      
      if (salesData) {
        setLatestSales(salesData.map(s => ({
          seller: s.pre_seller, // Fallback if consultant is missing
          consultant: s.consultant,
          client: s.lead_name,
          value: s.down_payment || "N/A",
          time: s.time.slice(0, 5)
        })));
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error loading TV panel data:", err);
    }
  };

  useEffect(() => {
    loadData();
    
    // Realtime subscriptions
    console.log("Setting up real-time subscriptions for Painel TV...");
    const channel = supabase
      .channel('tv-panel-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, (payload) => {
        console.log("Meeting change detected:", payload.eventType, payload);
        loadData();
        
        // Meeting (Agendamento) celebration
        if (payload.eventType === 'INSERT') {
          const newMeeting = payload.new as any;
          console.log("New meeting inserted, showing celebration for:", newMeeting.pre_seller);
          setShowMeetingCelebration({
            preSeller: newMeeting.pre_seller || "Consultor",
            leadName: newMeeting.lead_name || "Cliente",
            time: newMeeting.time?.slice(0, 5) || "--:--"
          });
          
          // Play celebration sound
          const audio = new Audio('/sounds/celebration_v2.mp3');
          audio.play().catch(e => console.log("Audio play failed:", e));

          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#60a5fa', '#ffffff']
          });

          setTimeout(() => setShowMeetingCelebration(null), 7000);
        }
        
        // Sale celebration
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newMeeting = payload.new as any;
          const oldMeeting = payload.old as any;
          
          const isNewSale = newMeeting.status === 'venda_concluida' && (!oldMeeting || oldMeeting.status !== 'venda_concluida');
          
          if (isNewSale) {
            console.log("New sale detected, showing celebration for:", newMeeting.consultant || newMeeting.pre_seller);
            setShowSaleCelebration({
              seller: newMeeting.consultant || newMeeting.pre_seller || "Consultor",
              value: newMeeting.down_payment || "N/A"
            });

            // Play celebration sound
            const audio = new Audio('/sounds/celebration_v2.mp3');
            audio.play().catch(e => console.log("Audio play failed:", e));

            confetti({
              particleCount: 200,
              spread: 100,
              origin: { y: 0.6 },
              colors: ['#10b981', '#34d399', '#ffffff', '#fbbf24']
            });

            setTimeout(() => setShowSaleCelebration(null), 7000);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operational_leads' }, () => { console.log("Leads update"); loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_calls' }, () => { console.log("Calls update"); loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads_distribution' }, () => { console.log("Dist update"); loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'period_goals' }, () => { console.log("Goals update"); loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'period_goal_progress' }, () => { console.log("Progress update"); loadData(); })
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Goal celebration effect
  useEffect(() => {
    if (totalGoal > 0 && totalRealized >= totalGoal) {
      setShowGoalCelebration(true);
      const timer = setTimeout(() => setShowGoalCelebration(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [totalGoal, totalRealized]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const generalPct = totalGoal > 0 ? Math.min(100, (totalRealized / totalGoal) * 100) : 0;

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Acesso restrito.</div>;
  }

  return (
    <div className={cn(
      "min-h-screen bg-[#0a0a0b] text-white font-sans selection:bg-primary/30",
      isFullscreen && "p-0 overflow-hidden"
    )}>
      {/* Sale Celebration Overlay */}
      {showSaleCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-8 p-16 rounded-[40px] border-4 border-success/50 bg-success/10 shadow-[0_0_100px_rgba(16,185,129,0.4)] relative overflow-hidden max-w-4xl w-full mx-4">
            <div className="absolute inset-0 bg-gradient-to-b from-success/20 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center p-8 rounded-full bg-success/20 text-success mb-6 animate-bounce shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <Trophy className="size-24" />
              </div>
              <h2 className="text-6xl font-black tracking-tighter sm:text-8xl animate-pulse text-white mb-4 uppercase">
                Venda Confirmada!
              </h2>
              <div className="h-1 w-32 bg-success mx-auto mb-8 rounded-full" />
              <p className="text-4xl text-success font-black uppercase tracking-[0.3em] mb-2">{showSaleCelebration.seller}</p>
              <div className="text-7xl font-display font-black text-white drop-shadow-2xl mb-8">
                {showSaleCelebration.value}
              </div>
              <p className="text-3xl font-bold text-white/90 italic drop-shadow-md">🚀 Quebrando recordes!</p>
            </div>
          </div>
        </div>
      )}

      {showMeetingCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-8 p-16 rounded-[40px] border-4 border-blue-500/50 bg-blue-500/10 shadow-[0_0_100px_rgba(59,130,246,0.4)] relative overflow-hidden max-w-4xl w-full mx-4">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center p-8 rounded-full bg-blue-500/20 text-blue-400 mb-6 animate-bounce shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                <Calendar className="size-24" />
              </div>
              <h2 className="text-6xl font-black tracking-tighter sm:text-8xl animate-pulse text-white mb-4 uppercase">
                Novo Agendamento!
              </h2>
              <div className="h-1 w-32 bg-blue-500 mx-auto mb-8 rounded-full" />
              <p className="text-4xl text-blue-400 font-black uppercase tracking-[0.3em] mb-2">{showMeetingCelebration.preSeller}</p>
              <div className="text-5xl font-display font-black text-white drop-shadow-2xl mb-8">
                Cliente: {showMeetingCelebration.leadName}
              </div>
              <p className="text-3xl font-bold text-white/90 italic drop-shadow-md">🎯 Ótimo trabalho!</p>
            </div>
          </div>
        </div>
      )}

      {/* Goal Celebration Overlay */}
      {showGoalCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-6 p-12 rounded-3xl border-2 border-primary/30 bg-primary/5 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <div className="inline-flex items-center justify-center p-6 rounded-full bg-primary/20 text-primary mb-4">
              <Trophy className="size-20" />
            </div>
            <h2 className="text-6xl font-black tracking-tighter sm:text-8xl">🎯 META BATIDA</h2>
            <p className="text-3xl text-white font-semibold italic">Parabéns equipe!</p>
          </div>
        </div>
      )}

      <div className={cn("p-6 space-y-6", isFullscreen ? "h-screen flex flex-col justify-between" : "")}>
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/10 -ml-2"
            >
              <ArrowLeft className="size-6" />
            </Button>
            <img src={logo} alt="Muniz" className="h-12 w-12 rounded-xl object-contain bg-white/5 p-1" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">Muniz Consultorias</h1>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Painel Operacional</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-3xl font-display font-black tabular-nums">
                {currentTime.toLocaleTimeString('pt-BR')}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-right">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Última Atualização</div>
              <div className="text-sm font-bold tabular-nums">
                {lastUpdate.toLocaleTimeString('pt-BR')}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleFullscreen}
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
            </Button>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6 flex-1">
          {/* Left Column: Stats */}
          <div className="col-span-12 lg:col-span-8 space-y-6 flex flex-col">
            {/* Bloco 1: Meta do Mês */}
            <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#121214] to-[#0a0a0b] p-8 shadow-2xl">
              <div className="absolute top-0 right-0 p-8">
                <Trophy className="size-32 text-primary/5" />
              </div>
              <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Meta do Mês</h3>
                    <p className="text-lg font-medium text-muted-foreground">{goal ? formatPeriodLabel(goal.start_date, goal.end_date) : "Sem meta definida"}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-6xl font-display font-black text-white">{Math.round(generalPct)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Meta</p>
                    <p className="text-4xl font-display font-black text-white/90">{formatBRL(totalGoal)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Resultado</p>
                    <p className="text-4xl font-display font-black text-success">{formatBRL(totalRealized)}</p>
                  </div>
                </div>

                <div className="relative h-4 w-full rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    style={{ width: `${generalPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Middle Stats: Bloco 2 & 3 */}
            <div className="grid grid-cols-2 gap-6">
              {/* Bloco 2: Produção do Dia */}
              <div className="rounded-3xl border border-white/5 bg-[#121214] p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Produção do Dia</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <StatItem label="Leads Captados" value={dailyStats.leads} icon={<Users className="size-4" />} />
                  <StatItem label="Leads Distribuídos" value={dailyStats.distributed} icon={<Users className="size-4" />} />
                  <StatItem label="Ligações" value={dailyStats.calls} icon={<Phone className="size-4" />} />
                  <StatItem label="Agendamentos" value={dailyStats.appointments} icon={<Calendar className="size-4" />} />
                </div>
              </div>

              {/* Bloco 3: Resultado do Dia */}
              <div className="rounded-3xl border border-white/5 bg-[#121214] p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-success">Resultado do Dia</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <StatItem label="Compareceram" value={dailyStats.present} icon={<CheckCircle2 className="size-4" />} color="text-success" />
                  <StatItem label="Faltaram" value={dailyStats.absent} icon={<XCircle className="size-4" />} color="text-destructive" />
                  <StatItem label="Negociações" value={dailyStats.negotiating} icon={<Handshake className="size-4" />} color="text-blue-400" />
                  <StatItem label="Vendas" value={dailyStats.sales} icon={<ShoppingCart className="size-4" />} color="text-success" />
                </div>
              </div>
            </div>

            {/* Bloco 6: Últimas Vendas */}
            <div className="rounded-3xl border border-white/5 bg-[#121214] p-6 space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-5 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Últimas Vendas</h3>
                </div>
              </div>
              <div className="space-y-2">
                {latestSales.length > 0 ? latestSales.map((sale, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-success/10 flex items-center justify-center text-success font-black">
                        {sale.consultant?.charAt(0) || sale.seller?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{sale.consultant || sale.seller}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">Cliente: {sale.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-black text-success">{sale.value}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center justify-end gap-1">
                        <Clock className="size-3" /> {sale.time}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic py-10">
                    Aguardando registros de hoje...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Rankings */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Bloco 4: Ranking Vendedores */}
            <div className="rounded-3xl border border-white/5 bg-[#121214] p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Top Vendedores (Mês)</h3>
              </div>
              <div className="space-y-3">
                {sellerRanking.length > 0 ? sellerRanking.map((s, i) => (
                  <RankingItem 
                    key={i} 
                    position={i + 1} 
                    name={s.name} 
                    value={`${s.sales} vendas`} 
                    isTop3={i < 3}
                  />
                )) : <div className="text-center text-sm text-muted-foreground py-4 italic">Sem dados no mês</div>}
              </div>
            </div>

            {/* Bloco 5: Ranking Pré-Vendedores */}
            <div className="rounded-3xl border border-white/5 bg-[#121214] p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-purple-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Top Pré-Venda (Mês)</h3>
              </div>
              <div className="space-y-4">
                {preSellerRanking.length > 0 ? preSellerRanking.map((ps, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-muted-foreground w-4">{i + 1}º</span>
                        <span className="font-bold text-white">{ps.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-primary">{ps.conversion}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                      <span>{ps.appointments} Agends.</span>
                      <span className="text-right">{ps.present} Comps.</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${ps.conversion}%` }} 
                      />
                    </div>
                  </div>
                )) : <div className="text-center text-sm text-muted-foreground py-4 italic">Sem dados no mês</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, icon, color = "text-white/90" }: any) {
  return (
    <div className="space-y-1 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-3xl font-display font-black tabular-nums", color)}>{value}</p>
    </div>
  );
}

function RankingItem({ position, name, value, isTop3 }: any) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-2xl border transition-all",
      isTop3 ? "bg-amber-400/5 border-amber-400/10" : "bg-white/[0.02] border-white/[0.05]"
    )}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{isTop3 ? medals[position - 1] : `${position}º`}</span>
        <span className={cn("font-bold truncate max-w-[120px]", isTop3 ? "text-amber-400" : "text-white")}>{name}</span>
      </div>
      <span className="font-black text-white/90 tabular-nums">{value}</span>
    </div>
  );
}
