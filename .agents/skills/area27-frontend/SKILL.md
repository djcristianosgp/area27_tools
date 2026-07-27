---
name: area27-frontend
description: Guidelines for Area27 Tools frontend (React, Vite, Tailwind CSS v4, React Query, and Zustand)
---

# Area27 Tools - Frontend Guidelines

This skill provides guidelines and patterns for developing the frontend of Area27 Tools using React + Vite.

## Frontend Stack
- **Framework**: React 19 (Vite 8-based), TypeScript 6
- **Styling**: Tailwind CSS v4 (PostCSS plugin — no `shadcn/ui` is currently installed)
- **State Management**: Zustand v5
- **Data Fetching/Caching**: React Query v5 (TanStack Query)
- **Icons**: Lucide React

> ⚠️ **shadcn/ui is referenced in docs but NOT installed.** Use raw Tailwind CSS classes directly.

## Project Structure
All source files are under `Frontend/area27-ui/src/`:
- `App.tsx` — root: renders `<Login />` or `<Dashboard />` based on JWT token
- `main.tsx` — entry point
- `index.css` — global Tailwind styles
- `components/` — **all** widget and page components live here (flat structure)
- `store/` — Zustand stores: `authStore.ts`, `dashboardStore.ts`

> There are NO `src/features/`, `src/pages/`, or `src/routes.tsx` files. No router is used.

## Key UI/UX Guidelines

1. **Dashboard & Widgets**:
   - The home page is a customizable drag-and-drop grid in `Dashboard.tsx`.
   - Widgets are enabled/disabled via the backend module registry and toggled in the Customization Panel.
   - Widget layout and visibility are persisted in `localStorage` via `dashboardStore`.

2. **Design System & Theme**:
   - Dark-mode-first. Primary background: `bg-[#0b0c10]`. Card background: `bg-[#1f2833]`.
   - Accent colors: `text-[#66fcf1]` (teal), borders: `border-[#45f3ff]/10`.
   - Widget card template: `bg-[#1f2833] rounded-2xl border border-[#45f3ff]/10 p-6 shadow-xl`.

3. **API Integration**:
   - Backend URL: `http://localhost:5000` (hardcoded in widgets).
   - Always pass `Authorization: Bearer ${token}` header using `useAuthStore`.
   - Use `useQuery` for reads, `useMutation` for writes.

4. **Adding a New Widget**:
   - Create `MyModuleWidget.tsx` in `src/components/`.
   - Import and add it to `Dashboard.tsx` in both the `isWidget` check and the render grid.
   - Module must be seeded in `DbInitializer.cs` to appear in the UI.

## Registered Widgets (all in `Dashboard.tsx`)
| Widget ID | Component |
|---|---|
| `uptime` | `UptimeWidget` |
| `server-metrics` | `ServerMetricsWidget` |
| `network-scanner` | `NetworkScannerWidget` |
| `web-terminal` | `WebTerminalWidget` |
| `ssl-dns` | `SslDnsWidget` |
| `docker-manager` | `DockerManagerWidget` |
| `backups-cron` | `BackupCronWidget` |
| `git-deploy` | `GitDeployWidget` |
| `centralized-logs` | `CentralizedLogsWidget` |
| `camera-panel` | `CameraPanelWidget` |
| `replays-qr` | `ReplaysQrWidget` |
| `iot-mqtt` | `IotMqttWidget` |
| `inventory-events` | `InventoryEventsWidget` |
| `updater` | `UpdaterWidget` (Phase 6) |
| `system-settings` | `SystemSettingsWidget` (Phase 6) |
