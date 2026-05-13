# Sistema de Metas Mensais — Muniz Consultorias

## Visão geral
Adicionar um módulo de **Metas Mensais** ao dashboard, com controle exclusivo do admin, visualização premium para todos, barras animadas, contadores animados, mensagens motivacionais dinâmicas e histórico mês a mês.

---

## 1. Banco de dados (Lovable Cloud)

Nova tabela `monthly_goals`:
- `month` (date, primeiro dia do mês — ex.: 2026-05-01) — único
- `total_goal` (numeric) — meta geral em R$
- `split_count` (integer, nullable) — para quantos funcionários dividir
- `created_by` (uuid)
- timestamps

Nova tabela `monthly_goal_progress` (valor realizado por funcionário):
- `month` (date)
- `user_id` (uuid)
- `amount` (numeric) — valor vendido/fechado pelo funcionário no mês
- único por (`month`, `user_id`)

**RLS:**
- `monthly_goals`: todos autenticados podem **ler**; somente admin pode **inserir/atualizar/deletar** (via `has_role`).
- `monthly_goal_progress`: cada funcionário lê **apenas o próprio**; admin lê e edita **todos**; cada funcionário pode atualizar o próprio valor (admin define se quer travar isso depois).

> Nota: como ainda não há integração de "fechamento" automatizado, o valor realizado começa editável manualmente pelo admin (1 input por funcionário no mês). Fica pronto para evoluir para automático.

---

## 2. UI — Componentes novos

### `src/components/goals/GoalsBanner.tsx`
Bloco premium exibido no topo do dashboard (`Index.tsx`) com 2 cards lado a lado (empilha no mobile):

**Card 1 — Meta Geral** (destaque maior)
- Título "META GERAL DO MÊS"
- Valor R$ animado (count-up de 0 → total)
- Barra de progresso amarela animada
- % atingido
- Mensagem: "Acompanhe o desempenho geral da operação 🚀"
- Quando ≥ 100%: glow dourado + "🎉 META GERAL BATIDA!"

**Card 2 — Sua Meta**
- Título "SUA META DO MÊS"
- Valor individual (total ÷ split_count, ou total se não dividido)
- Barra de progresso (cor diferenciada — gradiente claro)
- Mensagem motivacional dinâmica:
  - 0–25% → "Seu mês começou! Vamos pra cima 🚀"
  - 25–50% → "Você está evoluindo muito 🔥"
  - 50–75% → "Metade da meta já foi! Continue 👏"
  - 75–99% → "Você está muito perto da meta 🎯"
  - ≥100% → "🎉 PARABÉNS! META BATIDA!"

### `src/components/goals/GoalsAdminDialog.tsx` (apenas admin)
Botão "Gerenciar Metas" no banner abre dialog com:
- Mês (default: atual)
- Meta total (R$)
- "Dividir para quantos funcionários" (opcional)
- Preview: "R$ X por funcionário"
- Lista de funcionários com input de valor realizado (atualiza `monthly_goal_progress`)
- Salvar (upsert)

### `src/components/goals/GoalsHistory.tsx`
Acordeão/lista compacta abaixo dos cards mostrando meses anteriores: meta, realizado total, %.

---

## 3. Animações
- **Count-up**: hook próprio com `requestAnimationFrame` (sem libs novas).
- **Barra**: largura animada via CSS transition (`transition-all duration-1000 ease-out`).
- **Hover**: leve scale + sombra (já existe `hover-scale` no design system).
- **Meta batida**: classe com `box-shadow` dourado pulsante (keyframe novo no `tailwind.config.ts`).

---

## 4. Identidade visual
Reutilizar tokens existentes (tema escuro com primário dourado `#EDAB00`). Os cards usam:
- `bg-card`, bordas `rounded-2xl`, sombra suave
- Acento `primary` para meta geral
- Gradiente sutil `primary → primary/60` para meta individual
- Espaçamento generoso (`p-6 md:p-8`)
- Totalmente responsivo (grid 1 col mobile, 2 col desktop)

---

## 5. Integração
- Inserir `<GoalsBanner />` no topo do `src/pages/Index.tsx` (acima do conteúdo atual).
- Hook `useMonthlyGoal(month)` busca meta + progresso do usuário (e total agregado para admin/visão geral) com realtime via Supabase channel para atualizar ao admin alterar.

---

## 6. Fora de escopo (por ora)
- Cálculo automático do realizado a partir das reuniões/fechamentos (depende de definir o que conta como "valor fechado"). Por enquanto, admin lança manualmente o valor por funcionário.
- Edição de metas passadas trancada após virada de mês (pode ser adicionada depois).

---

## Arquivos
**Novos:** `src/components/goals/GoalsBanner.tsx`, `GoalsAdminDialog.tsx`, `GoalsHistory.tsx`, `src/hooks/useMonthlyGoal.ts`, `src/hooks/useCountUp.ts`
**Editados:** `src/pages/Index.tsx`, `tailwind.config.ts` (keyframe glow)
**Migration:** criar `monthly_goals` + `monthly_goal_progress` com RLS

Confirma que posso seguir? Se quiser ajustar algo (ex.: realizado automático a partir de outra fonte, ou esconder histórico), me diz antes.