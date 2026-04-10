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
| State | React `useState` / `useRef` / `useCallback` / `useEffect` |
| Real-time hooks | `useWebSocket`, `useAudioBroadcast`, `useAudioReceive`, `useSpeakerUplink` |

The frontend is a single-page app served by Vite's dev server (or static build). All host-facing routes are wrapped in a `ProtectedRoute` component that redirects unauthenticated users to Clerk's sign-in screen.

---

## Layer 2 — Real-Time Transport

Two protocols work in parallel for different jobs:

### WebSocket (`ws` library, path `/ws`)
Used for all **control-plane** messages — no audio data flows through WebSocket.

| Direction | Message types |
|---|---|
| Host → Server | `join-host`, `open-qa`, `close-qa`, `select-speaker`, `unmute-speaker`, `start-broadcast`, `stop-broadcast`, `close-event`, `launch-poll`, `end-poll`, `toggle-poll-results` |
| Attendee → Server | `join-attendee`, `raise-hand`, `cast-vote` |
| Server → Host | `room-state`, `attendee-joined`, `attendee-left`, `hand-update`, `rtc-answer`, `rtc-ice-from-attendee`, `speaker-offer`, `speaker-ice-from-attendee`, `poll-updated` |
| Server → Attendee | `qa-state`, `qa-opened`, `qa-closed`, `stream-available`, `stream-ended`, `session-ended`, `speaker-selected`, `speaker-mic-request`, `speaker-unmuted`, `rtc-offer`, `rtc-ice-candidate`, `speaker-answer`, `speaker-ice-candidate`, `poll-state`, `poll-launched`, `poll-ended`, `poll-results-toggled`, `poll-updated`, `poll-vote-confirmed`, `poll-vote-rejected` |
| Server → All | `poll-launched`, `poll-ended`, `poll-results-toggled` |

The server maintains an in-memory `Map<eventId, Room>` of active rooms. Each room tracks `qaOpen`, `muteUntilCalled`, connected clients, raised-hand state, and an optional `activePoll`.

#### Poll Message Details

| Message | Direction | Payload | Notes |
|---|---|---|---|
| `launch-poll` | Host→Server | `{ question, options[], showResults, pollQuestionId? }` | `pollQuestionId` links to a saved poll question for DB persistence |
| `end-poll` | Host→Server | — | Marks poll inactive; persists votes if `pollQuestionId` was set |
| `toggle-poll-results` | Host→Server | `{ showResults }` | Shows or hides live tally for attendees |
| `cast-vote` | Attendee→Server | `{ optionIndex }` | One vote per attendee; overwrites previous vote |
| `poll-launched` | Server→All | `{ poll: PollSnapshot }` | Broadcast to all when host starts a poll |
| `poll-ended` | Server→All | `{ poll: PollSnapshot }` | Broadcast to all when host ends the poll |
| `poll-results-toggled` | Server→All | `{ poll: PollSnapshot }` | Broadcast when host toggles result visibility |
| `poll-updated` | Server→Host | `{ poll: PollSnapshot }` | Sent on every new vote; also sent to attendees if `showResults` is true |
| `poll-state` | Server→Attendee | `{ poll: PollSnapshot, votedIndex }` | Sent to late-joining attendees if a poll is already active |
| `poll-vote-confirmed` | Server→Attendee | `{ optionIndex }` | Confirms the attendee's recorded vote |
| `poll-vote-rejected` | Server→Attendee | `{ reason }` | Sent when no active poll exists |

### WebRTC (browser `RTCPeerConnection`)
Used for all **audio data** — streamed peer-to-peer after WebSocket signaling.

| Stream | Direction | Hook |
|---|---|---|
| Host mic → all attendees | One-to-many downlink | `useAudioBroadcast` (host), `useAudioReceive` (attendee) |
| Selected attendee mic → host | One-to-one uplink | `useSpeakerUplink` (attendee), `useAudioBroadcast` (host receives) |
| Host mic → PA Source device | One-to-one PA downlink | `useAudioBroadcast` (host), raw `RTCPeerConnection` on `PaSourcePage` |

ICE servers: Google public STUN (`stun.l.google.com:19302`).

---

## Layer 3 — API Server (Express / Node.js)

**Package:** `@workspace/api-server`

### REST Endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/events` | List host's events | Host (Clerk) |
| `POST` | `/api/events` | Create event | Host (Clerk) |
| `GET` | `/api/events/:id` | Get single event | Host (Clerk) |
| `PUT` | `/api/events/:id` | Update event (status, title, etc.) | Host (Clerk) |
| `DELETE` | `/api/events/:id` | Delete event | Host (Clerk) |
| `POST` | `/api/events/:id/duplicate` | Duplicate event | Host (Clerk) |
| `GET` | `/api/events/:id/qr` | Generate QR code PNG | Host (Clerk) |
| `POST` | `/api/events/:id/pa-token` | Generate PA source token | Host (Clerk) |
| `POST` | `/api/events/join/:token` | Attendee join — creates record + returns sessionToken | Public |
| `PATCH` | `/api/attendees/:id` | Update attendee (raisedHand) | Attendee token |
| `GET` | `/api/events/:id/attendees` | List attendees | Host (Clerk) |
| `GET` | `/api/poll-sets` | List host's poll sets | Host (Clerk) |
| `POST` | `/api/poll-sets` | Create poll set | Host (Clerk) |
| `GET` | `/api/poll-sets/:id` | Get poll set with questions | Host (Clerk) |
| `PUT` | `/api/poll-sets/:id` | Update poll set title | Host (Clerk) |
| `DELETE` | `/api/poll-sets/:id` | Delete poll set (cascades questions + responses) | Host (Clerk) |
| `POST` | `/api/poll-sets/:id/duplicate` | Duplicate poll set and all its questions | Host (Clerk) |
| `POST` | `/api/poll-sets/:id/questions` | Add question to a poll set | Host (Clerk) |
| `PUT` | `/api/poll-sets/:id/questions/:qid` | Update a question | Host (Clerk) |
| `DELETE` | `/api/poll-sets/:id/questions/:qid` | Delete a question | Host (Clerk) |
| `GET` | `/api/poll-sets/:id/results.csv` | Download CSV of all poll responses for a set | Host (Clerk) |

### WebSocket
Mounted at `/ws`. Handles room lifecycle, Q&A state, in-event polling, and WebRTC signaling relay.

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
| `hostUserId` | `text` | Clerk user ID |
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

**`poll_sets` table**

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | Auto-increment |
| `title` | `text` | Required |
| `hostUserId` | `text` | Clerk user ID — only the owning host can access |
| `createdAt` | `timestamp` | Auto |

**`poll_questions` table**

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | Auto-increment |
| `pollSetId` | `integer` FK | → `poll_sets.id` ON DELETE CASCADE |
| `question` | `text` | Required |
| `options` | `json` | `string[]` — 2–10 options |
| `orderIndex` | `integer` | Display order within the set |
| `createdAt` | `timestamp` | Auto |

**`poll_responses` table**

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | Auto-increment |
| `pollQuestionId` | `integer` FK | → `poll_questions.id` ON DELETE CASCADE |
| `eventId` | `integer` FK | → `events.id` ON DELETE CASCADE |
| `attendeeId` | `integer` | Nullable (attendee may be anonymous) |
| `attendeeName` | `text` | Captured at vote time |
| `optionIndex` | `integer` | 0-based index into the question's options array |
| `createdAt` | `timestamp` | Auto |

Responses are only written when a poll is **ended** and was launched from a saved `pollQuestionId`. Ad-hoc polls (no `pollQuestionId`) are never persisted.

### Object Storage
Event logos are uploaded to Replit Object Storage (bucket via `DEFAULT_OBJECT_STORAGE_BUCKET_ID`). Returned as a public URL stored in `events.logoUrl`.

---

## Layer 5 — Authentication

**Two separate auth mechanisms — one per user type.**

### Host Authentication — Clerk
- Integration: `@clerk/express` (server middleware) + `@clerk/react` (React hooks)
- Session verified server-side on each request via Clerk's JWT / session token
- WebSocket host connections extract the Clerk session from cookies/headers via `clerkClient.authenticateRequest()`
- React guard: `ProtectedRoute` component uses `useUser()` from `@clerk/react`; redirects to Clerk sign-in if unauthenticated
- Host's Clerk `userId` is stored as `hostUserId` in `events`, `poll_sets` tables

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
