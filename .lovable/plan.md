

# Plano: Verificação explícita no backend antes de agendar

## Problema
O trigger `check_max_meetings_per_slot` já existe, mas a mensagem de erro pode não estar sendo capturada corretamente. A solução é adicionar uma **verificação explícita** antes do INSERT: consultar o banco para contar reuniões naquele horário+data e bloquear se já houver 2.

## Alteração em `src/components/MeetingForm.tsx`

No `handleSubmit`, **antes** de chamar `addMeeting()`, fazer uma query direta:

```typescript
// Antes de inserir, verificar no backend
const { count, error: countError } = await supabase
  .from('meetings')
  .select('*', { count: 'exact', head: true })
  .eq('date', form.date)
  .eq('time', form.time);

if (count !== null && count >= 2) {
  await refreshSlots();
  setForm(f => ({ ...f, time: "" }));
  toast.error("Esse horário já está lotado. Escolha outro.");
  setSaving(false);
  return;
}
```

Isso garante que, mesmo que o formulário não tenha atualizado em tempo real, a verificação é feita no momento exato do clique em "Agendar Reunião". O trigger no banco continua como camada extra de segurança.

## Resultado
- Clique em "Agendar Reunião" → consulta o banco → se 2+ reuniões no horário → mostra "Esse horário já está lotado. Escolha outro." e limpa o horário selecionado.
- Se < 2, prossegue normalmente.
- Dupla proteção: verificação pré-insert + trigger no banco.

