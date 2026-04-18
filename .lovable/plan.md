
## Contexto

No mobile (Android/iOS), o navegador **sempre** pergunta antes de baixar arquivos — não existe API web que force download silencioso. Isso é uma proteção do sistema operacional e não pode ser desabilitado por código.

Além disso, no mobile o fluxo atual tem outro problema: ao abrir o WhatsApp via `window.open`, o app do WhatsApp toma a tela e o download fica "perdido" no navegador em segundo plano, exigindo que o usuário volte ao navegador, confirme o download, abra a galeria, volte ao WhatsApp e anexe a imagem manualmente. Fluxo ruim.

## Solução: Web Share API com arquivo

Mobile moderno (Android Chrome, iOS Safari 15+) suporta `navigator.share({ files: [...] })`, que abre o **menu nativo de compartilhamento do sistema** já com a imagem anexada. O usuário escolhe WhatsApp na lista, seleciona o contato e a imagem já vai junto — sem download, sem prompt, sem fluxo manual.

### Estratégia

Detectar capacidade e seguir o melhor caminho:

1. **Mobile com `navigator.canShare({ files })` disponível** (caso ideal):
   - Chamar `navigator.share({ files: [pngFile], text: mensagem })`
   - Sistema abre seletor → usuário escolhe WhatsApp → imagem + texto já anexados
   - Zero download, zero prompt

2. **Mobile sem suporte a share de arquivos** (fallback):
   - Manter fluxo atual (download + abrir WhatsApp)
   - Mostrar toast explicando: "Salve a imagem e anexe na conversa do WhatsApp"

3. **Desktop**:
   - Manter fluxo atual (download automático + abrir WhatsApp Web)

## Alteração

**`src/components/MeetingSuccessModal.tsx`** — função `handleShare`:

1. Após gerar o blob, criar um `File`: `new File([blob], fileName, { type: "image/png" })`
2. Verificar `navigator.canShare?.({ files: [file] })`
3. Se sim → `await navigator.share({ files: [file], text: message })` e fechar modal
4. Se não → manter fluxo atual de download + `window.open`
5. Tratar erro `AbortError` (usuário cancelou o share) silenciosamente

## Arquivo a alterar
- `src/components/MeetingSuccessModal.tsx` (apenas `handleShare`)

Nenhuma mudança em outros arquivos. Resultado: no mobile o usuário toca uma vez, escolhe WhatsApp e a imagem já vai anexada — sem prompt de download.
