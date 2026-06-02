import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Calendar as CalendarIcon } from "lucide-react";

interface OpportunityFiltersProps {
  status: string;
  onStatusChange: (val: string) => void;
  type: string;
  onTypeChange: (val: string) => void;
  city: string;
  onCityChange: (val: string) => void;
  period: string;
  onPeriodChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  cities: string[];
  user?: string;
  onUserChange?: (val: string) => void;
  users?: string[];
  showUserFilter?: boolean;
}

export default function OpportunityFilters({
  status, onStatusChange,
  type, onTypeChange,
  city, onCityChange,
  period, onPeriodChange,
  search, onSearchChange,
  cities,
  user = "all", onUserChange,
  users = [],
  showUserFilter = false,
}: OpportunityFiltersProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${showUserFilter ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-2 sm:gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border shadow-sm`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Nome, tel ou cidade..." 
          className="pl-9" 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="pending">Não Contatados</SelectItem>
          <SelectItem value="contacted">Atenderam</SelectItem>
          <SelectItem value="no_answer">Não Atenderam</SelectItem>
          <SelectItem value="scheduled">Agendados</SelectItem>
          <SelectItem value="converted">Convertidos</SelectItem>
          <SelectItem value="archived">Arquivados</SelectItem>
        </SelectContent>
      </Select>

      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Tipos</SelectItem>
          <SelectItem value="imóvel">🏠 Imóvel</SelectItem>
          <SelectItem value="veículo">🚗 Veículo</SelectItem>
        </SelectContent>
      </Select>

      <Select value={city} onValueChange={onCityChange}>
        <SelectTrigger>
          <SelectValue placeholder="Cidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Cidades</SelectItem>
          {cities.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="Período" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="yesterday">Ontem</SelectItem>
          <SelectItem value="7days">Últimos 7 dias</SelectItem>
          <SelectItem value="30days">Últimos 30 dias</SelectItem>
          <SelectItem value="all">Todo o período</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
