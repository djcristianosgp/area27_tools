# 🧠 Area27 Tools - Cérebro do Projeto

Bem-vindo ao **Cérebro** do Area27 Tools! Este é um cofre do Obsidian projetado para centralizar toda a documentação, decisões arquiteturais, especificações de módulos e guias de desenvolvimento.

---

## 🗺️ Mapa de Conteúdo (MOC)

### 🧱 1. Arquitetura
* [[Visão Geral da Arquitetura]]: A stack tecnológica (ASP.NET 10, React 19, SQLite/PostgreSQL) e estrutura física do projeto.
* [[Estrutura de Banco de Dados]]: Mapeamento das tabelas do EF Core e troca de provedor (SQLite ↔ PostgreSQL).
* [[Sistema de Módulos (IToolModule)]]: Funcionamento da arquitetura modular desacoplada e ciclo de vida dos módulos.

### 📦 2. Módulos do Sistema
* [[Monitoramento e Rede]]: Detalhamento dos módulos de Uptime, Rede Local, Câmeras (RTSP) e IoT (MQTT).
* [[Infraestrutura e DevOps]]: Docker Manager, Logs Centralizados, Git & Deploy Automatizado, SSL & DNS, Backups & Agendador (Cron), **Auto-Update** e **Multi-Banco (PostgreSQL)**.
* [[Utilitários e Ferramentas]]: QR Code, Replays (Rock10) e Terminal Web (SSH).
* [[Operações e Negócios]]: Gerenciamento de inventário de equipamentos físicos e checklist de eventos.

### 🛠️ 3. Guia de Desenvolvimento
* [[Setup do Ambiente]]: Instruções para configurar e rodar o projeto localmente ou via Docker Compose.
* [[Criação de Novo Módulo]]: Passo a passo prático para implementar um novo módulo no backend e frontend.
* [[Atualizações e Distribuição]]: Guia de configuração do Auto-Updater (GitHub Releases) e migração para PostgreSQL.

---

## 🎯 Objetivo do Projeto
Transformar ferramentas isoladas e utilitários em uma **Central de Operações unificada**. Com uma tela inicial totalmente personalizável através de widgets dinâmicos arrastáveis, o Area27 Tools simplifica o gerenciamento de múltiplos servidores, câmeras, backups, deploys e sensores IoT em uma única interface responsiva e leve.
