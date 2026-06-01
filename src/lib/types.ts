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
  statusHistory?: MeetingStatus[];
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

export type QuotaStatus = "active" | "contemplated" | "cancelled" | "pending";

export interface Quota {
  id: string;
  companyId?: string;
  companyName?: string;
  clientName: string;
  phone?: string;
  groupNumber: string;
  quotaNumber: string;
  creditValue: number;
  installmentValue: number;
  sellerId: string;
  sellerName: string;
  saleId?: string;
  status: QuotaStatus;
  createdAt: string;
  updatedAt: string;
}

export type BidType = "free" | "fixed" | "embedded";
export type BidStatus = "pending" | "contemplated" | "not_contemplated";

export interface Bid {
  id: string;
  companyId?: string;
  companyName?: string;
  quotaId: string;
  clientName: string;
  bidType: BidType;
  bidValue: number;
  percentage: number;
  assemblyDate: string;
  status: BidStatus;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export type OpportunityStatus = "pending" | "contacted" | "no_answer" | "scheduled" | "converted" | "archived";

export interface Opportunity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_user_id: string;
  lead_name: string;
  phone: string;
  city: string;
  opportunity_type: string;
  vehicle_or_property: string;
  desired_value: string;
  desired_installment: string;
  available_down_payment: string;
  notes: string;
  status: OpportunityStatus;
  contact_attempts: number;
  last_contact_date: string | null;
  import_batch_id: string | null;
  ocr_raw_text: string | null;
  profiles?: {
    display_name: string;
  };
}
