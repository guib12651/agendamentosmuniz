

# Plano: Sistema de Login com 2 Admins + 5 Pré-vendas

## Usuários a serem criados

| Tipo | Usuário | Senha | Email interno |
|------|---------|-------|---------------|
| Admin | yulle | totoca9559 | yulle@muniz.internal |
| Admin | ketullen | ket6651 | ketullen@muniz.internal |
| Pré-venda | guilherme | guilhermedamuniz | guilherme@muniz.internal |
| Pré-venda | anakesia | anadamuniz | anakesia@muniz.internal |
| Pré-venda | tais | taisdamuniz | tais@muniz.internal |
| Pré-venda | ketullen_pv | ketdamuniz | ketullenpv@muniz.internal |
| Pré-venda | mikael | mikadamuniz | mikael@muniz.internal |

> Nota: Ketullen tem dois acessos — um admin (senha: ket6651) e um pré-venda (senha: ketdamuniz). Serão contas separadas.

## O que será feito

### 1. Banco de dados (migrações)

- **Tabela `profiles`**: `id` (FK auth.users), `username` (único), `display_name`, `role` (admin/pre_seller)
- **Coluna `user_id`** na tabela `meetings` (uuid, nullable inicialmente para não quebrar dados existentes)
- **Tabela `user_roles`**: seguindo boas práticas com enum `app_role` (admin, pre_seller)
- **Função `has_role()`**: security definer para checar papéis sem recursão RLS
- **Trigger**: criar perfil automaticamente ao cadastrar usuário
- **RLS atualizado em `meetings`**:
  - SELECT/UPDATE/DELETE: pré-vendedor vê só suas reuniões (`user_id = auth.uid()`), admin vê tudo
  - INSERT: `user_id` preenchido automaticamente com `auth.uid()`
- **RLS em `time_blocks`**: continua público (bloqueios são compartilhados)
- **Habilitar auto-confirm** de email (emails internos fictícios)

### 2. Criar os 7 usuários

- Usar edge function ou script para registrar os 7 usuários via Supabase Auth
- Inserir os perfis e roles correspondentes

### 3. Página de Login (`src/pages/Login.tsx`)

- Tela simples: campo **Nome de usuário** + **Senha**
- Internamente converte nome para `{nome}@muniz.internal`
- Sem opção de criar conta (apenas os 7 usuários pré-cadastrados)
- Botão "Entrar"

### 4. Proteção de rotas (`src/App.tsx`)

- Componente `ProtectedRoute` que verifica sessão
- Redireciona para `/login` se não autenticado
- Hook `useAuth` para gerenciar estado de autenticação

### 5. Ajustes no Dashboard

- **Header**: mostrar nome do usuário logado + botão "Sair"
- **Campo "Pré-vendedor"**: preenchido automaticamente com o nome do usuário logado (não editável para pré-vendas, editável para admins)
- **Store (`store.ts`)**: inserir `user_id` automaticamente ao criar reunião
- **Admins**: veem todas as reuniões de todos os pré-vendedores
- **Pré-vendas**: veem apenas suas próprias reuniões

### 6. Contexto de autenticação (`src/contexts/AuthContext.tsx`)

- Provider global com informações do usuário (nome, role)
- Disponível em toda a aplicação

## Resultado

- 7 logins funcionais com nome + senha
- Pré-vendedores isolados — cada um vê só seus agendamentos
- Admins (Yulle e Ketullen) veem tudo
- Segurança garantida no servidor via RLS

