# uMic.me — Screen Flows

User journeys through the app for both Hosts and Attendees, including the real-time Q&A and Polls sub-flows.

---

## Host Flow

### Main Path

```
Landing Page (/)
       │
       │  Click "Host an Event" or "Sign in"
       ▼
Sign In — Clerk (email / social OAuth)
       │
       │  Auth callback → Clerk session created
       ▼
Dashboard (/dashboard)
       │
       ├──► Create Event (modal)
       │         Title, logo, description, start time
       │         → POST /api/events
       │         → Navigate to Event Control
       │
       ├──► Poll Sets link (header) → /poll-sets
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
       ├──► Launch Poll (see Poll sub-flow below)
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

### Poll Sub-Flow (Host Side)

```
Event Control — Polls section
       │
       │  Click "New Poll"
       ▼
Poll creation panel opens (two modes)
       │
       ├─── "New Question" tab ─────────────────────────────────
       │         Enter question text + 2–10 options
       │         Toggle "Show live results to attendees"
       │         Click "Launch Poll"
       │         send: launch-poll { question, options, showResults }
       │         (no pollQuestionId → votes are in-memory only)
       │
       └─── "From Poll Set" tab ────────────────────────────────
                 GET /api/poll-sets → list sets
                 Select set → questions listed
                 Click a question to launch it
                 send: launch-poll { question, options, showResults, pollQuestionId }
                 (pollQuestionId → votes persisted to DB on end)
       │
       ▼
Poll is live — bar-chart tally updates in real time
       │
       ├──► Toggle "Show results to attendees"
       │         send: toggle-poll-results { showResults }
       │         Server broadcasts poll-results-toggled to all
       │
       │  Click "End Poll"
       ▼
send: end-poll
       │  Poll marked inactive
       │  Server broadcasts poll-ended to all
       │  If pollQuestionId was set: votes written to poll_responses table
       ▼
Poll panel returns to idle — host may launch another
```

---

### Poll Sets Management Flow

```
Dashboard — header
       │
       │  Click "Poll Sets" link
       ▼
Poll Sets Page (/poll-sets)
       │
       ├──► Create Set (enter title → POST /api/poll-sets)
       │
       ├──► Edit set title (inline → PUT /api/poll-sets/:id)
       │
       ├──► Duplicate set (POST /api/poll-sets/:id/duplicate)
       │
       ├──► Delete set (DELETE /api/poll-sets/:id)
       │
       └──► Expand set → manage questions
                 ├── Add question (POST /api/poll-sets/:id/questions)
                 ├── Edit question (PUT /api/poll-sets/:id/questions/:qid)
                 ├── Delete question (DELETE /api/poll-sets/:id/questions/:qid)
                 └── Download results CSV
                       GET /api/poll-sets/:id/results.csv
                       (contains all poll_responses for all questions in the set)
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
       │  Server sends: poll-state (if a poll is already active)
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
       ├──► [When host launches a poll]
       │         Receive: poll-launched
       │         (see Poll sub-flow below)
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

### Poll Sub-Flow (Attendee Side)

```
Receive: poll-launched { poll }
       │  Poll card appears with question and options
       ▼
Tap an answer option
       │  send: cast-vote { optionIndex }
       ▼
Receive: poll-vote-confirmed { optionIndex }
       │  Selected option highlighted
       │  Vote cannot be changed
       │
       ├──► [If showResults = true]
       │         See live bar-chart tally update in real time
       │         Receive: poll-updated on each new vote
       │
       │  [If host toggles showResults on]
       │         Receive: poll-results-toggled
       │         Bar chart appears
       │
       │  [If host toggles showResults off]
       │         Receive: poll-results-toggled
       │         Bar chart hidden — "Results hidden by host"
       │
       │  Host ends poll
       ▼
Receive: poll-ended
       │  Poll card shows final state (results if showResults was on)
       │  Voting disabled
```

---

## WebSocket Message Reference

### Host-Initiated Messages

| Message | Payload | Effect |
|---|---|---|
| `join-host` | `{ eventId }` | Joins or creates room; receives `room-state` (includes `activePoll`) |
| `open-qa` | `{ muteUntilCalled }` | Opens Q&A; broadcasts `qa-opened` |
| `close-qa` | — | Closes Q&A; broadcasts `qa-closed` |
| `select-speaker` | `{ attendeeId }` | Notifies all + sends `speaker-mic-request` to attendee |
| `unmute-speaker` | `{ attendeeId }` | Sends `speaker-unmuted` to attendee |
| `start-broadcast` | — | Broadcasts `stream-available` |
| `stop-broadcast` | — | Broadcasts `stream-ended` |
| `close-event` | — | Sends `session-ended` to all, closes attendee connections |
| `launch-poll` | `{ question, options[], showResults, pollQuestionId? }` | Stores poll in room; broadcasts `poll-launched` to all |
| `end-poll` | — | Marks poll inactive; broadcasts `poll-ended`; persists votes if `pollQuestionId` set |
| `toggle-poll-results` | `{ showResults }` | Updates `showResults`; broadcasts `poll-results-toggled` to all |

### Attendee-Initiated Messages

| Message | Payload | Effect |
|---|---|---|
| `join-attendee` | `{ eventId, attendeeId, attendeeToken }` | Joins room; receives `qa-state`; receives `poll-state` if poll active |
| `raise-hand` | `{ raised, questionText? }` | Updates hand state; notifies host via `hand-update` |
| `cast-vote` | `{ optionIndex }` | Records vote; sends `poll-vote-confirmed`; updates host tally via `poll-updated` |

### WebRTC Signaling (relayed by server)

| Message | From | To | Purpose |
|---|---|---|---|
| `rtc-offer-to-attendee` | Host | Attendee | Host → attendee downlink offer |
| `rtc-answer-to-host` | Attendee | Host | Attendee answer for downlink |
| `rtc-ice-to-attendee` / `rtc-ice-to-host` | Both | Both | ICE candidates (downlink) |
| `speaker-offer-to-host` | Attendee | Host | Attendee → host uplink offer |
| `speaker-answer-to-attendee` | Host | Attendee | Host answer for uplink |
| `speaker-ice-to-host` / `speaker-ice-to-attendee` | Both | Both | ICE candidates (uplink) |
