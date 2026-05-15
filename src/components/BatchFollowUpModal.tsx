import { useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import iconeLogo from "@/assets/logo-muniz.png";

interface MeetingLite {
  lead_name: string;
  phone: string;
  date: string;
}

interface BatchFollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: MeetingLite[];
  sellerName: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export default function BatchFollowUpModal({ open, onOpenChange, leads, sellerName }: BatchFollowUpModalProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const currentLead = leads[currentLeadIndex];

  const handleNext = useCallback(() => {
    if (currentLeadIndex < leads.length - 1) {
      setCurrentLeadIndex(prev => prev + 1);
    }
  }, [currentLeadIndex, leads.length]);

  const handlePrev = useCallback(() => {
    if (currentLeadIndex > 0) {
      setCurrentLeadIndex(prev => prev - 1);
    }
  }, [currentLeadIndex]);

  const handleSendOne = useCallback(async () => {
    if (!captureRef.current || !currentLead) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#0f1729",
        scale: 1.5,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) {
        toast.error("Erro ao gerar imagem.");
        return;
      }

      const cleanPhone = currentLead.phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const message = `Olá ${currentLead.lead_name}! Notamos que você não conseguiu comparecer à nossa reunião agendada na Muniz Consultorias. 😕\n\nEntendemos que imprevistos acontecem! Gostaria de reagendar para uma nova data?\n\nEstamos à disposição para te ajudar a conquistar seus objetivos. Aguardamos seu retorno! 🚀`;
      
      const fileName = `followup-${currentLead.lead_name.replace(/\s+/g, "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
      };

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], text: message, title: "Follow-up Muniz" });
        } catch (shareErr: any) {
          // Se o usuário cancelar o compartilhamento (AbortError ou NotAllowedError)
          if (shareErr.name === 'AbortError' || shareErr.name === 'NotAllowedError') {
            console.log("Compartilhamento interrompido pelo usuário");
            setLoading(false);
            return;
          }
          console.error("Erro no Share API:", shareErr);
          throw shareErr;
        }
      } else {
        const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Imagem gerada! Anexe-a no WhatsApp.");
      }

      if (currentLeadIndex < leads.length - 1) {
        setCurrentLeadIndex(prev => prev + 1);
      } else {
        toast.success("Todos os follow-ups foram processados!");
        onOpenChange(false);
      }
    } catch (err) {
      toast.error("Erro ao enviar follow-up.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentLead, currentLeadIndex, leads.length, onOpenChange]);

  if (!open || !currentLead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 overflow-hidden border-primary/30 bg-card rounded-xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <MessageSquare className="size-4 text-primary" />
              Follow-up em Massa ({currentLeadIndex + 1}/{leads.length})
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 h-8 w-8"
                onClick={handlePrev}
                disabled={currentLeadIndex === 0 || loading}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 h-8 w-8"
                onClick={handleNext}
                disabled={currentLeadIndex === leads.length - 1 || loading}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20">
          <p>Enviando para: <strong>{currentLead.lead_name}</strong></p>
        </div>

        {/* Capture Area */}
        <div ref={captureRef} className="bg-card">
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-6 py-6 text-center">
            <img src={iconeLogo} alt="Logo" className="mx-auto h-12 w-12 mb-3" />
            <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Muniz Consultorias</p>
            <h2 className="text-xl font-display font-bold text-foreground">Sentimos sua falta!</h2>
          </div>
          
          <div className="px-8 py-6 space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <p className="text-sm text-foreground leading-relaxed">
                Olá <span className="font-bold text-primary">{currentLead.lead_name}</span>, notamos que você não compareceu à nossa reunião.
              </p>
              <p className="text-sm text-foreground mt-3 leading-relaxed">
                Ainda queremos te ajudar com seu planejamento! Vamos remarcar?
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Consultor Responsável</span>
              <span className="text-sm font-semibold">{sellerName}</span>
            </div>
          </div>
          
          <div className="bg-primary/5 py-3 text-center border-t border-primary/10">
            <p className="text-[10px] text-primary/60">Juntos pelo seu objetivo</p>
          </div>
        </div>

        <DialogFooter className="p-4 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1 h-11">
            Cancelar
          </Button>
          <Button onClick={handleSendOne} disabled={loading} className="sm:flex-2 h-11 gap-2 bg-success hover:bg-success/90 text-white">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <WhatsAppIcon className="size-4" />}
            {currentLeadIndex === leads.length - 1 ? "Enviar Último" : "Enviar e Próximo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
