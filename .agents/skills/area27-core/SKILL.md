---
name: area27-core
description: Guidelines for Area27 Tools backend (ASP.NET 10, SQLite/PostgreSQL, Architecture, and IToolModule)
---

# Area27 Tools - Backend & Core Guidelines

This skill provides guidelines and patterns for developing the backend of Area27 Tools using ASP.NET 10, following a modular architecture with support for SQLite and PostgreSQL.

## Backend Stack
- **Framework**: ASP.NET 10 (Web API + Minimal API)
- **Database**: SQLite (default) or PostgreSQL — both via Entity Framework Core (EF Core)
- **OS compatibility**: Windows, Linux (Docker-friendly)

## Project Structure
The backend solution (`Area27.Tools.slnx`) is under `Backend/` with three projects:
- **`Area27.Tools.API/`**: `Program.cs`, Minimal API Controllers, and all Modules folders.
- **`Area27.Tools.Core/`**: Domain entities, `IToolModule` interface, `ModuleRegistry`.
- **`Area27.Tools.Infrastructure/`**: `AppDbContext`, `DbInitializer`, `DatabaseProviderExtensions`, security utilities.

> ⚠️ Modules live inside `Area27.Tools.API/Modules/[ModuleName]/`, NOT in a separate project.

## Module System (`IToolModule`)
Every tool/module must implement the `IToolModule` interface:

```csharp
public interface IToolModule
{
    string Id { get; }
    string Name { get; }
    string Description { get; }
    string Icon { get; }       // Lucide React icon name used by the frontend

    void RegisterServices(IServiceCollection services);   // NO IConfiguration param
    void RegisterRoutes(IEndpointRouteBuilder endpoints);
    IEnumerable<IHostedService> GetBackgroundServices();
}
```

### Registering a Module in `Program.cs`
```csharp
builder.Services.AddModuleRegistry(registry =>
{
    registry.RegisterModule(new MyModule());
    // ...
});
```

### Module Guidelines
1. **Isolation**: A module should not directly reference another module.
2. **Self-contained**: Keep entities, business logic, and background tasks inside the module folder.
3. **Database**: Declare new `DbSet<T>` properties in `AppDbContext` and seed state in `DbInitializer`.

## Database Provider
The project uses `DatabaseProviderExtensions.AddArea27Database()` in `Program.cs`:
- `"DatabaseProvider": "sqlite"` → SQLite (default, zero config)
- `"DatabaseProvider": "postgresql"` → PostgreSQL (requires `ConnectionStrings:PostgreSQL`)

**Never** call `AddDbContext<AppDbContext>()` directly — always use `AddArea27Database()`.

## Version & Auto-Update
- Backend version is defined in `Area27.Tools.API.csproj` via `<InformationalVersion>`.
- `UpdaterModule` (ID: `updater`) exposes:
  - `GET /api/updater/check` — compares current version vs. latest GitHub Release
  - `GET /api/updater/info` — returns version, uptime, environment, DB provider, machine, OS
- Configure via `appsettings.json`: `Updater:GitHubOwner` and `Updater:GitHubRepo`.
