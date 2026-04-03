# uMic.me — Module Dependency Graph

Tracks the import graph across the monorepo. Updated after each significant feature addition.
Reference this file before adding new features to understand existing coupling, and update it
(including the "What changed" table) whenever a new feature introduces or removes a dependency edge.

---

## How to Update This File

After adding a feature:
1. Identify every new `import` added to any file in `artifacts/` or `lib/`.
2. Add any new edges to the graph below. Annotate cross-layer edges with `◄── NEW`.
3. Update the "What changed" table at the bottom.
4. Pay special attention to the backend: if a route module now imports from `lib/websocket` (or vice versa), document it — that is a cross-layer coupling that may complicate future splitting.

---

## Baseline: Before Task #6 (PA Audio Source)

### Backend (`api-server`)

```
index.ts
  ├── app.ts
  │     ├── middlewares/authMiddleware  ──► lib/auth
  │     └── routes/index
  │           ├── routes/health
  │           ├── routes/auth          ──► lib/auth
  │           ├── routes/storage       ──► lib/objectStorage
  │           ├── routes/events        ──► @workspace/db
  │           │                        ──► lib/objectStorage
  │           │                        ──► lib/auth
  │           └── routes/attendees     ──► @workspace/db
  │                                    ──► lib/auth
  └── lib/websocket                    ──► lib/logger
                                       ──► lib/auth
                                       ──► @workspace/db
```

**Key property:** Routes layer and WebSocket layer are completely independent of each other.
`index.ts` wires both to the same HTTP server, but neither imports the other.

### Frontend (`live-event`)

```
App.tsx
  ├── pages/LandingPage
  ├── pages/DemosPage
  ├── components/ProtectedRoute        ──► hooks/useAuth
  ├── pages/HostDashboard              ──► @workspace/api-client-react
  ├── pages/PrintFlyerPage             ──► @workspace/api-client-react
  ├── pages/JoinPage                   ──► (fetch /api directly)
  ├── pages/EventPage
  │     ├── hooks/useWebSocket
  │     ├── hooks/useAudioBroadcast    ──► WsMessage (type only from useWebSocket)
  │     └── @workspace/api-client-react
  └── pages/AttendeePage
        ├── hooks/useWebSocket
        ├── hooks/useAudioReceive      ──► WsMessage (type only from useWebSocket)
        └── hooks/useSpeakerUplink     ──► WsMessage (type only from useWebSocket)
```

---

## After Task #6 (PA Audio Source)

### Backend (`api-server`) — changes marked ◄── NEW

```
index.ts
  ├── app.ts
  │     ├── middlewares/authMiddleware  ──► lib/auth
  │     └── routes/index
  │           ├── routes/health
  │           ├── routes/auth          ──► lib/auth
  │           ├── routes/storage       ──► lib/objectStorage
  │           ├── routes/events        ──► @workspace/db
  │           │                        ──► lib/objectStorage
  │           │                        ──► lib/auth
  │           │                        ──► lib/websocket  ◄── NEW cross-layer dep
  │           └── routes/attendees     ──► @workspace/db
  │                                    ──► lib/auth
  └── lib/websocket                    ──► lib/logger
        (now exports: generatePaSourceToken,     lib/auth
         getPaSourceToken,             ──► @workspace/db
         paSourceTokens Map — new public API surface)
```

> **Cross-layer note:** `routes/events.ts` now imports `generatePaSourceToken` from `lib/websocket`.
> This is the only place in the codebase where the HTTP route layer and the WebSocket layer
> are coupled at the import level. If either module is ever split out (e.g. moved to a
> separate service or replaced), this coupling must be resolved first.
> Mitigation options: extract PA token storage into a separate `lib/paTokens.ts` module.

**New WebSocket message types introduced:**
- Client→Server: `join-pa-source`, `pa-source-offer`, `pa-source-ice`, `pa-source-answer-to-source`, `pa-source-ice-to-source`
- Server→Client: `pa-source-joined`, `pa-source-answer`, `pa-source-ice-candidate`, `pa-source-connected`, `pa-source-disconnected`

**New REST endpoint:** `POST /api/events/:id/pa-token` — requires host auth, calls `generatePaSourceToken`.

### Frontend (`live-event`) — changes marked ◄── NEW

```
App.tsx
  ├── pages/LandingPage
  ├── pages/DemosPage
  ├── components/ProtectedRoute        ──► hooks/useAuth
  ├── pages/HostDashboard              ──► @workspace/api-client-react
  ├── pages/PrintFlyerPage             ──► @workspace/api-client-react
  ├── pages/JoinPage                   ──► (fetch /api directly)
  ├── pages/EventPage
  │     ├── hooks/useWebSocket
  │     ├── hooks/useAudioBroadcast    ──► WsMessage (type only from useWebSocket)
  │     │     (now also returns:  ◄── NEW
  │     │      handlePaSourceOffer,
  │     │      handlePaSourceIce,
  │     │      handlePaSourceDisconnected)
  │     └── @workspace/api-client-react
  ├── pages/AttendeePage
  │     ├── hooks/useWebSocket
  │     ├── hooks/useAudioReceive      ──► WsMessage (type only from useWebSocket)
  │     └── hooks/useSpeakerUplink     ──► WsMessage (type only from useWebSocket)
  └── pages/PaSourcePage  ◄── NEW (lazy-loaded via React.lazy)
        ├── (raw WebSocket API — intentionally NOT using useWebSocket hook)
        └── (raw RTCPeerConnection — intentionally NOT using useAudioBroadcast hook)
```

> **Design note:** `PaSourcePage` is intentionally standalone — it does not reuse `useWebSocket`
> or `useAudioBroadcast`. This keeps it self-contained and deliverable as a single URL
> to a sound engineer. Downside: WebSocket connection logic (reconnect strategy, auth headers)
> is duplicated and must be updated separately if the shared hooks change.

---

## What Changed — Per Feature

| Feature | New import edges | Notes |
|---|---|---|
| Task #6: PA Audio Source | `routes/events` → `lib/websocket` | First and only cross-layer coupling in the backend |
| Task #6: PA Audio Source | `App.tsx` → `pages/PaSourcePage` (lazy) | New standalone page, no shared hooks |
| Task #6: PA Audio Source | `hooks/useAudioBroadcast` gains 3 new exported functions | handlePaSourceOffer, handlePaSourceIce, handlePaSourceDisconnected |
| Task #6: PA Audio Source | `lib/websocket` gains 2 new exports | generatePaSourceToken, getPaSourceToken |
