# Módulos de Utilitários e Ferramentas

Estes módulos agregam ferramentas essenciais do dia a dia do desenvolvedor e integrações de projetos existentes.

---

## 📱 1. QR Code Generator
Ferramenta interna para criação e gerenciamento de códigos QR.

* **Funções**: Geração individual ou em lote, histórico de códigos gerados, exportação em formatos PNG/SVG.

---

## 🎥 2. Replay Monitor (Rock10)
Integração completa com a plataforma de replays esportivos **Rock10** (`https://replay.rock10.com.br`).

### API Rock10 (OpenAPI 3.0)
- **Spec completo**: `https://replay.rock10.com.br/api/openapi.json`
- **Autenticação**: `POST /api/auth` com `{ user: CPF|email, pass }` → retorna JWT Bearer
- **Endpoints principais**:
  - `GET /api/ping` — Health check (público)
  - `GET /api/arenas` — Lista arenas (campos sensíveis omitidos sem auth)
  - `GET /api/videos?arena_slug=&limit=&page=` — Lista vídeos (público)
  - `GET /api/dashboard` — Stats agregadas (requer Bearer JWT)
  - `GET /api/replay/config` — Config da arena para Replay Controller (requer `X-Api-Code` header)

### DashboardStats (schema)
```json
{ "arenas": { "total": 0, "ativas": 0 }, "quadras": { "total": 0, "ativas": 0 },
  "downloads": 0, "curtidas": 0,
  "videos": { "total": 0, "ano_atual": 0, "mes_atual": 0 } }
```

### Implementação Area27 Tools
- **Serviço**: `Rock10Service` (Singleton) em `Backend/Area27.Tools.API/Services/Rock10Service.cs`
  - Gerencia cache de JWT com renovação automática 30s antes do vencimento
  - Credenciais configuráveis em runtime via `PUT /api/replays-qr/rock10/configure`
  - Fallback: dados mock quando Rock10 está offline ou não configurado
- **Controller**: `ReplaysQrController.cs` expõe:
  - `GET /api/replays-qr/rock10/status` — Status + stats do dashboard
  - `GET /api/replays-qr/rock10/dashboard` — Stats detalhadas
  - `GET /api/replays-qr/rock10/arenas` — Lista arenas
  - `GET /api/replays-qr/rock10/videos?arenaSlug=` — Lista vídeos com filtro de arena
  - `PUT /api/replays-qr/rock10/configure` — Configura credenciais em runtime
  - `GET /api/replays-qr/qr/generate` — Gera QR Code SVG individual
  - `POST /api/replays-qr/qr/generate-batch` — Gera lote de QR Codes em ZIP
- **Widget Frontend**: `ReplaysQrWidget.tsx` (3 abas: Replays | Stats | QR Codes)
  - Painel de configuração de credenciais integrado (sem reiniciar o serviço)
  - Filtro por arena no painel de replays
  - Cards de vídeo com thumbnail, downloads, curtidas, link para assistir

---

## 📂 3. Gerenciador de Arquivos & Editor
Um explorador de arquivos seguro diretamente no navegador.

* **Operações**: Upload, download, exclusão, movimentação e compressão de arquivos no diretório permitido do servidor.
* **Editor Web**: Editor de código integrado para alteração rápida de arquivos de configuração como `.env`, `.json`, `.yaml` e `docker-compose.yml`.

---

## 🖥️ 4. Terminal Web (SSH)
Acesso seguro ao terminal do servidor local através da interface web.

* **Segurança**: Permissões estritas de uso, gravação de sessões executadas e autenticação por chaves SSH protegidas.

---

## 🛢️ 5. Banco de Dados (SQLite / PostgreSQL)
Visualizador web leve para conferência e manutenção de bancos de dados.

* **Recursos**: Visualizar tabelas, rodar consultas SQL rápidas, exportar resultados para CSV ou JSON.

---

## 🧪 6. API Tester & Utilitários
Canivete suíço de desenvolvimento.

* **API Tester**: Cliente HTTP básico integrado (similar ao Postman) para validar requisições e testar webhooks locais.
* **Conversores**: Conversões offline e rápidas (Base64, JWT decoder, JSON para YAML, hash MD5/SHA256, Regex testers, conversor de Epoch Timestamp).
* **Calculadoras Técnicas**: Calculadora de sub-redes CIDR, taxas de bitrate de vídeo e estimativas de espaço em disco para armazenamento de câmeras.
