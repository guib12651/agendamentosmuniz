import { useMemo } from "react";
import { Meeting } from "@/lib/types";
import { PeriodType } from "@/components/PeriodFilter";
import { FIXED_TIME_SLOTS } from "@/lib/timeSlots";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface MeetingsChartProps {
  meetings: Meeting[];
  period: PeriodType;
  dateRange: { start: string; end: string };
}

const chartConfig: ChartConfig = {
  total: { label: "Total", color: "hsl(var(--muted-foreground))" },
  compareceu: { label: "Visitas", color: "hsl(var(--success))" },
  naoCompareceu: { label: "Não compareceu", color: "hsl(var(--destructive))" },
};

function getMonthLabel(monthIndex: number): string {
  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return labels[monthIndex] || "";
}

function buildChartData(meetings: Meeting[], period: PeriodType, dateRange: { start: string; end: string }) {
  if (period === "daily") {
    return FIXED_TIME_SLOTS.map((slot) => {
      const slotMeetings = meetings.filter((m) => m.time === slot);
      return {
        label: slot,
        total: slotMeetings.length,
        compareceu: slotMeetings.filter((m) => m.status === "compareceu").length,
        naoCompareceu: slotMeetings.filter((m) => m.status === "nao_compareceu").length,
      };
    });
  }

  if (period === "weekly") {
    const startDate = new Date(dateRange.start + "T12:00:00");
    const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayMeetings = meetings.filter((m) => m.date === dateStr);
      return {
        label: dayNames[i],
        total: dayMeetings.length,
        compareceu: dayMeetings.filter((m) => m.status === "compareceu").length,
        naoCompareceu: dayMeetings.filter((m) => m.status === "nao_compareceu").length,
      };
    });
  }

  if (period === "monthly") {
    const ref = new Date(dateRange.start + "T12:00:00");
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${dateRange.start.slice(0, 8)}${String(day).padStart(2, "0")}`;
      const dayMeetings = meetings.filter((m) => m.date === dateStr);
      return {
        label: String(day),
        total: dayMeetings.length,
        compareceu: dayMeetings.filter((m) => m.status === "compareceu").length,
        naoCompareceu: dayMeetings.filter((m) => m.status === "nao_compareceu").length,
      };
    });
  }

  // quarterly, semi_annual, annual, custom — group by month
  const startDate = new Date(dateRange.start + "T12:00:00");
  const endDate = new Date(dateRange.end + "T12:00:00");

  // For custom periods shorter than 45 days, group by day
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (period === "custom" && diffDays <= 45) {
    const data: { label: string; total: number; compareceu: number; naoCompareceu: number }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split("T")[0];
      const dayMeetings = meetings.filter((m) => m.date === dateStr);
      data.push({
        label: `${cursor.getDate()}/${cursor.getMonth() + 1}`,
        total: dayMeetings.length,
        compareceu: dayMeetings.filter((m) => m.status === "compareceu").length,
        naoCompareceu: dayMeetings.filter((m) => m.status === "nao_compareceu").length,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return data;
  }

  // Group by month
  const data: { label: string; total: number; compareceu: number; naoCompareceu: number }[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

  while (cursor <= endMonth) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthMeetings = meetings.filter((m) => {
      const d = new Date(m.date + "T12:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    });
    data.push({
      label: getMonthLabel(month),
      total: monthMeetings.length,
      compareceu: monthMeetings.filter((m) => m.status === "compareceu").length,
      naoCompareceu: monthMeetings.filter((m) => m.status === "nao_compareceu").length,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return data;
}

export default function MeetingsChart({ meetings, period, dateRange }: MeetingsChartProps) {
  const data = useMemo(() => buildChartData(meetings, period, dateRange), [meetings, period, dateRange]);

  const totalMeetings = meetings.length;
  const totalCompareceu = meetings.filter((m) => m.status === "compareceu").length;
  const taxaComparecimento = totalMeetings > 0 ? Math.round((totalCompareceu / totalMeetings) * 100) : 0;

  return (
    <div className="stat-card p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
          Desempenho de Agendamentos
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Taxa: <strong className="text-success">{taxaComparecimento}%</strong></span>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            className="text-muted-foreground"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--color-total)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="compareceu"
            stroke="var(--color-compareceu)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="naoCompareceu"
            stroke="var(--color-naoCompareceu)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Total</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-muted-foreground">Visitas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Não compareceu</span>
        </div>
      </div>
    </div>
  );
}
