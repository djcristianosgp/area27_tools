---
name: area27-core
description: Guidelines for Area27 Tools backend (ASP.NET 10, SQLite, Architecture, and IToolModule)
---

# Area27 Tools - Backend & Core Guidelines

This skill provides guidelines and patterns for developing the backend of Area27 Tools using ASP.NET 10 and SQLite, following a modular architecture.

## Backend Stack
- **Framework**: ASP.NET 10 (Web API + Minimal API)
- **Database**: SQLite with Entity Framework Core (EF Core) or Dapper
- **OS compatibility**: Windows, Linux (Docker-friendly)

## Project Structure
The backend is structured under `Area27.Tools`:
- **API**: Minimal API endpoints, routing registration, and middleware.
- **Core**: Domain models, common interfaces, background scheduling system.
- **Modules**: Contain all feature modules (e.g., Uptime, Docker, Cameras).
- **Infrastructure**: Database context (SQLite), file storage, and OS communication wrapper.

## Module System (`IToolModule`)
Every tool/module must implement the `IToolModule` interface. This keeps the core slim and makes it easy to register new tools dynamically:

```csharp
public interface IToolModule
{
    string Id { get; }
    string Name { get; }
    string Description { get; }
    string Icon { get; }
    
    void RegisterServices(IServiceCollection services);
    void RegisterRoutes(IEndpointRouteBuilder endpoints);
    IEnumerable<IHostedService> GetBackgroundServices();
}
```

### Module Guidelines
1. **Isolation**: A module should not directly reference another module. Use events or mediator patterns if inter-module communication is needed.
2. **Self-contained**: Keep module-specific database entities, business logic, and background tasks inside the module's folder.
3. **Database migrations**: Each module must define its tables inside the central SQLite database but handle its schema requirements via clean initializers or migrations.

## Database Provider
The project uses `DatabaseProviderExtensions.AddArea27Database()` in `Program.cs` to select the database provider based on `appsettings.json`:
- `"DatabaseProvider": "sqlite"` → uses SQLite (default, retrocompatível)
- `"DatabaseProvider": "postgresql"` → uses PostgreSQL (requires `ConnectionStrings:PostgreSQL`)

Never call `AddDbContext<AppDbContext>()` directly — always use `AddArea27Database()`.

## Version & Auto-Update
- The backend version is set in `Area27.Tools.API.csproj` via `<InformationalVersion>`.
- `UpdaterModule` (ID: `updater`) exposes `GET /api/updater/check` (GitHub Releases comparison) and `GET /api/updater/info` (system metadata).
- To configure: set `Updater:GitHubOwner` and `Updater:GitHubRepo` in `appsettings.json`.
