# Registro de Mudanças — MaurIA

Documento de rastreio para permitir rollback. Data: 2026-06-10.

---

## PARTE 1 — Mudanças JÁ APLICADAS (correções de bugs)

### 1.1 Chat ficava vazio ao fim do streaming

**Arquivo:** `src/components/chat/chat-realtime.tsx`

**Problema:** ao fim do stream, `setStreaming(null)` apagava a resposta da tela antes do `router.refresh()` trazer as mensagens persistidas; fora de uma transition, o commit podia ficar preso até a próxima interação.

**Mudança:**
- Adicionado import de `useTransition`.
- Adicionado `const [, startTransition] = useTransition();` no componente.
- O bloco final do `sendMessage` passou de:
  ```ts
  setStreaming(null);
  setPendingUser(null);
  if (!errored) router.refresh();
  ```
  para:
  ```ts
  startTransition(() => {
    router.refresh();
    setStreaming(null);
    setPendingUser(null);
  });
  ```

**Rollback:** restaurar o bloco antigo e remover `useTransition`.

### 1.2 Conversa ativa não atualizava na sidebar

**Problema:** o `activeThreadId` era calculado no layout do servidor (header `x-pathname`), que não re-renderiza em navegação client-side.

**Mudanças:**
- `src/components/chat/thread-item.tsx`: removida a prop `active`; o ativo agora é calculado no cliente com `usePathname()`:
  ```ts
  const pathname = usePathname();
  const active = pathname === `/chat/${threadId}`;
  ```
- `src/components/chat/thread-sidebar.tsx`: removida a prop `activeThreadId` e o `active={thread.id === activeThreadId}`.
- `src/app/(app)/chat/layout.tsx`: removidos o import de `headers`, a leitura de `x-pathname`, o `match`/`activeThreadId` e a prop passada aos dois `<ThreadSidebar>`.

**Rollback:** restaurar a prop `active`/`activeThreadId` na cadeia layout → sidebar → item e a leitura do header no layout. O middleware (`src/lib/supabase/middleware.ts`) continua setando `x-pathname` e NÃO foi alterado (os layouts de `(app)` e `onboarding` ainda usam).

---

## PARTE 2 — Mudanças APLICADAS em 2026-06-10 (aprovadas pelo Daniel)

### 2.A Contexto de dados atuais no chat (opção A)

**Problema:** a API de futebol só era usada em previsões; perguntas tipo "jogos da champions hoje" iam direto pro LLM, que respondia com dados de treino antigos.

**Mudanças:**
- **NOVO** `src/lib/football/context.ts`: detecta por regex (sem LLM) perguntas de "jogos hoje/amanhã" e "tabela/classificação", com detecção de liga por apelido (premier, brasileirão, champions...), e monta bloco `=== DADOS ATUAIS ===` com dados da football-data.org. Rollback: deletar o arquivo.
- `src/lib/football/client.ts`: adicionada função `getMatchesByDate(dateFrom, dateTo)` → `GET /matches?dateFrom&dateTo`. Rollback: remover a função.
- `src/lib/football/cache.ts`: adicionado `dateMatches: 10min` ao objeto `TTL`. Rollback: remover a linha.
- `src/lib/llm/prompts.ts`: adicionada constante `INFO_CONTEXT_INSTRUCTIONS`. Rollback: remover a constante.
- `src/app/api/chat/route.ts`: quando não há previsão, chama `buildInfoContext(message, profile.followedLeagues)`; se retornar contexto, anexa `INFO_CONTEXT_INSTRUCTIONS` ao system prompt e passa o bloco em `contextData`. Rollback: remover o bloco `infoContext` e voltar `contextData: prediction?.narrativeContext`.

### 2.P1 Paralelização do /api/chat

**Arquivo:** `src/app/api/chat/route.ts`
- thread + profile + histórico: 3 awaits sequenciais → um `Promise.all` (checagens de 404/403 vêm depois, comportamento HTTP idêntico).
- gravação da mensagem do usuário + pipeline de previsão: sequencial → `Promise.all` (o try/catch do pipeline virou `.catch()` devolvendo `null`).
- gravação da resposta + update do `updatedAt` do thread: sequencial → `Promise.all`.

**Rollback:** voltar aos awaits sequenciais (ver histórico git / Parte 2 do diff).

### 2.P2 detectIntent sem retries bloqueantes

- `src/lib/llm/gemini.ts`: `GenerateStructuredArgs` ganhou campo opcional `attempts` (default 3), repassado ao `withRetry`.
- `src/lib/llm/intent.ts`: chama `generateStructured` com `attempts: 1` (antes, um 429 podia segurar o stream por até ~11s de backoff).

**Rollback:** remover `attempts: 1` do intent.ts e o campo do gemini.ts.

### 2.P3 Modelo do LLM configurável por env

- `src/lib/llm/gemini.ts`: `MODEL_NAME` agora lê `process.env.LLM_MODEL` com fallback no atual `openai/gpt-oss-120b:free`.
- **Ação do Daniel (opcional):** para acelerar, definir no `.env`/Vercel algo como `LLM_MODEL=google/gemini-2.5-flash` (modelo pago do OpenRouter, mesmo `OPENROUTER_API_KEY`). Sem a env, nada muda.

**Rollback:** voltar a constante fixa.

### 2.P4 Cache por request do getCurrentProfile

- `src/lib/auth/profile.ts`: `getCurrentProfile` envolto em `cache()` do React — layout + página na mesma navegação fazem 1 ida ao Supabase/Postgres em vez de 2+.

**Rollback:** desfazer o wrap `cache()`.

### NÃO aplicado

- Opção B (upgrade football-data €12/mês) e C (migração API-Football) — decisões de plano/custo, não de código.

---

## PARTE 2 (original) — Propostas como foram apresentadas (referência)

### 2.1 Dados desatualizados nas respostas

Causa raiz: a API de futebol só é consultada em intents de previsão; o resto vai direto pro LLM (`openai/gpt-oss-120b:free`), que responde com dados de treino antigos.

Opções levantadas:
- **A (recomendada, custo zero):** expandir a pipeline em `src/app/api/chat/route.ts` + `src/lib/llm/intent.ts` para detectar intents de "jogos de hoje/tabela/rodada" e injetar dados da football-data.org no prompt (mesmo padrão do `PREDICTION_CONTEXT_INSTRUCTIONS`). Arquivos novos prováveis: função em `src/lib/football/client.ts` já cobre standings/matches; criar formatador de contexto em `src/lib/prediction/` ou `src/lib/football/`.
- **B:** upgrade football-data.org €12/mês (livescores) — zero código, só troca de plano.
- **C:** migrar para API-Football Pro ($19/mês) — reescrever `src/lib/football/client.ts`, `types.ts`, `resolver.ts`, `src/lib/data/teams.ts` (IDs diferentes) — mudança grande, não recomendada agora.

### 2.2 Performance

| # | Mudança proposta | Arquivos | Risco |
|---|---|---|---|
| P1 | Paralelizar queries do route handler (thread + profile + histórico via `Promise.all`; gravação da mensagem do usuário e update do thread idem) | `src/app/api/chat/route.ts` | Baixo |
| P2 | `detectIntent` sem retries bloqueantes (1 tentativa) e/ou só heurística regex antes do stream | `src/lib/llm/intent.ts`, `src/lib/llm/gemini.ts` | Baixo |
| P3 | Trocar modelo `:free` do OpenRouter por provider mais rápido (Gemini Flash / Groq) — requer nova API key no `.env` | `src/lib/llm/gemini.ts` | Médio |
| P4 | Cachear `getCurrentProfile` por request com `React.cache()` | `src/lib/auth/profile.ts` | Baixo |

**Rollback geral:** todas as mudanças da Parte 2, quando aplicadas, serão registradas aqui com o diff resumido (antes/depois) por arquivo, como na Parte 1. Recomenda-se também um commit git separado por item (P1, P2...) para reverter com `git revert`.

---

## Diagnóstico de lentidão (referência)

1. LLM `:free` do OpenRouter lento + retries de 1s/3s/7s em 429 (até ~11s extras).
2. `detectIntent` = chamada LLM extra bloqueante antes do stream começar.
3. Chamadas sequenciais no `/api/chat` (auth → thread → profile → histórico → gravação → intent → pipeline).
4. Cache da football-data em Postgres remoto (round-trip por leitura).
5. `router.refresh()` pós-mensagem re-renderiza layout inteiro (threads + mensagens + profile).
