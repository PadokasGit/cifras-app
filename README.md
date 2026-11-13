# Cifras

PWA para tocar ao vivo no celular: importar cifras, ajustar tom e tamanho da letra, montar repertórios. Funciona offline.

## Rodar

```
npm install
npm run dev        # desenvolvimento
npm test           # testes
npm run build      # gera dist/ (com service worker)
npm run preview    # serve dist/ localmente
```

## Como usar

1. **Biblioteca > Importar**: cole o texto da cifra. Se a 1ª linha for `Título - Artista`, vira o cabeçalho.
2. Abra a música: **Tom −/+**, **♭/♯** (grafia dos acordes), **A−/A+** (letra). Tudo fica salvo por música.
3. **Repertórios**: crie, adicione músicas, reordene (arrastar ou ↑/↓) e toque.

## Publicar (ainda manual)

Publique a pasta `dist` em um host estático (Cloudflare Pages ou Netlify).
Abra a URL no celular, use "Adicionar à tela inicial" e confira em modo avião:
abra o app uma vez com internet, ative o modo avião e reabra.

## Verificação offline feita até agora

O `dist/sw.js` pré-carrega HTML, JS, CSS, ícones e manifesto (12 arquivos).
O teste real em modo avião no celular ainda precisa ser feito depois da publicação.
