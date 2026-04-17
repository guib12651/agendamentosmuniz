
O usuário enviou um ícone PNG verde (check de sucesso) e quer que ele substitua o `CheckCircle` atual do lucide-react no modal. Como é uma imagem rasterizada (PNG), o `html2canvas` vai capturá-la corretamente, resolvendo o problema do ícone sumir na imagem compartilhada via WhatsApp.

## Alterações

**1. Copiar o asset**
- Copiar `user-uploads://ícone_sucesso.png` para `src/assets/icone-sucesso.png`

**2. `src/components/MeetingSuccessModal.tsx`**
- Importar a imagem: `import iconeSucesso from "@/assets/icone-sucesso.png";`
- Remover `CheckCircle` do import do `lucide-react` (continua sendo usado? Não — só era usado nesse local)
- Substituir o `<CheckCircle ... />` por uma `<img>`:
  ```tsx
  <img 
    src={iconeSucesso} 
    alt="Sucesso" 
    className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-1.5 sm:mb-2" 
  />
  ```

Mantém o mesmo tamanho e espaçamento atuais. Como PNG é rasterizado, o `html2canvas` o capturará sem problemas na imagem baixada.
