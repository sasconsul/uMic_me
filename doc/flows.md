# uMic.me — Screen Flows

User journeys through the app for both Hosts and Attendees, including the real-time Q&A sub-flows.

---

## Host Flow

### Main Path

```
Landing Page (/)
       │
       │  Click "Host an Event" or "Sign in"
       ▼
Sign In — Replit Auth (OIDC/PKCE)
       │
       │  Auth callback → session created
       ▼
Dashboard (/dashboard)
       │
       ├──► Create Event (modal)
       │         Title, logo, description, start time
       │         → POST /api/events
       │         → Navigate to Event Control
       │
       │  Click "Manage" on event card
       ▼
Event Control (/events/:id)
       │
       ├──► Print Flyer → /events/:id/print (new tab)
       │
       │  Click "Go Live"
       ▼
Go Live — event.status = "live"
       │
       ├──► Start Audio Broadcast
       │         getUserMedia → WebRTC peer per attendee
       │         send: start-broadcast
       │
       ├──► Open Q&A (see Q&A sub-flow below)
       │
       │  Click "End Event"
       ▼
End Event
       │  PUT /api/events/:id { status: "closed" }
       │  send: close-event
       │  All attendee WS connections closed
       │  Broadcast stopped
       ▼
       (Back to Dashboard)
```

---

### Q&A Sub-Flow (Host Side)

```
Event Control — Q&A section
       │
       │  (Optional) Toggle: "Mute attendees until I manually open their mic"
       │
       │  Click "Open Q&A"
       ▼
send: open-qa { muteUntilCalled: true|false }
       │  Broadcasts qa-opened to all attendees
       ▼
Queue Fills — attendees raise hands
       │  Incoming: hand-update { attendeeId, raisedHand, raisedHandAt }
       │  Queue sorted by raisedHandAt ascending (first come, first served)
       ▼
Click "Call on" (mute mode) or "Give mic" (live mode)
       │  send: select-speaker { attendeeId }
       │  Server sends speaker-mic-request { startMuted } to attendee
       │  Server broadcasts speaker-selected to all other attendees
       ▼
[If mute mode OFF]                     [If mute mode ON]
       │                                       │
       │  Attendee mic activates immediately   │  "Called on" panel appears
       │                                       │  Attendee sees yellow "waiting" banner
       │                                       │
       │                                       │  Click "Open Mic"
       │                                       │  send: unmute-speaker { attendeeId }
       │                                       │  Server sends speaker-unmuted to attendee
       │                                       ▼
       └──────────────────────────────► Attendee mic live (WebRTC uplink)
       │
       │  Click "Close Q&A"
       ▼
send: close-qa
       │  Broadcasts qa-closed to all attendees
       │  Raised hands cleared
       │  Selected speaker cleared
```

---

## Attendee Flow

### Main Path

```
Scan QR Code or open join link
       │  URL: /join/:qrCodeToken
       ▼
Join Page (/join/:token)
       │  Event details fetched (title, logo, description, start time)
       │  Attendee enters optional display name
       │  Click "Join"
       ▼
POST /api/events/join/:token { displayName }
       │  Server creates attendee record
       │  Returns: { attendeeId, assignedId, sessionToken, event }
       │  Client saves to sessionStorage
       ▼
Attendee Page (/attend/:token/:attendeeId)
       │  WebSocket connects: join-attendee { eventId, attendeeId, attendeeToken }
       │  Server sends: qa-state { qaOpen }
       │
       ├──► [When host starts broadcast]
       │         Receive: stream-available
       │         WebRTC offer received → answer → audio stream begins
       │         Volume2 icon active
       │
       ├──► [When host stops broadcast]
       │         Receive: stream-ended
       │         WebRTC connection closed
       │
       ├──► [When Q&A opens]
       │         Receive: qa-opened
       │         Raise Hand button activates
       │         (see Q&A sub-flow below)
       │
       └──► [When event ends]
                 Receive: session-ended
                 "Event has ended" full-screen state shown
```

---

### Q&A Sub-Flow (Attendee Side)

```
Receive: qa-opened
       │
       │  Raise Hand button becomes active
       ▼
Tap "Raise Hand"
       │  send: raise-hand { raised: true }
       │  PATCH /api/attendees/:id { raisedHand: true }
       │  Button turns yellow — "The host has been notified"
       ▼
Waiting in queue...
       │
       │  Host clicks "Call on" in their queue
       ▼
Receive: speaker-mic-request { startMuted: true|false }
       │
       ▼
[startMuted: false — immediate mic]    [startMuted: true — muted mic]
       │                                       │
       │  getUserMedia → mic stream            │  getUserMedia → mic stream
       │  track.enabled = true                 │  track.enabled = false (muted)
       │  WebRTC uplink offer sent to host     │  WebRTC uplink offer sent to host
       │  Toast: "Mic activating..."           │  Toast: "Waiting for host to open mic"
       │                                       │  Yellow banner: "Waiting for host"
       │                                       │
       │                                       │  Receive: speaker-unmuted
       │                                       │  track.enabled = true
       │                                       │  Toast: "Mic is now live"
       │                                       ▼
       └──────────────────────────────► Red banner: "Mic active — you are speaking live"
       │
       │  Tap "Stop Speaking" or host closes Q&A
       ▼
WebRTC uplink closed
       │  track.stop() on all mic tracks
       │  speakerSelected state cleared
```

---

## WebSocket Message Reference

### Host-Initiated Messages

| Message | Payload | Effect |
|---|---|---|
| `join-host` | `{ eventId }` | Joins or creates room; receives `room-state` |
| `open-qa` | `{ muteUntilCalled }` | Opens Q&A; broadcasts `qa-opened` |
| `close-qa` | — | Closes Q&A; broadcasts `qa-closed` |
| `select-speaker` | `{ attendeeId }` | Notifies all + sends `speaker-mic-request` to attendee |
| `unmute-speaker` | `{ attendeeId }` | Sends `speaker-unmuted` to attendee |
| `start-broadcast` | — | Broadcasts `stream-available` |
| `stop-broadcast` | — | Broadcasts `stream-ended` |
| `close-event` | — | Sends `session-ended` to all, closes attendee connections |

### Attendee-Initiated Messages

| Message | Payload | Effect |
|---|---|---|
| `join-attendee` | `{ eventId, attendeeId, attendeeToken }` | Joins room; receives `qa-state` |
| `raise-hand` | `{ raised }` | Updates hand state; notifies host via `hand-update` |

### WebRTC Signaling (relayed by server)

| Message | From | To | Purpose |
|---|---|---|---|
| `rtc-offer-to-attendee` | Host | Attendee | Host → attendee downlink offer |
| `rtc-answer-to-host` | Attendee | Host | Attendee answer for downlink |
| `rtc-ice-to-attendee` / `rtc-ice-to-host` | Both | Both | ICE candidates (downlink) |
| `speaker-offer-to-host` | Attendee | Host | Attendee → host uplink offer |
| `speaker-answer-to-attendee` | Host | Attendee | Host answer for uplink |
| `speaker-ice-to-host` / `speaker-ice-to-attendee` | Both | Both | ICE candidates (uplink) |
