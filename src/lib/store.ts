import { Meeting, TimeBlock } from "./types";

const MEETINGS_KEY = "muniz_meetings";
const BLOCKS_KEY = "muniz_blocks";

export function getMeetings(): Meeting[] {
  const data = localStorage.getItem(MEETINGS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveMeetings(meetings: Meeting[]) {
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
}

export function addMeeting(meeting: Meeting) {
  const meetings = getMeetings();
  meetings.push(meeting);
  saveMeetings(meetings);
}

export function updateMeeting(updated: Meeting) {
  const meetings = getMeetings().map((m) => (m.id === updated.id ? updated : m));
  saveMeetings(meetings);
}

export function deleteMeeting(id: string) {
  saveMeetings(getMeetings().filter((m) => m.id !== id));
}

export function getBlocks(): TimeBlock[] {
  const data = localStorage.getItem(BLOCKS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveBlocks(blocks: TimeBlock[]) {
  localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
}

export function addBlock(block: TimeBlock) {
  const blocks = getBlocks();
  blocks.push(block);
  saveBlocks(blocks);
}

export function updateBlock(updated: TimeBlock) {
  const blocks = getBlocks().map((b) => (b.id === updated.id ? updated : b));
  saveBlocks(blocks);
}

export function deleteBlock(id: string) {
  saveBlocks(getBlocks().filter((b) => b.id !== id));
}

export function isTimeBlocked(date: string, time: string): boolean {
  const blocks = getBlocks().filter((b) => b.date === date);
  return blocks.some((b) => time >= b.startTime && time < b.endTime);
}
