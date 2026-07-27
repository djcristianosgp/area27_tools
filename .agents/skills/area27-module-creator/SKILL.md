---
name: area27-module-creator
description: Standard workflow and instructions for creating and registering new modules in Area27 Tools
---

# Area27 Tools - Module Creator Guidelines

Use this skill when you need to bootstrap, implement, and register a new module in the Area27 Tools codebase.

## Backend Module Creation Checklist
1. **Create the Folder**: Under `Area27.Tools/Modules/`, create a new folder named after your module (e.g., `UptimeModule`).
2. **Implement `IToolModule`**:
   - Create a class implementing `IToolModule` (e.g., `UptimeModule.cs`).
   - Define its name, icon, and required permissions.
   - Implement `RegisterRoutes` to define Minimal API endpoints for this module.
   - Implement `RegisterServices` for dependency injection.
   - Return any module-scoped background tasks in `GetBackgroundServices()`.
3. **Database Setup**:
   - If the module requires new tables, map them in the DB Context or run initial SQL scripts inside `RegisterServices`.
4. **Register in Core**:
   - Add the module class instance to the module registry in `Program.cs`.

## Frontend Module Integration Checklist
1. **Create Feature Components**: Under `src/features/[ModuleName]/`, create:
   - Components (e.g., Main view, settings, detail dialogs).
   - Zustand stores or React Query hooks.
2. **Define Routes**:
   - Register the new module's entry page under the layout system in `routes.tsx`.
3. **Dashboard Widget**:
   - If the module provides a dashboard widget, register the widget in the global Widget Catalog (e.g., `src/components/dashboard/WidgetCatalog.tsx`).
