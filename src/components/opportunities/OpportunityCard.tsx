import React, { useState, useEffect } from "react";
import { Opportunity } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Check, X, Calendar, User, MapPin, Building2, Car, Clock, Trash2, Save, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onUpdateStatus: (id: string, status: string) => void;
  onSchedule: (opportunity: Opportunity) => void;
  onDelete?: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => Promise<void> | void;
  isAdmin: boolean;
}

const statusConfig = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  contacted: { label: "Atendeu", color: "bg-green-100 text-green-700 border-green-200" },
  no_answer: { label: "Não Atendeu", color: "bg-red-100 text-red-700 border-red-200" },
  scheduled: { label: "Agendado", color: "bg-blue-100 text-blue-700 border-blue-200" },
  converted: { label: "Convertido", color: "bg-purple-100 text-purple-700 border-purple-200" },
  archived: { label: "Arquivado", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function OpportunityCard({ opportunity, onUpdateStatus, onSchedule, onDelete, onUpdateNotes, isAdmin }: OpportunityCardProps) {
  const status = statusConfig[opportunity.status] || statusConfig.pending;
  const [notes, setNotes] = useState(opportunity.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(opportunity.notes || "");
  }, [opportunity.notes]);

  const handleSaveNotes = async () => {
    if (!onUpdateNotes) return;
    setSavingNotes(true);
    try {
      await onUpdateNotes(opportunity.id, notes);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleNoWhatsApp = async () => {
    try {
      await onUpdateStatus(opportunity.id, "no_whatsapp");
      toast.success("Marcado como sem WhatsApp");
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleWhatsApp = () => {
    const phone = opportunity.phone.replace(/\D/g, "");
    if (!phone) return;
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  return (
    <Card className="overflow-hidden border-border shadow-sm hover:shadow-md transition-shadow relative w-full">
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              {opportunity.opportunity_type?.toLowerCase().includes("imóvel") ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <Car className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight truncate max-w-[120px] sm:max-w-none">{opportunity.lead_name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {opportunity.city}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
            {onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                onClick={() => {
                  if (window.confirm("Deseja mesmo excluir o contato?")) {
                    onDelete(opportunity.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Telefone</span>
            <span className="font-medium">{opportunity.phone || "N/A"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Recebido em</span>
            <span className="font-medium">
              {format(new Date(opportunity.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Carta Desejada</span>
            <span className="font-medium">R$ {opportunity.desired_value || "0,00"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Entrada</span>
            <span className="font-medium">R$ {opportunity.available_down_payment || "0,00"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Parcela</span>
            <span className="font-medium">R$ {opportunity.desired_installment || "0,00"}</span>
          </div>
        </div>

        {opportunity.vehicle_or_property && (
          <div className="bg-muted/30 p-2 rounded text-xs">
            <span className="font-bold block mb-1">Interesse:</span>
            {opportunity.vehicle_or_property}
          </div>
        )}

        {opportunity.notes && (
          <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded text-xs border border-amber-100 dark:border-amber-900/30">
            <span className="font-bold block mb-1 flex items-center gap-1 text-amber-800 dark:text-amber-200 uppercase text-[9px]">
              <StickyNote className="w-3 h-3" /> Observação Histórica
            </span>
            <p className="text-amber-900/80 dark:text-amber-100/70 italic whitespace-pre-wrap">
              {opportunity.notes}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="w-3 h-3" />
            {isAdmin ? `Resp: ${opportunity.profiles?.display_name || "N/A"}` : "Minha Oportunidade"}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            Tentativas: {opportunity.contact_attempts}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-1.5 sm:p-2 bg-muted/20 grid grid-cols-2 gap-1.5 sm:gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-red-500 hover:bg-red-600 text-white border-none text-[10px] sm:text-xs h-8 sm:h-9 px-2"
          onClick={handleNoWhatsApp}
        >
          <MessageSquare className="w-4 h-4 mr-1" /> Sem WhatsApp
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-blue-500 hover:bg-blue-600 text-white border-none text-[10px] sm:text-xs h-8 sm:h-9 px-2"
          onClick={() => onUpdateStatus(opportunity.id, "contacted")}
        >
          <Check className="w-4 h-4 mr-1" /> Atendeu
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-purple-500 hover:bg-purple-600 text-white border-none text-[10px] sm:text-xs h-8 sm:h-9 px-2"
          onClick={() => onSchedule(opportunity)}
        >
          <Calendar className="w-4 h-4 mr-1" /> Agendado
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-red-500 hover:bg-red-600 text-white border-none text-[10px] sm:text-xs h-8 sm:h-9 px-2"
          onClick={() => onUpdateStatus(opportunity.id, "no_answer")}
        >
          <X className="w-4 h-4 mr-1" /> Não Atendeu
        </Button>
      </CardFooter>
    </Card>
  );
}
