import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";

interface ProfileLite {
  id: string;
  display_name: string;
  username: string;
}

interface MeetingLite {
  lead_name: string;
  phone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function NoShowPrintDialog({ open, onOpenChange }: Props) {
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<MeetingLite[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, display_name, username")
      .order("display_name")
      .then(({ data }) => setProfiles((data as any) ?? []));
  }, [open]);

  const fetchLeads = async (sellerName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("lead_name, phone")
        .eq("status", "não compareceu")
        .eq("pre_seller", sellerName);

      if (error) throw error;
      setLeads(data ?? []);
    } catch (e: any) {
      toast.error("Erro ao buscar leads");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSeller) {
      const profile = profiles.find(p => p.id === selectedSeller);
      if (profile) {
        fetchLeads(profile.display_name);
      }
    } else {
      setLeads([]);
    }
  }, [selectedSeller, profiles]);

  const handlePrint = () => {
    if (leads.length === 0) return;
    
    const seller = profiles.find(p => p.id === selectedSeller)?.display_name || "";
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Leads Não Compareceram - ${seller}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Leads: Não Compareceu</h1>
          <p><strong>Pré-vendedor:</strong> ${seller}</p>
          <p><strong>Total:</strong> ${leads.length} leads</p>
          <table>
            <thead>
              <tr>
                <th>Nome do Lead</th>
                <th>Telefone</th>
              </tr>
            </thead>
            <tbody>
              ${leads.map(l => `
                <tr>
                  <td>${l.lead_name}</td>
                  <td>${l.phone}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="footer">Gerado em ${new Date().toLocaleString("pt-BR")}</div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="size-5 text-destructive" />
            Imprimir Leads (Não Compareceu)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Selecione o membro da equipe</Label>
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSeller && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Buscando leads...</p>
                </div>
              ) : leads.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-sm font-medium">{leads.length} leads encontrados</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {leads.map((l, i) => (
                      <div key={i} className="text-sm flex justify-between gap-2 p-2 rounded bg-background border border-border/50">
                        <span className="font-medium truncate">{l.lead_name}</span>
                        <span className="text-muted-foreground shrink-0">{l.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Nenhum lead com status "não compareceu" encontrado para este membro.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button 
            onClick={handlePrint} 
            disabled={leads.length === 0 || loading}
            className="gap-2"
          >
            <Printer className="size-4" />
            Imprimir Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
