

# Plano: Implementar PWA na plataforma Muniz Consultorias

## O que será feito

Tornar a aplicação instalável em qualquer dispositivo (celular e PC) como um app nativo, sem precisar de loja de aplicativos.

## Abordagem

Como a aplicação depende de dados online (banco de dados), não há necessidade de suporte offline completo. Vamos usar a abordagem **simples**: apenas um `manifest.json` com ícones e configuração de tela cheia — sem service workers, sem `vite-plugin-pwa`.

## Etapas técnicas

1. **Criar `public/manifest.json`** com nome, cores da marca, ícones e `display: "standalone"`
2. **Gerar ícones do app** (192x192 e 512x512) a partir da logo existente da Muniz
3. **Adicionar `<link rel="manifest">` e meta tags** no `index.html` (theme-color, apple-touch-icon, mobile-web-app-capable)
4. **Testar** que o app é reconhecido como instalável pelo navegador

## Resultado

- Usuários poderão "instalar" o app no celular ou PC
- Abre em janela própria, sem barra do navegador
- Ícone no menu iniciar / dock / tela inicial

