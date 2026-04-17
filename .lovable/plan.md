

# Plano: Abrir WhatsApp diretamente ao compartilhar

## Problema
A Web Share API não permite direcionar para o WhatsApp especificamente. Para abrir o WhatsApp diretamente, precisamos usar a API do WhatsApp (`https://wa.me/`) com o número do lead.

## Limitação importante
A API `wa.me` só suporta **texto**, não imagens. Para enviar a imagem diretamente pelo WhatsApp via link, não é possível nativamente. A solução será:

1. **Gerar a imagem** com `html2canvas` (como já faz)
2. **Salvar/download** a imagem automaticamente no dispositivo
3. **Abrir o WhatsApp** com o número do lead e uma mensagem pré-formatada
4. O usuário só precisa anexar a imagem que foi salva automaticamente

## Alteração em `src/components/MeetingSuccessModal.tsx`

No `handleShare`:
- Gerar a imagem e fazer download automático
- Formatar o número do lead (remover caracteres não numéricos, adicionar 55 se necessário)
- Abrir `https://wa.me/{numero}?text={mensagem}` em nova aba
- Mensagem: "Olá {nome}! Segue a confirmação do seu agendamento com a Muniz Consultorias. 📋"
- Mostrar toast informando: "Imagem salva! Anexe-a na conversa do WhatsApp."

## Botão
- Trocar ícone de `Share2` para ícone do WhatsApp (usando um SVG inline simples)
- Texto: "Enviar via WhatsApp"

## Fluxo do usuário
1. Clica em "Enviar via WhatsApp"
2. Imagem é baixada automaticamente
3. WhatsApp abre com o número do lead e mensagem pronta
4. Usuário anexa a imagem salva e envia

