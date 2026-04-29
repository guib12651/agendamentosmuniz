## Objetivo

Permitir que cada pré-vendedor (e também os admins) vejam quantos agendamentos foram feitos em **cada dia do mês**, com totais e detalhamento diário.

## Onde adicionar

Nova aba/página: **"Meus Agendamentos"** acessível a partir de um botão no header do `Index.tsx`.

- Pré-vendedor: vê apenas os próprios agendamentos.
- Admin: vê os próprios + um seletor para escolher qualquer pré-vendedor e visualizar os agendamentos dele.

Rota: `/meus-agendamentos`

## Layout da página

1. **Seletor de mês** (input `month` ou navegação ◄ Novembro 2026 ►).
2. **Seletor de pré-vendedor** (somente admin) — usa a lista de `profiles` com role `pre_seller`.
3. **Cards de resumo do mês**:
   - Total de agendamentos no mês
   - Média por dia útil
   - Melhor dia (data + quantidade)
   - Dias com pelo menos 1 agendamento
4. **Calendário/Heatmap mensal**: grid 7 colunas (Dom-Sáb) mostrando cada dia do mês com a quantidade de agendamentos. Intensidade de cor (gold) varia conforme o volume. Clicar em um dia → navega para `/?date=YYYY-MM-DD` (já suportado).
5. **Lista detalhada por dia**: tabela/lista mostrando apenas dias com agendamentos: `Data — Dia da semana — Qtd — [Compareceu / Não compareceu / Pendente]`.

## Detalhes técnicos

**Arquivos:**
- Novo: `src/pages/MeusAgendamentos.tsx`
- Editar: `src/App.tsx` — registrar rota `/meus-agendamentos`
- Editar: `src/pages/Index.tsx` — adicionar botão no header (ícone `CalendarCheck`), visível para todos os usuários autenticados, label oculto em mobile (mesmo padrão de "Fechamentos")

**Dados:**
- Reaproveitar `getMeetings()` de `src/lib/store.ts`. As policies RLS já garantem que pré-vendedores só vejam os próprios; admin vê todos e filtramos no client pelo `preSeller` selecionado.
- Para admin escolher um pré-vendedor: query em `profiles` onde `role = 'pre_seller'` (já feita em `Index.tsx`, replicar).

**Cálculos no client:**
- Filtrar meetings por mês selecionado (`date >= primeiroDia && date <= ultimoDia`).
- Agrupar por `date` num `Map<string, Meeting[]>`.
- Heatmap: gerar grid do mês com `new Date(ano, mês, 1)` até último dia, alinhado pelo `getDay()` da primeira semana.

**Estilo:**
- Seguir o padrão dark + gold da plataforma (`stat-card`, `bg-card`, `border-border`, `text-primary`).
- Responsivo mobile-first: heatmap com células `aspect-square` e texto pequeno; lista detalhada com `flex-wrap` + `truncate`.

## Sem alterações de backend

Não precisa de migration nem nova tabela — usa `meetings` existente e respeita as policies RLS atuais.
