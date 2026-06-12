import React from "react";
import { ProductionSalesForm } from "@/components/ProductionSalesForm";
import { ProductionSalesList } from "@/components/ProductionSalesList";
import { ProductionSalesChart } from "@/components/ProductionSalesChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Package, PlusCircle, TrendingUp, DollarSign, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProductionSales() {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalByItem, setTotalByItem] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalesData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("production_sales")
        .select("*")
        .order("production_date", { ascending: false });

      if (error) throw error;
      
      const sales = data || [];
      setSalesData(sales);
      
      const total = sales.reduce((acc, sale) => acc + Number(sale.total_price), 0);
      setTotalSales(total);
      
      const byItem = sales.reduce((acc, sale) => {
        const item = sale.product_name;
        acc[item] = (acc[item] || 0) + Number(sale.total_price);
        return acc;
      }, {} as Record<string, number>);
      setTotalByItem(byItem);
      
    } catch (error: any) {
      toast.error("Erro ao carregar dados de vendas: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendas por Produção</h1>
            <p className="text-muted-foreground">Gerencie e analise suas vendas de produtos fabricados.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
              <h3 className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalSales)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
              <ListOrdered className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Diferentes</p>
              <h3 className="text-2xl font-bold">{Object.keys(totalByItem).length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário lateral em desktop, topo em mobile */}
        <div className="lg:col-span-1">
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Novo Lançamento
              </CardTitle>
              <CardDescription>Cadastre uma nova venda de produção.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ProductionSalesForm onSuccess={handleRefresh} />
            </CardContent>
          </Card>
        </div>

        {/* Listagem e Gráficos */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Registros
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Análise
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Vendas</CardTitle>
                  <CardDescription>Lista de todas as vendas cadastradas recentemente.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6">
                    <ProductionSalesList refreshTrigger={refreshTrigger} />
                    
                    {Object.keys(totalByItem).length > 0 && (
                      <div className="mt-4 pt-6 border-t">
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Total por Produto</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(totalByItem).map(([item, total]) => (
                            <div key={item} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border text-sm">
                              <span className="font-medium">{item}</span>
                              <span className="font-bold text-primary">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="chart" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Desempenho de Produção</CardTitle>
                  <CardDescription>Visualização gráfica do faturamento por período.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductionSalesChart refreshTrigger={refreshTrigger} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
