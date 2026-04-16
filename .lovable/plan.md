

# Plano: Modal de confirmação de agendamento com dados do lead

## Objetivo
Após agendar uma reunião com sucesso, exibir um modal/card bonito com os dados do lead por 7 segundos. Isso permite que o usuário tire um print para enviar ao lead e gerar credibilidade.

## O que será exibido no modal
- Titulo: "✅ Reunião Agendada com Sucesso!"
- Nome do Lead
- Telefone
- Data e Horário
- Tipo de reunião (Presencial/Online)
- Pré-vendedor responsável
- Consultor (se preenchido)
- Barra de progresso visual indicando os 7 segundos

## Alterações

### 1. Criar `src/components/MeetingSuccessModal.tsx`
- Componente que recebe os dados da reunião e um callback `onClose`
- Layout bonito, estilizado com as cores do projeto (dark theme, gold primary)
- Logo ou nome "Muniz Consultorias" no topo para credibilidade no print
- Auto-fecha após 7 segundos com `setTimeout`
- Barra de progresso animada (7s) para feedback visual
- Botão de fechar manual também disponível

### 2. Atualizar `src/components/MeetingForm.tsx`
- Adicionar estado `successData` para armazenar os dados da reunião recém-agendada
- Após `addMeeting` com sucesso (apenas para novas reuniões, não edições), salvar os dados do form em `successData` antes de limpar o formulário
- Renderizar `MeetingSuccessModal` quando `successData` estiver preenchido
- Remover o `toast.success("Reunião agendada com sucesso!")` (substituído pelo modal)

## Detalhes técnicos
- O modal usa `Dialog` do shadcn/ui para overlay
- Timer de 7 segundos com cleanup no `useEffect`
- Animação CSS na barra de progresso (linear 7s)
- O `onSave` continua sendo chamado normalmente para atualizar a lista

