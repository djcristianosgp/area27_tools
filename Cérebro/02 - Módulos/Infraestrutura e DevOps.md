# Módulos de Infraestrutura e DevOps

Estes módulos destinam-se ao gerenciamento de servidores, contêineres Docker, automação de deploys e backups das aplicações.

---

## 🎛️ 1. Monitoramento do Servidor (System Metrics)
Exibe a integridade do hardware hospedeiro em tempo real.

* **Métricas**: Consumo de CPU, uso de Memória RAM/Swap, espaço de armazenamento em disco, temperatura do processador, tráfego de rede ativo.
* **Alertas**: Notificações se o espaço em disco passar de 90% ou se houver pico sustentado de CPU.

---

## 🐳 2. Docker Manager
Gerenciamento simplificado de contêineres sem necessidade de acessar o terminal.

* **Operações**: Listar, Iniciar, Parar e Reiniciar contêineres Docker.
* **Logs**: Visualização em tempo real de logs de saída padrão de cada contêiner.
* **Estatísticas**: Consumo individual de CPU e Memória de cada container ativo.

---

## 🐙 3. Git & Deploy Automatizado
Automação do fluxo de atualização contínua de repositórios locais.

* **Mapeamento**: Monitora repositórios Git na máquina local.
* **Fluxo de Deploy**:
  1. Executa `git pull` na branch configurada.
  2. Executa comandos pós-deploy (ex: `docker compose up --build -d` ou `dotnet publish`).
  3. Gera log detalhado do status do deploy.

---

## 📝 4. Logs Centralizados
Visualização central de logs de arquivos locais e logs de sistema.

* **Fontes**: Arquivos `.txt` / `.log` mapeados, logs do Docker e `journalctl` (no Linux).
* **Filtros**: Busca rápida por severidade (`INFO`, `WARNING`, `ERROR`) ou expressão regular.

---

## 🔐 5. Certificados SSL & DNS
Evita a expiração indesejada de domínios e serviços de internet.

* **Mapeamento**: Monitora domínios registrados e confere a validade dos certificados SSL associados.
* **Avisos**: Notificações aos 30, 15, 7 e 1 dias antes da expiração.
* **DNS Resolver**: Consulta rápida de registros `A`, `AAAA`, `TXT`, `MX`, `NS` e `CNAME`.

---

## 💾 6. Backups & Agendamento
Gerenciamento de tarefas de proteção a dados.

* **Agendador (Cron)**: Motor interno para execução periódica de scripts, limpezas ou backups.
* **Destinos de Backup**: Compacta diretórios e envia para servidores NAS locais, FTP, ou nuvens (AWS S3, Google Drive, OneDrive).

---

## 🔄 7. Atualizações Automáticas (Auto-Updater)
Mantém o sistema atualizado com o mínimo de intervenção manual.

* **Verificação**: Consulta a GitHub Releases API (`/repos/{owner}/{repo}/releases/latest`) e compara a `tag_name` com a versão atual do assembly (`AssemblyInformationalVersion`).
* **Exibição**: Widget no dashboard mostra versão atual vs. mais recente, badge animado quando há update, e changelog expandível direto da release.
* **Configuração** em `appsettings.json`:
  ```json
  "Updater": {
    "GitHubOwner": "seu-usuario",
    "GitHubRepo": "area27_tools",
    "Channel": "stable"
  }
  ```
* **Endpoint**: `GET /api/updater/check` — retorna `UpdateCheckResult` com flag `updateAvailable`.

---

## 🗄️ 8. Suporte Multi-Banco (PostgreSQL)
Permite escalabilidade para ambientes maiores sem reescrever código.

* **Abstração**: `DatabaseProviderExtensions.AddArea27Database()` lê `"DatabaseProvider"` do config e injeta SQLite ou PostgreSQL no `AppDbContext`.
* **Padrão**: SQLite (retrocompatível, zero impacto para setups existentes).
* **Migração para PostgreSQL**:
  1. Instalar PostgreSQL e criar o banco `area27_tools`.
  2. Alterar `appsettings.json`: `"DatabaseProvider": "postgresql"`.
  3. Preencher `ConnectionStrings:PostgreSQL` com as credenciais.
  4. Reiniciar o backend — EF Core cria as tabelas automaticamente.
* **Widget**: `SystemSettingsWidget` exibe o provider ativo, status de conexão e informações de runtime.

