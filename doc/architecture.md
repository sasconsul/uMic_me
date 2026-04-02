# uMic.me — Architecture Drill-Down

A layered overview of every technology in the stack, from browser to infrastructure.

---

## Layer 1 — Client (Browser)

| Concern | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 7 |
| Routing | Wouter (lightweight client-side router) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Toasts / notifications | Sonner |
| Icons | Lucide Icons |
| State | React `useState` / `useRef` / `useCallback` |
| Real-time hooks | `useWebSocket`, `useAudioBroadcast`, `useAudioReceive`, `useSpeakerUplink` |

The frontend is a single-page app served by Vite's dev server (or static build). All host-facing routes are wrapped in a `ProtectedRoute` component that redirects unauthenticated users to a sign-in screen.

---

## Layer 2 — Real-Time Transport

Two protocols work in parallel for different jobs:

### WebSocket (`ws` library, path `/ws`)
Used for all **control-plane** messages — no audio data flows through WebSocket.

| Direction | Message types |
|---|---|
| Host → Server | `join-host`, `open-qa`, `close-qa`, `select-speaker`, `unmute-speaker`, `start-broadcast`, `stop-broadcast`, `close-event` |
| Attendee → Server | `join-attendee`, `raise-hand` |
| Server → Host | `room-state`, `attendee-joined`, `attendee-left`, `hand-update`, `rtc-answer`, `rtc-ice-from-attendee`, `speaker-offer`, `speaker-ice-from-attendee` |
| Server → Attendee | `qa-state`, `qa-opened`, `qa-closed`, `stream-available`, `stream-ended`, `session-ended`, `speaker-selected`, `speaker-mic-request`, `speaker-unmuted`, `rtc-offer`, `rtc-ice-candidate`, `speaker-answer`, `speaker-ice-candidate` |

The server maintains an in-memory `Map<eventId, Room>` of active rooms. Each room tracks `qaOpen`, `muteUntilCalled`, connected clients, and raised-hand state.

### WebRTC (browser `RTCPeerConnection`)
Used for all **audio data** — streamed peer-to-peer after WebSocket signaling.

| Stream | Direction | Hook |
|---|---|---|
| Host mic → all attendees | One-to-many downlink | `useAudioBroadcast` (host), `useAudioReceive` (attendee) |
| Selected attendee mic → host | One-to-one uplink | `useSpeakerUplink` (attendee), `useAudioBroadcast` (host receives) |

ICE servers: Google public STUN (`stun.l.google.com:19302`).

---

## Layer 3 — API Server (Express / Node.js)

**Package:** `@workspace/api-server`

### REST Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/auth/user` | Return current session user | Session |
| `GET` | `/api/auth/login` | Initiate Replit OIDC login | Public |
| `GET` | `/api/auth/callback` | Handle OIDC callback | Public |
| `POST` | `/api/auth/logout` | Destroy session | Session |
| `GET` | `/api/events` | List host's events | Host |
| `POST` | `/api/events` | Create event | Host |
| `GET` | `/api/events/:id` | Get single event | Host |
| `PUT` | `/api/events/:id` | Update event (status, title, etc.) | Host |
| `DELETE` | `/api/events/:id` | Delete event | Host |
| `GET` | `/api/events/:id/qr` | Generate QR code PNG | Host |
| `POST` | `/api/events/join/:token` | Attendee join — creates record + returns sessionToken | Public |
| `PATCH` | `/api/attendees/:id` | Update attendee (raisedHand) | Attendee token |
| `GET` | `/api/events/:id/attendees` | List attendees | Host |

### WebSocket
Mounted at `/ws`. Handles room lifecycle, Q&A state, and WebRTC signaling relay.

### Logging
Pino (structured JSON logs) via `pino-http` middleware.

---

## Layer 4 — Data Layer

**Package:** `@workspace/db`

### Database
PostgreSQL, hosted on Replit's managed database. Connected via `DATABASE_URL` environment variable using the `pg` driver through Drizzle ORM.

### Schema

**`events` table**

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | Auto-increment |
| `title` | `text` | Required |
| `status` | `text` | `pending`, `live`, `closed` |
| `qrCodeToken` | `text` | UUID, unique — used in join URLs |
| `hostUserId` | `text` | Replit user ID from OIDC |
| `logoUrl` | `text` | Object Storage URL |
| `promoText` | `text` | Optional description |
| `startTime` | `timestamp` | Optional scheduled start |
| `createdAt` | `timestamp` | Auto |

**`attendees` table**

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | Auto-increment |
| `eventId` | `integer` FK | → `events.id` |
| `displayName` | `text` | Nullable |
| `assignedId` | `integer` | Sequential per event (1, 2, 3…) |
| `sessionToken` | `text` | One-time token for attendee auth |
| `raisedHand` | `boolean` | Current hand-raise state |
| `joinedAt` | `timestamp` | Auto |

Unique constraint: `(eventId, assignedId)`.

### Object Storage
Event logos are uploaded to Replit Object Storage (bucket via `DEFAULT_OBJECT_STORAGE_BUCKET_ID`). Returned as a public URL stored in `events.logoUrl`.

---

## Layer 5 — Authentication

**Two separate auth mechanisms — one per user type.**

### Host Authentication — Replit Auth (OIDC + PKCE)
- Login flow: `/api/auth/login` → Replit OIDC provider → `/api/auth/callback`
- Session stored server-side in `express-session` (cookie: `sid`)
- Session contains `{ user: { id: string, name: string } }`
- WebSocket host connections read the `sid` cookie (or `Authorization: Bearer` header) and verify against the session store before granting host role
- React guard: `ProtectedRoute` component calls `/api/auth/user`; redirects to sign-in if unauthenticated

### Attendee Authentication — sessionToken
- When an attendee POSTs to `/api/events/join/:token`, the server creates an attendee record and returns a random `sessionToken`
- The token is stored in `sessionStorage` on the browser and sent as `x-attendee-token` header on subsequent requests
- WebSocket `join-attendee` messages include the token, which the server verifies against the DB

---

## Layer 6 — Infrastructure

| Concern | Technology |
|---|---|
| Platform | Replit |
| Package manager | pnpm (workspace monorepo) |
| Monorepo packages | `live-event` · `api-server` · `@workspace/db` · `@workspace/api-client` · `@workspace/api-client-react` |
| Dev proxy | Replit mTLS reverse proxy (all traffic via `*.replit.dev` domain) |
| Database | Replit-managed PostgreSQL (`DATABASE_URL` secret) |
| File storage | Replit Object Storage |
| Port routing | Each artifact reads `PORT` env var; proxy routes by path prefix |

### Monorepo Package Summary

| Package | Role |
|---|---|
| `@workspace/live-event` | React + Vite frontend (host and attendee UI) |
| `@workspace/api-server` | Express server (REST + WebSocket) |
| `@workspace/db` | Drizzle schema, migrations, and DB client |
| `@workspace/api-client` | Auto-generated fetch client from OpenAPI spec |
| `@workspace/api-client-react` | TanStack Query hooks wrapping the API client |
