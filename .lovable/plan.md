

# Plano: Atualização em tempo real dos horários

## O que muda

Quando alguém agendar uma reunião, todos os outros usuários verão o horário ficar indisponível **automaticamente**, sem precisar recarregar a página.

## Como funciona

### 1. Migração: habilitar Realtime na tabela `meetings`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
```

### 2. Atualizar `src/pages/Index.tsx`

- Adicionar um listener Realtime no canal `meetings` que escuta eventos `INSERT`, `UPDATE` e `DELETE`.
- Quando qualquer mudança ocorrer, re-buscar os slots ocupados via `getOccupiedSlots(filterDate)` e a lista de reuniões.
- Desmontar o canal no cleanup do `useEffect`.

### Resultado

- Pré-vendedor A agenda 09:15 → horário fica vermelho instantaneamente para todos os outros usuários conectados.
- Funciona para criação, edição e exclusão de reuniões.

