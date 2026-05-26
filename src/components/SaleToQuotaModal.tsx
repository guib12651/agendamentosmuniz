import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight, Clock } from "lucide-react";
import logo from "@/assets/logo-muniz.png";

interface SaleToQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuota: () => void;
  clientName: string;
}

export default function SaleToQuotaModal({ isOpen, onClose, onCreateQuota, clientName }: SaleToQuotaModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl bg-white">
        <div className="bg-primary/5 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Venda Concluída!</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Parabéns pela venda para <span className="text-primary font-bold">{clientName}</span>.
            </p>
          </div>
        </div>
        <div className="p-8 pt-4 space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <img src={logo} alt="Muniz" className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Deseja transformar esta venda em uma <span className="font-bold text-slate-900">cota oficial</span> agora? Isso permite o acompanhamento pós-venda e lances.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-3 pt-2">
            <Button 
              onClick={onCreateQuota} 
              className="bg-primary hover:bg-primary/90 rounded-2xl h-14 font-bold text-base gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              Criar Cota Agora <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="rounded-2xl h-12 font-bold text-slate-400 hover:text-slate-600 gap-2"
            >
              <Clock className="w-4 h-4" /> Deixar para Depois
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
