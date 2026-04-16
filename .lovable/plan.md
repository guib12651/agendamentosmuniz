

# Plano: Corrigir atualização em tempo real dos horários no formulário

## Problema

O formulário já tem um listener Realtime que chama `refreshSlots()`, mas há um `useEffect` (linha 79-85) que, quando `occupiedSlots` prop muda, sobrescreve os slots com dados potencialmente desatualizados vindos do componente pai. Isso cria uma "corrida" onde o refresh em tempo real é anulado pelo prop.

## Solução

Simplificar a lógica: **sempre usar `refreshSlots()` como fonte única de verdade** para os horários, removendo a dependência do prop `occupiedSlots`.

### Alteração em `src/components/MeetingForm.tsx`

1. Remover a lógica condicional do `useEffect` que usa `occupiedSlots` como override.
2. Sempre chamar `refreshSlots()` quando a data muda, independentemente do prop.
3. Manter o listener Realtime como está (já funciona corretamente).

```typescript
// ANTES (bugado):
useEffect(() => {
  if (occupiedSlots && form.date === new Date().toISOString().split("T")[0]) {
    setDateSlots(occupiedSlots);  // ← sobrescreve o refresh em tempo real
  } else {
    refreshSlots();
  }
}, [form.date, occupiedSlots, refreshSlots]);

// DEPOIS (corrigido):
useEffect(() => {
  refreshSlots();
}, [form.date, refreshSlots]);
```

## Resultado

Quando outro pré-vendedor marcar uma reunião, o horário será atualizado automaticamente no formulário de todos os outros usuários — passando de verde para amarelo (1/2) ou de amarelo para vermelho (lotado).

