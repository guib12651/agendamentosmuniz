
## Análise

No `handleShare` em `MeetingSuccessModal.tsx`, hoje a ordem é:
1. Gera canvas → blob
2. Cria `<a download>` e dispara click (download)
3. Depois abre `window.open(waUrl)` do WhatsApp

O usuário percebe como se o WhatsApp abrisse antes da imagem baixar, provavelmente porque em alguns navegadores o `window.open` pré-abre uma aba e o download só "aparece" depois. Além disso, em mobile o `window.open` pode roubar o foco e o `<a download>` perde a chance de baixar.

## Causa real
- O `window.open` numa nova aba muda o foco antes do navegador completar o download.
- Em mobile (Android/iOS), a ordem `download → open` muitas vezes inverte na percepção do usuário.

## Solução

Disparar **as duas ações em paralelo, no mesmo gesto de clique**, mas:
- garantir que o `<a download>` seja clicado **antes** do `window.open`
- usar `requestAnimationFrame` para que o navegador comece o download imediatamente
- abrir o WhatsApp logo em seguida na mesma "tick" do evento, preservando o user-gesture

## Alteração

**`src/components/MeetingSuccessModal.tsx`** — função `handleShare`:

1. Gerar canvas/blob como já é feito.
2. Criar o `<a>` de download e chamar `.click()`.
3. Imediatamente em seguida (mesmo bloco síncrono, sem `await` entre eles) chamar `window.open(waUrl, "_blank")`.
4. Remover qualquer `await` ou microtask entre o download e o open.
5. Ajustar o toast para algo como: "Imagem baixada e WhatsApp aberto. Anexe a imagem na conversa."

Resultado: o clique único dispara download + abertura do WhatsApp simultaneamente, sem esperar um pelo outro.

## Arquivo a alterar
- `src/components/MeetingSuccessModal.tsx` (apenas a função `handleShare`)

Nenhuma mudança em outros arquivos.
