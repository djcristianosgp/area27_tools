# Atualizações e Distribuição

Este guia descreve como configurar o sistema de atualizações automáticas do Area27 Tools e como migrar entre provedores de banco de dados.

---

## 🔄 Sistema de Atualizações Automáticas

### Como funciona

O `UpdaterModule` integra-se à **GitHub Releases API** para verificar se há uma versão mais recente disponível:

1. A versão atual é lida do `AssemblyInformationalVersion` (definido em `Area27.Tools.API.csproj`).
2. O endpoint `GET /api/updater/check` consulta `https://api.github.com/repos/{owner}/{repo}/releases/latest`.
3. As versões são comparadas via `System.Version` (semver).
4. O resultado é exibido no **`UpdaterWidget`** do dashboard.

### Configuração necessária

Em `appsettings.json`, preencha:

```json
"Updater": {
  "GitHubOwner": "seu-usuario-ou-org",
  "GitHubRepo": "area27_tools",
  "Channel": "stable"
}
```

> **Nota**: Enquanto `GitHubOwner` estiver vazio, o check retorna "sistema atualizado" sem gerar erro.

### Como publicar uma nova versão

1. Atualize a versão em `Area27.Tools.API.csproj`:
   ```xml
   <Version>1.1.0</Version>
   <InformationalVersion>1.1.0</InformationalVersion>
   ```
2. Crie uma **GitHub Release** com a tag `v1.1.0` e inclua as notas de release (changelog).
3. O widget detectará automaticamente na próxima verificação (ou ao clicar em "Verificar agora").

---

## 🗄️ Migração de SQLite para PostgreSQL

O Area27 Tools suporta dois provedores de banco de dados via flag de configuração, sem qualquer mudança de código.

### Pré-requisitos

- PostgreSQL 15+ instalado e acessível
- Banco de dados criado: `CREATE DATABASE area27_tools;`
- Usuário com permissões de criação de tabelas

### Passo a passo

**1. Altere o provedor em `appsettings.json`:**

```json
"DatabaseProvider": "postgresql",
"ConnectionStrings": {
  "DefaultConnection": "Data Source=area27_tools.db",
  "PostgreSQL": "Host=localhost;Port=5432;Database=area27_tools;Username=postgres;Password=sua_senha"
}
```

**2. Reinicie o backend:**

```bash
dotnet run
# ou via Docker:
docker compose up --build -d
```

O EF Core criará todas as tabelas automaticamente no PostgreSQL na primeira inicialização.

**3. (Opcional) Migre os dados existentes do SQLite:**

Use ferramentas como `pgloader` ou exporte/importe manualmente via scripts SQL.

### Verificação

O **`SystemSettingsWidget`** no dashboard exibirá "PostgreSQL" como provedor ativo, confirmando a migração.

### Reversão

Para voltar ao SQLite, basta alterar `"DatabaseProvider": "sqlite"` e reiniciar.

---

## 🐳 Variáveis de Ambiente (Docker)

Você pode sobrescrever as configurações do `appsettings.json` via variáveis de ambiente no `docker-compose.yml`:

```yaml
environment:
  - DatabaseProvider=postgresql
  - ConnectionStrings__PostgreSQL=Host=db;Port=5432;Database=area27_tools;Username=postgres;Password=changeme
  - Updater__GitHubOwner=seu-usuario
  - Updater__GitHubRepo=area27_tools
```

> O padrão de nome `__` (duplo underscore) é o separador hierárquico de configuração no ASP.NET.
