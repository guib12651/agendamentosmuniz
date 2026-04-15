import { TimeSlotInfo } from "@/lib/timeSlots";
import { Clock, User, Ban } from "lucide-react";

interface TimeSlotGridProps {
  slots: TimeSlotInfo[];
}

export default function TimeSlotGrid({ slots }: TimeSlotGridProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="font-display font-bold text-sm sm:text-base text-foreground">Horários do Dia</h2>
        <div className="flex items-center gap-3 ml-auto text-[10px] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success" /> Livre</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-destructive" /> Ocupado</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Bloqueado</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {slots.map((slot) => {
          const isAvailable = slot.status === "available";
          const isOccupied = slot.status === "occupied";
          const isBlocked = slot.status === "blocked";

          return (
            <div
              key={slot.time}
              className={`
                rounded-lg border px-3 py-2.5 sm:py-2 text-center transition-colors select-none
                ${isAvailable ? "bg-success/15 border-success/30 text-success" : ""}
                ${isOccupied ? "bg-destructive/15 border-destructive/30 text-destructive opacity-80" : ""}
                ${isBlocked ? "bg-muted border-border text-muted-foreground opacity-60" : ""}
              `}
            >
              <span className="font-display font-bold text-base sm:text-sm">{slot.time}</span>
              {isAvailable && (
                <p className="text-[10px] mt-0.5 opacity-70">Disponível</p>
              )}
              {isOccupied && (
                <p className="text-[10px] mt-0.5 truncate flex items-center justify-center gap-0.5">
                  <User className="w-2.5 h-2.5 shrink-0" />
                  {slot.meetingLeadName || "Ocupado"}
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
