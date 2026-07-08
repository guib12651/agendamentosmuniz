import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_BADGE, LeadHistoryEntry } from "@/lib/leadsTypes";
import { getLeadHistory } from "@/lib/leadsStore";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; lead: Lead | null; }

export default function LeadDetailsSheet({ open, onOpenChange, lead }: Props) {
  const [history, setHistory] = useState<LeadHistoryEntry[]>([]);

  useEffect(() => {
    if (open && lead) getLeadHistory(lead.id).then(setHistory);
  }, [open, lead]);

  if (!lead) return null;

  const row = (l: string, v: any) => (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/50 text-sm">
      <span className="text-muted-foreground">{l}</span>
      <span className="text-right">{v ?? "—"}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{lead.name}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <span className={`inline-flex px-2 py-1 rounded-md text-xs border ${LEAD_STATUS_BADGE[lead.status]}`}>
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>
          <div>
            {row("Telefone", lead.phone)}
            {row("Interesse", lead.interest)}
            {row("Origem", lead.source)}
            {row("Responsável", lead.responsible_name)}
            {row("Crédito desejado", lead.desired_credit_value)}
            {row("Parcela", lead.desired_installment)}
            {row("Entrada", lead.available_down_payment)}
            {row("Restrição", lead.has_restriction)}
            {row("Profissão", lead.profession)}
            {row("Renda", lead.income)}
            {row("Decide sozinho", lead.decides_alone)}
            {row("Próximo retorno", lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString("pt-BR") : null)}
            {row("Criado em", new Date(lead.created_at).toLocaleString("pt-BR"))}
            {row("Atualizado em", new Date(lead.updated_at).toLocaleString("pt-BR"))}
          </div>
          {lead.notes && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Observações</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
          <div>
            <h4 className="font-semibold text-sm mb-2">Histórico</h4>
            <ul className="space-y-2">
              {history.length === 0 && <li className="text-xs text-muted-foreground">Sem registros.</li>}
              {history.map((h) => (
                <li key={h.id} className="text-xs border-l-2 border-primary/40 pl-2">
                  <div className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")} — {h.user_name || "—"}</div>
                  <div>{h.description}{h.old_value && h.new_value ? `: ${h.old_value} → ${h.new_value}` : ""}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
