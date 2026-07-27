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
    string Name { get; }
    string Icon { get; }
    void RegisterRoutes(IEndpointRouteBuilder endpoints);
    void RegisterServices(IServiceCollection services);
    IEnumerable<BackgroundService> GetBackgroundServices();
    IEnumerable<string> RequiredPermissions { get; }
}
```

### Module Guidelines
1. **Isolation**: A module should not directly reference another module. Use events or mediator patterns if inter-module communication is needed.
2. **Self-contained**: Keep module-specific database entities, business logic, and background tasks inside the module's folder.
3. **Database migrations**: Each module must define its tables inside the central SQLite database but handle its schema requirements via clean initializers or migrations.
