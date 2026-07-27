---
name: area27-frontend
description: Guidelines for Area27 Tools frontend (React, Vite, Tailwind CSS, shadcn/ui, React Query, and Zustand)
---

# Area27 Tools - Frontend Guidelines

This skill provides guidelines and patterns for developing the frontend of Area27 Tools using React + Vite.

## Frontend Stack
- **Framework**: React (Vite-based)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Data Fetching/Caching**: React Query (TanStack Query)
- **Icons**: Lucide React

## Key UI/UX Guidelines
1. **Dashboard & Widgets**:
   - The home page is a customizable grid layout showing active cards/widgets.
   - Use drag-and-drop widgets to monitor infrastructure health, Docker containers, weather, cameras, and system stats.
2. **Design System & Theme**:
   - Utilize a unified dark-mode-first aesthetic with sleek card components and high readability.
   - All styling tokens must align with shadcn/ui's theme variables.
3. **API Integration**:
   - Implement queries and mutations via React Query to manage state synchronizations.
   - Use Zustand for local client-side state (e.g., active widget layout, user preference toggles).
4. **Responsive Layouts**:
   - Ensure the layout is fully responsive, looking stunning on desktops, tablets, and mobile devices.

## Phase 6 Widgets (Polimento & Distribuição)
- **`UpdaterWidget`**: Shows current vs. latest version (from GitHub Releases), animated update badge, expandable changelog, and refresh button. Uses `GET /api/updater/check`.
- **`SystemSettingsWidget`**: Displays active DB provider (SQLite/PostgreSQL), runtime version, uptime counter (auto-refreshes every 30s), environment, machine name, and OS. Uses `GET /api/updater/info`.

