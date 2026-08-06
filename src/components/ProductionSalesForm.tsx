import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  product_name: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres."),
  production_date: z.date({
    required_error: "A data de produção é obrigatória.",
  }),
  quantity: z.coerce.number().positive("A quantidade deve ser um número positivo."),
  unit_price: z.coerce.number().positive("O preço unitário deve ser um número positivo."),
});

interface ProductionSalesFormProps {
  onSuccess?: () => void;
}

export function ProductionSalesForm({ onSuccess }: ProductionSalesFormProps) {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      production_date: new Date(),
      quantity: 1,
      unit_price: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data: newSale, error } = await supabase.from("production_sales").insert({
        product_name: values.product_name,
        production_date: format(values.production_date, "yyyy-MM-dd"),
        quantity: values.quantity,
        unit_price: values.unit_price,
        user_id: profile?.id,
      }).select().single();

      if (error) throw error;

      // Criar reconhecimento para comemoração em tela cheia para todos os admins/vendedores
      const totalFormatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(values.quantity * values.unit_price);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["admin", "seller"]);

      if (profiles && profiles.length > 0) {
        const recognitions = profiles.map(p => ({
          recipient_user_id: p.id,
          admin_user_id: profile?.id || p.id,
          title: "🚀 NOVA VENDA!",
          message: `${profile?.displayName || "Um consultor"} acabou de realizar uma venda de ${values.product_name}!`,
          metric_label: "Valor",
          metric_value: totalFormatted,
        }));

        await supabase.from("recognitions").insert(recognitions);
      }

      if (error) throw error;

      toast.success("Venda de produção cadastrada com sucesso!");
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao cadastrar venda: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="product_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Cota X" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="production_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data de Produção</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço Unitário (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cadastrar Venda
        </Button>
      </form>
    </Form>
  );
}
