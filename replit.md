# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is a full-stack real-time live event management platform. Hosts log in via Clerk auth (Google, email, GitHub), create events with QR codes, stream audio via WebRTC to all attendee devices and a PA system, run Q&A sessions with a hand-raise queue, and launch live polls with multiple-choice answers.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: Clerk (`@clerk/express` server, `@clerk/react` client)
- **Real-time**: WebSocket (`ws` library) + WebRTC for audio
- **QR Codes**: `qrcode` npm package

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API + WebSocket server (port via $PORT, paths: /api /ws)
│   ├── live-event/         # React + Vite frontend (port 18558, path: /)
│   └── umic-deck/          # Slides presentation artifact (path: /umic-deck/)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── object-storage-web/ # ObjectUploader component + useUpload hook
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Key Architecture Decisions

### Authentication
- Clerk via `@clerk/express` on the server (`clerkMiddleware()` in `app.ts`)
- Clerk proxy middleware at `/api/__clerk` for production cookie-based auth
- `requireAuth` middleware in `events.ts` extracts `req.userId` via `getAuth(req)`
- WebSocket host auth uses `wsAuth.ts` module (`getSessionUserFromReq` on upgrade, `verifyHostToken` for JWT fallback)
- Frontend uses `@clerk/react`: `useAuth()`, `useUser()`, `useClerk()`
- Sign-in/up pages at `/sign-in` and `/sign-up` with Clerk's embedded `<SignIn>`/`<SignUp>` components

### Real-time Communication
- WebSocket server at `/ws` path using `ws` package
- Host connects with `{ type: "join-host", eventId }` 
- Attendees connect with `{ type: "join-attendee", eventId, attendeeId, attendeeName }`
- WebRTC audio streaming: host → all attendee devices simultaneously via RTCPeerConnection

### Database Schema
- `users` — from Replit Auth (id, email, firstName, lastName, profileImageUrl)
- `sessions` — from Replit Auth (session storage)
- `events` — (id, hostUserId, title, logoUrl, promoText, startTime, status, qrCodeToken, createdAt)
- `attendees` — (id, eventId, sessionId, displayName, assignedId, joinedAt, raisedHand, raisedHandAt)

### Object Storage
- GCS-backed via Replit's managed bucket
- Public files served at `/api/storage/public-objects/:filePath`
- Private files served at `/api/storage/objects/:objectPath`

### Frontend Pages
- `/` — Landing page (public)
- `/dashboard` — Host dashboard (requires auth)
- `/events/:id` — Event control room (requires auth, host only)
- `/join/:token` — Attendee join page (public, QR code destination)
- `/attend/:token/:attendeeId` — Attendee live page (public, audio + hand-raise)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. Run `pnpm run typecheck` from root.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 + WebSocket API server. Routes in `src/routes/`. WebSocket server in `src/lib/websocket.ts`.
- `pnpm --filter @workspace/api-server run dev` — dev server
- Paths exposed: `/api`, `/ws`

### `artifacts/live-event` (`@workspace/live-event`)
React + Vite frontend. 
- `pnpm --filter @workspace/live-event run dev` — dev server on port 18558
- Hooks: `useWebSocket`, `useAudioBroadcast`, `useAudioReceive`
- Auth via `@clerk/react`: `useAuth()`, `useUser()`, `useClerk()`

### `lib/db` (`@workspace/db`)
- `pnpm --filter @workspace/db run push` — push schema to DB

### `lib/api-spec` (`@workspace/api-spec`)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks and Zod schemas

### `lib/object-storage-web` (`@workspace/object-storage-web`)
- `ObjectUploader` component + `useUpload()` hook for file uploads via presigned URLs

### `tests/` (`@workspace/tests`)
- Playwright E2E tests (54 tests across 8 spec files: smoke, landing, join, demos, PA source, umic-deck, poll-sets API, attendee poll/QA UI)
- Vitest unit tests (55 tests across 6 files):
  - `pollSnapshot.test.ts` — 13 tests for `getPollSnapshot` and `getAttendeeList` helpers
  - `pollingQaFlow.test.ts` — 13 broadcast/snapshot helper tests
  - `wsIntegration.test.ts` — 16 WebSocket integration tests (real WS server, mocked auth/DB)
  - `generatePaSourceToken.test.ts` — 4 tests
  - `getPaSourceToken.test.ts` — 4 tests
  - `useAudioBroadcast.test.ts` — 5 tests
- `pnpm --filter @workspace/tests run test:e2e` — run E2E tests (uses system Chromium via `executablePath`)
- `pnpm --filter @workspace/tests run test:unit` — run unit tests
- Vitest config has 3 projects: `node` (pure unit), `ws-integration` (WebSocket integration), `jsdom` (React hooks)
- `@workspace/db` is aliased in vitest.config.ts to resolve correctly for mocking

### `artifacts/api-server/src/lib/wsAuth.ts`
- Extracted Clerk auth functions (`getSessionUserFromReq`, `verifyHostToken`) from `websocket.ts` into a separate module for testability

## Validation Commands

Three named validation commands are registered:
- **typecheck** — `pnpm -r --filter='!@workspace/tests' exec tsc --noEmit`
- **unit-tests** — `pnpm --filter @workspace/tests run test:unit` (55 tests)
- **regression** — `pnpm --filter @workspace/tests run test:e2e` (54 E2E tests)
