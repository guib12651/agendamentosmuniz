import { supabase } from "@/integrations/supabase/client";
import { Meeting, TimeBlock, RestrictionType, MeetingStatus, MarkingType, MeetingType } from "./types";

export async function getMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("time", { ascending: true });

  if (error) {
    console.error("Error fetching meetings:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    leadName: row.lead_name,
    phone: row.phone,
    date: row.date,
    time: row.time.slice(0, 5),
    preSeller: row.pre_seller,
    consultant: row.consultant,
    downPayment: row.down_payment || "",
    installment: row.installment || "",
    restriction: row.restriction as RestrictionType,
    notes: row.notes || "",
    status: (row.status || "pending") as MeetingStatus,
    markingType: ((row as any).marking_type || "lead_quente") as MarkingType,
    meetingType: ((row as any).meeting_type || "presencial") as MeetingType,
    userId: (row as any).user_id || null,
  }));
}

export async function addMeeting(meeting: Omit<Meeting, "id">, userId: string): Promise<void> {
  const { error } = await supabase.from("meetings").insert({
    lead_name: meeting.leadName,
    phone: meeting.phone,
    date: meeting.date,
    time: meeting.time,
    pre_seller: meeting.preSeller,
    consultant: meeting.consultant,
    down_payment: meeting.downPayment,
    installment: meeting.installment,
    restriction: meeting.restriction,
    notes: meeting.notes,
    status: meeting.status || "pending",
    marking_type: meeting.markingType || "lead_quente",
    meeting_type: meeting.meetingType || "presencial",
    user_id: userId,
  } as any);
  if (error) throw error;
}

export async function updateMeeting(meeting: Meeting): Promise<void> {
  const { error } = await supabase
    .from("meetings")
    .update({
      lead_name: meeting.leadName,
      phone: meeting.phone,
      date: meeting.date,
      time: meeting.time,
      pre_seller: meeting.preSeller,
      consultant: meeting.consultant,
      down_payment: meeting.downPayment,
      installment: meeting.installment,
      restriction: meeting.restriction,
      notes: meeting.notes,
      status: meeting.status,
      marking_type: meeting.markingType,
      meeting_type: meeting.meetingType,
    } as any)
    .eq("id", meeting.id);
  if (error) throw error;
}

export async function updateMeetingStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("meetings")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

export async function getBlocks(): Promise<TimeBlock[]> {
  const { data, error } = await supabase
    .from("time_blocks")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching blocks:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    reason: row.reason || "",
  }));
}

export async function addBlock(block: Omit<TimeBlock, "id">): Promise<void> {
  const { error } = await supabase.from("time_blocks").insert({
    date: block.date,
    start_time: block.startTime,
    end_time: block.endTime,
    reason: block.reason,
  });
  if (error) throw error;
}

export async function updateBlock(block: TimeBlock): Promise<void> {
  const { error } = await supabase
    .from("time_blocks")
    .update({
      date: block.date,
      start_time: block.startTime,
      end_time: block.endTime,
      reason: block.reason,
    })
    .eq("id", block.id);
  if (error) throw error;
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from("time_blocks").delete().eq("id", id);
  if (error) throw error;
}

export async function getOccupiedSlots(date: string): Promise<{ time: string; leadName: string; meetingId: string }[]> {
  const { data, error } = await supabase.rpc("get_occupied_slots", { _date: date });
  if (error) {
    console.error("Error fetching occupied slots:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    time: row.slot_time.slice(0, 5),
    leadName: row.lead_name,
    meetingId: row.meeting_id,
  }));
}

export async function isTimeBlocked(date: string, time: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("date", date)
    .lte("start_time", time)
    .gt("end_time", time);

  if (error) {
    console.error("Error checking blocks:", error);
    return false;
  }
  return (data || []).length > 0;
}
  const { data, error } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("date", date)
    .lte("start_time", time)
    .gt("end_time", time);

  if (error) {
    console.error("Error checking blocks:", error);
    return false;
  }
  return (data || []).length > 0;
}
