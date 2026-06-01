import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Opportunity } from "@/lib/types";

interface ScheduleModalProps {
  isOpen: boolean;
  opportunity: Opportunity | null;
  onClose: () => void;
  onConfirm: (id: string, date: string, time: string, notes: string) => void;
}

export default function ScheduleModal({ isOpen, opportunity, onClose, onConfirm }: ScheduleModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (!opportunity) return;
    onConfirm(opportunity.id, date, time, notes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>📅 Agendar Reunião</DialogTitle>
          <DialogDescription>
            {opportunity ? `Agendando para: ${opportunity.lead_name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Input 
                id="time" 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observação</Label>
            <Textarea 
              id="notes" 
              placeholder="Ex: Cliente prefere atendimento presencial..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!date || !time}>Confirmar Agendamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
