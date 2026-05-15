import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, ChevronLeft, ChevronRight, ImagePlus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(false);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageGallery, setImageGallery] = useState<string[]>(() => {
    const saved = localStorage.getItem("followup_gallery");
    return saved ? JSON.parse(saved) : [];
  });

  const currentLead = leads[currentLeadIndex];

  useEffect(() => {
    localStorage.setItem("followup_gallery", JSON.stringify(imageGallery));
  }, [imageGallery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione uma imagem.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (!imageGallery.includes(base64String)) {
          setImageGallery(prev => [base64String, ...prev].slice(0, 6)); // Keep last 6 images
        }
        setSelectedFile(file);
        setPreviewUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectFromGallery = (base64: string) => {
    setPreviewUrl(base64);
    // Convert base64 to File object to maintain compatibility with share API if needed
    fetch(base64)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "gallery-image.png", { type: "image/png" });
        setSelectedFile(file);
      });
  };

  const removeFromGallery = (e: React.MouseEvent, base64: string) => {
    e.stopPropagation();
    setImageGallery(prev => prev.filter(img => img !== base64));
    if (previewUrl === base64) {
      removeFile();
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

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
    if (!currentLead) return;
    setLoading(true);
    try {
      const cleanPhone = currentLead.phone.replace(/\D/g, "");
      const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const message = `Olá ${currentLead.lead_name}! Notamos que você não conseguiu comparecer à nossa reunião agendada na Muniz Consultorias. 😕\n\nEntendemos que imprevistos acontecem! Gostaria de reagendar para uma nova data?\n\nEstamos à disposição para te ajudar a conquistar seus objetivos. Aguardamos seu retorno! 🚀`;
      
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[]; text?: string; title?: string }) => boolean;
        share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
      };

      // Directly open WhatsApp URL as the share API doesn't always go straight to the chat
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      if (selectedFile) {
        toast.success("Abrindo conversa... Lembre-se de anexar a imagem!");
      } else {
        toast.success("Abrindo conversa no WhatsApp...");
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
  }, [currentLead, currentLeadIndex, leads.length, onOpenChange, selectedFile]);

  if (!open || !currentLead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] p-0 border-primary/30 bg-card rounded-xl max-h-[90vh] flex flex-col">
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

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20">
            <p>Enviando para: <strong>{currentLead.lead_name}</strong></p>
          </div>

          <div className="p-6 space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <p className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Mensagem que será enviada:</p>
            <div className="bg-card p-3 rounded border border-border text-sm leading-relaxed italic text-foreground/80">
              "Olá <strong>{currentLead.lead_name}</strong>! Notamos que você não conseguiu comparecer à nossa reunião... Gostaria de reagendar?"
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Selecione uma Imagem:</p>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>

              {imageGallery.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => selectFromGallery(img)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${previewUrl === img ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'}`}
                >
                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={(e) => removeFromGallery(e, img)}
                    className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ opacity: previewUrl === img ? 1 : undefined }}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>

            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden border border-border h-48 bg-black/5">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                <button 
                  onClick={removeFile}
                  className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full shadow-lg"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            
            <p className="text-[10px] text-muted-foreground text-center italic">
              A imagem selecionada será lembrada para os próximos envios.
            </p>
          </div>
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
