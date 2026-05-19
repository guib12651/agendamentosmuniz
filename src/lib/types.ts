export type RestrictionType = "clean" | "up_to_10k" | "above_10k";
export type MeetingStatus = "pending" | "compareceu" | "nao_compareceu";
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
  userId?: string | null;
  createdAt?: string; // ISO timestamp when the meeting was registered
  funnelStage?: FunnelStage;
}

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}
