export const FIXED_TIME_SLOTS = [
  "09:15", "09:45",
  "10:15", "10:45",
  "11:15", "11:45",
  "14:15", "14:45",
  "15:15", "15:45",
  "16:15", "16:45",
  "17:15", "17:45",
] as const;

export type SlotStatus = "available" | "occupied" | "blocked";

export interface TimeSlotInfo {
  time: string;
  status: SlotStatus;
  meetingLeadName?: string;
  meetingId?: string;
}
