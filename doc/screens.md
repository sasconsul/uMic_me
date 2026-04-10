# uMic.me — Screen Inventory

All screens in the Live Event Platform, their routes, access control, and key interactions.

---

## Access Legend

| Badge | Meaning |
|---|---|
| **PUBLIC** | No authentication required |
| **PUBLIC (Attendees)** | No Clerk login required; attendee `sessionToken` used for actions |
| **PROTECTED** | Clerk Auth required — redirects to sign-in if unauthenticated |

---

## Screen 1 — Landing Page

| | |
|---|---|
| **Route** | `/` |
| **Access** | PUBLIC |
| **File** | `src/pages/LandingPage.tsx` |

Marketing home page. Entry point for new hosts.

**Key interactions:**
- "Host an Event" button → initiates Clerk sign-in, redirects to Dashboard on success
- "Sign in" button → same auth flow
- No content is gated — anyone can see the landing page

---

## Screen 2 — Dashboard

| | |
|---|---|
| **Route** | `/dashboard` |
| **Access** | PROTECTED |
| **File** | `src/pages/HostDashboard.tsx` |

The host's home base. Shows all events they own.

**Key interactions:**
- **Create Event** — opens a modal dialog with fields: title (required), logo upload, description, start time
  - Logo is uploaded to Object Storage; URL stored in `events.logoUrl`
  - On submit: `POST /api/events`, then navigate to Event Control
- **Manage** button on event card → navigates to `/events/:id`
- **Duplicate** button on event card → `POST /api/events/:id/duplicate`
- **Delete** button → confirmation dialog, then `DELETE /api/events/:id`
- **Poll Sets** link in the header → navigates to `/poll-sets`
- Event status badges: `pending` (yellow), `live` (green), `closed` (grey)

---

## Screen 3 — Event Control

| | |
|---|---|
| **Route** | `/events/:id` |
| **Access** | PROTECTED |
| **File** | `src/pages/EventPage.tsx` |

The host's live control center. This is the primary operational screen during a live event.

**Sections:**

### Audio Broadcast
- **Start Broadcast** — requests host mic via `getUserMedia`, creates a WebRTC peer for each connected attendee, sends `start-broadcast` WS message
- **Stop Broadcast** — closes all peer connections, sends `stop-broadcast`
- Live indicator shows number of connected devices

### Q&A Session
- **Mute toggle** (visible before opening Q&A) — "Mute attendees until I manually open their mic"
  - When on: attendees' mics are muted on connection; host must click "Open Mic" to unmute
  - When off: attendee mic activates immediately on "Call on"
- **Open Q&A** — sends `open-qa` (with `muteUntilCalled` flag); broadcasts `qa-opened` to all attendees
- **Hand Raise Queue** — live list of attendees who have raised their hand, sorted by time
  - "Call on" button → `select-speaker` WS message → attendee receives `speaker-mic-request`
  - If mute mode on: a "Called on" panel appears with **Open Mic** button
  - "Open Mic" → `unmute-speaker` WS message → attendee's track enabled
- **Close Q&A** — sends `close-qa`, clears queue and selected speaker

### Polls
- **New Poll** button — opens the poll creation panel with two modes:
  - **New Question** tab — ad-hoc question: type question text + 2–10 options, optional "Show live results to attendees" toggle, then "Launch Poll"
  - **From Poll Set** tab — fetches `GET /api/poll-sets`, shows a set dropdown, then lists questions in the chosen set; clicking a question instantly launches it (with its saved `pollQuestionId` for DB persistence)
- While a poll is active:
  - Live bar-chart tally shows vote counts per option (host always sees results)
  - **Show/Hide results** toggle → sends `toggle-poll-results`; controls whether attendees can see the live tally
  - **End Poll** button → sends `end-poll`; if the poll had a `pollQuestionId`, votes are persisted to `poll_responses`

### Attendee List
- Live list of all connected attendees with their assigned number and display name
- Hand-raise icon appears next to attendees who have raised their hand

### Header Controls
- **QR Code** toggle — shows/hides the event QR code and join URL
- **Print Flyer** — opens `/events/:id/print` in a new tab
- **Go Live** (pending events) — calls `PUT /api/events/:id` with `status: "live"`
- **End Event** — calls `PUT /api/events/:id` with `status: "closed"`, sends `close-event` WS message, stops broadcast, kicks all attendees

---

## Screen 4 — Print Flyer

| | |
|---|---|
| **Route** | `/events/:id/print` |
| **Access** | PROTECTED |
| **File** | `src/pages/PrintFlyerPage.tsx` |

A print-optimized page for generating a physical QR code poster.

**Key interactions:**
- Displays event title, description, start time, and a large QR code image from `/api/events/:id/qr`
- Designed for `window.print()` — all navigation UI is hidden in print styles
- Opens in a new tab from the Event Control header

---

## Screen 5 — Join Page

| | |
|---|---|
| **Route** | `/join/:token` |
| **Access** | PUBLIC (Attendees) |
| **File** | `src/pages/JoinPage.tsx` |

The attendee entry point, reached by scanning the QR code or clicking the join URL.

**Key interactions:**
- Displays event title, logo, description, and start time (fetched by QR token)
- Optional **display name** text field
- **Join** button → `POST /api/events/join/:token` with `{ displayName }`
  - Server creates attendee record, returns `{ attendeeId, assignedId, sessionToken }`
  - Client stores full event metadata + token in `sessionStorage` (key: `event-join-{attendeeId}`)
  - Navigates to `/attend/:token/:attendeeId`
- If event status is `closed`: shows "This event has ended" and blocks joining

---

## Screen 6 — Attendee Page

| | |
|---|---|
| **Route** | `/attend/:token/:attendeeId` |
| **Access** | PUBLIC (Attendees) |
| **File** | `src/pages/AttendeePage.tsx` |

The live experience for attendees. Loaded from `sessionStorage` — no API call needed on mount.

**Sections:**

### Audio Stream
- Automatically receives the host's WebRTC audio stream when broadcast starts
- `Volume2` icon when receiving, `VolumeX` when not
- "Audio available — check your volume" state if stream is announced but WebRTC hasn't connected yet

### Speaker Status (when called on)
Three states shown as a banner:
- **"Selected as speaker — mic activating..."** — connection being established
- **"Selected — waiting for the host to open your mic"** — `startMuted: true`, awaiting `speaker-unmuted`
- **"Mic active — you are speaking live"** — WebRTC uplink connected and track enabled

**Stop Speaking** button appears when mic is active.

### Live Poll
- Appears when host launches a poll; `poll-launched` WS message received
- Attendee sees the question and taps an option to vote (`cast-vote`)
- After voting, their choice is highlighted and locked (no re-vote)
- If `showResults` is enabled by host: live bar-chart tally updates in real time
- If host hides results: chart replaced with "Results hidden by host" message
- Poll card remains visible after `poll-ended`, showing final state

### Raise Hand Button
- Large touch-friendly button, full width
- Disabled with "Q&A is not open yet" when Q&A is closed
- Active (yellow, pressed state) when hand is raised
- Sends `raise-hand` WS message + `PATCH /api/attendees/:id` on toggle
- Automatically lowered when host closes Q&A

### Event Closed
If `session-ended` WS message received: full-screen "Event has ended" state with thank-you message.

---

## Screen 7 — Poll Sets

| | |
|---|---|
| **Route** | `/poll-sets` |
| **Access** | PROTECTED |
| **File** | `src/pages/PollSetsPage.tsx` |

Reusable poll question library for the host. Questions saved here can be launched directly from any event's poll panel.

**Key interactions:**
- **Create Set** — enter a title, `POST /api/poll-sets`; new set appears in the list
- **Edit title** — inline edit on the set card, `PUT /api/poll-sets/:id`
- **Duplicate** — `POST /api/poll-sets/:id/duplicate`; creates a copy with all questions
- **Delete** — confirmation dialog, then `DELETE /api/poll-sets/:id`; cascades to all questions and stored responses
- **Expand set** — reveals the question list for that set
  - **Add Question** — enter question text + 2–10 options, `POST /api/poll-sets/:id/questions`
  - **Edit Question** — inline edit, `PUT /api/poll-sets/:id/questions/:qid`
  - **Delete Question** — `DELETE /api/poll-sets/:id/questions/:qid`
  - **Download Results CSV** — `GET /api/poll-sets/:id/results.csv`
    - Contains one row per recorded vote, with columns: Set, Question, Option, Attendee Name, Event ID, Voted At
    - Only available for questions that were launched from a saved set during an event

---

## Screen 8 — PA Source

| | |
|---|---|
| **Route** | `/pa-source/:token` |
| **Access** | PUBLIC (token-gated) |
| **File** | `src/pages/PaSourcePage.tsx` |

A standalone page for a sound engineer. Receives the host's audio stream over WebRTC and plays it into a PA mixing desk.

**Key interactions:**
- Token is generated by the host from the Event Control page (`POST /api/events/:id/pa-token`)
- Host sends the token URL to the sound engineer
- Page connects via raw WebSocket (not `useWebSocket` hook) and establishes a dedicated WebRTC peer connection with the host
- Audio plays through the device's default output — the sound engineer connects their device to the mixing desk
