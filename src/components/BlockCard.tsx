import { TimeBlock } from "@/lib/types";
import { Ban, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface BlockCardProps {
  block: TimeBlock;
  onEdit: () => void;
  onDelete: () => void;
}

export default function BlockCard({ block, onEdit, onDelete }: BlockCardProps) {
  const { isAdmin } = useAuth();

  return (
    <div className="card-blocked">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ban className="w-5 h-5 text-destructive" />
          <div>
            <span className="text-lg font-display font-bold text-destructive">
              {block.startTime} - {block.endTime}
            </span>
            <p className="text-sm text-muted-foreground">
              Indisponível{block.reason ? ` — ${block.reason}` : ""}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
