import { TimeSlotInfo, MAX_MEETINGS_PER_SLOT } from "@/lib/timeSlots";
import { Clock, User, Ban } from "lucide-react";

interface TimeSlotGridProps {
  slots: TimeSlotInfo[];
  onOccupiedClick?: (meetingIds: string[]) => void;
}

export default function TimeSlotGrid({ slots, onOccupiedClick }: TimeSlotGridProps) {
  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="font-display font-bold text-base text-foreground uppercase tracking-tight">Horários do Dia</h2>
        </div>
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[10px] sm:text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/30">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" /> Livre</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" /> 1/{MAX_MEETINGS_PER_SLOT}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" /> Lotado</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted shadow-[0_0_8px_rgba(156,163,175,0.4)]" /> Bloqueado</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {slots.map((slot) => {
          const isAvailable = slot.status === "available";
          const isPartial = slot.status === "partial";
          const isOccupied = slot.status === "occupied";
          const isBlocked = slot.status === "blocked";
          const clickable = (isPartial || isOccupied) && slot.meetingIds?.length;

          return (
            <div
              key={slot.time}
              onClick={() => {
                if (clickable && slot.meetingIds && onOccupiedClick) {
                  onOccupiedClick(slot.meetingIds);
                }
              }}
              className={`
                rounded-xl border px-3 py-3 text-center transition-all select-none active:scale-95
                ${isAvailable ? "bg-success/10 border-success/30 text-success hover:bg-success/20" : ""}
                ${isPartial ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-500/20 shadow-lg shadow-amber-500/5" : ""}
                ${isOccupied ? "bg-destructive/10 border-destructive/30 text-destructive opacity-90 cursor-pointer hover:opacity-100 hover:bg-destructive/15" : ""}
                ${isBlocked ? "bg-muted/50 border-border/50 text-muted-foreground opacity-60" : ""}
              `}
            >
              <span className="font-display font-black text-lg sm:text-base tracking-tight">{slot.time}</span>
              {isAvailable && (
                <p className="text-[10px] mt-0.5 opacity-70">Disponível</p>
              )}
              {isPartial && (
                <p className="text-[10px] mt-0.5 truncate flex items-center justify-center gap-0.5">
                  <User className="w-2.5 h-2.5 shrink-0" />
                  {slot.meetingLeadNames?.[0] || "1/2 vagas"}
                </p>
              )}
              {isOccupied && (
                <p className="text-[10px] mt-0.5 truncate flex items-center justify-center gap-0.5">
                  <User className="w-2.5 h-2.5 shrink-0" />
                  Lotado ({slot.occupiedCount}/{MAX_MEETINGS_PER_SLOT})
                </p>
              )}
              {isBlocked && (
                <p className="text-[10px] mt-0.5 flex items-center justify-center gap-0.5">
                  <Ban className="w-2.5 h-2.5 shrink-0" />
                  Bloqueado
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
