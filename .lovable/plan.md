

# Plano: Horários compartilhados entre todos os usuários

## Problema atual

Os horários disponíveis são calculados com base apenas nas reuniões que o usuário pode ver. Como o RLS restringe pré-vendedores a ver apenas suas próprias reuniões, um horário marcado pelo Guilherme aparece como "disponível" para a Anakesia.

## Solução

Criar uma **função de banco de dados** (security definer) que retorna os horários ocupados de um dia específico, acessível por todos os usuários autenticados — sem expor os dados completos das reuniões de outros usuários.

### 1. Migração: criar função `get_occupied_slots`

```sql
CREATE OR REPLACE FUNCTION public.get_occupied_slots(_date date)
RETURNS TABLE(time time, lead_name text, meeting_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.time, m.lead_name, m.id
  FROM public.meetings m
  WHERE m.date = _date
$$;
```

Essa função roda com permissão elevada (security definer), então retorna todas as reuniões do dia independentemente do RLS. Isso é seguro porque só expõe horário, nome do lead e ID.

### 2. Atualizar `store.ts`

Adicionar função `getOccupiedSlots(date)` que chama `supabase.rpc('get_occupied_slots', { _date })`.

### 3. Atualizar `Index.tsx`

- Buscar os slots ocupados do dia via `getOccupiedSlots(filterDate)` (todas as reuniões de todos os usuários).
- Usar esses dados para montar o grid de horários, garantindo que horários ocupados por qualquer usuário apareçam como indisponíveis.
- Manter a lista de reuniões filtrada normalmente (pré-venda vê só as suas).

### 4. Atualizar `MeetingForm.tsx`

- Usar `getOccupiedSlots` também no formulário para mostrar horários realmente disponíveis ao agendar/editar.

## Resultado

- Se qualquer pré-vendedor marca 09:15, esse horário aparece como **ocupado** para todos.
- A lista de reuniões continua respeitando o RLS (cada um vê só as suas).
- Admins continuam vendo tudo normalmente.

