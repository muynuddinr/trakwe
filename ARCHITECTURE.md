# Working on Trackwe

## Start here

Run `npm ci` and `npm run dev`, then visit `http://localhost:4173`. Use a demo account on the login screen. Run `node scripts/test-demo.cjs`, `npm run typecheck`, and `npm run build` before publishing.

The project exports a static site into `out/`. Serve the whole directory with a host that supports directory indexes; `/tasks/` resolves to `out/tasks/index.html`.

## Route → feature → component

Each route file is intentionally small. It selects a screen; presentation and behavior live in the feature folder. The route group `(workspace)` adds a shared layout without adding a URL segment.

| URL                                                                       | Feature implementation                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/login/`                                                                 | `features/auth/login-form.tsx`                                                    |
| `/dashboard/`                                                             | `features/dashboard/dashboard-page.tsx` and seven sections in `components/`       |
| `/tracking/`                                                              | `features/tracking/tracking-page.tsx`                                             |
| `/vehicles/`, `/drivers/`, `/tasks/`, `/expenses/`, `/alerts/`, `/users/` | `features/records/records-page.tsx`, with an explicit module prop from each route |
| `/trips/`                                                                 | `features/trips/trips-page.tsx`                                                   |
| `/geofences/`                                                             | `features/geofences/geofences-page.tsx`                                           |
| `/fuel/`, `/temperature/`, `/diagnostics/`, `/behavior/`                  | `features/intelligence/intelligence-page.tsx`, with an explicit module prop       |
| `/cameras/`, `/immobilizer/`, `/reports/`, `/integrations/`               | Matching folder under `features/`                                                 |
| `/settings/`, `/profile/`, `/organizations/`                              | Matching folder under `features/`                                                 |

Record modules share their table, filters and permission-aware actions to avoid maintaining six copies of the same CRUD workflow. Sensor modules share capability filtering and reporting layout. Vehicle details are reusable in tracking and dialogs at `features/vehicles/components/vehicle-details.tsx`.

## Layout and authentication

`app/layout.tsx` loads fonts/styles and mounts `AuthProvider`. The home page resolves the session and redirects to login or dashboard; it also recognizes old hash links. The login page uses the existing demo authentication service.

`app/(workspace)/layout.tsx` mounts `ProtectedWorkspace`. It waits for session restoration, redirects logged-out visitors, and creates the scoped `WorkspaceProvider`. `AppShell` renders the sidebar, topbar, route content, notifications and dialogs. Route transitions key off the current pathname; the surrounding shell remains mounted.

`lib/auth.ts` defines role permissions. The workspace controller rejects disallowed routes before rendering their content. `lib/demo-data.ts` independently validates every mutation and applies organization/vehicle scope. These are frontend demo guards, not production access control.

## State ownership

| State                                                                    | Owner                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| Session restoration, login, logout                                       | `providers/auth-provider.tsx`                  |
| Organization scope, shared selections/filters, navigation, notifications | `hooks/use-workspace-controller.tsx`           |
| Persistent records and guarded writes                                    | `hooks/use-demo-store.ts` + `lib/demo-data.ts` |
| Trip date, replay position and replay timer                              | Trips feature; the timer cleans up on unmount  |
| Drawing points, zone name/radius and assignment draft                    | Geofences feature                              |
| Settings form draft                                                      | Settings feature                               |
| List/board view                                                          | Records feature                                |
| Record form conversion and permitted field choices                       | `components/forms/use-record-form.ts`          |

Keep new page-specific state within its feature. Put state in the workspace only when several pages need to share it. Read records through `useWorkspace()` and save through guarded setters; do not mutate seeds or write localStorage directly from page components.

## Common edits

- **Change a sidebar label:** edit `config/navigation.ts`.
- **Change the dashboard:** edit its relevant section under `features/dashboard/components/`.
- **Add or change a record field:** edit `config/form-fields.ts`, then its conversion/validation in the form hook and demo service as needed.
- **Add a route:** add `app/(workspace)/<name>/page.tsx`, its feature component, navigation entry and permissions in `lib/auth.ts`.
- **Change the map:** edit `components/maps/fleet-map.tsx`; retain the client-only wrapper so Leaflet is not evaluated on the server.
- **Change motion:** edit `styles/motion.css`. Keep the reduced-motion override and avoid long animations on operational controls.

## Validation

The acceptance script exercises all demo roles, data scoping, guarded edits, persistence, charts and UAE seed data. TypeScript and the production build validate the route/component graph. Browser checks cover route navigation, direct refresh, record forms and role redirects after this refactor.

## Vehicle profiles, images and themes

- `features/vehicles/vehicle-detail-page.tsx` renders `/vehicles/detail/?id=<vehicle-id>` from the permitted fleet. Unknown or out-of-scope IDs show an unavailable state. The Track vehicle action opens `/tracking/?vehicle=<vehicle-id>`; selection survives refresh.
- `lib/media.ts` maps vehicle types and seeded demo names to bundled photographs in `public/images/`. These are illustrative stock images, not the actual vehicles or named people. Source URLs are recorded in `public/images/sources.json`. New names fall back to initials.
- `components/ui/person-avatar.tsx` supplies consistent portraits in vehicle details, driver/user tables, the topbar and profile page.
- `providers/theme-provider.tsx` and `components/ui/theme-toggle.tsx` manage light/dark mode using the `trackwe.theme` browser preference. The root layout applies the saved preference before rendering; `styles/appearance.css` defines colors and responsive vehicle-profile layouts.
