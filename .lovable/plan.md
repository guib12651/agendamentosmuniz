

# Plano: 2 reuniões por horário

## O que muda

Cada horário passa a permitir **2 agendamentos**. Só fica indisponível (vermelho) após o segundo. Com 1 reunião, fica em estado intermediário (amarelo/parcial).

## Alterações

### 1. Atualizar `TimeSlotInfo` (`src/lib/timeSlots.ts`)
- Adicionar novo status `"partial"` ao tipo `SlotStatus` (1 reunião de 2).
- Adicionar campo opcional `occupiedCount` e arrays para múltiplos leads/IDs.

### 2. Atualizar lógica de slots (`src/pages/Index.tsx`)
- Ao montar os `timeSlots`, contar quantas reuniões existem no mesmo horário via `globalOccupiedSlots.filter()`.
- Se count === 0 → `available`
- Se count === 1 → `partial` (amarelo, mostra nome do lead)
- Se count >= 2 → `occupied` (vermelho, indisponível)

### 3. Atualizar grid visual (`src/components/TimeSlotGrid.tsx`)
- Adicionar estilo amarelo/laranja para status `"partial"` (ex: "1/2 vagas").
- Clicar em partial ou occupied abre detalhes normalmente.
- Adicionar legenda "Parcial" na barra de legendas.

### 4. Atualizar formulário (`src/components/MeetingForm.tsx`)
- Permitir seleção de horários que têm apenas 1 reunião (partial).
- Bloquear apenas horários com 2+ reuniões.

### 5. Validação no banco (opcional mas recomendado)
- Criar trigger ou constraint para impedir mais de 2 reuniões no mesmo horário+data, como camada de segurança adicional.

## Resultado
- Horário com 0 reuniões → verde (Disponível)
- Horário com 1 reunião → amarelo (1/2 vagas)
- Horário com 2 reuniões → vermelho (Indisponível)

