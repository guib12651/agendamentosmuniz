import React from 'react';
import { Target, Upload, Phone, Calendar, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OpportunitiesCenter() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Target className="w-8 h-8" /> Central de Oportunidades
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie leads e acompanhe o fluxo de vendas.</p>
        </div>
        <Button className="flex items-center gap-2">
          <Upload className="w-4 h-4" /> Importar Oportunidades
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Placeholder cards */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h3 className="font-semibold text-yellow-600">Não Contatados</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h3 className="font-semibold text-green-600">Atenderam</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h3 className="font-semibold text-red-600">Não Atenderam</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h3 className="font-semibold text-blue-600">Agendados</h3>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
}
