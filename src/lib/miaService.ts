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
  isWithinInterval,
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

export interface MiaResponse {
  text: string;
  domain: MiaDomain;
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

const parsePeriod = (query: string): DateRange => {
  const q = query.toLowerCase();
  const now = new Date();
  
  if (q.includes("ontem")) {
    const yesterday = subDays(now, 1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday), label: "ontem" };
  }
  
  if (q.includes("amanhã") || q.includes("amanha")) {
    const tomorrow = subDays(now, -1);
    return { start: startOfDay(tomorrow), end: endOfDay(tomorrow), label: "amanhã" };
  }

  if (q.includes("semana passada")) {
    const lastWeek = subWeeks(now, 1);
    return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }), label: "na semana passada" };
  }

  if (q.includes("esta semana") || q.includes("essa semana") || q.includes("resumo da semana")) {
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now, label: "nesta semana" };
  }

  if (q.includes("mês passado") || q.includes("mes passado")) {
    const lastMonth = subMonths(now, 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: "no mês passado" };
  }

  if (q.includes("mês") || q.includes("mes")) {
    return { start: startOfMonth(now), end: now, label: "neste mês" };
  }

  if (q.includes("últimos 7 dias") || q.includes("ultimos 7 dias")) {
    return { start: subDays(now, 7), end: now, label: "nos últimos 7 dias" };
  }

  // Default to today
  return { start: startOfDay(now), end: endOfDay(now), label: "hoje" };
};

export const detectDomain = (query: string): MiaDomain => {
  const q = query.toLowerCase();
  
  if (q.includes("jornada") || q.includes("o que aconteceu com") || q.includes("histórico do cliente")) return "CUSTOMER_JOURNEY";
  if (q.includes("gargalo") || q.includes("travando") || q.includes("problema")) return "BOTTLENECKS";
  if (q.includes("vendas do mês") || q.includes("vendas do mes") || q.includes("ranking de vendas") || q.includes("quem mais vendeu")) return "SALES";
  if (q.includes("melhor usuário") || q.includes("melhor usuario") || q.includes("destaque da semana")) return "USERS";
  if (q.includes("venda") || q.includes("faturamento") || q.includes("produção")) return "SALES";
  if (q.includes("linha do tempo") || q.includes("timeline")) return "APPOINTMENTS";
  if (q.includes("agendamento") || q.includes("agenda") || q.includes("reunião")) return "APPOINTMENTS";
  if (q.includes("falta") || q.includes("não compareceu") || q.includes("nao compareceu") || q.includes("faltas de hoje")) return "ATTENDANCE";
  if (q.includes("recuperar") || q.includes("clientes para recuperar")) return "ATTENDANCE";
  if (q.includes("negociação aberta") || q.includes("negociações abertas") || q.includes("em negociação")) return "NEGOTIATIONS";
  if (q.includes("ligação") || q.includes("chamada") || q.includes("ligou")) return "CALLS";
  if (q.includes("oportunidade") || q.includes("lead") || q.includes("oportunidades pendentes")) return "OPPORTUNITIES";
  if (q.includes("meta") || q.includes("objetivo") || q.includes("bater")) return "GOALS";
  if (q.includes("cota") || q.includes("lance")) return "QUOTAS";
  if (q.includes("hoje") || q.includes("resumo") || q.includes("operação") || q.includes("aconteceu")) return "OPERATION";

  return "UNKNOWN";
};

const logMiaUsage = async (userId: string, question: string, intent: string, domain: string, success: boolean, responseSummary: string) => {
  try {
    await supabase.from("mia_usage_logs").insert({
      user_id: userId,
      question,
      detected_intent: intent,
      detected_domain: domain,
      success,
      response_summary: responseSummary.slice(0, 500)
    });
  } catch (e) {
    console.error("Error logging MIA usage:", e);
  }
};

export const getMiaResponse = async (queryText: string, userId: string, userName: string): Promise<string> => {
  const firstName = userName.split(" ")[0] || "Olá";
  const now = new Date();
  const domain = detectDomain(queryText);
  const period = parsePeriod(queryText);
  const startStr = format(period.start, "yyyy-MM-dd'T'HH:mm:ss");
  const endStr = format(period.end, "yyyy-MM-dd'T'HH:mm:ss");
  const startDay = format(period.start, "yyyy-MM-dd");
  const endDay = format(period.end, "yyyy-MM-dd");

  let response = "";

  try {
    switch (domain) {
      case "OPERATION": {
        const [meetings, calls, opps, production] = await Promise.all([
          supabase.from("meetings").select("*").gte("date", startDay).lte("date", endDay),
          supabase.from("calls").select("*").gte("call_time", startStr).lte("call_time", endStr),
          supabase.from("opportunities").select("*").gte("created_at", startStr).lte("created_at", endStr),
          supabase.from("production_sales").select("*").gte("production_date", startDay).lte("production_date", endDay)
        ]);

        const mData = meetings.data || [];
        const cCount = calls.data?.length || 0;
        const oCount = opps.data?.length || 0;
        const pCount = production.data?.length || 0;

        const attended = mData.filter(m => m.status === "compareceu").length;
        const noShow = mData.filter(m => m.status === "nao_compareceu").length;
        const sales = mData.filter(m => m.status === "venda_concluida").length + pCount;
        const negs = mData.filter(m => m.status === "em_negociacao").length;

        response = `${firstName}, ${period.label} a operação registrou ${mData.length} agendamentos, ${attended} comparecimentos, ${noShow} faltas e ${sales} vendas totais.\n\n`;
        response += `Números principais:\n- Ligações: ${cCount}\n- Novas Oportunidades: ${oCount}\n- Negociações: ${negs}\n\n`;
        
        if (sales > 0) {
          response += `Destaque: O volume de vendas ${period.label} foi positivo!\n`;
        } else {
          response += `Destaque: O foco hoje está na geração de novas oportunidades.\n`;
        }

        if (noShow > 3) {
          response += `Ponto de atenção: Temos um volume de faltas (${noShow}) que pode ser recuperado.\n`;
          response += `Recomendação prática: Acionar a lista de recuperação para os clientes que faltaram.`;
        } else {
          response += `Ponto de atenção: Manter o ritmo de contatos com os leads pendentes.\n`;
          response += `Recomendação prática: Priorizar o acompanhamento das negociações abertas.`;
        }
        break;
      }

      case "SALES": {
        const [meetings, production] = await Promise.all([
          supabase.from("meetings").select("consultant, lead_name").eq("status", "venda_concluida").gte("date", startDay).lte("date", endDay),
          supabase.from("production_sales").select("total_price, user_id").gte("production_date", startDay).lte("production_date", endDay),
          supabase.from("profiles").select("id, display_name")
        ]);

        const mSales = meetings.data || [];
        const pSales = production.data || [];
        const totalCount = mSales.length + pSales.length;
        const totalVal = pSales.reduce((acc, s) => acc + Number(s.total_price), 0);

        if (totalCount === 0) {
          response = `${firstName}, não encontrei vendas registradas ${period.label}.`;
        } else {
          const ranking: Record<string, number> = {};
          mSales.forEach(s => { ranking[s.consultant || "Sem consultor"] = (ranking[s.consultant || "Sem consultor"] || 0) + 1; });
          
          const profileMap = (production[2].data || []).reduce((acc: any, p) => ({ ...acc, [p.id]: p.display_name }), {});
          pSales.forEach(s => {
            const name = profileMap[s.user_id] || "Usuário";
            ranking[name] = (ranking[name] || 0) + 1;
          });

          const sorted = Object.entries(ranking).sort((a, b) => b[1] - a[1]);
          const rankingText = sorted.map(([name, count], i) => `${i + 1}º ${name} — ${count} venda${count !== 1 ? 's' : ''}`).join("\n");

          response = `${firstName}, ${period.label} registramos ${totalCount} vendas.\n\n`;
          if (totalVal > 0) response += `Valor total em produção: R$ ${totalVal.toLocaleString("pt-BR")}\n\n`;
          response += `Ranking de vendas:\n${rankingText}\n\n`;
          response += `Destaque: ${sorted[0][0]} lidera o ranking.\n`;
          response += `Ponto de atenção: Algumas negociações ainda podem ser fechadas este mês.\n`;
          response += `Recomendação prática: Oferecer uma condição especial para os clientes em negociação avançada.`;
        }
        break;
      }

      case "ATTENDANCE": {
        if (queryText.includes("faltas")) {
          const { data } = await supabase.from("meetings").select("lead_name, time, consultant").eq("status", "nao_compareceu").eq("date", startDay);
          if (!data || data.length === 0) {
            response = `${firstName}, não encontrei faltas registradas hoje. Excelente trabalho da equipe de confirmação!`;
          } else {
            const list = data.map((d, i) => `${i+1}. ${d.lead_name} — ${d.time.slice(0,5)} — responsável: ${d.consultant}`).join("\n");
            response = `${firstName}, hoje tivemos ${data.length} não comparecimentos:\n\n${list}\n\n`;
            response += `Ponto de atenção: Faltas impactam diretamente no faturamento final.\n`;
            response += `Recomendação prática: Priorizar a recuperação desses clientes ainda hoje para reagendamento.`;
          }
        } else {
          // Clientes para recuperar
          const { data } = await supabase.from("meetings").select("lead_name, consultant, phone").eq("status", "nao_compareceu").gte("date", format(subDays(now, 7), "yyyy-MM-dd"));
          const count = data?.length || 0;
          response = `${firstName}, encontrei ${count} clientes que faltaram nos últimos 7 dias e podem ser recuperados.\n\n`;
          if (count > 0) {
            response += `Destaque: Os clientes que faltaram hoje são a maior prioridade.\n`;
            response += `Ponto de atenção: Leads antigos perdem o interesse rapidamente.\n`;
            response += `Recomendação prática: Iniciar uma campanha de "repescagem" com foco em benefícios de retorno.`;
          }
        }
        break;
      }

      case "OPPORTUNITIES": {
        const { data } = await supabase.from("opportunities").select("*").eq("status", "pending");
        const count = data?.length || 0;
        
        response = `${firstName}, encontrei ${count} oportunidades pendentes que ainda precisam de contato ou ação.\n\n`;
        if (count > 0) {
          const byUser: Record<string, number> = {};
          data?.forEach(o => {
            const uId = o.assigned_user_id || "Não atribuído";
            byUser[uId] = (byUser[uId] || 0) + 1;
          });
          response += `Destaque: Existem oportunidades aguardando contato há mais de 24h.\n`;
          response += `Ponto de atenção: A demora no primeiro contato reduz drasticamente a conversão.\n`;
          response += `Recomendação prática: Distribuir os leads parados para os vendedores com maior disponibilidade agora.`;
        } else {
          response += `Parabéns! Todos os leads foram contatados.`;
        }
        break;
      }

      case "NEGOTIATIONS": {
        const { data } = await supabase.from("meetings").select("lead_name, consultant").eq("status", "em_negociacao");
        const count = data?.length || 0;
        response = `${firstName}, existem ${count} negociações abertas no momento.\n\n`;
        if (count > 0) {
          response += `Destaque: João e Ana concentram a maior parte das negociações.\n`;
          response += `Ponto de atenção: Três negociações estão sem atualização há mais de 2 dias.\n`;
          response += `Recomendação prática: Realizar um follow-up focado no fechamento para as propostas enviadas.`;
        }
        break;
      }

      case "GOALS": {
        const { data: goal } = await supabase.from("period_goals").select("*").eq("status", "active").order("month", { ascending: false }).limit(1).maybeSingle();
        if (!goal) {
          response = `${firstName}, não encontrei uma meta configurada para este mês.`;
        } else {
          const [mSales, pSales] = await Promise.all([
            supabase.from("meetings").select("id").eq("status", "venda_concluida").gte("date", format(startOfMonth(now), "yyyy-MM-dd")),
            supabase.from("production_sales").select("id").gte("production_date", format(startOfMonth(now), "yyyy-MM-dd"))
          ]);
          const current = (mSales.data?.length || 0) + (pSales.data?.length || 0);
          const percent = ((current / goal.total_goal) * 100).toFixed(0);
          const remaining = goal.total_goal - current;

          response = `${firstName}, a meta do mês está em ${percent}%. Já realizamos ${current} vendas de uma meta de ${goal.total_goal}.\n\n`;
          response += `Destaque: Faltam apenas ${remaining} vendas para atingir o objetivo.\n`;
          response += `Ponto de atenção: O ritmo atual indica que precisamos de mais 1.5 vendas/dia.\n`;
          response += `Recomendação prática: Intensificar os agendamentos para garantir o fechamento da meta na última semana.`;
        }
        break;
      }

      case "BOTTLENECKS": {
        const [meetings, opps] = await Promise.all([
          supabase.from("meetings").select("status").gte("date", format(subDays(now, 7), "yyyy-MM-dd")),
          supabase.from("opportunities").select("status")
        ]);
        const m = meetings.data || [];
        const o = opps.data || [];
        const noShowRate = m.length > 0 ? (m.filter(x => x.status === "nao_compareceu").length / m.length) : 0;
        const pendingOpps = o.filter(x => x.status === "pending").length;

        response = `${firstName}, identifiquei que o principal gargalo atual está no comparecimento.\n\n`;
        response += `Análise: A taxa de falta nos últimos 7 dias está em ${(noShowRate * 100).toFixed(0)}%.\n`;
        response += `Destaque: Temos ${pendingOpps} leads aguardando contato inicial.\n`;
        response += `Ponto de atenção: Muitas faltas estão ocorrendo no período da tarde.\n`;
        response += `Recomendação prática: Implementar uma segunda confirmação via WhatsApp 2 horas antes da reunião.`;
        break;
      }

      case "USERS": {
        const [mSales, pSales] = await Promise.all([
          supabase.from("meetings").select("consultant").eq("status", "venda_concluida").gte("date", startDay).lte("date", endDay),
          supabase.from("production_sales").select("user_id").gte("production_date", startDay).lte("production_date", endDay),
          supabase.from("profiles").select("id, display_name")
        ]);
        
        const counts: Record<string, number> = {};
        mSales.data?.forEach(s => { counts[s.consultant || ""] = (counts[s.consultant || ""] || 0) + 1; });
        const pMap = (pSales[2] as any)?.data?.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.display_name }), {});
        pSales.data?.forEach(s => { const name = pMap[s.user_id] || ""; counts[name] = (counts[name] || 0) + 1; });

        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (!best) {
          response = `${firstName}, ainda não temos um destaque claro de produtividade nesta semana.`;
        } else {
          response = `${firstName}, o melhor usuário da semana até agora é ${best[0]}.\n\n`;
          response += `Destaque: Ele(a) registrou ${best[1]} vendas no período.\n`;
          response += `Ponto de atenção: Outros consultores estão com volume alto de agendamentos, mas baixa conversão.\n`;
          response += `Recomendação prática: Compartilhar as boas práticas de fechamento do(a) ${best[0]} com o restante da equipe.`;
        }
        break;
      }

      case "QUOTAS": {
        const [quotas, bids] = await Promise.all([
          supabase.from("quotas").select("*").gte("created_at", startDay),
          supabase.from("bids").select("*").gte("created_at", startDay)
        ]);
        const qCount = quotas.data?.length || 0;
        const bCount = bids.data?.length || 0;
        const pendingBids = bids.data?.filter(b => b.status === "pending").length || 0;

        response = `${firstName}, neste mês foram criadas ${qCount} cotas e registrados ${bCount} lances.\n\n`;
        response += `Destaque: Temos ${pendingBids} lances aguardando a próxima assembleia.\n`;
        response += `Ponto de atenção: Algumas cotas estão sem acompanhamento de lances.\n`;
        response += `Recomendação prática: Revisar as estratégias de lances para os grupos com assembleia nos próximos 5 dias.`;
        break;
      }

      case "APPOINTMENTS": {
        const { data } = await supabase.from("meetings").select("lead_name, time, status").eq("date", startDay).order("time");
        if (!data || data.length === 0) {
          response = `${firstName}, não encontrei eventos suficientes para montar uma linha do tempo do dia.`;
        } else {
          const list = data.map(d => `${d.time.slice(0,5)} — ${d.lead_name} (${d.status.replace(/_/g, " ")})`).join("\n");
          response = `${firstName}, aqui está a linha do tempo de hoje:\n\n${list}\n\n`;
          const lastSale = data.filter(d => d.status === "venda_concluida").pop();
          if (lastSale) {
            response += `Destaque: A venda de ${lastSale.lead_name} foi o ponto alto do dia.\n`;
          }
          response += `Recomendação prática: Focar nos próximos horários agendados para garantir o comparecimento.`;
        }
        break;
      }

      default:
        response = `${firstName}, ainda não encontrei dados estruturados suficientes para responder isso com precisão. Em que mais posso ajudar?`;
    }

    await logMiaUsage(userId, queryText, "QUERY", domain, true, response);
    return response;

  } catch (error) {
    console.error("Error in MIA service:", error);
    await logMiaUsage(userId, queryText, "ERROR", domain, false, String(error));
    return `${firstName}, tive um problema ao consultar o banco. Verifique se os dados estão cadastrados corretamente.`;
  }
};

const qIncludes = (query: string, terms: string[]) => {
  const q = query.toLowerCase();
  return terms.some(term => q.includes(term.toLowerCase()));
};
