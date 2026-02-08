# Framework LLM-Readable — progress-bar-1-a-1

**ID Mestre:** 06022-191500
**Feature:** progress-bar-1-a-1
**Origem:** video2plaud (backend)

---

## Parte A — Feature (Intake)

- FEATURE_NAME: progress-bar-1-a-1
- CODEBASE_PATH: .
- ENTRY_POINTS:
  - `backend/services/convert.js`
  - `backend/queue/worker.js`
  - `backend/src/middleware/upload.js`
  - `backend/src/server.js`
- TEST_FILE: `backend/test/services/ffmpegProgress.test.js`
- TEST_COMMAND: `cd backend && npm test`

---

## Parte B — Framework (Spec + Snippet + Guia)

### 1) Spec (O que entregar)

- Progresso 1-a-1: parsing do `time=` emitido pelo FFmpeg no stderr para mapear tempo atual → percentual (faixa 11–95) e emitir payloads estruturados `{ percent, stage, detail }` via `job.progress()` do Bull.
- Estágios definidas (invariants): `queued`, `validating`, `thumbnail`, `thumbnail-done`, `convert-audio`, `faststart`, `metadata`, `done`.
- UI: polling de `/api/convert/:id` retorna `{ status, progress, stage, detail }` e o frontend atualiza barra/timeline.

### 2) Snippet Técnico (núcleo)

- Extraia funções testáveis: `parseTimeFromStderr`, `computePercent`, `runWithRealProgress` em `backend/services/ffmpegProgress.js`.

Exemplo de API:

```js
// parse time string
const t = parseTimeFromStderr('... time=00:01:23.45 ...');
// percent mapping
const p = computePercent(t, durationSec, rangeStart, rangeEnd);
// runner (reportProgress é async)
await runWithRealProgress([ffmpeg,...args], { durationSec, rangeStart:11, rangeEnd:95, stage:'convert-audio', detail:'Extraindo áudio', reportProgress });
```

### 3) Guia de Adoção (Como usar)

- Ao receber `job` no worker, passe `reportProgress = (p) => job.progress(p)` para `convertToAudio`.
- Assegure que `durationSec` provenha de `ffprobe` no upload ou seja enviado no POST `/api/convert`.
- Na falta de `durationSec` (zero), `runWithRealProgress` não emitirá intermediários (fallback: `job.progress({ percent: rangeEnd, ...})` no exit).

---

## Meios necessários (≥3)

- Binários: `ffmpeg`, `ffprobe` (configuráveis via `FFMPEG_BIN` / `FFPROBE_BIN` ou PATH).
- Infra: Redis (`REDIS_URL`) para Bull queue.
- Ambiente: Node.js (conforme Dockerfile: node:20-alpine) e permissão de escrita em `UPLOAD_DIR`.

---

## Insights (≥3)

1. Por que usar stderr `time=`: é a única fonte confiável para tempo real emitido pelo processo FFmpeg; onde: `runWithRealProgress` (worker); limites: exige `ffprobe` ter retornado `durationSec` para mapear percent.
2. Payload objeto no `job.progress()`: permite UI rica (stage+detail) sem criar canais extras; onde: `worker` → `job.progress()`; limites: job.progress aceita serializáveis — evitar funções ou circular refs.
3. Faixa 11–95 para conversão: reserva 0–10 para upload/thumbnail/heartbeat e 96–100 para finalização; onde: `convertToAudio` milestones; limites: ajuste de faixa pode ser necessário para formatos longos/curtos.

---

## Testes & Validação

- Unit tests (Vitest): `backend/test/services/ffmpegProgress.test.js` (parse, compute, mocked runWithRealProgress).
- Manual E2E smoke steps:
  1. Upload vídeo válido → receber `{ path, duration }`.
  2. POST `/api/convert` com `path` + `duration` → recebe `jobId`.
  3. Poll `/api/convert/:id` e verificar `progress` evolui (11..95..100) e `stage` transita.
  4. GET `/api/download/:id` retorna arquivo final.

---

## Lookup tables & Invariants

- Stage labels → UI labels: `queued` → 'Na fila', `convert-audio` → 'Convertendo', `done` → 'Concluído'.
- Invariant: `job.progress()` payload shape `{ percent: Number, stage: String, detail: String }`.

---

## Checklist HITL (o que Operador valida)

- [ ] `components/llm-readable.progress-bar-1-a-1.skill.md` revisado.
- [ ] Unit tests passando: `cd backend && npm test`.
- [ ] Extração criada: `backend/services/ffmpegProgress.js` com ID Mestre.
- [ ] Manual E2E: upload → enqueue → progress → download (ver etapas e percentuais).
- [ ] `docs/TODO.md` e `docs/SESSION_LOG.md` atualizados com a execução.

---

## Notas finais

- Arquivos-chave: `backend/services/convert.js` (orquestra), `backend/queue/worker.js` (reportProgress wiring), `backend/services/ffmpegProgress.js` (extracted), `backend/public/index.html` (frontend UI).
- Próximo passo sugerido: adicionar um E2E (mocked ffmpeg or docker) se desejado pelo Operador.
