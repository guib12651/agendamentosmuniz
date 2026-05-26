    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, onClick }: any) {
  return (
    <Card 
      className="transition-all duration-300 hover:scale-[1.02] border border-border shadow-sm bg-card"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-5 flex flex-col items-center text-center">
        <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm", color)}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className="text-lg sm:text-2xl font-black text-foreground tracking-tight">{value}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
            {title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuotaCard({ quota, onEdit, onDelete, onAddBid, onShowTimeline, onUpdateStatus, formatCurrency, companyName }: any) {
  const config = statusConfig[quota.status as QuotaStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="group bg-card rounded-[2.5rem] border border-border/60 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
      <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-tight line-clamp-1">{quota.clientName}</h3>
              <ArrowUpRight className="w-4 h-4 text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase tracking-wider">
              <span className="bg-background px-1.5 py-0.5 rounded text-[10px]">{companyName}</span>
              <span>•</span>
              <span>G: {quota.groupNumber}</span>
              <span>•</span>
              <span>C: {quota.quotaNumber}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn("px-2 sm:px-3 py-1 sm:py-1.5 h-auto rounded-xl border text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm transition-all hover:scale-105", config.color)}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border bg-card">
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "pending")} className="gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Pendente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "active")} className="gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" /> Ativa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "contemplated")} className="gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Contemplada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(quota.id, "cancelled")} className="gap-2">
                <XCircle className="w-4 h-4 text-rose-500" /> Cancelada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-background border border-border shadow-inner">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Crédito</p>
            <p className="text-sm sm:text-base font-black text-primary tracking-tight">{formatCurrency(quota.creditValue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Parcela</p>
            <p className="text-sm sm:text-base font-black text-foreground tracking-tight">{formatCurrency(quota.installmentValue)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Responsável</span>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-xs font-bold text-foreground">{quota.sellerName}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
            <Button size="icon" variant="ghost" onClick={onShowTimeline} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" title="Timeline">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onAddBid} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-emerald-50/10 rounded-xl" title="Adicionar Lance">
              <Gavel className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" title="Editar">
              <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl" title="Excluir">
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}