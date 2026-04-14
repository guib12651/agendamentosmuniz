export type RestrictionType = "clean" | "up_to_10k" | "above_10k";

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
}

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}
