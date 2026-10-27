# Trackwe — Fleet Operations Demo

Next.js, React and TypeScript frontend with a white/navy/gold interface, Leaflet/OpenStreetMap and Recharts.

## Run and verify

```bash
npm ci
npm run dev
node scripts/test-demo.cjs
npm run typecheck
npm run build
```

Development serves port 4173. Static production output is `out/`.

## Demo accounts

Choose a role on the login screen or use superadmin@trackwe.demo, admin@trackwe.demo, manager@trackwe.demo or employee@trackwe.demo. All use `Trackwe@123`.

Super Admin sees all organizations; Admin manages its organization; Manager sees assigned fleet records; Employee sees assigned vehicles, own tasks and expenses. Page, action and data scope rules are centralized in `src/lib/auth.ts` and `src/lib/demo-data.ts`.

Sessions expire after eight hours and survive refresh. Demo records persist in this browser using localStorage. Authorized administrators can reset their scoped demo data. This is a frontend demonstration: credentials and permissions are not a production security boundary, and data is not shared between browsers.

## Features and data

57 seeded vehicles across two UAE organizations, UAE city routes, AED expenses and Asia/Dubai display times. Modules include fleet tracking, vehicles, drivers, trips/replay, geofences, fuel, temperature, diagnostics, driver behavior, tasks, expenses, alerts, reports, users, organizations, profile and settings. Charts derive from scoped records and date selections. Capability-gated camera, integration and immobilizer interfaces honestly represent simulated or disconnected hardware.

Historical records span 9–22 October 2026. Route points and distances are illustrative demo data, not live GPS or routing-engine results. OSM map tiles require network access. There is no backend, database, live hardware connection or production identity service.

## Verification

The acceptance script covers all four logins, session restore/logout/expiry, role and record guards, scoped mutations and reset, persistence, UAE geography, and chart/filter consistency. Browser QA additionally exercised login/logout, refresh persistence, denied navigation, task completion, expense submission/approval, and UAE map rendering.

## Folder structure and page routes

The application uses real Next.js App Router URLs. The old all-in-one `fleet-app.tsx` has been removed. Start with [ARCHITECTURE.md](./ARCHITECTURE.md) when working on a cloned checkout.

| Folder                                  | Responsibility                                                              |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `src/app/(workspace)/<module>/page.tsx` | One route entry per module, such as `/vehicles/`, `/tasks/` and `/reports/` |
| `src/app/(workspace)/layout.tsx`        | Shared protected workspace layout                                           |
| `src/app/login/`                        | Login route                                                                 |
| `src/features/`                         | Page content and feature-specific components/state                          |
| `src/components/layout/`                | Sidebar, topbar, heading, footer and app shell                              |
| `src/components/forms/`                 | Shared record dialogs and form handling                                     |
| `src/components/maps/`                  | Browser-only Leaflet map and loading wrapper                                |
| `src/components/ui/`                    | Dialog, panel, KPI, toast and loading primitives                            |
| `src/providers/`                        | Authentication and workspace contexts                                       |
| `src/hooks/`                            | Shared workspace state and persistent demo-store hook                       |
| `src/config/`                           | Navigation groups and form field definitions                                |
| `src/data/`, `src/lib/`, `src/types/`   | Seeds, permission/service logic, formatting and shared types                |
| `src/styles/motion.css`                 | Route, sidebar, dialog and small interaction transitions                    |

Routes can be opened directly or refreshed. The shared workspace layout keeps state during client navigation; browser persistence is unchanged. Legacy `/#tasks` style links are forwarded from the home route. Animations honor `prefers-reduced-motion`.
