export const LEAD_STATUSES = [
  "novo",
  "em_atendimento",
  "nao_respondeu",
  "agendado",
  "compareceu",
  "nao_compareceu",
  "em_negociacao",
  "futuro",
  "fechado",
  "sem_interesse",
  "desistiu",
  "ja_comprou",
  "arquivado",
] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  nao_respondeu: "Não respondeu",
  agendado: "Agendado",
  compareceu: "Compareceu",
  nao_compareceu: "Não compareceu",
  em_negociacao: "Em negociação",
  futuro: "Futuro",
  fechado: "Fechado",
  sem_interesse: "Sem interesse",
  desistiu: "Desistiu",
  ja_comprou: "Já comprou",
  arquivado: "Arquivado",
};

export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  novo: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  em_atendimento: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  nao_respondeu: "bg-muted text-muted-foreground border-border",
  agendado: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  compareceu: "bg-green-500/15 text-green-400 border-green-500/30",
  nao_compareceu: "bg-red-500/15 text-red-400 border-red-500/30",
  em_negociacao: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  futuro: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  fechado: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  sem_interesse: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40",
  desistiu: "bg-red-900/30 text-red-300 border-red-800/40",
  ja_comprou: "bg-green-600/20 text-green-400 border-green-600/40",
  arquivado: "bg-muted text-muted-foreground border-border",
};

export const LEAD_INTERESTS = [
  "Imóvel", "Terreno", "Construção", "Reforma", "Veículo",
  "Moto", "Caminhão", "Maquinário", "Rural", "Capital de giro",
  "Consórcio", "Outro",
] as const;

export const LEAD_SOURCES = [
  "Instagram", "WhatsApp", "Indicação", "Lista fria", "CNPJ",
  "Lead quente", "Anúncio", "Central de Oportunidades", "Presencial", "Outro",
] as const;

export interface Lead {
  id: string;
  created_by: string;
  responsible_user_id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  interest: string;
  source: string;
  status: LeadStatus;
  desired_credit_value: number | null;
  desired_installment: number | null;
  available_down_payment: number | null;
  has_restriction: string | null;
  profession: string | null;
  income: number | null;
  decides_alone: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  responsible_name?: string;
}

export interface LeadHistoryEntry {
  id: string;
  lead_id: string;
  user_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
  user_name?: string;
}

export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}
