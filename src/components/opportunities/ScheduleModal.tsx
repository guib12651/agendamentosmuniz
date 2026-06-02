import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Opportunity } from "@/lib/types";
import MeetingForm from "@/components/MeetingForm";
import MeetingSuccessModal from "@/components/MeetingSuccessModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ScheduleModalProps {
  isOpen: boolean;
  opportunity: Opportunity | null;
  onClose: () => void;
  onConfirm: (id: string, date: string, time: string, notes: string) => void;
}

export default function ScheduleModal({ isOpen, opportunity, onClose, onConfirm }: ScheduleModalProps) {
  const { profile, isAdmin } = useAuth();
  const [successData, setSuccessData] = useState<any>(null);

  if (!opportunity) return null;

  // Initial data for the form based on the opportunity
  const initialMeetingData = {
    leadName: opportunity.lead_name,
    phone: opportunity.phone,
    date: new Date().toISOString().split("T")[0],
    time: "",
    preSeller: profile?.displayName || "",
    consultant: "",
    downPayment: opportunity.available_down_payment || "",
    installment: opportunity.desired_installment || "",
    restriction: "clean" as const,
    notes: "", // Deixado vazio conforme solicitado para remover informações de data/hora automática
    status: "pending" as const,
    markingType: "lead_quente" as const,
    meetingType: "presencial" as const,
    trigger: opportunity.opportunity_type?.toLowerCase().includes("imóvel") ? "imovel" as const : "carro" as const,
    city: opportunity.city || "",
  };

  const handleSave = async (savedDate?: string, data?: any) => {
    if (data) {
      try {
        await onConfirm(opportunity.id, data.date, data.time, data.notes || "");
        setSuccessData(data);
      } catch (err) {
        console.error("Error confirming schedule:", err);
        toast.error("Erro ao vincular agendamento ao lead.");
      }
    }
  };

  if (successData) {
    return (
      <MeetingSuccessModal 
        data={successData} 
        onClose={() => {
          setSuccessData(null);
          onClose();
        }} 
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📅 Agendar Reunião</DialogTitle>
          <DialogDescription>
            Agendando para: {opportunity.lead_name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <MeetingForm 
            onSave={handleSave}
            onCancel={onClose}
            userId={profile?.id || ""}
            userDisplayName={profile?.displayName || ""}
            isAdmin={isAdmin}
            submitButtonLabel="Enviar reunião no WhatsApp"
            // We pass the partial data as editMeeting to pre-fill the form
            // But we'll treat it as a new meeting (no id)
            editMeeting={initialMeetingData as any}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
