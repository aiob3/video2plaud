// README.md

# PRD v1.0 — Conversor Vídeo Snipping Tool → MP4 Audio

## 1. Objetivo Executivo
Aplicação web proprietária que converte arquivos de vídeo gerados pelo Windows Snipping Tool em áudio MP4 compatível com Plaud.ai, com deploy automatizado em Hostinger (VPS KVM4 + Docker).

## 2. Requisitos Funcionais

### RF1: Ingestão de Vídeo
- Upload drag-and-drop de `.mp4`, `.mov`, `.mkv` (formatos Snipping Tool)
- Validação: codec H.264, resolução mín 1280x720, duração máx 2h
- Armazenamento temporário: `/uploads/temp/` (cleanup automático 24h)

### RF2: Conversão Áudio
- Extração de áudio usando **FFmpeg** (libmp3lame)
- Saída: MP4 container + AAC codec, 128kbps, 44.1kHz
- Metadados: título, duração, thumbnail frame (15s)
- Processamento assíncrono via **Bull Queue** (Redis backend)

### RF3: Compatibilidade Plaud.ai
- Formato exato: MP4 (ISO/IEC 14496-14), AAC LC
- Metadados ID3v2 automáticos
- Rate de sucesso testado vs API Plaud.ai v2.0

### RF4: Integração Hostinger
- Docker image multi-stage: `conversor-audio:1.0`
- Auto-deploy via Hostinger WebApp Wizard
- Env vars: `PLAUD_API_KEY`, `REDIS_URL`, `NODE_ENV`
- Health check: `/api/health` (200 OK)

## 3. Não-Requisitos (YAGN)
- ❌ Interface de administração
- ❌ Fila de conversões persistente (24h TTL suficiente)
- ❌ Streaming em tempo real
- ❌ Suporte a múltiplos idiomas

## 4. Entregáveis Técnicos

| Item | Formato | Descrição |
|------|---------|-----------|
| **PRD** | Markdown | Este documento |
| **System Prompt** | Texto | Orquestrador de projeto (vide abaixo) |
| **Engineer Prompt** | Texto | Desenvolvimento Front/Back (vide seção 2) |
| **Docker Compose** | YAML | Orquestração local (Redis, Node, FFmpeg) |
| **Aplicação** | Node.js + Vite/React | Interface + API backend |
| **GitHub Repo** | Link | Estrutura GitOps pronta para Hostinger |

## 5. Timeline (Sprints)
- **Sprint 1** (T+1d): Arquitetura + Docker Compose
- **Sprint 2** (T+3d): Frontend (upload UI) + API estúdio
- **Sprint 3** (T+5d): Testes + Deploy Hostinger
- **Sprint 4** (T+7d): Validação Plaud.ai + Go-Live

---

## SYSTEM PROMPT — Orquestrador de Projeto:			copilot-instructions.md
## ENGINEER PROMPT — Development Agent Senior:			DEVOPS.agent.md
## PRD v1.0 — Conversor Vídeo Snipping Tool → MP4 Audio: 	README.md
