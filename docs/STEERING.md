# Crocco-DZ Admin – Steering Document

## Purpose and Scope
- Admin dashboard for Crocco-DZ e-commerce operations (orders, catalog, shipping, finance, users, support).
- Audience: engineers and operators maintaining the Next.js app and its APIs.
- Goals: consistent architecture decisions, secure integrations, predictable operational practices.

## Architecture at a Glance
- Framework: Next.js 15 App Router with client-heavy pages and Tailwind CSS styling. Root layout wires fonts and global providers (`app/layout.js`, `app/providers.js`).
- AuthN/Z: NextAuth credentials provider backed by MongoDB users. JWT sessions carry `id` and `role`. Login/logout events are persisted to the `Activity` model.
- Data layer: MongoDB via Mongoose models in `lib/models/*` (orders, products, categories, users, wilayas/communes, activity, etc.). Connection pooling and retry defined in `lib/mongodb.js`.
- API surface: colocated route handlers under `app/api/*` for orders, products, shipping, categories, finance summary, messages, uploads, and admin utilities. All business logic runs server-side; routes enforce session presence where required.
- UI/data fetching: client components consume `useData` and `dataService` for cached fetch, background polling, and optimistic mutation (see `hooks/useData.js`, `lib/dataService.js`). Dashboard prefetches key datasets on mount.
- Integrations: Cloudinary for media uploads, EcoTrack for shipping data/imports and tracking, NextAuth for identity.

## Key Domains
- Orders: full CRUD plus bulk expediate, status transitions, payment status, and line items; statuses include pending → confirmed → pre-sent/sent/shipped → out-for-delivery/delivered/returned/cancelled.
- Catalog: products, categories, product images with Cloudinary; sizes/colors and pricing stored on products and order items.
- Shipping geography: wilayas and communes importable from EcoTrack; shipping fees and delivery type (`to_home`, `to_desk`).
- Activity & audit: `Activity` model logs auth events; utilities under `utils/activityLogger*.js` add server/client logging hooks.
- Finance: `/api/finance/summary` supplies dashboard KPIs (orders/revenue/customers/products) with polling on the home page.

## Configuration and Secrets
Set the following in `.env.local` (no defaults in production):
- `MONGODB_URI` – Mongo connection string.
- `NEXTAUTH_SECRET` – NextAuth JWT secret.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` – seed admin credentials used by the health/setup endpoint.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` – media uploads.
- `ECOTRACK_API_URL`, `ECOTRACK_TOKEN` – EcoTrack API (shipping data/tracking).
- Optional: `NODE_ENV` influences verbose error bodies in API responses.

## Local Development
- Install: `npm install`
- Run dev server: `npm run dev` (Next.js app router)
- Tests: `npm test` (Jest + Testing Library), `npm run test:watch`, `npm run test:coverage`
- Lint: `npm run lint`
- Build/start: `npm run build && npm start`

## Conventions and Guardrails
- API handlers must check `getServerSession(authOptions)` before DB access (pattern in `app/api/orders/route.js`).
- Always go through `connectDB()` for Mongoose; avoid creating new connections per request.
- Prefer `useData`/`dataService` for client fetching to benefit from cache, deduping, and polling; set `dedupingInterval`/`revalidateInterval` thoughtfully.
- Return `{ success, data?, error? }` envelopes from APIs; include stack traces only when `NODE_ENV === 'development'`.
- Keep Cloudinary/EcoTrack tokens server-side; never expose via client components.
- Maintain Tailwind utility style; shared layouts in `components/DashboardLayout`, navigation in `components/Sidebar`/`Header`.
- Error boundaries: wrap new client surfaces with `ErrorBoundary` if they can throw during render.

## Operational Notes
- Health/setup: `/api/health` ensures DB reachability and seeds an admin account using `ADMIN_EMAIL`/`ADMIN_PASSWORD` if absent.
- Index maintenance: scripts under `scripts/*.js` (`fix-indexes.js`, `add-performance-indexes.js`) target Mongo indexes; run with node when schema/index drift occurs.
- Data imports: shipping geography importers live at `app/api/shipping/wilayas/import` and `app/api/shipping/communes/import` (expect EcoTrack credentials).
- Caching/polling: dashboard stats poll every 15s; wilaya/commune lists cache for 5 minutes; adjust via options in `hooks/useData.js`.
- Logging: many API routes write debug logs (`debug.log` files) and console diagnostics; consider centralizing if moving to production-grade logging.

## Testing Expectations
- Unit/UI tests live in `__tests__/*`; jest is configured in `jest.config.js` with jsdom env (`jest.setup.js`).
- When adding APIs, include tests for auth guard, validation failures, and happy paths.
- For client components, assert loading/empty/error states and key interactions (form submits, pagination).

## Change Management Checklist
- Update `docs/STEERING.md` when introducing new domains, external services, or architectural changes.
- Add env var documentation for any new integration.
- Provide migration/index scripts for new Mongo models when indexes change.
- Keep API response shapes backwards compatible or version endpoints under `app/api/*` if breaking.

## Open Questions / To-Validate
- Confirm rate limits and error handling requirements for EcoTrack (currently simple retries).
- Decide on logging/observability stack to replace scattered `console` and `debug.log` usage.
- Clarify RBAC expectations beyond `role` on the session (handlers presently only gate on presence of a session).

