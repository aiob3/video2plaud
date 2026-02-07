# Copilot instructions — video2plaud

## Visão rápida da arquitetura
- Backend Node/Express (ESM) em `backend/`: API REST + fila Bull (Redis) para converter vídeo → áudio MP4 (AAC) e gerar thumbnail via ffmpeg/ffprobe.
- Rotas principais: `/api/upload` (multer + validação), `/api/convert` (enfileira), `/api/convert/:id` (status), `/api/download/:id` (download quando pronto), `/api/health` (200 OK).
- Worker Bull inicia junto do servidor em `queue/worker.js` e processa a fila `convert` chamando `services/convert.js` (duas execuções ffmpeg: thumb aos 15s e extração de áudio AAC 128k/44.1k com faststart).
- Uploads gravam em `UPLOAD_DIR` (ex.: `backend/uploads/temp`). Downloads servem o arquivo `.mp4` final do mesmo diretório.

## Fluxo de uso da API
- Upload: POST `/api/upload` campo `file` (multer). Aceita extensões mp4/mov/mkv; valida codec H.264, resolução mínima 1280x720, duração ≤ 7200s. Responde caminho salvo, meta e tamanho. Remove arquivo em falhas.
- Conversão: POST `/api/convert` body `{ path, title? }` usando `path` retornado do upload. Responde `jobId` e 202. Status em GET `/api/convert/:id` (states Bull: waiting/active/completed/failed). Se concluído, traz `result` com caminhos. Download em GET `/api/download/:id` (409 se não concluído, 500 se arquivo ausente).

## Ambiente e dependências
- Variáveis obrigatórias (`backend/config/index.js`): `PORT`, `REDIS_URL`, `UPLOAD_DIR`. Caminhos dos binários configuráveis: `FFMPEG_BIN` (default `ffmpeg`), `FFPROBE_BIN` (default `ffprobe`). Leia `.env` via dotenv. ffmpeg/ffprobe precisam estar instalados e executáveis no PATH do container/host.
- Docker Compose (dev): `docker-compose.yml` sobe Redis e app (`PORT=3001`, `UPLOAD_DIR=/app/uploads/temp`, volume `backend/uploads` preserva saídas). Fila Bull aponta para `redis://redis:6379`.
- Pacotes chave: express, multer (+ nanoid para nomes), bull (fila), dotenv, ioredis (peer de bull), nodemon para dev.

## Convenções de código
- Módulos ES em todo backend (`type: module`). Imports relativos com extensão `.js`.
- Logs estruturados com marcadores (`[UPLOAD_START]`, `[VALIDATION_ERROR]`, etc.) e objetos JSON em erros. Mantenha formato ao adicionar logs.
- Validação central em `routes/upload.js` respeitando limites do PRD (codec/resolução/duração). Preserve mensagens PT-BR e remoção do arquivo em falha.
- Fila: use `enqueueConvert`/`getJob` de `lib/queue.js`; evite criar novas filas sem necessidade. Worker já é iniciado via `startWorker()` no boot do servidor.
- Saídas de conversão: `services/convert.js` usa dois comandos ffmpeg. Se alterar, mantenha geração de thumbnail (frame aos 15s) e áudio AAC 128k/44.1k + faststart e title metadata.
- Header de identificação solicitado pelo operador: ao criar arquivos ou blocos novos significativos, adicionar comentário com `ID Mestre 06022-191500` descrevendo objetivo.

## Rotina de desenvolvimento
- Instalação backend: `cd backend && npm install`. Rodar local com `npm run dev` (nodemon) ou `npm start`. Exige Redis ativo e ffmpeg/ffprobe disponíveis.
- Frontend ainda é template Vite padrão em `frontend/`; previsível substituição por UI de upload/estado. Rodar com `cd frontend && npm install && npm run dev`.
- Testes manuais: 1) subir Redis (via docker-compose), 2) iniciar backend, 3) POST `/api/upload` com vídeo h264 ≥1280x720 e <2h, 4) POST `/api/convert` com `path` retornado, 5) acompanhar GET `/api/convert/:id`, 6) baixar via `/api/download/:id`.

## Padrões de entrega e repositório
- Branch principal: `main`. Usar `.gitignore` raiz (inclui node_modules, dist, .env, editor). Evitar adicionar artefatos de build/upload.
- PRD e prompts de agentes estão na raiz (`README.md`, `copilot-instruction.md`, `devops.agent.md`). Consulte antes de alterar requisitos.
- Deploy alvo: Hostinger VPS (Docker). Compose atual serve como base; mantenha compatibilidade com imagem multi-stage citada no PRD.
