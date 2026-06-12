import React, { useState } from "react";
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
import { ArrowLeft, Package, PlusCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProductionSales() {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
                  <ProductionSalesList refreshTrigger={refreshTrigger} />
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
