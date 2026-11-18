# CivicEye AI

Civic complaint platform: citizens report issues with a location and photos, admins triage and assign them, field workers fix them and upload proof, and the citizen can give feedback or reopen the complaint.

## Status

| Area | State |
|---|---|
| Auth, RBAC, audit log | Done |
| Complaint create / list / detail, status history | Done |
| Priority rules, SLA deadlines | Done (rule-based, `backend/src/domain`) |
| Admin: dashboard, complaint list, status, priority, assign/unassign, workers | Done (API) |
| Worker: accept, reject, start, submit resolution | Done (API) |
| Citizen: reopen, feedback | Done (API) |
| Frontend (React) | Login and register only. Citizen, admin and worker screens are not built yet |
| Image upload to Cloudinary | Not built. APIs accept `https` image URLs |
| AI service (Python), duplicate detection, maps, notifications | Not built |

## Run locally

Requires Node 20+ and Docker.

```bash
docker compose -f docker-compose.dev.yml up -d

cd backend
cp .env.example .env     # set JWT_SECRET (command is in the file)
npm install
npm run db:migrate
npm run db:seed          # also creates dev-only demo users
npm run dev              # http://localhost:4000/health

cd ../frontend && npm install && npm run dev   # http://localhost:5173
```

Demo accounts (development seed only):

| Role | Email | Password |
|---|---|---|
| Admin | admin@civiceye.local | Admin@123 |
| Citizen | citizen@civiceye.local | Citizen@123 |
| Worker | worker@civiceye.local | Worker@123 |

## Complaint lifecycle

```
SUBMITTED -> UNDER_REVIEW -> APPROVED -> ASSIGNED -> ACCEPTED -> IN_PROGRESS
          -> RESOLUTION_SUBMITTED -> RESOLVED -> (REOPENED -> UNDER_REVIEW)
```

Side exits: `REJECTED` (admin), worker rejects an assignment (back to `APPROVED`), admin sends bad work back (`RESOLUTION_SUBMITTED -> IN_PROGRESS`).
Every transition goes through `applyTransition` in `backend/src/modules/complaints/service.js`, which checks `domain/statusMachine.js` under a row lock and writes `status_history`. A worker cannot mark their own work resolved.

## API (`/api/v1`)

All responses are `{ success, data }` or `{ success: false, error }`. Auth is `Authorization: Bearer <jwt>`.

**Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

**Citizen**
- `POST /complaints` with `title, description, category_confirmed, latitude, longitude, address?, image_urls[]`
- `GET /complaints/my?status&page&pageSize`
- `GET /complaints/:id` (owner, admin, or assigned worker)
- `POST /complaints/:id/reopen` with `{ reason }`
- `POST /complaints/:id/feedback` with `{ rating 1-5, comment? }` (resolved only, once)

**Admin**
- `GET /admin/dashboard`
- `GET /admin/complaints?status&priority&category&overdue&q&sort&order&page&pageSize`
- `PATCH /admin/complaints/:id/status` with `{ to, remarks? }` (`to`: UNDER_REVIEW, APPROVED, REJECTED, RESOLVED, IN_PROGRESS)
- `PATCH /admin/complaints/:id/priority` with `{ priority, justification }`
- `POST /admin/complaints/:id/assign` with `{ worker_id }`, `POST /admin/complaints/:id/unassign`
- `GET /admin/departments`, `GET /admin/workers?department_id`, `POST /admin/workers`

**Worker**
- `GET /worker/assignments?status`
- `PATCH /worker/assignments/:id/accept`, `/reject` (`{ reason }`), `/start`
- `POST /worker/assignments/:id/resolution` with `{ notes, after_image_urls[] }`

Categories: `ROAD_DAMAGE, GARBAGE, DRAINAGE, WATER_LEAKAGE, STREETLIGHT, WATERLOGGING, PUBLIC_INFRA`.

## Design notes

- Priority is a deterministic rule engine (category base level, safety keywords force `CRITICAL`, context keywords raise one level). Admins can override with a justification, which is audit-logged.
- SLA deadline = creation time + hours from `sla_policies` (per category and priority), falling back to 24h / 72h / 7d / 14d for Critical / High / Medium / Low.
- AI fields on complaints are not accepted from clients. A future AI service will write them.
- Complaints the caller may not see return 404, so ticket ids can't be enumerated.
- Not yet scoped: `DEPT_MANAGER` has no admin routes. Admin routes are `ADMIN` only.
