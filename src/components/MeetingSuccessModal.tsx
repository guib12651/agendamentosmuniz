import { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Phone, Calendar, Clock, User, Briefcase, MapPin, Monitor } from "lucide-react";

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
  const [progress, setProgress] = useState(100);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const start = Date.now();
    const timer = setTimeout(() => onCloseRef.current(), 7000);
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / 7000) * 100));
    }, 50);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-primary/30 bg-card">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-6 pt-6 pb-4 text-center">
          <p className="text-xs font-display tracking-widest uppercase text-muted-foreground mb-3">Muniz Consultorias</p>
          <CheckCircle className="mx-auto h-12 w-12 text-primary mb-2" />
          <h2 className="text-xl font-display font-bold text-foreground">Reunião Agendada com Sucesso!</h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 space-y-3">
          <Row icon={<User className="h-4 w-4" />} label="Lead" value={data.leadName} />
          <Row icon={<Phone className="h-4 w-4" />} label="Telefone" value={data.phone} />
          <Row icon={<Calendar className="h-4 w-4" />} label="Data" value={formatDate(data.date)} />
          <Row icon={<Clock className="h-4 w-4" />} label="Horário" value={data.time} />
          <Row
            icon={data.meetingType === "presencial" ? <MapPin className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            label="Tipo"
            value={data.meetingType === "presencial" ? "📍 Presencial" : "💻 Online"}
          />
          <Row icon={<Briefcase className="h-4 w-4" />} label="Pré-vendedor" value={data.preSeller} />
          {data.consultant && <Row icon={<User className="h-4 w-4" />} label="Consultor" value={data.consultant} />}
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 pt-2 space-y-3">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Button variant="outline" className="w-full" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-primary">{icon}</span>
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
