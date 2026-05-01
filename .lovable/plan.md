## Objetivo

Na página **"Meus Agendamentos"**, permitir que admins vejam dados consolidados de **todos os pré-vendedores juntos**, além da visão individual já existente.

## Mudanças

Arquivo único: `src/pages/MeusAgendamentos.tsx`

1. **Seletor de pré-vendedor (admin)**
   - Adicionar nova opção no topo do `Select`: **"Todos os pré-vendedores"** (valor interno `__all__`).
   - Definir esse valor como o padrão inicial para admins (em vez do primeiro nome da lista).

2. **Lógica de filtro (`filteredMeetings`)**
   - Quando `selectedPreSeller === "__all__"`, **não aplicar** o filtro por `m.preSeller`. Todas as reuniões do mês/intervalo serão consideradas.
   - Demais filtros (status, marcação, gatilho, modalidade, busca por lead, intervalo de datas) continuam funcionando normalmente sobre o conjunto agregado.

3. **Cálculos derivados**
   - Não é necessário alterar `byDate`, `total`, `bestDay`, `avgPerBusinessDay`, heatmap nem o modal do dia — todos derivam de `filteredMeetings` automaticamente. Com "Todos" selecionado, os cards de resumo e o heatmap passam a refletir o time inteiro.

4. **UX**
   - Manter o label do trigger mostrando "Todos os pré-vendedores" quando ativo.
   - Pré-vendedores comuns (não-admin) continuam travados no próprio nome (sem alteração).

## Fora de escopo

- Sem mudanças de backend, RLS ou tipos.
- Sem alteração na página `Index.tsx` ou em `Fechamentos.tsx`.
