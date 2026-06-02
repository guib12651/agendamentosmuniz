import { useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Calendar, Clock, User, Briefcase, MapPin, Monitor, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import iconeSucesso from "@/assets/logo-muniz.png";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface SuccessData {
  leadName: string;
  phone: string;
  date: string;
  time: string;
  meetingType: string;
  preSeller: string;
  consultant?: string;
}

interface MeetingSuccessModalProps {
  data: SuccessData;
  onClose: () => void;
}

export default function MeetingSuccessModal({ data, onClose }: MeetingSuccessModalProps) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const handleShare = useCallback(async () => {
    if (!captureRef.current) return;
    setSharing(true);
    
    try {
      // 1. Generate image FIRST
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#0f1729",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) {
        throw new Error("Erro ao gerar imagem");
      }

      const cleanPhone = data.phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const message = `Olá ${data.leadName}! Segue a confirmação do seu agendamento com a Muniz Consultorias. 📋\n\n📅 Data: ${formatDate(data.date)}\n⏰ Horário: ${data.time}\n📍 Tipo: ${data.meetingType === "presencial" ? "Presencial" : "Online"}\n\nEndereço: Rua Bertino Passos, Edifício Viana, 2° andar, sala 202, Centro Jequié-BA.\n\n📍Referências:\nRua da embasa\nEm frente à CVC\nEm cima da loja Bem Vestida.\n\nhttps://maps.app.goo.gl/843aHsLskYHN8BED9?g_st=ipc\n\n*Documentação Necessária*\n\nCPF\nRG\nou CNH\nComprovante de Endereço\n\n*Caso seja casado(a) no civil*\n\nRG\nCPF da(o) esposa(o)\nCertidão de casamento.`;
      
      const fileName = `reuniao-${data.leadName.replace(/\s+/g, "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // 2. Try Combined Share (Text + Image) - Best for Mobile
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
      };

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({ 
            files: [file], 
            text: message, 
            title: "Agendamento Muniz" 
          });
          toast.success("Confirmação enviada com sucesso!");
          onClose();
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            setSharing(false);
            return;
          }
          console.warn("Share API failed, falling back to WhatsApp link", err);
        }
      }

      // 3. Fallback: Open WhatsApp (Text) + Download (Image)
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Mensagem aberta e imagem baixada. Anexe-a no WhatsApp.");
      onClose();
    } catch (err) {
      toast.error("Erro ao gerar confirmação. Tente novamente.");
      console.error(err);
    } finally {
      setSharing(false);
    }
  }, [data, onClose]);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 overflow-hidden border-primary/30 bg-card rounded-xl">
        {/* Capture area */}
        <div ref={captureRef} className="bg-card">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 text-center">
            <p className="text-[10px] sm:text-xs font-display tracking-widest uppercase text-muted-foreground mb-2 sm:mb-3">
              Muniz Consultorias
            </p>
            <img src={iconeSucesso} alt="Muniz Consultorias" className="mx-auto h-12 w-12 sm:h-14 sm:w-14 mb-1.5 sm:mb-2" crossOrigin="anonymous" />
            <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">
              Reunião Agendada com Sucesso!
            </h2>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-2.5 sm:space-y-3">
            <Row icon={<User className="h-4 w-4" />} label="Lead" value={data.leadName} />
            <Row icon={<Phone className="h-4 w-4" />} label="Telefone" value={data.phone} />
            <Row icon={<Calendar className="h-4 w-4" />} label="Data" value={formatDate(data.date)} />
            <Row icon={<Clock className="h-4 w-4" />} label="Horário" value={data.time} />
            <Row
              icon={data.meetingType === "presencial" ? <MapPin className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              label="Tipo"
              value={data.meetingType === "presencial" ? "Presencial" : "Online"}
            />
            <Row icon={<Briefcase className="h-4 w-4" />} label="Pré-vendedor" value={data.preSeller} />
            {data.consultant && (
              <Row icon={<User className="h-4 w-4" />} label="Consultor" value={data.consultant} />
            )}
          </div>
        </div>

        {/* Actions (outside capture area) */}
        <div className="px-4 sm:px-6 pb-4 pt-1 space-y-2">
          <Button
            className="w-full h-11 sm:h-10 gap-2"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
            {sharing ? "Gerando imagem..." : "Enviar via WhatsApp"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 text-sm">
      <span className="text-primary shrink-0">{icon}</span>
      <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs sm:text-sm">{label}</span>
      <span className="font-semibold text-foreground text-xs sm:text-sm break-all">{value}</span>
    </div>
  );
}
