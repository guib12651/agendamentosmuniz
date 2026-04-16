import { useRef, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Calendar, Clock, User, Briefcase, MapPin, Monitor, Share2, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

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
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#0f1729",
        scale: 2,
        useCORS: true,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) {
        toast.error("Erro ao gerar imagem.");
        return;
      }

      const file = new File([blob], `reuniao-${data.leadName.replace(/\s+/g, "-")}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Reunião Agendada - Muniz Consultorias",
          text: `Reunião agendada com ${data.leadName}`,
          files: [file],
        });
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Imagem salva! Envie manualmente ao lead.");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Erro ao compartilhar.");
        console.error(err);
      }
    } finally {
      setSharing(false);
    }
  }, [data.leadName]);

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
            <CheckCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-primary mb-1.5 sm:mb-2" />
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
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {sharing ? "Gerando imagem..." : "Compartilhar"}
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
