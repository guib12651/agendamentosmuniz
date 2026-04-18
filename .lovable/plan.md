
## Mudança: Resumo diário do dia anterior

Alterar `supabase/functions/daily-summary/index.ts` para que às 09:10 BRT envie o **fechamento de ontem** em vez do panorama de hoje.

### O que muda na lógica
- Calcular `yesterday` = data BRT atual menos 1 dia
- Buscar reuniões com `date = yesterday`
- Contar por status: `compareceu`, `nao_compareceu`, `pendente`
- Calcular taxa de comparecimento: `compareceu / total * 100`
- Quebrar por pré-vendedor mostrando: total, compareceram, faltaram

### Texto da notificação (exemplo)
```
Fechamento de 17/04: 8 reuniões • 6 compareceram / 2 faltaram (75%) 
• yulle: 4 (3✓/1✗) • lucas: 4 (3✓/1✗)
```

Título passa de "Resumo do dia" para "Fechamento de ontem".

### Observações
- Status válidos no banco: `pending`, `compareceu`, `nao_compareceu` (confirmar lendo as opções no código antes de editar).
- Cron continua o mesmo (12:10 UTC = 09:10 BRT), só muda o conteúdo da função.
- Nenhuma mudança em UI, banco, RLS ou outras edge functions.

### Arquivo a alterar
- `supabase/functions/daily-summary/index.ts`
