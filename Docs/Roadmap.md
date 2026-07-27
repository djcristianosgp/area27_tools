# 🗺️ Roadmap de Desenvolvimento: Area27 Tools

Este documento define as etapas de desenvolvimento do Area27 Tools, evoluindo de uma fundação sólida até um dashboard centralizador e módulos avançados de infraestrutura e operações.

---

## 📍 Fase 1: Fundação & Core
*Objetivo: Estabelecer a estrutura do projeto, segurança básica e o sistema modular.*

1. **Setup Inicial do Projeto**
   - Criação da solução .NET 10 (Backend) e inicialização do projeto React + Vite (Frontend).
   - Configuração do Docker Compose para rodar ambos em ambiente de desenvolvimento e produção local.
2. **Banco de Dados & Autenticação**
   - Configuração do SQLite com EF Core.
   - Sistema de login básico (JWT) e gerenciamento de perfis de usuário (Admin/Viewer).
3. **Core Modular (`IToolModule`)**
   - Criação e registro da interface para descoberta automática de módulos.
   - Sistema de ativação/desativação dinâmica de ferramentas através do painel de controle.

---

## 📊 Fase 2: Dashboard & Módulos Críticos
*Objetivo: Criar a central operacional principal e monitorar a saúde de serviços externos e do hardware.*

1. **Dashboard Customizável**
   - Layout de grid arrastável no frontend (Zustand + React-Grid-Layout ou similar).
   - Catálogo básico de widgets.
2. **Módulo 01: Monitoramento de URLs (Uptime)**
   - Checagem automática via HTTP, HTTPS e Ping em background.
   - Gráficos de tempo de resposta e alertas na tela inicial.
3. **Módulo 02: Monitoramento do Servidor (System Metrics)**
   - Coleta de dados de CPU, RAM, armazenamento e temperatura da máquina local.

---

## 🔌 Fase 3: Rede, Terminal & Segurança
*Objetivo: Integrar comandos de rede e controle direto de portas e terminais.*

1. **Módulo 03: Rede Local (Scanner)**
   - Escaneamento de IPs e MAC na sub-rede.
   - Wake-on-LAN (WOL) integrado e atalhos rápidos para SSH/HTTP.
2. **Módulo 04: Terminal Web (SSH)**
   - Terminal seguro integrado na interface web para comandos rápidos no servidor local.
3. **Módulo 05: Certificados SSL & DNS**
   - Monitoramento automático de expiração de certificados e resolvedor DNS.

---

## 🐳 Fase 4: DevOps & Automação
*Objetivo: Gerenciar containers, rotinas periódicas de backup e deploys automáticos.*

1. **Módulo 06: Docker Manager**
   - Interface visual para listar containers, ler logs ao vivo, reiniciar e parar serviços.
2. **Módulo 07: Backups & Agendador (Cron)**
   - Criação do cron interno para tarefas e scripts.
   - Rotinas para compactar dados e enviar para S3/Drive/FTP.
3. **Módulo 08: Git & Deploy Automatizado**
   - Execução programável de `git pull` e restarts automáticos através de webhooks de deploy.
4. **Módulo 09: Logs Centralizados**
   - Coletor de logs locais, journalctl e logs de contêineres em uma única tela de pesquisa.

---

## 📹 Fase 5: Módulos Avançados & Operações
*Objetivo: Integrar câmeras de segurança, utilitários de produção e ferramentas de negócios.*

1. **Módulo 10: Painel de Câmeras**
   - Streamers RTSP no navegador e detecção básica.
2. **Módulo 11: Replays (Rock10) & QR Code**
   - Integração com a API do Rock10 para monitorar arquivos gerados.
   - Gerador de QR Code em lote.
3. **Módulo 12: IoT (MQTT)**
   - Dashboard de leitura de tópicos MQTT e acionamento de chaves.
4. **Módulo 13: Inventário & Eventos**
   - Cadastro de equipamentos físicos e checklist operacional para transmissões ao vivo.

---

## 🚀 Fase 6: Polimento & Distribuição
*Objetivo: Facilitar a manutenção, atualizações e escalabilidade.*

1. **Sistema de Atualizações Automáticas**
   - Checagem automática via GitHub Releases e auto-update do executável backend.
2. **Suporte Multi-Banco (PostgreSQL)**
   - Possibilidade de migração facilitada das tabelas para PostgreSQL para ambientes maiores.
