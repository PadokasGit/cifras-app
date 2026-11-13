# Cifras para o palco: design

Data: 2026-11-13. Status: aguardando aprovação.

## Intenção e porquê
Tocar ao vivo usando o celular como estante de cifras. O usuário quer pegar cifras do CIFRASCLUB.com.br, ajustar **tom** e **tamanho da letra** do jeito que precisa e ter um **repertório salvo**. Uso exclusivo do próprio usuário, no palco, onde sinal ruim é comum.

## Objetivos
- Importar uma cifra colando o link do Cifra Club.
- Importar também por colar texto (alternativa quando a busca por link falhar).
- Transpor o tom (semitons, com preferência por sustenido ou bemol) e escolher o tom final direto.
- Ajustar o tamanho da fonte, com a cifra sempre em fonte monoespaçada para manter os acordes alinhados sobre as sílabas.
- Tom e tamanho ficam salvos por música.
- Repertórios (listas ordenadas) com ordem arrastável.
- Modo palco: tela cheia, fonte grande, tela sempre ligada, navegação rápida entre músicas do repertório.
- Funcionar 100% offline depois de importar.
- Instalável na tela inicial do celular (PWA).
- Sincronizar entre celular e computador.

## Não objetivos
- Não é produto para outras pessoas: sem cadastro aberto, sem compartilhamento, sem lojas de apps.
- Não guarda catálogo nem faz busca por artista/música no Cifra Club. Só importa o link que o usuário colou, uma cifra por vez.
- Não é app nativo (sem pedal Bluetooth nesta versão).
- Sem rolagem automática, metrônomo ou afinador nesta versão.

## Anti-objetivos (seria fracasso mesmo funcionando)
- Abrir lento ou precisar de internet no palco.
- Bagunçar o alinhamento acorde/letra ao mudar tom ou fonte.
- Uma mudança no layout do Cifra Club deixar o app inutilizável: colar texto precisa sempre funcionar.

## Restrições
- Os termos do Cifra Club provavelmente não permitem extração automatizada e as letras têm direitos autorais. Por isso: uso pessoal, uma música por vez, só quando o usuário pede, sem republicar nada. O app não expõe as cifras a terceiros.
- Navegador não consegue buscar a página direto (CORS), então a busca por link passa por uma função na nuvem.
- Usuário já tem Supabase (decisão dele, de projetos anteriores).

## Abordagens consideradas
1. PWA só local, com colar texto. Simples e estável, mas não "puxa" e não sincroniza.
2. **PWA offline-first + função na nuvem para buscar por link + sincronização (escolhida pelo usuário).**
3. App nativo Expo. Mais controle, mais trabalho, sem necessidade clara.

Entrega em duas etapas dentro da escolha 2: primeiro o PWA offline com colar texto, tom, fonte e repertório; depois a busca por link e a sincronização.

## Decisões de como construir (escolhas minhas, pode corrigir)
- **Front:** Vite + React + TypeScript, PWA com service worker (cache de todo o app).
- **Dados locais:** IndexedDB, que é a fonte da verdade no aparelho.
- **Nuvem:** Supabase (Auth por e-mail com um único usuário, tabelas com RLS por `user_id`, Edge Function para buscar a página).
- **Hospedagem:** qualquer host estático gratuito (Cloudflare Pages ou Netlify).
- **Tela ligada:** Screen Wake Lock API.
- **Modelo de uma cifra:** título, artista, tom original, texto bruto, tom atual, deslocamento, tamanho da fonte, origem (link ou colada), datas.
- **Transposição:** reconhecer acordes por padrão (raiz, qualidade, extensões, baixo após barra, como `G/B`), aplicar o deslocamento em semitons e escolher sustenido ou bemol conforme o tom de destino. Linhas de letra não são tocadas.
- **Sincronização:** ao abrir com internet, envia mudanças locais e puxa as remotas; em conflito vale a edição mais recente por música. Sem internet, tudo continua funcionando.

## Rascunho do modo palco
```
┌──────────────────────┐
│ ◀  3/12   Tom: G  ▶ │
│                      │
│  [cifra em fonte     │
│   grande, rolável]   │
│                      │
│  A−   A+    ♭  ♯     │
└──────────────────────┘
```

## O que fica para quem constrói
- Descobrir, olhando uma página real do Cifra Club, como extrair título, artista, tom e texto com acordes; tratar falha com mensagem clara e sugerir colar texto.
- Escolha de biblioteca para arrastar e ordenar.
- Layout detalhado, cores, tipografia e testes.
- Detalhes de segurança da Edge Function (aceitar só links do domínio do Cifra Club, limitar tamanho e frequência).

## Verificação do documento
Li o documento como quem vai construir: dá para planejar a partir dele. Chamadas minhas marcadas acima: Vite/React, IndexedDB, Supabase com um usuário só, hospedagem estática e regra de conflito por edição mais recente.
