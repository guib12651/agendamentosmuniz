import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, Briefcase, DollarSign } from "lucide-react";
import { Company, QuotaStatus, Meeting } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuotaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preFill?: Partial<Meeting>;
  userId?: string;
  userName?: string;
}

export default function QuotaForm({ isOpen, onClose, onSuccess, preFill, userId, userName }: QuotaFormProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [clientName, setClientName] = useState(preFill?.leadName || "");
  const [phone, setPhone] = useState(preFill?.phone || "");
  const [companyName, setCompanyName] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [quotaNumber, setQuotaNumber] = useState("");
  const [creditValue, setCreditValue] = useState(preFill?.downPayment?.replace(/\D/g, "") || ""); // Just a guess for prefill
  const [installmentValue, setInstallmentValue] = useState(preFill?.installment?.replace(/\D/g, "") || "");
  const [status, setStatus] = useState<QuotaStatus>("pending");

  useEffect(() => {
    const loadCompanies = async () => {
      const { data } = await supabase.from("companies").select("*").order("name");
      if (data) setCompanies(data.map(c => ({ id: c.id, name: c.name, createdAt: c.created_at })));
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (preFill) {
      setClientName(preFill.leadName || "");
      setPhone(preFill.phone || "");
    }
  }, [preFill]);

  const handleSubmit = async () => {
    if (!clientName || !companyName || !groupNumber || !quotaNumber) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const quotaData = {
        client_name: clientName,
        phone,
        company_name: companyName,
        group_number: groupNumber,
        quota_number: quotaNumber,
        credit_value: parseFloat(creditValue.replace(',', '.')) || 0,
        installment_value: parseFloat(installmentValue.replace(',', '.')) || 0,
        status,
        seller_id: userId,
        seller_name: userName,
        sale_id: preFill?.id
      };

      const { error } = await supabase.from("quotas").insert(quotaData);
      if (error) throw error;

      toast.success("Cota criada com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar cota");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card rounded-3xl border border-border shadow-2xl overflow-hidden p-0 text-foreground">
        <div className="bg-slate-900 p-6 text-white">
          <DialogTitle className="text-xl font-black">Transformar em Cota</DialogTitle>
          <p className="text-slate-400 text-sm font-medium">Complete os dados operacionais da cota</p>
        </div>
        <div className="p-0 overflow-y-auto max-h-[70vh]">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Cliente</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome completo" className="pl-10 bg-background border-border rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="pl-10 bg-background border-border rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Administradora</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Porto Seguro" className="pl-10 bg-background border-border rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Grupo</Label>
                <Input value={groupNumber} onChange={e => setGroupNumber(e.target.value)} placeholder="0000" className="bg-background border-border rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Cota</Label>
                <Input value={quotaNumber} onChange={e => setQuotaNumber(e.target.value)} placeholder="000" className="bg-background border-border rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Valor do Crédito</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                  <Input type="text" value={creditValue} onChange={e => setCreditValue(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="0,00" className="pl-10 bg-background border-border rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Valor da Parcela</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                  <Input type="text" value={installmentValue} onChange={e => setInstallmentValue(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="0,00" className="pl-10 bg-background border-border rounded-xl" />
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as QuotaStatus)}>
                  <SelectTrigger className="bg-background border-border rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4 pb-2">
              <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">Depois</Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-primary hover:bg-primary/90 rounded-xl font-bold min-w-[120px]">
                {loading ? "Criando..." : "Criar Cota"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
