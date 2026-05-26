export type RestrictionType = "clean" | "up_to_10k" | "above_10k";
export type MeetingStatus = "pending" | "compareceu" | "nao_compareceu" | "visita_realizada" | "em_negociacao" | "venda_concluida";
export type MarkingType = "lead_quente" | "cnpj" | "lista_fria" | "instagram" | "indicacao" | "reagendamento";
export type MeetingType = "presencial" | "online";
export type TriggerType = "imovel" | "construcao" | "reforma" | "carro" | "moto" | "caminhao" | "maquinario" | "rural";

export type FunnelStage = "appointment" | "visit" | "negotiation" | "sale";

export interface Meeting {
  id: string;
  leadName: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  preSeller: string;
  consultant: string;
  downPayment: string;
  installment: string;
  restriction: RestrictionType;
  notes: string;
  status: MeetingStatus;
  markingType: MarkingType;
  meetingType: MeetingType;
  trigger: TriggerType;
  city?: string;
  saleDate?: string;
  userId?: string | null;
  createdAt?: string; // ISO timestamp when the meeting was registered
  funnelStage?: FunnelStage;
  archived?: boolean;
}

export interface Call {
  id: string;
  leadName: string;
  userId: string;
  userDisplayName?: string;
  callTime: string; // ISO string
  result: string;
  createdAt?: string;
}

export interface DailyCall {
  id: string;
  userId: string;
  userDisplayName?: string;
  amount: number;
  date: string;
  observations?: string;
  createdAt?: string;
}

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}
