# Setup do Ambiente

Siga as instruções abaixo para rodar e testar o **Area27 Tools** no seu ambiente de desenvolvimento local.

---

## 📋 Pré-requisitos

Certifique-se de ter instalado em sua máquina de desenvolvimento:
* **.NET 10 SDK** (para o backend ASP.NET)
* **Node.js (v18+) & npm** (para o frontend React)
* **SQLite 3**
* **Docker & Docker Compose** (opcional, para testes de deploy e gerenciamento)

---

## 🛠️ Passos para Configuração

### 1. Clonar e Inicializar o Banco de Dados

O banco SQLite será criado automaticamente na primeira inicialização da API do Backend, mas você pode conferir as configurações em `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=area27_tools.db"
  }
}
```

### 2. Rodando o Backend (ASP.NET Core)

Entre na pasta do backend e execute a aplicação:

```bash
cd Backend/Area27.Tools.API
dotnet restore
dotnet run
```
A API estará acessível em: `https://localhost:5001` (ou `http://localhost:5000`).

### 3. Rodando o Frontend (React + Vite)

Navegue até a pasta do frontend, instale as dependências e inicie o servidor Vite:

```bash
cd Frontend/area27-ui
npm install
npm run dev
```
O painel do frontend estará acessível em: `http://localhost:5173`.

---

## 🐳 Docker Deployment (Produção)

Para rodar todo o ecossistema localmente simulando produção:

```bash
docker compose up -d --build
```
Isso levantará o backend no container Linux mapeando o arquivo `.db` em um volume local persistente.
