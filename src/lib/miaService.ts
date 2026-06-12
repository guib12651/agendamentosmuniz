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

  if (q.includes("esta semana") || q.includes("essa semana")) {
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: "nesta semana" };
  }

  if (q.includes("mês passado") || q.includes("mes passado")) {
    const lastMonth = subMonths(now, 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: "no mês passado" };
  }

  if (q.includes("mês") || q.includes("mes")) {
    return { start: startOfMonth(now), end: endOfMonth(now), label: "neste mês" };
  }

  if (q.includes("últimos 7 dias") || q.includes("ultimos 7 dias")) {
    return { start: subDays(now, 7), end: now, label: "nos últimos 7 dias" };
  }

  if (q.includes("últimos 30 dias") || q.includes("ultimos 30 dias")) {
    return { start: subDays(now, 30), end: now, label: "nos últimos 30 dias" };
  }

  // Custom date range 01/06 até 15/06
  const dateRangeMatch = q.match(/(\d{1,2})\/(\d{1,2})\s+(até|a)\s+(\d{1,2})\/(\d{1,2})/);
  if (dateRangeMatch) {
    const d1 = parseInt(dateRangeMatch[1]);
    const m1 = parseInt(dateRangeMatch[2]) - 1;
    const d2 = parseInt(dateRangeMatch[4]);
    const m2 = parseInt(dateRangeMatch[5]) - 1;
    const year = now.getFullYear();
    return { 
      start: new Date(year, m1, d1, 0, 0, 0), 
      end: new Date(year, m2, d2, 23, 59, 59), 
      label: `entre ${dateRangeMatch[1]}/${dateRangeMatch[2]} e ${dateRangeMatch[4]}/${dateRangeMatch[5]}` 
    };
  }

  // Default to month for sales/goals if no specific period is mentioned
  if (detectDomain(query) === "SALES" || detectDomain(query) === "GOALS") {
    return { start: startOfMonth(now), end: endOfMonth(now), label: "neste mês" };
  }

  // Default to today
  return { start: startOfDay(now), end: endOfDay(now), label: "hoje" };
};

export const detectDomain = (query: string): MiaDomain => {
  const q = query.toLowerCase();
  
  if (q.includes("jornada") || q.includes("o que aconteceu com") || q.includes("histórico do cliente") || q.includes("jornada do cliente")) return "CUSTOMER_JOURNEY";
  if (q.includes("gargalo") || q.includes("travando") || q.includes("onde estamos perdendo") || q.includes("problema")) return "BOTTLENECKS";
  if (q.includes("venda") || q.includes("ranking de vendas") || q.includes("quem mais vendeu") || q.includes("melhor usuário") || q.includes("melhor usuario")) return "SALES";
  if (q.includes("agendamento") || q.includes("agenda") || q.includes("marcou") || q.includes("reunião") || q.includes("linha do tempo")) return "APPOINTMENTS";
  if (q.includes("falta") || q.includes("compareceu") || q.includes("não compareceu") || q.includes("presença") || q.includes("recuperar")) return "ATTENDANCE";
  if (q.includes("ligação") || q.includes("chamada") || q.includes("ligou")) return "CALLS";
  if (q.includes("oportunidade") || q.includes("lead")) return "OPPORTUNITIES";
  if (q.includes("meta") || q.includes("objetivo") || q.includes("bater")) return "GOALS";
  if (q.includes("cota")) return "QUOTAS";
  if (q.includes("lance")) return "BIDS";
  if (q.includes("usuário") || q.includes("vendedor") || q.includes("equipe") || q.includes("quem é")) return "USERS";
  if (q.includes("produção") || q.includes("venda de produção") || q.includes("produto fabricado")) return "PRODUCTION_SALES";
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
  const firstName = userName.split(" ")[0];
  const domain = detectDomain(queryText);
  const period = parsePeriod(queryText);
  const startStr = format(period.start, "yyyy-MM-dd'T'HH:mm:ss");
  const endStr = format(period.end, "yyyy-MM-dd'T'HH:mm:ss");
  const startDay = format(period.start, "yyyy-MM-dd");
  const endDay = format(period.end, "yyyy-MM-dd");

  let response = "";

  try {
    switch (domain) {
      case "OPERATION":
      case "APPOINTMENTS":
      case "ATTENDANCE":
      case "SALES": {
        const [meetings, calls, opps] = await Promise.all([
          supabase.from("meetings").select("*").gte("date", startDay).lte("date", endDay),
          supabase.from("calls").select("*").gte("call_time", startStr).lte("call_time", endStr),
          supabase.from("opportunities").select("*").gte("created_at", startStr).lte("created_at", endStr)
        ]);

        const data = meetings.data || [];
        const total = data.length;
        const attended = data.filter(m => ["compareceu", "visita_realizada"].includes(m.status)).length;
        const noShow = data.filter(m => m.status === "nao_compareceu").length;
        const sales = data.filter(m => m.status === "venda_concluida").length;
        const negotiations = data.filter(m => m.status === "em_negociacao").length;
        const callsCount = calls.data?.length || 0;
        const newOpps = opps.data?.length || 0;

        if (domain === "SALES" || qIncludes(queryText, ["venda", "ranking"])) {
          // Combinar vendas de reuniões e vendas de produção
          const [productionSales] = await Promise.all([
            supabase.from("production_sales").select("*").gte("production_date", startDay).lte("production_date", endDay)
          ]);

          const pData = productionSales.data || [];
          const meetingSales = data.filter(m => m.status === "venda_concluida");
          
          const totalSalesCount = meetingSales.length + pData.length;
          const totalValue = pData.reduce((acc, s) => acc + Number(s.total_price), 0);

          if (totalSalesCount === 0) {
            response = `${firstName}, não encontrei vendas registradas ${period.label}.`;
          } else {
            const ranking: Record<string, number> = {};
            const valueRanking: Record<string, number> = {};

            // Ranking de reuniões (consultores)
            meetingSales.forEach(s => {
              const name = s.consultant || "Sem consultor";
              ranking[name] = (ranking[name] || 0) + 1;
            });

            // Ranking de produção (usuários que lançaram)
            // Aqui precisamos dos nomes dos usuários para a produção
            const { data: profiles } = await supabase.from("profiles").select("id, display_name");
            const profileMap = (profiles || []).reduce((acc: any, p) => ({ ...acc, [p.id]: p.display_name }), {});

            pData.forEach(s => {
              const name = profileMap[s.user_id] || "Usuário";
              ranking[name] = (ranking[name] || 0) + 1;
              valueRanking[name] = (valueRanking[name] || 0) + Number(s.total_price);
            });

            const sorted = Object.entries(ranking).sort((a, b) => b[1] - a[1]);
            const rankingText = sorted.map(([name, count], i) => `${i + 1}º ${name} (${count} venda${count !== 1 ? 's' : ''})`).join("\n");
            
            response = `${firstName}, ${period.label} tivemos um total de ${totalSalesCount} venda${totalSalesCount !== 1 ? 's' : ''}.`;
            
            if (totalValue > 0) {
              response += `\nO valor total em produção foi de ${new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalValue)}.`;
            }

            response += `\n\nRanking Geral:\n${rankingText}`;
            
            if (sorted.length > 0) {
              response += `\n\nO destaque vai para ${sorted[0][0]}, parabéns pelo resultado!`;
            }
          }
        } else if (domain === "ATTENDANCE" || qIncludes(queryText, ["falta", "compareceu", "recuperar"])) {
          if (qIncludes(queryText, ["recuperar"])) {
            const recoveryList = data.filter(m => m.status === "nao_compareceu").slice(0, 5).map(m => `- ${m.lead_name} (${m.phone || 'Sem telefone'})`).join("\n");
            if (recoveryList) {
              response = `${firstName}, identifiquei ${noShow} clientes que faltaram ${period.label}. Aqui estão os principais para recuperação:\n\n${recoveryList}\n\nRecomendo entrar em contato imediatamente.`;
            } else {
              response = `${firstName}, não encontrei clientes com falta ${period.label} para recuperação.`;
            }
          } else {
            const attendanceRate = total > 0 ? ((attended / total) * 100).toFixed(1) : 0;
            response = `${firstName}, ${period.label} tivemos ${total} agendamentos no total.\n- Comparecimentos: ${attended}\n- Faltas: ${noShow}\n- Taxa de Presença: ${attendanceRate}%`;
            if (noShow > attended && noShow > 0) {
              response += `\n\nPonto de atenção: O número de faltas está alto (${noShow}). Recomendo revisar o processo de confirmação.`;
            }
          }
        } else if (qIncludes(queryText, ["linha do tempo", "agenda"])) {
          const timeline = data.sort((a, b) => (a.time || "").localeCompare(b.time || "")).slice(0, 8).map(m => `${m.time?.slice(0, 5)} - ${m.lead_name} (${m.status.replace(/_/g, " ")})`).join("\n");
          if (timeline) {
            response = `${firstName}, aqui está a linha do tempo ${period.label}:\n\n${timeline}${total > 8 ? `\n...e mais ${total - 8} eventos.` : ""}`;
          } else {
            response = `${firstName}, não encontrei eventos na agenda ${period.label}.`;
          }
        } else {
          // Operation Summary
          response = `${firstName}, ${period.label} a operação registrou:\n`;
          response += `- ${total} agendamentos\n`;
          response += `- ${attended} comparecimentos\n`;
          response += `- ${noShow} faltas\n`;
          response += `- ${sales} vendas\n`;
          response += `- ${callsCount} ligações realizadas\n`;
          response += `- ${newOpps} novas oportunidades`;

          if (sales > 0) response += `\n\nDestaque: Tivemos ${sales} venda(s) concretizada(s)!`;
          if (noShow > 5) response += `\n\nAlerta: O volume de faltas (${noShow}) merece atenção estratégica.`;
        }
        break;
      }

      case "CALLS": {
        const { data: calls } = await supabase
          .from("calls")
          .select("*, profiles(display_name)")
          .gte("call_time", startStr)
          .lte("call_time", endStr);
        
        const count = calls?.length || 0;
        if (count === 0) {
          response = `${firstName}, não encontrei registros de ligações ${period.label}.`;
        } else {
          const ranking: Record<string, number> = {};
          calls?.forEach((c: any) => {
            const name = c.profiles?.display_name || "Desconhecido";
            ranking[name] = (ranking[name] || 0) + 1;
          });
          const sorted = Object.entries(ranking).sort((a, b) => b[1] - a[1]);
          const rankingText = sorted.slice(0, 5).map(([name, val]) => `- ${name}: ${val} ligações`).join("\n");
          
          response = `${firstName}, foram realizadas ${count} ligações ${period.label}.\n\nTop produtividade:\n${rankingText}`;
          if (count < 20 && period.label === "hoje") {
            response += `\n\nRecomendação: O volume de ligações está baixo para o horário. É importante aumentar o ritmo de contatos.`;
          }
        }
        break;
      }

      case "OPPORTUNITIES": {
        const { data: opps } = await supabase.from("opportunities").select("*");
        const pending = opps?.filter(o => o.status === "pending").length || 0;
        const total = opps?.length || 0;
        
        response = `${firstName}, no momento temos ${pending} oportunidades pendentes de um total de ${total} cadastradas no sistema.`;
        if (pending > 10) {
          response += `\n\nEste é um gargalo importante! Temos muitos leads aguardando o primeiro contato.`;
        }
        break;
      }

      case "GOALS": {
        const { data: goal } = await supabase
          .from("period_goals")
          .select("*")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!goal) {
          response = `${firstName}, não encontrei uma meta ativa configurada no sistema.`;
        } else {
          const { data: progress } = await supabase
            .from("period_goal_progress")
            .select("amount")
            .eq("start_date", goal.start_date)
            .eq("end_date", goal.end_date);

          const realized = progress?.reduce((acc, r) => acc + Number(r.amount || 0), 0) || 0;
          const percent = ((realized / goal.total_goal) * 100).toFixed(1);
          const remaining = goal.total_goal - realized;
          
          response = `${firstName}, a meta atual é de ${goal.total_goal} vendas.\n- Realizado: ${realized} (${percent}%)\n- Restante: ${remaining > 0 ? remaining : 0}`;
          
          const daysLeft = Math.ceil((new Date(goal.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && remaining > 0) {
            const pace = (remaining / daysLeft).toFixed(1);
            response += `\n\nAnálise: Faltam ${daysLeft} dias para o fim do período. Precisamos de uma média de ${pace} vendas por dia para bater a meta.`;
          }
        }
        break;
      }

      case "CUSTOMER_JOURNEY": {
        const nameMatch = queryText.match(/com\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i) || queryText.match(/de\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
        const clientName = nameMatch ? nameMatch[1].trim() : "";
        
        if (!clientName) {
          response = `${firstName}, qual o nome do cliente que você deseja consultar?`;
        } else {
          const [opps, meetings] = await Promise.all([
            supabase.from("opportunities").select("*").ilike("lead_name", `%${clientName}%`),
            supabase.from("meetings").select("*").ilike("lead_name", `%${clientName}%`)
          ]);

          if ((!opps.data || opps.data.length === 0) && (!meetings.data || meetings.data.length === 0)) {
            response = `${firstName}, não encontrei nenhum registro para o cliente "${clientName}".`;
          } else {
            const m = meetings.data?.[0];
            const o = opps.data?.[0];
            const name = m?.lead_name || o?.lead_name;
            
            response = `${firstName}, encontrei registros de ${name}:\n`;
            if (o) response += `- Criado como oportunidade em: ${format(parseISO(o.created_at), "dd/MM/yyyy")}\n`;
            if (m) {
              response += `- Agendado para: ${format(parseISO(`${m.date}T${m.time}`), "dd/MM/yyyy HH:mm")}\n`;
              response += `- Status atual: ${m.status.replace(/_/g, " ")}\n`;
              response += `- Consultor: ${m.consultant || "Não atribuído"}\n`;
            }
            
            if (m?.status === "venda_concluida") {
              response += `\nParabéns! Este cliente já concluiu uma venda.`;
            } else if (m?.status === "nao_compareceu") {
              response += `\nEste cliente faltou ao agendamento. Recomendo uma ação de recuperação.`;
            }
          }
        }
        break;
      }

      case "BOTTLENECKS": {
        const [meetings, opps] = await Promise.all([
          supabase.from("meetings").select("status").gte("date", format(subDays(new Date(), 7), "yyyy-MM-dd")),
          supabase.from("opportunities").select("status")
        ]);

        const noShow = meetings.data?.filter(m => m.status === "nao_compareceu").length || 0;
        const totalMeetings = meetings.data?.length || 0;
        const pendingOpps = opps.data?.filter(o => o.status === "pending").length || 0;

        response = `${firstName}, analisei os dados dos últimos 7 dias e identifiquei o seguinte:\n\n`;
        
        let found = false;
        if (totalMeetings > 0 && (noShow / totalMeetings) > 0.3) {
          response += `1. Gargalo de Comparecimento: A taxa de falta está em ${((noShow / totalMeetings) * 100).toFixed(0)}%. Isso está travando o resultado final.\n`;
          found = true;
        }
        if (pendingOpps > 15) {
          response += `2. Gargalo de Contato: Temos ${pendingOpps} oportunidades paradas sem o primeiro contato.\n`;
          found = true;
        }

        if (!found) {
          response += `A operação está saudável! Não identifiquei gargalos críticos nos dados recentes.`;
        } else {
          response += `\nRecomendação: Focar na recuperação de faltas e na agilização do primeiro contato com novos leads.`;
        }
        break;
      }

      case "QUOTAS":
      case "BIDS": {
        const [quotas, bids] = await Promise.all([
          supabase.from("quotas").select("id"),
          supabase.from("bids").select("id, status")
        ]);
        
        const qCount = quotas.data?.length || 0;
        const bCount = bids.data?.length || 0;
        const pendingBids = bids.data?.filter(b => b.status === "pending").length || 0;

        response = `${firstName}, encontrei ${qCount} cotas ativas no sistema e ${bCount} lances registrados.`;
        if (pendingBids > 0) {
          response += `\n\nExistem ${pendingBids} lances pendentes que precisam de validação.`;
        }
        break;
      }

      case "PRODUCTION_SALES": {
        const { data: pSales } = await supabase
          .from("production_sales")
          .select("*")
          .gte("production_date", startDay)
          .lte("production_date", endDay);

        const count = pSales?.length || 0;
        const totalValue = pSales?.reduce((acc, s) => acc + Number(s.total_price), 0) || 0;

        if (count === 0) {
          response = `${firstName}, não encontrei vendas por produção registradas ${period.label}.`;
        } else {
          response = `${firstName}, ${period.label} foram registradas ${count} vendas por produção, totalizando ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(totalValue)}.`;
          
          if (totalValue > 5000) {
            response += "\n\nExcelente volume de produção! O ritmo está muito bom.";
          }
        }
        break;
      }

      default:
        response = `${firstName}, ainda estou aprendendo sobre esse assunto específico. No momento, posso te ajudar com:\n- Resumo da operação (hoje, semana, mês)\n- Ranking de vendas e agendamentos\n- Análise de metas e gargalos\n- Jornada do cliente e oportunidades pendentes\n- Produtividade de ligações`;
    }

    await logMiaUsage(userId, queryText, "QUERY", domain, true, response);
    return response;

  } catch (error) {
    console.error("Error in MIA service:", error);
    await logMiaUsage(userId, queryText, "ERROR", domain, false, String(error));
    return `${firstName}, tive um problema técnico ao consultar o banco de dados. Por favor, tente novamente em alguns instantes.`;
  }
};

const qIncludes = (query: string, terms: string[]) => {
  const q = query.toLowerCase();
  return terms.some(t => q.includes(t));
};