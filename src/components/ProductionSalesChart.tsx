import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, startOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductionSalesChartProps {
  refreshTrigger: number;
}

export function ProductionSalesChart({ refreshTrigger }: ProductionSalesChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: sales, error } = await supabase
          .from("production_sales")
          .select("*")
          .order("production_date", { ascending: true });

        if (error) throw error;

        // Aggregate data
        const aggregated: Record<string, number> = {};

        sales?.forEach((sale) => {
          let key = "";
          const date = parseISO(sale.production_date);

          if (view === "daily") {
            key = format(date, "dd/MM");
          } else if (view === "weekly") {
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            key = "Semana " + format(weekStart, "dd/MM");
          } else {
            key = format(date, "MMMM", { locale: ptBR });
          }

          aggregated[key] = (aggregated[key] || 0) + Number(sale.total_price);
        });

        const chartData = Object.entries(aggregated).map(([name, total]) => ({
          name,
          total,
        }));

        setData(chartData);
      } catch (error) {
        console.error("Erro ao carregar gráfico:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [view, refreshTrigger]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={view} onValueChange={(v: any) => setView(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Diário</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[300px] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Sem dados para o gráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tick={{ fill: "#666" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tick={{ fill: "#666" }}
                tickFormatter={(value) =>
                  `R$ ${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}`
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(value)
                }
              />
              <Bar
                dataKey="total"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
