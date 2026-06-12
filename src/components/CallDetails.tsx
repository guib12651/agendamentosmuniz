import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";

interface CallDetail {
  userName: string;
  totalCalls: number;
  automaticCalls: number;
  manualCalls: number;
}

interface CallDetailsProps {
  details: CallDetail[];
  total: number;
}

const CallDetails: React.FC<CallDetailsProps> = ({ details, total }) => {
  return (
    <Card className="bg-card border-border shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border py-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
          <Phone className="w-4 h-4 text-amber-500" /> Detalhamento por Usuário
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-bold">Usuário</TableHead>
              <TableHead className="font-bold text-center">Automáticas</TableHead>
              <TableHead className="font-bold text-center">Manuais</TableHead>
              <TableHead className="font-bold text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.map((detail, idx) => (
              <TableRow key={idx} className="border-border hover:bg-muted/30">
                <TableCell className="font-medium">{detail.userName}</TableCell>
                <TableCell className="text-center text-muted-foreground">{detail.automaticCalls}</TableCell>
                <TableCell className="text-center text-muted-foreground">{detail.manualCalls}</TableCell>
                <TableCell className="text-right font-bold text-amber-500">{detail.totalCalls}</TableCell>
              </TableRow>
            ))}
            {details.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground italic">
                  Nenhuma ligação registrada no período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {details.length > 0 && (
            <tfoot className="bg-muted/30 font-bold border-t border-border">
              <TableRow>
                <TableCell colSpan={3} className="text-right">Soma Total:</TableCell>
                <TableCell className="text-right text-lg text-amber-500">{total}</TableCell>
              </TableRow>
            </tfoot>
          )}
        </Table>
      </CardContent>
    </Card>
  );
};

export default CallDetails;
