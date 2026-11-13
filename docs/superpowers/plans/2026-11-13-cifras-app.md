# Cifras para o palco: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA offline-first para tocar ao vivo no celular, com cifras importadas (colar texto, depois link do Cifra Club), tom e tamanho de fonte editáveis e salvos por música, repertórios ordenáveis, modo palco e sincronização.

**Architecture:** App de página única em React, sem backend próprio na etapa 1. IndexedDB (Dexie) é a fonte da verdade no aparelho; a lógica de acordes é um módulo puro, testado sem interface. Na etapa 2, uma Edge Function do Supabase busca a página do link e um módulo de sync envia/puxa mudanças.

**Tech Stack:** Vite, React, TypeScript, Vitest, Dexie (+ `fake-indexeddb` nos testes), `vite-plugin-pwa`, `@dnd-kit` para arrastar, Supabase (Auth, Postgres com RLS, Edge Function em Deno).

**Spec:** `docs/superpowers/specs/2026-11-13-cifras-app-design.md`

## Global Constraints
- Uso só do dono: um único usuário no Supabase, sem cadastro aberto, sem compartilhamento.
- Cifra sempre em fonte monoespaçada; mudar tom ou fonte não pode desalinhar acorde e letra.
- Tudo funciona offline depois de importado; IndexedDB é a fonte da verdade.
- Colar texto precisa funcionar sempre, independente do Cifra Club.
- A Edge Function aceita só links do domínio `cifraclub.com.br`, limita tamanho da resposta e a frequência.
- Sem catálogo nem busca por artista: uma cifra por vez, só quando o usuário pede.
- Textos da interface em português do Brasil, com acentuação correta.
- Fixtures de teste são cifras inventadas; nunca copiar letras reais.

## Review Focus
- Acordes com bemol e sustenido (`Bb`, `F#m`, `Eb/G`) transpostos para tom que prefere o outro símbolo.
- Baixo após barra (`G/B`) transpõe junto com a raiz.
- Linhas de letra que contêm palavras parecidas com acordes ("A vida é bela", "E agora") não são transpostas.
- Linhas com rótulo (`Intro: C G Am`, `Refrão: F C`) transpõem só os acordes.
- Texto vazio, só espaços ou sem nenhum acorde: importa sem quebrar e mostra a cifra como está.
- Link de outro domínio, malformado ou página sem cifra: erro claro e sugestão de colar texto.
- Transpor +12 ou −12 devolve o texto original; offset sempre normalizado.
- Tamanho da fonte fica entre limites mínimo e máximo; valor salvo inválido volta ao padrão.
- Conflito de sincronização: vale a edição mais recente por música; apagar também sincroniza.

## Estrutura de arquivos
```
cifras-app/
  package.json, vite.config.ts, tsconfig.json, index.html
  src/
    main.tsx, App.tsx
    lib/
      types.ts          # Song, Setlist, Accidental
      chords.ts         # transposição e detecção (puro)
      db.ts             # Dexie: songs e setlists
      importText.ts     # texto colado -> dados da música
      wakeLock.ts       # tela sempre ligada
      sync.ts           # etapa 2
      cifraImport.ts    # etapa 2: HTML -> dados da música
    ui/
      Library.tsx       # lista de músicas + importar
      ImportDialog.tsx  # colar texto (e link na etapa 2)
      SongView.tsx      # modo palco + controles de tom/fonte
      Setlists.tsx      # lista/edição de repertórios
      SetlistPlayer.tsx # navegação entre músicas do repertório
  tests/                # espelha src/lib
  supabase/
    migrations/0001_init.sql
    functions/fetch-cifra/index.ts
```

---

## Etapa 1: PWA offline

### Task 1: Esqueleto, testes e PWA

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `tests/smoke.test.ts`, `.gitignore`

**Interfaces:**
- Produces: scripts `npm run dev | build | test`; app em `/` renderizando `<App />`.

- [ ] **Step 1:** `git init` em `cifras-app`; criar projeto Vite React TS (`npm create vite@latest . -- --template react-ts`) e instalar `vitest`, `jsdom`, `fake-indexeddb`, `dexie`, `vite-plugin-pwa`, `@dnd-kit/core`, `@dnd-kit/sortable`.
- [ ] **Step 2: Escrever `tests/smoke.test.ts`** que renderiza `<App />` e espera o texto "Cifras" na tela. Configurar Vitest com ambiente `jsdom` em `vite.config.ts`.
- [ ] **Step 3:** Rodar `npm test`. Esperado: falha (texto ausente).
- [ ] **Step 4: Implementar `App` com título "Cifras".** Configurar `vite-plugin-pwa` com manifest (nome "Cifras", `display: standalone`, tema escuro, ícones placeholder) e precache de todos os assets.
- [ ] **Step 5:** `npm test` passa e `npm run build` gera `dist` com `manifest.webmanifest` e service worker.
- [ ] **Step 6: Commit** `chore: esqueleto Vite React PWA com testes`.

### Task 2: Acordes e transposição (módulo puro)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/chords.ts`
- Test: `tests/chords.test.ts`

**Interfaces:**
- Produces em `types.ts`: `type Accidental = 'sharp' | 'flat'`.
- Produces em `chords.ts`:
  - `transposeChord(chord: string, semitones: number, prefer: Accidental): string`
  - `isChordLine(line: string): boolean`
  - `transposeText(text: string, semitones: number, prefer: Accidental): string`
  - `semitonesBetween(fromKey: string, toKey: string): number` (0 a 11)
  - `normalizeSemitones(n: number): number` (−11 a 11 vira 0 a 11)

- [ ] **Step 1: Escrever testes que falham**, com estas asserções:
  - `transposeChord('C', 2, 'sharp') === 'D'`; `transposeChord('A', 1, 'sharp') === 'A#'`; `transposeChord('A', 1, 'flat') === 'Bb'`.
  - Qualidade e extensões preservadas: `transposeChord('F#m7(b5)', 2, 'sharp') === 'G#m7(b5)'`, `'Cmaj7'`, `'Dsus4'`, `'E7M'`, `'Gdim'`, `'C4/9'`.
  - Baixo: `transposeChord('G/B', 2, 'sharp') === 'A/C#'`; `transposeChord('Eb/G', 3, 'flat') === 'Gb/Bb'`; `transposeChord('Eb/G', 3, 'sharp') === 'F#/A#'`.
  - `transposeChord('C', 12, 'sharp') === 'C'` e `transposeChord('C', -12, 'sharp') === 'C'`.
  - `isChordLine('C  G  Am  F') === true`; `isChordLine('Intro: C G Am') === true`; `isChordLine('A vida é bela') === false`; `isChordLine('E agora') === false`; `isChordLine('') === false`.
  - `transposeText('Intro: C G\nA vida é bela', 2, 'sharp') === 'Intro: D A\nA vida é bela'`.
  - Alinhamento: `transposeText('C      G', 1, 'sharp')` mantém o `G#` na mesma coluna que o `G` original (coluna 7); quando o acorde cresce e não há espaço, deixa pelo menos um espaço.
  - `semitonesBetween('C', 'D') === 2`; `semitonesBetween('G', 'F') === 10`; `normalizeSemitones(-1) === 11`.
- [ ] **Step 2:** Rodar `npx vitest run tests/chords.test.ts`. Esperado: falha, módulo inexistente.
- [ ] **Step 3: Implementar `chords.ts`.** Reconhecer acorde por regex (raiz A–G com `#`/`b`, sufixo livre sem espaço, baixo opcional após `/`); tabela de 12 notas com variante sustenido e bemol. Em `isChordLine`, descartar um rótulo terminado em `:` no início e exigir que todos os tokens restantes sejam acordes; palavra de uma letra só conta como acorde se a linha tiver pelo menos dois tokens de acorde ou for a única palavra da linha. Em `transposeText`, processar só linhas de acorde e reposicionar os acordes seguintes para manter as colunas.
- [ ] **Step 4:** Rodar os testes. Esperado: todos passam.
- [ ] **Step 5: Commit** `feat: transposição de acordes e detecção de linhas`.

### Task 3: Camada de dados local

**Files:**
- Create: `src/lib/db.ts`; modify `src/lib/types.ts`
- Test: `tests/db.test.ts` (usa `fake-indexeddb/auto`)

**Interfaces:**
- Consumes: `Accidental` (Task 2).
- Produces em `types.ts`:
  - `Song { id: string; title: string; artist: string; originalKey: string; rawText: string; semitones: number; fontSize: number; accidental: Accidental; source: {kind:'paste'} | {kind:'link'; url: string}; createdAt: number; updatedAt: number; deletedAt?: number }`
  - `Setlist { id: string; name: string; songIds: string[]; updatedAt: number; deletedAt?: number }`
- Produces em `db.ts`:
  - `addSong(input: Pick<Song,'title'|'artist'|'originalKey'|'rawText'|'source'>): Promise<Song>` (defaults: `semitones 0`, `fontSize 20`, `accidental 'sharp'`)
  - `getSong(id: string): Promise<Song | undefined>`
  - `listSongs(): Promise<Song[]>` (sem apagadas, ordem por título)
  - `updateSong(id: string, patch: Partial<Song>): Promise<void>` (atualiza `updatedAt`)
  - `deleteSong(id: string): Promise<void>` (marca `deletedAt`, remove de repertórios)
  - `createSetlist(name: string): Promise<Setlist>`, `listSetlists(): Promise<Setlist[]>`, `getSetlist(id: string): Promise<Setlist | undefined>`
  - `setSetlistOrder(id: string, songIds: string[]): Promise<void>`, `addToSetlist(id: string, songId: string): Promise<void>`, `removeFromSetlist(id: string, songId: string): Promise<void>`, `deleteSetlist(id: string): Promise<void>`
  - `clampFontSize(n: number): number` (mínimo 12, máximo 48; inválido ou `NaN` vira 20)

- [ ] **Step 1: Escrever testes que falham:** `addSong` devolve defaults; `updateSong` persiste `semitones: 3` e `fontSize: 30` e muda `updatedAt`; `listSongs` omite apagada; `deleteSong` tira a música de um repertório; `setSetlistOrder` preserva a ordem exata; `addToSetlist` duas vezes não duplica; `clampFontSize(5) === 12`, `clampFontSize(99) === 48`, `clampFontSize(NaN) === 20`.
- [ ] **Step 2:** Rodar `npx vitest run tests/db.test.ts`. Esperado: falha.
- [ ] **Step 3: Implementar `db.ts`** com Dexie (tabelas `songs` e `setlists`, `id` via `crypto.randomUUID()`).
- [ ] **Step 4:** Rodar testes. Esperado: passam.
- [ ] **Step 5: Commit** `feat: camada de dados local com IndexedDB`.

### Task 4: Importar por texto colado e biblioteca

**Files:**
- Create: `src/lib/importText.ts`, `src/ui/ImportDialog.tsx`, `src/ui/Library.tsx`
- Modify: `src/App.tsx`
- Test: `tests/importText.test.ts`, `tests/library.test.tsx`

**Interfaces:**
- Consumes: `addSong`, `listSongs` (Task 3).
- Produces: `parsePastedText(text: string): { title: string; artist: string; originalKey: string; rawText: string }`. Título e artista vêm de linhas iniciais no formato `Título - Artista` quando existirem, senão `'Sem título'` e `''`; `originalKey` vem do primeiro acorde da primeira linha de acorde (ou `''`).
- Produces: `<Library onOpen={(id: string) => void} />` com busca simples por título/artista e botão "Importar".

- [ ] **Step 1: Escrever testes que falham:**
  - `parsePastedText('')` não lança e devolve `title 'Sem título'`, `rawText ''`.
  - Texto só de espaços idem; texto sem nenhum acorde mantém `originalKey ''` e `rawText` intacto.
  - `parsePastedText('Canção Teste - Banda X\nG   D\nletra inventada')` dá `title 'Canção Teste'`, `artist 'Banda X'`, `originalKey 'G'`.
  - `Library`: após importar um texto no diálogo, o título aparece na lista; filtro por busca esconde os demais; lista vazia mostra "Nenhuma cifra ainda".
- [ ] **Step 2:** Rodar `npx vitest run`. Esperado: falha.
- [ ] **Step 3: Implementar** `parsePastedText`, o diálogo (textarea + salvar) e a biblioteca, ligada em `App` por estado simples de tela (`library | song | setlists | player`).
- [ ] **Step 4:** Rodar testes. Esperado: passam.
- [ ] **Step 5: Commit** `feat: importar cifra colando texto e listar biblioteca`.

### Task 5: Visualização, tom, fonte e modo palco

**Files:**
- Create: `src/ui/SongView.tsx`, `src/lib/wakeLock.ts`
- Modify: `src/App.tsx`
- Test: `tests/songview.test.tsx`

**Interfaces:**
- Consumes: `getSong`, `updateSong`, `clampFontSize` (Task 3); `transposeText`, `transposeChord`, `normalizeSemitones` (Task 2).
- Produces: `<SongView songId: string; onBack: () => void; onPrev?: () => void; onNext?: () => void; position?: string />`; `acquireWakeLock(): Promise<() => void>` (devolve função de liberar; não lança se a API não existir).

- [ ] **Step 1: Escrever testes que falham:** botões "♯"/"♭" e "+"/"−" de tom mudam o texto exibido e persistem `semitones`; botões A+/A− mudam `fontSize` dentro de 12–48 e persistem; trocar preferência sustenido/bemol persiste `accidental`; ao reabrir a música, tom e fonte voltam como salvos; o tom atual exibido é `transposeChord(originalKey, semitones, accidental)`; `acquireWakeLock` não lança quando `navigator.wakeLock` não existe.
- [ ] **Step 2:** Rodar `npx vitest run tests/songview.test.tsx`. Esperado: falha.
- [ ] **Step 3: Implementar `SongView`:** `<pre>` monoespaçado com `font-size` do estado e rolagem vertical; barra inferior com tom −/+ , ♭/♯, A−/A+; botão de tela cheia (`requestFullscreen`) e wake lock ligados ao entrar na tela e liberados ao sair. Layout conforme o rascunho do modo palco no spec (cabeçalho com posição e tom, navegação ◀ ▶ só quando `onPrev`/`onNext` existirem). Alvos de toque de pelo menos 44px.
- [ ] **Step 4:** Rodar testes. Esperado: passam.
- [ ] **Step 5: Commit** `feat: modo palco com tom, fonte e tela ligada`.

### Task 6: Repertórios

**Files:**
- Create: `src/ui/Setlists.tsx`, `src/ui/SetlistPlayer.tsx`
- Modify: `src/App.tsx`
- Test: `tests/setlists.test.tsx`

**Interfaces:**
- Consumes: funções de repertório de `db.ts` (Task 3); `<SongView>` (Task 5).
- Produces: `<Setlists onPlay={(setlistId: string) => void} />` e `<SetlistPlayer setlistId: string; onBack: () => void />`, que mostra `SongView` da posição atual com `position` no formato `"3/12"` e navega com `onPrev`/`onNext` (parado nas pontas).

- [ ] **Step 1: Escrever testes que falham:** criar repertório, adicionar duas músicas, reordenar chama `setSetlistOrder` com a nova ordem; remover tira a música; no player, "próxima" avança e na última música o botão de próxima fica desabilitado; repertório vazio mostra "Repertório vazio" e não quebra o player.
- [ ] **Step 2:** Rodar testes. Esperado: falha.
- [ ] **Step 3: Implementar** lista com arrastar por `@dnd-kit/sortable` (alça de arrastar, funciona por toque) e adicionar a partir da biblioteca.
- [ ] **Step 4:** Rodar testes. Esperado: passam.
- [ ] **Step 5: Commit** `feat: repertórios ordenáveis e player`.

### Task 7: Verificação offline e publicação

**Files:**
- Modify: `vite.config.ts` (se necessário), `README.md`

- [ ] **Step 1:** `npm run build && npm run preview`; no Chrome, abrir, importar uma cifra inventada, ligar modo avião (DevTools > Network > Offline) e recarregar. Esperado: app abre e a cifra aparece.
- [ ] **Step 2:** Publicar `dist` em Cloudflare Pages ou Netlify; abrir no celular, instalar na tela inicial e repetir o teste em modo avião. Esperado: abre offline.
- [ ] **Step 3:** Escrever no `README.md` como rodar, testar e publicar. **Commit** `docs: README e verificação offline`.

---

## Etapa 2: Link do Cifra Club e sincronização

### Task 8: Buscar cifra por link

**Files:**
- Create: `src/lib/cifraImport.ts`, `supabase/functions/fetch-cifra/index.ts`, `tests/fixtures/cifra-fixture.html` (HTML inventado com a mesma estrutura de uma página real: título, artista, tom e bloco de cifra)
- Modify: `src/ui/ImportDialog.tsx`
- Test: `tests/cifraImport.test.ts`

**Interfaces:**
- Consumes: `parsePastedText` e `addSong` (Tasks 3, 4).
- Produces: `parseCifraHtml(html: string): { title: string; artist: string; originalKey: string; rawText: string } | null` (`null` quando não há cifra); `isAllowedCifraUrl(url: string): boolean` (só `https` e host `cifraclub.com.br` ou `www.cifraclub.com.br`); Edge Function `POST /fetch-cifra {url}` → `{html}` ou erro `{error: 'url_invalida' | 'nao_encontrada' | 'muito_grande' | 'limite'}`.

- [ ] **Step 1: Antes de escrever o parser**, abrir uma página real do Cifra Club no navegador e anotar onde ficam título, artista, tom e o bloco da cifra (não copiar letra para o repositório); montar a fixture inventada com essa estrutura.
- [ ] **Step 2: Escrever testes que falham:** `parseCifraHtml(fixture)` devolve os quatro campos esperados; HTML sem bloco de cifra devolve `null`; `isAllowedCifraUrl` aceita `https://www.cifraclub.com.br/banda/musica/`, rejeita `http://`, `https://evil.com/cifraclub.com.br`, `https://cifraclub.com.br.evil.com/`, texto qualquer e string vazia.
- [ ] **Step 3:** Rodar testes. Esperado: falha.
- [ ] **Step 4: Implementar** o parser (DOMParser no navegador) e a Edge Function: validar URL com a mesma regra, buscar com timeout, limitar a resposta a 1 MB, exigir JWT do usuário e limitar a 30 requisições por hora. No `ImportDialog`, campo de link com botão "Buscar"; em qualquer erro mostrar mensagem em português e "Cole o texto da cifra abaixo".
- [ ] **Step 5:** Rodar testes e, com a função publicada, importar um link real à mão. Esperado: música aparece na biblioteca com origem `link`.
- [ ] **Step 6: Commit** `feat: importar cifra por link do Cifra Club`.

### Task 9: Sincronização com Supabase

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/sync.ts`, `src/ui/Login.tsx`
- Modify: `src/App.tsx`
- Test: `tests/sync.test.ts`

**Interfaces:**
- Consumes: `listSongs`/`listSetlists`/`updateSong` etc. (Task 3), incluindo registros com `deletedAt`.
- Produces: `mergeRecords<T extends {id: string; updatedAt: number}>(local: T[], remote: T[]): { toUpload: T[]; toSaveLocal: T[] }` (vence o maior `updatedAt`; empate não faz nada); `syncNow(): Promise<{uploaded: number; downloaded: number}>` (não faz nada e não lança se estiver offline).

- [ ] **Step 1: Escrever testes que falham em `mergeRecords`:** registro só local sobe; só remoto desce; vence o mais recente nos dois sentidos; empate não gera ação; registro apagado (`deletedAt`) mais recente vence um não apagado mais antigo; listas vazias dão resultado vazio.
- [ ] **Step 2:** Rodar testes. Esperado: falha.
- [ ] **Step 3: Implementar `mergeRecords`**; escrever `0001_init.sql` com tabelas `songs` e `setlists` (colunas espelham os tipos, `user_id uuid default auth.uid()`), RLS ligado e políticas de `select/insert/update` só para `user_id = auth.uid()`; implementar `syncNow` e `Login` (e-mail e senha; criação de contas desligada no projeto Supabase). Chamar `syncNow` ao abrir o app com internet e ao voltar o foco.
- [ ] **Step 4:** Rodar testes. Esperado: passam. Verificação manual: importar no celular, abrir no computador e ver a música; editar o tom nos dois e confirmar que vence a mais recente.
- [ ] **Step 5: Commit** `feat: sincronização offline-first com Supabase`.

## Auto-revisão
- **Cobertura do spec:** importar por link e por texto (Tasks 4, 8); tom e fonte salvos por música (5); repertório arrastável (6); modo palco com tela ligada (5); offline e instalável (1, 7); sincronização (9); limites do domínio e da função (8).
- **Consistência de tipos:** `Song`, `Setlist`, `Accidental` definidos nas Tasks 2–3 e usados com os mesmos nomes depois.
- **Fora do escopo, por decisão do spec:** rolagem automática, pedal, metrônomo, catálogo, compartilhamento.
