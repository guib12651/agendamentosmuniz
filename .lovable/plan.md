## Objetivo
Garantir que o filtro "Não Contatados" da Central de Oportunidades exiba apenas leads com a tag **Pendente**, removendo os que estão como "Atendeu" e "Não Atendeu".

## Causa
No arquivo `src/pages/OpportunitiesCenter.tsx`, o filtro atual agrupa três status como "pending":
```
filterStatus === "pending" ? (opp.status === "pending" || opp.status === "contacted" || opp.status === "no_answer") : ...
```

## Mudança
Simplificar a comparação para usar apenas o status selecionado:
```
matchStatus = filterStatus === "all" || opp.status === filterStatus
```

Assim:
- "Não Contatados" → só `pending`
- "Atenderam" → só `contacted`
- "Não Atenderam" → só `no_answer`
- demais filtros permanecem iguais
