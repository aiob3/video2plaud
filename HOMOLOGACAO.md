# Video2Plaud - Conversor de Vídeo para Áudio Plaud.ai

## Status da Implementação

### ✅ Concluído

1. **Backend Node.js + Express**
   - Servidor Express com rotas REST
   - Upload de arquivos com Multer
   - Validação de vídeo (codec H.264, resolução mínima 1280x720, duração máxima 2h)
   - Fila assíncrona com Bull + Redis
   - Conversão de áudio com FFmpeg (AAC LC 128kbps, 44.1kHz)
   - Extração de thumbnail aos 15s
   - Metadados ID3v2 compatíveis com Plaud.ai v2.0

2. **Frontend Estático**
   - Interface minimalista em HTML/CSS/JS puro
   - Upload via drag-and-drop ou seleção de arquivo
   - Polling de status da conversão
   - Download do arquivo convertido

3. **Docker**
   - Dockerfile multi-stage com FFmpeg
   - docker-compose.yml com Redis e app
   - .dockerignore e .gitignore configurados

4. **Estrutura de Arquivos**
```
backend/
├── config/
│   └── index.js          # Configuração centralizada
├── lib/
│   ├── exec.js           # Wrapper para execFile
│   ├── media.js          # FFprobe para validação
│   └── queue.js          # Bull queue setup
├── queue/
│   └── worker.js         # Worker de conversão
├── services/
│   └── convert.js        # Lógica de conversão FFmpeg
├── src/
│   ├── middleware/
│   │   └── upload.js     # Multer config
│   ├── routes/
│   │   ├── convert.js    # POST /api/convert, GET /api/convert/:id
│   │   ├── download.js   # GET /api/download/:id
│   │   ├── health.js     # GET /api/health
│   │   └── upload.js     # POST /api/upload
│   └── server.js         # Entry point
├── public/
│   └── index.html        # Frontend estático
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
└── package.json
```

### 🔧 Próximos Passos para Homologação Local

1. **Instalar FFmpeg localmente** (Windows):
   - Baixar de https://ffmpeg.org/download.html
   - Adicionar ao PATH do sistema
   - Ou usar Docker: `docker-compose up`

2. **Testar conversão completa**:
   - Acessar http://localhost:3001
   - Fazer upload de um vídeo .mp4/.mov/.mkv
   - Aguardar conversão
   - Baixar arquivo de áudio

3. **Validar saída**:
   - Verificar codec AAC LC 128kbps
   - Verificar sample rate 44.1kHz
   - Verificar metadados ID3v2
   - Testar upload no Plaud.ai

### 🚀 Deploy para Hostinger

1. **Preparar repositório Git**:
```bash
git init
git add .
git commit -m "Initial commit - Video2Plaud converter"
git remote add origin <seu-repo-github>
git push -u origin main
```

2. **Configurar Hostinger WebApp Wizard**:
   - Conectar repositório GitHub
   - Selecionar branch `main`
   - Definir variáveis de ambiente:
     - `PORT=3001`
     - `REDIS_URL=redis://redis:6379`
     - `UPLOAD_DIR=/app/uploads/temp`
   - Deploy automático via Docker

3. **Configurar Redis no VPS KVM4**:
   - Usar Docker Compose existente
   - Ou adicionar serviço Redis ao stack

### 📋 Endpoints da API

- `GET /api/health` - Health check
- `POST /api/upload` - Upload e validação de vídeo
- `POST /api/convert` - Enfileirar conversão
- `GET /api/convert/:id` - Status da conversão
- `GET /api/download/:id` - Download do áudio convertido

### 🔍 Validações Implementadas

- Codec: H.264 obrigatório
- Resolução mínima: 1280x720
- Duração máxima: 2 horas
- Formatos aceitos: .mp4, .mov, .mkv
- Tamanho máximo: 2GB

### 🎯 Conformidade com PRD

- ✅ Conversão para AAC LC 128kbps, 44.1kHz
- ✅ Extração de thumbnail aos 15s
- ✅ Metadados ID3v2 (título)
- ✅ Fila assíncrona com Bull + Redis
- ✅ Validação de codec, resolução e duração
- ✅ Docker multi-stage com FFmpeg
- ✅ Health check endpoint
- ✅ Sem admin UI (conforme YAGN)
- ✅ Sem autenticação (conforme YAGN)
- ✅ Sem persistência em DB (conforme YAGN)

### 📝 Notas

- Arquivos temporários em `/uploads/temp/`
- Limpeza automática após 24h (implementar cron job)
- Logs via stdout (Docker-friendly)
- Idempotência garantida (imports ordenados, named exports)
- SSOT: configuração centralizada em `config/index.js`
