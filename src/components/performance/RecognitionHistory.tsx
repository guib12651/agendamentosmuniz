import { Card } from "@/components/ui/card";
import { PartyPopper, Eye, Clock } from "lucide-react";

interface HistoryItem {
  id: string;
  title: string;
  message: string;
  metric_label: string | null;
  metric_value: string | null;
  seen_at: string | null;
  created_at: string;
  recipient_name?: string;
  admin_name?: string;
}

interface Props {
  items: HistoryItem[];
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
};

export function RecognitionHistory({ items }: Props) {
  if (items.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Nenhum reconhecimento enviado ainda.
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <Card key={r.id} className="p-3 flex items-start gap-3">
          <PartyPopper className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">
              {r.recipient_name || "Funcionário"}
            </div>
            <div className="text-xs text-muted-foreground">
              {r.metric_label ? `${r.metric_label}` : r.title}
              {r.metric_value ? ` — ${r.metric_value}` : ""}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Parabenizado por {r.admin_name || "admin"} em {formatDate(r.created_at)}
            </div>
          </div>
          {r.seen_at ? (
            <span className="text-[11px] text-primary flex items-center gap-1">
              <Eye className="w-3 h-3" /> Visualizado
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pendente
            </span>
          )}
        </Card>
      ))}
    </div>
  );
}
