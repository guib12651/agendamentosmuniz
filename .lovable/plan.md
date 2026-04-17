
Atualmente o modal já tem um ícone `CheckCircle` (do lucide-react) entre o texto "Muniz Consultorias" e o título "Reunião Agendada com Sucesso!", mas ele está usando a cor `text-primary` (dourado da marca).

O usuário quer trocar essa cor para verde, que é a cor universal de confirmação/sucesso.

## Alteração

**`src/components/MeetingSuccessModal.tsx`** (linha ~107):
- Trocar `text-primary` por `text-green-500` no ícone `CheckCircle` para que ele apareça em verde.

Antes:
```tsx
<CheckCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-primary mb-1.5 sm:mb-2" />
```

Depois:
```tsx
<CheckCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-green-500 mb-1.5 sm:mb-2" />
```

Mudança mínima, apenas visual. Nenhuma outra parte do modal será afetada.
