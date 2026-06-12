import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type MiaIntention = 
  | "HOJE" 
  | "SEMANA" 
  | "VENDAS_MES" 
  | "RANKING_VENDAS" 
  | "RANKING_AGENDAMENTOS" 
  | "AGENDA_HOJE" 
  | "FALTAS_HOJE" 
  | "OPORTUNIDADES_PENDENTES" 
  | "NEGOCIACOES_ATIVAS" 
  | "META_MES" 
  | "GARGALO" 
  | "UNKNOWN";

export interface MiaResponse {
  text: string;
  intention: MiaIntention;
}

export const detectIntention = (query: string): MiaIntention => {
  const q = query.toLowerCase();
  
  if (q.includes("hoje") && (q.includes("dia") || q.includes("operação") || q.includes("aconteceu") || q.includes("resumo"))) return "HOJE";
  if (q.includes("semana")) return "SEMANA";
  if (q.includes("vendas") && (q.includes("mês") || q.includes("quanto") || q.includes("total"))) return "VENDAS_MES";
  if (q.includes("ranking") && q.includes("vendas")) return "RANKING_VENDAS";
  if (q.includes("quem") && (q.includes("vendeu") || q.includes("vendendo"))) return "RANKING_VENDAS";
  if (q.includes("ranking") && q.includes("agendamentos")) return "RANKING_AGENDAMENTOS";
  if (q.includes("quem") && (q.includes("agendou") || q.includes("marcou"))) return "RANKING_AGENDAMENTOS";
  if (q.includes("agenda") || q.includes("agendamentos hoje") || q.includes("reuniões hoje")) return "AGENDA_HOJE";
  if (q.includes("faltou") || q.includes("falta") || q.includes("não compareceu")) return "FALTAS_HOJE";
  if (q.includes("oportunidades") || q.includes("leads") || q.includes("parados") || q.includes("sem contato")) return "OPORTUNIDADES_PENDENTES";
  if (q.includes("negociações") || q.includes("negociação") || q.includes("andamento")) return "NEGOCIACOES_ATIVAS";
  if (q.includes("meta") || q.includes("progresso") || q.includes("bater")) return "META_MES";
  if (q.includes("gargalo") || q.includes("travando") || q.includes("melhorar") || q.includes("atenção") || q.includes("problema")) return "GARGALO";
  
  // Fallbacks for specific simple queries
  if (q === "resumo de hoje") return "HOJE";
  if (q === "resumo da semana") return "SEMANA";
  if (q === "vendas do mês") return "VENDAS_MES";
  
  return "UNKNOWN";
};

export const getMiaResponse = async (intention: MiaIntention, userName: string): Promise<string> => {
  const firstName = userName.split(" ")[0];
  const today = format(new Date(), "yyyy-MM-dd");
  const now = new Date();
  const startMonth = format(startOfMonth(now), "yyyy-MM-dd");
  const endMonth = format(endOfMonth(now), "yyyy-MM-dd");
  const startWeek = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const endWeek = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

  try {
    switch (intention) {
      case "HOJE": {
        const [calls, createdMeetings, todayMeetings] = await Promise.all([
          supabase.from("calls").select("id").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`),
          supabase.from("meetings").select("id").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`),
          supabase.from("meetings").select("status").eq("date", today)
        ]);

        const attended = todayMeetings.data?.filter(m => m.status === "compareceu" || m.status === "visita_realizada").length || 0;
        const noShow = todayMeetings.data?.filter(m => m.status === "nao_compareceu").length || 0;
        const sales = todayMeetings.data?.filter(m => m.status === "venda_concluida").length || 0;
        const totalMeetings = todayMeetings.data?.length || 0;
        const totalCalls = calls.data?.length || 0;
        const newMeetings = createdMeetings.data?.length || 0;

        let response = `${firstName}, hoje a operação registrou ${totalCalls > 0 ? totalCalls + " ligações, " : ""}${newMeetings} agendamentos criados e ${totalMeetings} reuniões marcadas. `;
        response += `Tivemos ${attended} comparecimentos, ${noShow} faltas e ${sales} venda${sales !== 1 ? 's' : ''}. `;
        
        if (noShow > attended && noShow > 0) {
          response += "O principal ponto de atenção é o alto índice de faltas hoje.";
        } else if (sales > 0) {
          response += "O destaque do dia é a venda realizada!";
        }
        
        return response;
      }

      case "SEMANA": {
        const { data: weekMeetings } = await supabase
          .from("meetings")
          .select("status")
          .gte("date", startWeek)
          .lte("date", endWeek);

        const total = weekMeetings?.length || 0;
        const attended = weekMeetings?.filter(m => m.status === "compareceu" || m.status === "visita_realizada").length || 0;
        const noShow = weekMeetings?.filter(m => m.status === "nao_compareceu").length || 0;
        const sales = weekMeetings?.filter(m => m.status === "venda_concluida").length || 0;

        if (total === 0) return `${firstName}, não encontrei agendamentos registrados para esta semana.`;

        return `${firstName}, nesta semana tivemos ${total} agendamentos, com ${attended} comparecimentos, ${noShow} faltas e ${sales} venda${sales !== 1 ? 's' : ''}.`;
      }

      case "VENDAS_MES": {
        const { data: monthSales } = await supabase
          .from("meetings")
          .select("id")
          .eq("status", "venda_concluida")
          .gte("sale_date", startMonth)
          .lte("sale_date", endMonth);

        const count = monthSales?.length || 0;
        if (count === 0) return `${firstName}, ainda não registramos vendas este mês.`;

        return `${firstName}, o total de vendas registradas este mês é de ${count} venda${count !== 1 ? 's' : ''}.`;
      }

      case "RANKING_VENDAS": {
        const { data: monthSales } = await supabase
          .from("meetings")
          .select("consultant")
          .eq("status", "venda_concluida")
          .gte("sale_date", startMonth)
          .lte("sale_date", endMonth);

        if (!monthSales || monthSales.length === 0) return `${firstName}, não encontrei vendas registradas este mês para gerar o ranking.`;

        const ranking: Record<string, number> = {};
        monthSales.forEach(s => {
          if (s.consultant) {
            ranking[s.consultant] = (ranking[s.consultant] || 0) + 1;
          }
        });

        const sorted = Object.entries(ranking).sort((a, b) => b[1] - a[1]);
        const text = sorted.map(([name, count], i) => `${i + 1}º ${name} (${count} venda${count !== 1 ? 's' : ''})`).join(", ");

        return `${firstName}, o ranking de vendas do mês está assim: ${text}.`;
      }

      case "RANKING_AGENDAMENTOS": {
        const { data: todayAgendamentos } = await supabase
          .from("meetings")
          .select("pre_seller")
          .eq("date", today);

        if (!todayAgendamentos || todayAgendamentos.length === 0) return `${firstName}, não encontrei agendamentos hoje para gerar o ranking.`;

        const ranking: Record<string, number> = {};
        todayAgendamentos.forEach(a => {
          if (a.pre_seller) {
            ranking[a.pre_seller] = (ranking[a.pre_seller] || 0) + 1;
          }
        });

        const sorted = Object.entries(ranking).sort((a, b) => b[1] - a[1]);
        const text = sorted.map(([name, count], i) => `${i + 1}º ${name} (${count})`).join(", ");

        return `${firstName}, o ranking de agendamentos de hoje é: ${text}.`;
      }

      case "AGENDA_HOJE": {
        const { data: agenda } = await supabase
          .from("meetings")
          .select("time, lead_name, consultant, status")
          .eq("date", today)
          .order("time", { ascending: true });

        if (!agenda || agenda.length === 0) return `${firstName}, não temos agendamentos para hoje.`;

        const list = agenda.slice(0, 5).map(a => `${a.time.slice(0, 5)} - ${a.lead_name} (${a.consultant})`).join("; ");
        const more = agenda.length > 5 ? `. E mais ${agenda.length - 5} agendamentos.` : ".";

        return `${firstName}, temos ${agenda.length} agendamentos hoje. Os primeiros são: ${list}${more}`;
      }

      case "FALTAS_HOJE": {
        const { data: faltas } = await supabase
          .from("meetings")
          .select("time, lead_name, pre_seller")
          .eq("date", today)
          .eq("status", "nao_compareceu");

        if (!faltas || faltas.length === 0) return `${firstName}, não registramos faltas até o momento hoje.`;

        const list = faltas.map(f => `${f.lead_name} (${f.time.slice(0, 5)})`).join(", ");
        return `${firstName}, os clientes que faltaram hoje foram: ${list}.`;
      }

      case "OPORTUNIDADES_PENDENTES": {
        const { data: opps } = await supabase
          .from("opportunities")
          .select("id")
          .eq("status", "pending");

        const count = opps?.length || 0;
        if (count === 0) return `${firstName}, não encontrei oportunidades pendentes no momento.`;

        return `${firstName}, existem ${count} oportunidades sem contato que precisam de atenção.`;
      }

      case "NEGOCIACOES_ATIVAS": {
        const { data: negs } = await supabase
          .from("meetings")
          .select("id")
          .eq("status", "em_negociacao");

        const count = negs?.length || 0;
        if (count === 0) return `${firstName}, não há negociações em andamento registradas.`;

        return `${firstName}, temos ${count} negociações ativas no momento.`;
      }

      case "META_MES": {
        const { data: goal } = await supabase
          .from("period_goals")
          .select("total_goal, start_date, end_date")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!goal) return `${firstName}, não encontrei uma meta configurada para este mês.`;

        const { data: progress } = await supabase
          .from("period_goal_progress")
          .select("amount")
          .eq("start_date", goal.start_date)
          .eq("end_date", goal.end_date);

        const totalRealized = progress?.reduce((acc, r) => acc + Number(r.amount || 0), 0) || 0;
        const percent = ((totalRealized / goal.total_goal) * 100).toFixed(1);
        const remaining = goal.total_goal - totalRealized;

        return `${firstName}, a meta do mês é ${goal.total_goal}. Já realizamos ${totalRealized} (${percent}%). Falta${remaining !== 1 ? 'm' : ''} ${remaining > 0 ? remaining : 0} para bater a meta.`;
      }

      case "GARGALO": {
        const [weekMeetings, opps] = await Promise.all([
          supabase.from("meetings").select("status").gte("date", startWeek).lte("date", endWeek),
          supabase.from("opportunities").select("id").eq("status", "pending")
        ]);

        const noShow = weekMeetings.data?.filter(m => m.status === "nao_compareceu").length || 0;
        const attended = weekMeetings.data?.filter(m => m.status === "compareceu" || m.status === "visita_realizada").length || 0;
        const pendingOpps = opps.data?.length || 0;

        if (noShow > attended && noShow > 5) {
          return `${firstName}, o principal gargalo da semana é o comparecimento. Tivemos ${noShow} faltas contra ${attended} presenças.`;
        }
        
        if (pendingOpps > 10) {
          return `${firstName}, o gargalo atual são as oportunidades paradas. Temos ${pendingOpps} leads sem contato.`;
        }

        return `${firstName}, não identifiquei gargalos críticos com os dados atuais. A operação parece fluir bem.`;
      }

      default:
        return `${firstName}, ainda não consigo responder essa pergunta. Por enquanto, posso ajudar com resumo do dia, resumo da semana, vendas, ranking, agenda, faltas, oportunidades, metas e gargalos.`;
    }
  } catch (error) {
    console.error("Error in MIA service:", error);
    return `${firstName}, não consegui consultar essa informação agora. Tente novamente em alguns instantes.`;
  }
};
