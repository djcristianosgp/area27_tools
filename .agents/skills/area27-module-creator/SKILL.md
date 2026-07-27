---
name: area27-module-creator
description: Standard workflow and instructions for creating and registering new modules in Area27 Tools
---

# Area27 Tools - Module Creator Guidelines

Use this skill when you need to bootstrap, implement, and register a new module in the Area27 Tools codebase.

## Backend Module Creation Checklist

1. **Create the Folder**: Under `Backend/Area27.Tools.API/Modules/`, create a new folder (e.g., `MyModule/`).
2. **Implement `IToolModule`**:
   - Create `MyModule.cs` implementing `IToolModule`.
   - `RegisterServices(IServiceCollection services)` — register DI services (no `IConfiguration` param).
   - `RegisterRoutes(IEndpointRouteBuilder endpoints)` — define Minimal API endpoints.
   - `GetBackgroundServices()` — return hosted services, or `Enumerable.Empty<IHostedService>()`.

   ```csharp
   namespace Area27.Tools.API.Modules.MyModule;

   public class MyModule : IToolModule
   {
       public string Id          => "my-module";
       public string Name        => "My Module";
       public string Description => "Short description.";
       public string Icon        => "Cpu"; // Lucide icon name

       public void RegisterServices(IServiceCollection services)
       {
           services.AddSingleton<MyService>();
       }

       public void RegisterRoutes(IEndpointRouteBuilder endpoints)
       {
           var group = endpoints.MapGroup("/api/my-module")
               .RequireAuthorization()
               .WithTags("MyModule");

           group.MapGet("/", (MyService svc) => Results.Ok(svc.GetData()))
               .WithName("GetMyModuleData");
       }

       public IEnumerable<IHostedService> GetBackgroundServices()
           => Enumerable.Empty<IHostedService>();
   }
   ```

3. **Database Setup** (if needed):
   - Add new entities to `Backend/Area27.Tools.Core/Entities/`.
   - Add `DbSet<T>` to `AppDbContext.cs` in `Infrastructure/Data/`.
   - Seed initial module state in `DbInitializer.cs`.

4. **Register in `Program.cs`**:
   ```csharp
   registry.RegisterModule(new Area27.Tools.API.Modules.MyModule.MyModule());
   ```

## Frontend Module Integration Checklist

> **Note**: The frontend uses a flat component structure under `src/components/`. There are NO `src/features/` or `src/routes.tsx` files — all widgets are registered directly in `Dashboard.tsx`.

1. **Create the Widget Component**: Under `Frontend/area27-ui/src/components/`, create `MyModuleWidget.tsx`.
   - Use `useAuthStore` to get the JWT token for API calls.
   - Use `useQuery` / `useMutation` from React Query for data fetching.
   - Match the dark-mode card style: `bg-[#1f2833] rounded-2xl border border-[#45f3ff]/10`.

2. **Register in `Dashboard.tsx`**:
   - Import the widget.
   - Add `mod.id === 'my-module'` to the `isWidget` check in the customization panel.
   - Add `{widgetId === 'my-module' && <MyModuleWidget />}` in the render grid.

3. **Seed the module state** in `DbInitializer.cs` so it appears in the dashboard by default:
   ```csharp
   new ToolModuleState { Id = "my-module", Name = "My Module", IsEnabled = true }
   ```
