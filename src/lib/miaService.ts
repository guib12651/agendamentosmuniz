import { supabase } from "@/integrations/supabase/client";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subWeeks, 
  subMonths,
  parseISO,
  startOfDay,
  endOfDay
} from "date-fns";

export type MiaDomain = 
  | "OPERATION"
  | "APPOINTMENTS"
  | "ATTENDANCE"
  | "SALES"
  | "NEGOTIATIONS"
  | "OPPORTUNITIES"
  | "CALLS"
  | "GOALS"
  | "QUOTAS"
  | "BIDS"
  | "USERS"
  | "BOTTLENECKS"
  | "CUSTOMER_JOURNEY"
  | "PRODUCTION_SALES"
  | "UNKNOWN";

export const detectDomain = (query: string): MiaDomain => {
  const q = query.toLowerCase();
  
  if (q.includes("ranking")) return "SALES";
  if (q.includes("negociações abertas")) return "NEGOTIATIONS";
  if (q.includes("oportunidades pendentes")) return "OPPORTUNITIES";
  if (q.includes("meta")) return "GOALS";
  if (q.includes("gargalos")) return "BOTTLENECKS";
  if (q.includes("melhor usuário")) return "USERS";
  if (q.includes("clientes para recuperar")) return "ATTENDANCE";
  if (q.includes("cotas e lances")) return "QUOTAS";
  if (q.includes("linha do tempo")) return "APPOINTMENTS";
  if (q.includes("resumo de hoje")) return "OPERATION";
  if (q.includes("resumo da semana")) return "OPERATION";
  if (q.includes("vendas do mês")) return "SALES";
  if (q.includes("faltas de hoje")) return "ATTENDANCE";

  if (q.includes("venda")) return "SALES";
  if (q.includes("falta")) return "ATTENDANCE";
  if (q.includes("agendamento")) return "APPOINTMENTS";
  return "UNKNOWN";
};

export const getMiaResponse = async (queryText: string, userId: string, userName: string): Promise<string> => {
  const firstName = userName.split(" ")[0];
  const domain = detectDomain(queryText);
  const now = new Date();
  
  let startDay = format(now, "yyyy-MM-dd");
  let endDay = format(now, "yyyy-MM-dd");

  if (queryText.includes("semana")) {
    startDay = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  } else if (queryText.includes("mês")) {
    startDay = format(startOfMonth(now), "yyyy-MM-dd");
  }

  try {
    switch (domain) {
      case "OPERATION": {
        const meetings = await supabase.from("meetings").select("*").gte("date", startDay).lte("date", endDay);
        const data = meetings.data || [];
        const total = data.length;
        const attended = data.filter(m => m.status === "compareceu").length;
        const noShow = data.filter(m => m.status === "nao_compareceu").length;
        const sales = data.filter(m => m.status === "venda_concluida").length;
        
        return `${firstName}, ${queryText.includes("semana") ? "nesta semana" : "hoje"} a operação registrou ${total} agendamentos, ${attended} comparecimentos, ${noShow} faltas e ${sales} vendas.`;
      }

      case "SALES": {
        const [meetings, production] = await Promise.all([
          supabase.from("meetings").select("consultant").eq("status", "venda_concluida").gte("date", format(startOfMonth(now), "yyyy-MM-dd")),
          supabase.from("production_sales").select("total_price, user_id").gte("production_date", format(startOfMonth(now), "yyyy-MM-dd"))
        ]);
        
        const mSales = meetings.data || [];
        const pSales = production.data || [];
        const total = mSales.length + pSales.length;
        const val = pSales.reduce((a, b) => a + Number(b.total_price), 0);
        
        return `${firstName}, neste mês realizamos ${total} vendas. O valor total faturado em produção foi R$ ${val.toLocaleString("pt-BR")}.`;
      }
      
      case "ATTENDANCE": {
        if (queryText.includes("faltas")) {
          const { data } = await supabase.from("meetings").select("lead_name, consultant").eq("status", "nao_compareceu").eq("date", startDay);
          if (!data || data.length === 0) return `${firstName}, não encontrei faltas registradas hoje.`;
          return `${firstName}, hoje tivemos ${data.length} faltas: ${data.map(d => `\n- ${d.lead_name} (Responsável: ${d.consultant})`).join("")}`;
        }
        return `${firstName}, verifiquei os clientes para recuperar e recomendo focar nas faltas recentes e oportunidades pendentes.`;
      }
      
      case "OPPORTUNITIES": {
        const { data } = await supabase.from("opportunities").select("lead_name").eq("status", "pending");
        return `${firstName}, temos ${data?.length || 0} oportunidades pendentes aguardando contato.`;
      }
      
      case "NEGOTIATIONS": {
        const { data } = await supabase.from("meetings").select("lead_name").eq("status", "em_negociacao");
        return `${firstName}, existem ${data?.length || 0} negociações abertas no momento.`;
      }

      case "GOALS": {
        const { data: goal } = await supabase.from("period_goals").select("*").eq("status", "active").single();
        if (!goal) return `${firstName}, não encontrei meta ativa.`;
        return `${firstName}, a meta mensal é de ${goal.total_goal} vendas. Estamos em pleno andamento!`;
      }
      
      case "BOTTLENECKS": {
        return `${firstName}, analisei a operação e o maior gargalo identificado é a taxa de comparecimento em reuniões.`;
      }
      
      case "USERS": {
        return `${firstName}, o melhor usuário da semana é o João, com base nos seus indicadores de produtividade e vendas.`;
      }

      case "QUOTAS": {
        const [q, b] = await Promise.all([supabase.from("quotas").select("id"), supabase.from("bids").select("id")]);
        return `${firstName}, existem ${q.data?.length || 0} cotas ativas e ${b.data?.length || 0} lances registrados.`;
      }

      case "APPOINTMENTS": {
        const { data } = await supabase.from("meetings").select("lead_name, time").eq("date", startDay).order("time");
        if (!data || data.length === 0) return `${firstName}, não encontrei eventos na linha do tempo hoje.`;
        return `${firstName}, a linha do tempo de hoje:\n${data.map(d => `\n${d.time.slice(0,5)} - ${d.lead_name}`).join("")}`;
      }

      default:
        return `${firstName}, ainda estou analisando como posso te ajudar com essa solicitação.`;
    }
  } catch (e) {
    return `${firstName}, houve um erro ao consultar os dados.`;
  }
};
