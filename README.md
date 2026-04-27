# Contact Pro — WhatsApp Bot com IA

> Chatbot de WhatsApp com IA que faz o atendimento inicial de leads da
> Contact Pro: conversa, classifica intenção, qualifica o lead e exibe tudo em
> uma interface web em tempo real.
>
> Desafio técnico de **6 horas** para Contact Pro.

![Stack](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&logoColor=white)
![Anthropic](https://img.shields.io/badge/LLM-Claude%20Sonnet%204.5-D97757?logoColor=white)
![Whisper](https://img.shields.io/badge/STT-Whisper-412991?logo=openai&logoColor=white)
![TTS](https://img.shields.io/badge/TTS-OpenAI%20gpt--4o--mini-412991?logo=openai&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma&logoColor=white)

---

## Visão geral

```
┌──────────────────────────────────────────────────────────────────────┐
│                          docker compose up                           │
│                                                                      │
│   ┌─────────────────────────┐    Socket.IO    ┌─────────────────┐    │
│   │   backend (Node + TS)   │ ◄────────────►  │  frontend (Vite)│    │
│   │                         │                  │                 │    │
│   │   Express + Socket.IO   │ ◄── REST API ──  │  React + TW     │    │
│   │   Baileys (WhatsApp)    │                  │  Inbox UI       │    │
│   │   Prisma + SQLite       │                  │                 │    │
│   │   Claude / Whisper / TTS│                  │                 │    │
│   └────────────┬────────────┘                  └─────────────────┘    │
│                │                                                      │
│   Volumes locais:                                                    │
│     ./data/sqlite.db    (banco)                                      │
│     ./data/wa-session/  (sessão WhatsApp persistida)                 │
│     ./data/media/       (áudios in/out)                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Stack

| Camada       | Tecnologia                                            |
| ------------ | ----------------------------------------------------- |
| WhatsApp     | **Baileys** (`@whiskeysockets/baileys`)               |
| Backend      | **Node.js 22 + TypeScript + Express + Socket.IO**     |
| ORM/DB       | **Prisma + SQLite** (file-based, zero infra)          |
| Frontend     | **React 18 + Vite + Tailwind CSS + lucide-react**     |
| Realtime     | **Socket.IO** (server → client events)                |
| LLM          | **Anthropic Claude Sonnet 4.5** (chat + classificação)|
| STT          | **OpenAI Whisper** (`whisper-1`)                      |
| TTS          | **OpenAI** (`gpt-4o-mini-tts`)                        |
| Container    | **Docker Compose** (backend + frontend + volumes)     |

---

## Como rodar

### Pré-requisitos

- Docker + Docker Compose **OU** Node.js 22+
- Chaves de API:
  - `AI_API_KEY` (Anthropic) — obrigatória para a IA conversar de verdade
  - `STT_API_KEY` (OpenAI) — obrigatória para transcrever áudio
  - `TTS_API_KEY` (OpenAI) — obrigatória para responder em áudio

### Caminho rápido (Docker)

```bash
cp .env.example .env
# preencha AI_API_KEY, STT_API_KEY, TTS_API_KEY no .env
docker compose up --build
```

Depois:

1. Abra `http://localhost:5173` no navegador.
2. Um **QR Code** aparecerá no header da interface (e também no terminal do
   container `contactpro-backend`).
3. No celular: WhatsApp → **Aparelhos conectados** → **Conectar um aparelho** →
   escanear.
4. Quando o pill de status mudar para **"WhatsApp conectado"**, mande qualquer
   mensagem para o número conectado a partir de outro celular.
5. A mensagem aparece na inbox em tempo real, o bot reage com 👍, processa
   pela IA e responde.

### Caminho local (sem Docker)

```bash
# Terminal 1 — backend
cd backend
cp ../.env.example ../.env   # ajuste as chaves
npm install
npx prisma db push           # cria o sqlite
npm run dev

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- Backend / API: `http://localhost:3001`
- Healthcheck: `http://localhost:3001/health`
- Status (WA + serviços): `http://localhost:3001/api/status`

---

## Configuração do `.env`

Todas as variáveis estão no `.env.example`. Resumo das obrigatórias:

```env
# LLM
AI_PROVIDER=anthropic                            # anthropic | openai
AI_MODEL=claude-sonnet-4-5-20250929
AI_API_KEY=sk-ant-...

# STT (transcrição)
STT_PROVIDER=openai
STT_MODEL=whisper-1
STT_API_KEY=sk-...

# TTS (resposta em áudio)
TTS_PROVIDER=openai
TTS_MODEL=gpt-4o-mini-tts
TTS_VOICE=alloy
TTS_API_KEY=sk-...
```

> Sem `AI_API_KEY`, o bot ainda **conecta no WhatsApp** e mostra mensagens em
> tempo real, mas responde com uma mensagem placeholder em vez de chamar a IA.
> Sem STT, áudios chegam mas não são transcritos. Sem TTS, áudios recebidos
> são respondidos em texto (fallback automático).

---

## Conectando o WhatsApp

- O QR Code é gerado a cada nova autenticação. Aparece **no terminal do
  backend** (ASCII) e **na interface web** (imagem).
- A sessão é persistida em `./data/wa-session/` (volume local, no host).
- Reinicializações **não exigem** novo QR enquanto o WhatsApp não derrubar a
  sessão.

### Resetar a sessão

```bash
rm -rf ./data/wa-session/*
docker compose restart backend
# ou, sem docker:
rm -rf ./data/wa-session/*
# o backend vai gerar um novo QR automaticamente no próximo start
```

### Visualizar logs

```bash
# docker
docker compose logs -f backend

# local
# o pino-pretty já está formatando os logs no stdout do `npm run dev`
```

---

## Como testar manualmente

### 1. Texto

Mande para o número conectado: `Olá, queria saber sobre o Contact Z`

Esperado:
- Mensagem aparece na inbox **em tempo real** com bolha à esquerda
- Bot reage com 👍
- Indicador "**IA pensando…**" aparece
- Resposta do bot chega como **reply** à mensagem original
- Painel direito mostra **intent = contact_z** e dados parciais do lead

### 2. Áudio

Grave um áudio no WhatsApp dizendo: _"Quero contratar um mailing de empresas
de varejo para uma campanha de cobrança"_

Esperado:
- Mensagem chega como áudio (player na bolha)
- Após ~2-3s, a transcrição aparece abaixo do player
- Intent vira **mailing**, lead.serviceInterest = `mailing`
- Bot **responde também em áudio** (TTS) com perguntas de qualificação
  adicionais (volume, segmento etc)

### 3. Pedir humano

Mande: `Posso falar com um consultor humano?`

Esperado:
- Status do lead vira **needs_human** (badge amarelo no painel)
- Reaction final na mensagem do lead é ✅
- Bot confirma transferência

### 4. Opt-out

Mande: `Não tenho interesse, obrigado`

Esperado:
- Status vira **opt_out** (badge vermelho)
- Reaction 👌
- Bot encerra cordialmente

### 5. Persistência

Recarregue a página → o histórico continua intacto, conversas selecionáveis,
mensagens, reactions, transcrições, dados do lead.

---

## Arquitetura

```
backend/src/
├── index.ts                      # bootstrap Express + Socket.IO + Baileys
├── config/env.ts                 # validação de env via zod
├── db/client.ts                  # Prisma singleton
├── realtime/socket.ts            # Socket.IO server + tipos de eventos
├── whatsapp/
│   ├── client.ts                 # conexão Baileys, QR, reconnect, send/react
│   └── media.ts                  # download e detecção de áudio
├── ai/
│   ├── llm.ts                    # Anthropic + system prompt
│   ├── intent.ts                 # classificação em 9 categorias
│   ├── qualify.ts                # extração de dados do lead
│   ├── stt.ts                    # Whisper
│   └── tts.ts                    # OpenAI TTS
├── pipeline/handleInbound.ts     # orquestra todo o fluxo
├── routes/                       # REST: conversations, messages, media, status
└── knowledge/contactpro.ts       # KB injetada no prompt
```

### Pipeline de mensagem (resumo)

```
1.  Baileys recebe mensagem
2.  Identifica/cria Conversation pelo JID
3.  Persiste Message inbound      → emit wa.message.received
4a. (áudio) Download → Whisper    → emit audio.transcribed
4b. (texto) usa o conteúdo
5.  Reage 👍                      → emit wa.reaction.sent
6.  emit ai.thinking { on: true }
7.  Em paralelo: classifyIntent + qualifyLead
8.  Atualiza Conversation/Lead    → emit lead.updated
9.  Decide status (qualified | needs_human | opt_out | active)
10. generateReply (LLM)
11. (áudio in) TTS + sendAudio    | (texto in) sendText
12. Persiste outbound             → emit wa.message.sent
13. Reaction final (✅, 👌 ou 👍)
14. emit ai.thinking { on: false }
```

### Eventos Socket.IO (server → client)

```
wa.connection.update     { status, qr? }
wa.message.received      { message, conversation }
wa.message.sent          { message }
wa.reaction.sent         { messageId, emoji }
audio.transcribed        { messageId, transcription }
ai.thinking              { conversationId, on }
lead.updated             { conversation, lead }
conversation.status_changed { conversationId, status }
error                    { message, conversationId? }
```

### Schema do banco

```prisma
Conversation { id, whatsappJid, contactName, status, intent, lead, messages }
Lead         { id, name, company, phone, serviceInterest, leadGoal, estimatedVolume, status }
Message      { id, conversationId, direction, type, content, mediaPath, transcription, status, reaction, whatsappId }
```

---

## Decisões e trade-offs

| Decisão                                | Alternativa rejeitada       | Por quê                                                        |
| -------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| **SQLite + Prisma**                    | Postgres                    | Zero infra, atende o desafio, file-based em volume Docker      |
| **Sem fila externa**                   | BullMQ + Redis              | Em 6h, fila adicionaria infra sem ganho perceptível na demo    |
| **KB estática no prompt**              | RAG vetorial                | Base é pequena (~5 serviços, ~600 tokens), RAG não justifica   |
| **TTS+STT no mesmo provider (OpenAI)** | Whisper local + ElevenLabs  | Menos chaves, menos código, latência ok                        |
| **Vite dev server em produção**        | Build estático + nginx      | Para o desafio basta — README documenta o atalho               |
| **Sem testes automatizados**           | Vitest / supertest          | Tempo finito; validei manualmente, documento como gap          |
| **Sem auth no frontend**               | Login + sessão              | Demo single-user, não há requisito de multi-tenant             |
| **Inbox read-only**                    | Caixa permitindo digitação  | Foco do desafio é o **bot autônomo**; humano não digita aqui   |

---

## Limitações conhecidas

- **Multi-conversa**: o backend já suporta N conversas; a UI também — só não
  testei sob alta carga (10+ leads simultâneos).
- **Retries de envio**: confio no retry interno do Baileys; não implementei
  retry custom no pipeline.
- **Observabilidade**: usa pino-pretty no dev; sem dashboard de métricas.
- **Testes**: ausentes. Validei manualmente os fluxos descritos acima.
- **Reset de QR**: requer apagar `data/wa-session/` manualmente (não há
  botão na UI).
- **Áudio formato**: salvo como `.ogg/opus`. Em alguns navegadores pode haver
  delay no início da reprodução por conta do `Content-Range` ausente.
- **Sem rate-limiting** nas chamadas do LLM (o desafio é demo).
- **Knowledge base estática**: para um produto real, faria sentido um RAG
  alimentado pelo CMS da Contact Pro.
- **Sem `pricing` lookup**: o bot recusa preço e qualifica primeiro (decisão
  consciente, alinhado às instruções).

## O que eu faria com mais tempo

1. **Fila** (BullMQ ou pg-boss) para desacoplar inbound do processamento,
   permitir retries idempotentes e lidar com surtos de mensagens.
2. **Testes**: contract tests para o pipeline, e Playwright pra inbox.
3. **Métricas**: latência LLM/STT/TTS, taxa de qualificação, distribuição de
   intents — exposto em `/metrics` (prometheus).
4. **RAG**: embeddings + pgvector para a KB ficar viva conforme a Contact Pro
   atualiza serviços.
5. **Multi-tenant**: cada workspace teria seu próprio número WhatsApp e KB.
6. **UI completa**: caixa para o operador humano assumir, marcar tags,
   exportar lead pra CRM.
7. **Auth**: NextAuth ou similar pra login do operador.
8. **Build estático do frontend** + nginx no Docker.
9. **Webhooks de status do WhatsApp** (delivered/read) refletindo no
   `Message.status`.

---

## AI Usage Report

### Ferramentas usadas

- **Claude Sonnet** (no Cursor / Claude Code) — pair-programming na quase
  totalidade do projeto: scaffolding, schema Prisma, integração Baileys,
  prompts, frontend, Docker.
- **Anthropic API (Claude Sonnet 4.5)** — runtime do bot (geração, classificação
  e qualificação).
- **OpenAI Whisper / TTS** — STT e TTS em runtime.

### Onde usei IA

| Área                              | Uso de IA                                                  |
| --------------------------------- | ---------------------------------------------------------- |
| Estrutura inicial e Docker Compose| Geração de scaffolding (package.json, tsconfig, compose)   |
| Integração Baileys                | Padrão de uso (`useMultiFileAuthState`, eventos)           |
| Pipeline `handleInbound`          | Esqueleto + revisão                                        |
| System prompt da IA               | Iteração rápida com a própria IA testando o prompt         |
| Classificação/qualificação JSON   | Definição do schema e validação                            |
| Frontend Tailwind                 | Componentes shadcn-style, paleta, hierarquia tipográfica   |
| Decisões de arquitetura           | Conferência de trade-offs (SQLite vs Postgres etc)         |

### Onde revisei manualmente

- **Segurança**: `.gitignore`, `.env.example` sem segredos, validação de
  caminho no `routes/media.ts` (path traversal), CORS com origin único,
  download de mídia sem expor caminho do filesystem.
- **Sessão WhatsApp**: paths absolutos, criação de diretório, reconexão sob
  `DisconnectReason.loggedOut`.
- **Pipeline**: erros isolados em try/catch, `ai.thinking { off }` no finally,
  fallback texto quando TTS não está configurado.
- **Persistência**: índices, cascading deletes, schema review.
- **Tipagem**: `tsc --noEmit` passa em backend e frontend.
- **Prompts**: ajustei manualmente para ser objetivo, não inventar preços e
  fazer apenas uma pergunta por turno.

### Uma sugestão da IA que rejeitei ou alterei

A primeira proposta da IA usava **Postgres + Redis (BullMQ) + nginx** no
Docker Compose. Rejeitei: para o desafio em 6h, isso aumenta a superfície de
falha de boot e não traz ganho na demo. Substituí por **SQLite + sem fila +
Vite dev em prod**, documentando o trade-off explicitamente.

A IA também sugeriu que o frontend tivesse uma **caixa de input** para o
operador digitar respostas — rejeitei porque o desafio é sobre o **bot
autônomo**, e ter uma caixa enviaria a mensagem errada (parece que o humano
está respondendo pelo bot). Mantive a inbox **read-only** com aviso claro.

### Como validei a entrega

- `tsc --noEmit` em backend e frontend → **OK**
- `vite build` → **OK** (216 KB JS, 18 KB CSS, gzip 67 KB / 4 KB)
- `prisma db push` → **DB criado**
- Smoke test manual seguindo a seção [Como testar manualmente](#como-testar-manualmente)
  acima:
  - Texto inbound → reaction 👍 → IA responde → painel atualizado ✓
  - Áudio inbound → transcrição visível → resposta TTS ✓
  - Pedido de humano → status `needs_human` ✓
  - Opt-out → status `opt_out` ✓
  - Reload → histórico persiste ✓
- Arquitetura conferida lendo `handleInbound.ts` linha-a-linha após cada IA
  generation (especialmente os emits + side-effects).

### Tempo aproximado de execução

**~5h45** das 6h estipuladas (sobrou margem para polimento + README).

Distribuição:
1. Setup + esqueleto (~30min)
2. Backend (Baileys, prisma, pipeline) (~1h45)
3. AI integrations (LLM, intent, qualify, STT, TTS) (~1h)
4. Frontend completo (~1h30)
5. Docker Compose + smoke tests (~30min)
6. README + KB + commits + verificação (~30min)

---

## Entrega

- Repositório: este diretório
- Branch principal: `main`
- Commits progressivos: ver `git log`
- `.env.example` incluso (sem segredos)
- O QR Code aparece **automaticamente** no terminal e na UI quando o backend
  sobe sem sessão prévia.

### O que ficou completo

✅ Conexão WhatsApp via **Baileys** com QR no terminal **e** na UI
✅ Reconexão automática (exceto quando logged-out)
✅ Recebimento de **texto**
✅ Envio de texto **como reply** à mensagem original
✅ **Reaction** 👍 / ✅ / 👌 / ⚠️ na mensagem inbound
✅ **IA real** (Claude Sonnet 4.5) gerando resposta com KB injetada
✅ **Classificação de intent** em 9 categorias
✅ **Qualificação de lead** (nome, empresa, interesse, objetivo, volume)
✅ **Mudança automática de status** (qualified / needs_human / opt_out)
✅ **Frontend React + Tailwind** com 3-painéis (lista, chat, painel do lead)
✅ **Socket.IO** com 9 eventos cobrindo todo o pipeline
✅ Indicador "**IA pensando…**"
✅ Distinção visual clara user vs bot, texto vs áudio
✅ **Persistência completa** (SQLite via Prisma) — recarregar mantém tudo
✅ **Áudio inbound**: download + STT (Whisper) com transcrição exibida
✅ **Áudio outbound**: TTS (OpenAI) quando inbound foi áudio (regra mínima)
✅ **Docker Compose** subindo backend + frontend com volumes persistentes
✅ **README completo** com AI Usage Report

### O que ficou incompleto (documentado acima)

- Testes automatizados
- Fila assíncrona (BullMQ)
- Multi-tenant
- Auth no frontend
- Métricas / observabilidade detalhada
- Build estático do frontend + nginx
