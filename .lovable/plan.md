

# Plano: Restrição de exclusão para pré-vendedores (30 min antes)

## O que muda

Pré-vendedores só poderão excluir uma reunião se faltarem **mais de 30 minutos** para o horário agendado. Admins continuam podendo excluir a qualquer momento.

## Alterações

### 1. `src/components/MeetingCard.tsx`
- Receber novas props: `isAdmin` e `currentDate` (ou calcular internamente).
- Calcular se faltam mais de 30 minutos para a reunião comparando `meeting.date + meeting.time` com `new Date()`.
- Se **não é admin** e faltam **≤ 30 minutos** (ou já passou): esconder o botão de excluir ou desabilitá-lo com tooltip explicativo.
- O botão de editar segue a mesma lógica (opcional, mas recomendado).

### 2. `src/pages/Index.tsx`
- Passar `isAdmin` como prop para cada `MeetingCard`.

### 3. Proteção no banco (RLS)
- Atualizar a policy de DELETE na tabela `meetings` para impedir exclusão por pré-vendedores quando faltam ≤ 30 minutos. Isso usa um trigger `BEFORE DELETE` (pois RLS não tem acesso fácil ao horário atual vs horário da reunião com timezone).
- Criar trigger `BEFORE DELETE` que verifica: se o usuário **não é admin** e `date + time - now() <= 30 min`, rejeita a exclusão.

## Resultado
- Pré-venda: botão de excluir desabilitado/oculto quando faltam 30 min ou menos.
- Admin: sempre pode excluir.
- Proteção dupla: frontend (UX) + banco (segurança).

