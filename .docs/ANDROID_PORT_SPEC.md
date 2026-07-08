# 20 Questions — Android Client Port Spec

## Purpose of this document

This app already exists as a working **Flask + Socket.IO backend** and a **vanilla JS web frontend**. The backend is done and will not change. Your job is to build the **Android client** (Kotlin + Jetpack Compose) that talks to the *same* backend — same REST endpoints, same Socket.IO events, same payload shapes. This doc is the contract: it describes the backend precisely, the state machine the web client implements, and what screens/behavior need to be replicated on Android. Treat the "API Contract" and "Socket.IO Contract" sections as authoritative and exact — field names and casing matter (backend uses `snake_case` in REST/DB, but socket payloads mix `camelCase` for things emitted to the client).

The web frontend is the reference implementation for *behavior*, not for visuals — build this natively with Compose, following normal Android design conventions, not a 1:1 pixel clone of the CSS (which isn't included here anyway).

---

## 1. High-level architecture

- **Backend**: Flask app (`app/__init__.py`) exposing:
  - REST routes under `/api/auth/*` and `/api/game/*` (JWT-authenticated, via `Authorization: Bearer <token>` header) — used only for **auth** and **static reference data** (category list, profile, leaderboard).
  - A **Socket.IO** namespace (default `/`) that authenticates the socket itself via a `token` passed in the `auth` payload on connect, and handles **all actual gameplay** (starting games, submitting questions/guesses, pausing/resuming, multiplayer rooms/matches) as request/ack or broadcast events.
  - MongoDB for persistence (`users` collection, `game_sessions` collection with a 24h TTL).
- **Game**: A 20-Questions-style game. Server picks a secret word from a category word list. Player asks yes/no questions; an LLM (OpenAI `gpt-4o-mini`) judges each question as `Yes`/`No`/`Error` against the secret word, with a max question budget (default 20). Player can guess the secret word at any time; the LLM also judges guesses semantically (typo/synonym tolerant). Player wins by guessing correctly; loses if they run out of questions without a correct final guess.
- **Two modes**:
  - **Singleplayer**: solo vs. the AI judge. Supports pause/resume (one paused game per account at a time) and quit/forfeit. Tracks XP and win/loss history server-side.
  - **Multiplayer**: 2-player head-to-head in a room (4-character room code). Players take turns; whoever guesses correctly (or is left standing after the other forfeits/disconnects) wins. No pause; disconnect ends the match for both players.
- **Auth**: JWT-based. Three ways to get a token: signup (email+username+password), login (identity = email or username + password), or guest (nickname only, ephemeral, not persisted to XP/leaderboard). Token is a 24h JWT containing `user_id`, `username`, `is_guest`.

Android implementation should mirror this split: **Retrofit** (or Ktor client) for the REST auth/category/profile/leaderboard calls, and the **official Socket.IO Java/Kotlin client** (`io.socket:socket.io-client`) for everything gameplay-related. Do not try to reimplement gameplay over REST — the backend does not expose gameplay over REST at all.

---

## 2. REST API contract

Base URL: configurable (e.g. `http://<host>:8080`). No `/api` prefix confusion — blueprints are registered with `url_prefix="/api/auth"` and `url_prefix="/api/game"`.

All authenticated routes require header: `Authorization: Bearer <jwt>`.

### `POST /api/auth/signup`
Request JSON: `{ "email": string, "username": string, "password": string }`
Response `201`: `{ "token": string, "username": string, "is_guest": false, "email": string }`
Errors `400`: `{ "error": "Missing required fields..." }` or `{ "error": "A user with this email or username already exists" }`

### `POST /api/auth/login`
Request JSON: `{ "identity": string /* email OR username */, "password": string }`
Response `200`: `{ "token": string, "username": string, "is_guest": false, "email": string }`
Errors `400`/`401`: `{ "error": "Invalid username, email, or password" }`

### `POST /api/auth/guest`
Request JSON: `{ "nickname": string /* optional, defaults to "Guest" */ }`
Response `200`: `{ "token": string, "username": string /* "<nickname>-<5 hex chars>" */, "is_guest": true, "email": "" }`
Guest accounts are **not persisted** — no DB row, no XP/history, no leaderboard eligibility. Purely a signed JWT.

### `GET /api/auth/user_info` (auth required)
Response `200` (guest):
```json
{
  "username": "Guest-a1b2c",
  "xp": 0,
  "is_guest": true,
  "rank": "-",
  "avg_turns_to_win": 0.0,
  "win_rate": 0,
  "history_singleplayer": [],
  "history_multiplayer": [],
  "active_game": null
}
```
Response `200` (registered user):
```json
{
  "username": "roy",
  "xp": 42,
  "is_guest": false,
  "rank": "S | A | B | C | -",
  "avg_turns_to_win": 7.4,
  "win_rate": 63,
  "history_singleplayer": [
    {
      "game_id": "uuid",
      "category": "animals",
      "result": "WIN | LOSE",
      "turns_used": 9,
      "xp_earned": 12,
      "played_at": "2026-07-01T12:34:56+00:00"
    }
  ],
  "history_multiplayer": [
    {
      "game_id": "uuid",
      "room_code": "K8X1",
      "category": "countries",
      "result": "WIN | LOSE",
      "turns_used": 5,
      "xp_earned": 16,
      "opponent_username": "amy",
      "played_at": "2026-07-01T12:34:56+00:00"
    }
  ],
  "active_game": {
    "game_id": "uuid",
    "category": "food",
    "turns_used": 4,
    "max_questions": 20,
    "chat_history": [ /* ChatHistoryItem[], see §4 */ ]
  }
}
```
`active_game` is non-null only if the user has a **paused singleplayer** game (`game_stage == PAUSED`). This drives the "Resume Investigation" card on the singleplayer landing screen. There is no equivalent "resume" concept for multiplayer.

Rank tiers are computed server-side from the player's **last 5 singleplayer wins**' average turns-used: `S` ≤ 7.0, `A` ≤ 11.0, `B` ≤ 15.0, else `C`; `-` if fewer than 5 total games played or 0 wins.

### `GET /api/game/categories` (auth required)
Response `200`: `{ "categories": ["animals", "countries", "football_players", "professions", "food", "everyday_objects"] }`
(The keys of `config.json`'s `categories` object — treat as dynamic, don't hardcode this list on Android; always fetch it.)

### `GET /api/auth/leaderboard` (auth required)
Response `200`:
```json
{
  "leaderboard": [
    { "username": "roy", "avg_turns": 7.4, "rank": "S", "xp": 120, "position": 1 },
    { "username": "amy", "avg_turns": 9.1, "rank": "A", "xp": 95, "position": 2 }
  ]
}
```
Only includes users with an unlocked rank (5+ games played). Sorted ascending by `avg_turns` (fewer turns = better).

---

## 3. Socket.IO contract

Connect with `auth: { token: "<jwt>" }` in the handshake (same JWT as REST). If missing/invalid, the server rejects the connection outright (no `connect` event fires; you'll get `connect_error`). There is **no re-auth mid-connection** — if the token expires, reconnect with a fresh one (get a new one via login before reconnecting, since JWTs aren't refreshed automatically).

Every event below is either:
- **Ack-style** (client emits, passes a callback, server replies directly with a result — used for singleplayer + room creation acks), or
- **Broadcast-style** (server pushes to all sockets in a "room" — Socket.IO's own broadcast rooms, keyed by the 4-char room code, used for multiplayer).

### 3.1 Connection lifecycle

| Event | Direction | Payload |
|---|---|---|
| `connect` | server→client | (none) — fires once auth succeeds |
| `connect_error` | server→client | JS `Error`-like; treat as "bad/expired token, kick to login" |
| `disconnect` | server→client | fires on network loss; server-side cleans up any room the socket was in (see §3.4) |
| `socket_error` | server→client | `{ "message": string }` — generic error channel for out-of-band failures (not tied to an ack), e.g. unauthorized actions, room-not-found. Surface as a toast/snackbar. |

### 3.2 Singleplayer events (all ack-style: client sends data + gets a direct callback response)

**`sp_start_game`** → emit `{ "category": string }`
Ack success: `{ "gameId": string, "category": string, "maxQuestions": int, "gameStage": "PLAYING" }`
Ack error: `{ "error": string }` (e.g. "You have an unfinished game in progress. You must resume or forfeit it first.", or invalid category)

**`sp_submit_turn`** → emit `{ "game_id": string, "type": "QUESTION" | "GUESS", "text": string }`
Ack for `type: "QUESTION"`:
```json
{ "gameId": "...", "type": "QUESTION", "response": "Yes." /* or "No." or "Error." */, "turnsUsed": 5, "gameStage": "PLAYING" | "FINAL_GUESS" }
```
Ack for `type: "GUESS"`:
```json
{
  "gameId": "...", "type": "GUESS", "response": "Correct." | "Incorrect.",
  "turnsUsed": 6, "gameStage": "PLAYING" | "FINAL_GUESS" | "GAME_OVER",
  "gameResult": "WIN" | "LOSE" | null,
  "secretAnswer": "lasagna",   // present ONLY when gameStage == GAME_OVER
  "xpEarned": 12                // present ONLY when gameStage == GAME_OVER and user is not a guest
}
```
Note: an incorrect question/guess that the LLM couldn't parse comes back as `"Error."` and does **not** consume a turn (see `error_count` server-side) — only valid Yes/No answers increment `turnsUsed`. Once `turnsUsed >= maxQuestions`, `gameStage` becomes `FINAL_GUESS`: at that point the UI must **disable further questions and require a guess**.

**`sp_pause_game`** → emit `{ "game_id": string }`
Ack: `{ "gameStage": "PAUSED" }` or `{ "error": string }`. Only valid mid-game (not after GAME_OVER).

**`sp_resume_game`** → emit `{ "game_id": string }`
Ack: `{ "gameId": "...", "category": "...", "turnsUsed": int, "maxQuestions": int, "gameStage": "PLAYING", "chatHistory": [ChatHistoryItem, ...] }` — use `chatHistory` to rebuild the transcript UI.

**`sp_quit_game`** → emit `{ "game_id": string }`
Ack: `{ "gameStage": "GAME_OVER", "secretAnswer": string, "xp": 0 }` — quitting always records as a LOSE with 0 XP.

**`sp_get_analysis`** → emit `{ "game_id": string }`
Ack: `{ "gameId": "...", "chatHistory": [ChatHistoryItem, ...] }`. Only works once `gameStage == GAME_OVER` (errors otherwise) — this powers an optional "show AI reasoning" toggle after the match.

### 3.3 Multiplayer lobby events

**`create_room`** → emit `{}` (fire-and-forget, no ack). Server replies via broadcast `room_state_updated` (see below), sent only to the creator's own socket at that point since no room broadcast group has other members yet.

**`join_room`** → emit `{ "roomCode": string }` (fire-and-forget). Room codes are 4 uppercase alphanumeric chars; uppercase before sending (server does `.upper()` too, but be consistent). Max 2 players per room. Rejoining with the same `user_id` is idempotent (updates your socket id, doesn't duplicate you or error). Failure emits `socket_error` with a message like "Requested room code does not exist." or "Room capacity limit reached. Max 2 investigators."

**`update_room_settings`** → emit `{ "roomCode": string, "category": string }` (fire-and-forget) — host picks a category; broadcasts new `room_state_updated` to the whole room.

**`launch_match`** → emit `{ "roomCode": string, "category": string }` (fire-and-forget) — host-only, requires 2 players present; broadcasts `match_launched` to the room. Non-host callers or <2 players get `socket_error` instead.

Broadcast: **`room_state_updated`** (server→all sockets in room)
```json
{
  "roomCode": "K8X1",
  "players": [
    { "user_id": "...", "username": "roy", "socket_id": "...", "color": "#1e40af", "isHost": true, "is_guest": false },
    { "user_id": "...", "username": "amy", "socket_id": "...", "color": "#065f46", "isHost": false, "is_guest": true }
  ]
}
```
Note this does **not** include the selected category directly on the payload in the current server code — the web client tracks `state.selectedCategory` from its own `update_room_settings` call locally and only trusts `roomData.category` if present (a bit of an inconsistency in the current server — the category is not actually broadcast back in `room_state_updated`, only room/player info is refreshed). **Recommendation for Android**: keep the locally-selected category as the source of truth for the host, and rely on `match_launched`'s `category` field (below) as the source of truth for all players once launched. If you want the guest to see the host's live category selection before launch, that's a possible small backend enhancement to flag to your partner — not guaranteed to work reliably as currently implemented.

Broadcast: **`match_launched`** (server→all sockets in room, once)
```json
{ "roomCode": "K8X1", "category": "food", "maxQuestions": 20, "currentTurnHolder": "roy" }
```
Transition all clients in the room from lobby → gameplay screen on this event. `currentTurnHolder` is chosen randomly by the server among the 2 players.

### 3.4 Multiplayer gameplay events

**`submit_multiplayer_turn`** → emit `{ "roomCode": string, "type": "QUESTION" | "GUESS", "text": string }` (fire-and-forget — no ack; result arrives via broadcasts below). Server rejects (via `socket_error`, "Out of turn action request ignored.") if the sender isn't the current `current_turn_holder`.

Broadcast: **`turn_broadcast_received`** (immediately, before AI evaluates) — shows the raw submitted text to both players right away:
```json
{ "senderName": "roy", "senderType": "USER_QUESTION" | "USER_GUESS", "messageText": "Is it alive?" }
```

Broadcast: **`ai_response_broadcast_received`** (after LLM evaluates) — this is the "real" turn result:
```json
{
  "turnsUsed": 5,
  "currentTurnHolder": "amy" | null,      // null once game is over
  "gameStage": "PLAYING" | "FINAL_GUESS" | "GAME_OVER",
  "messageText": "Yes.",                   // or "No.", "Error.", "Correct.", "Incorrect.", or a forfeit message
  "analysis": "brief LLM reasoning string",
  "victory": true | false | null,          // only meaningful for GUESS turns; null for QUESTION turns
  "winnerUsername": "roy" | null | "unknown",
  "secretAnswer": "lasagna" | null,        // present only when gameStage == GAME_OVER
  "forfeit": false,
  "xpEarned": 12                            // present on GUESS turns; may be absent on QUESTION turns — default to 0
}
```
Turn rotation: on a `QUESTION` (game not ended), `currentTurnHolder` flips to the other player. On a correct `GUESS`, the game ends immediately (no rotation) and both players' XP/history get recorded server-side. On an incorrect final-stage guess, the game also ends in a LOSE for both (nobody "wins" by attrition the way singleplayer works — check `winnerUsername`/`victory` to render correctly; if `victory` is false and it's the FINAL_GUESS-triggered game-over, no one guessed correctly, so treat as a mutual-loss / draw-like ending on the losing side and NOT a “LOSE” attributed only to the guesser. **Verify this edge case with your partner/backend logs during testing** — the current server code doesn't cleanly special-case "both players ran out of turns with nobody guessing correctly").

**`forfeit_match`** → emit `{ "roomCode": string }` (fire-and-forget). Ends the match immediately; broadcasts `ai_response_broadcast_received` with `forfeit: true`, `victory: false`, `winnerUsername` = the other player, `messageText` = "`<name>` forfeited the match.".

**`return_to_lobby`** → emit `{ "roomCode": string }` (fire-and-forget) — either player can trigger a rematch. Broadcasts `returned_to_lobby` to the room:
```json
{ "roomCode": "K8X1", "players": [ /* same shape as room_state_updated */ ] }
```
On receipt, both clients should go back to the **lobby** screen (same room, same players, category/match state cleared) rather than the entrance screen.

**`room_terminated`** (server→remaining client only) — fires when the *other* player disconnects mid-match or mid-lobby:
```json
{ "reason": "Match terminated: amy went offline." }
```
The current web client's handling is blunt: on receipt it shows an alert and **force-reloads the whole app** back to square one. On Android, at minimum: show a dialog/snackbar with the reason, then navigate back to the main menu/dashboard and drop all local room/game state. Note the backend behavior on disconnect: if a mid-match player drops, the game session is force-set to `GAME_OVER`/`LOSE` and (if a match was active) the *other* player gets an automatic multiplayer win recorded — but with category `"Unknown"` and 0 turns_used, which is a known quirk in the current backend, not something to fix client-side.

---

## 4. Shared data model reference (mirror as Kotlin data classes)

These mirror `models.py`. Use them as your `data class` / `enum class` definitions in Kotlin — field names in **socket payloads are camelCase**, but anything that echoes straight from Mongo/DB objects (like `chat_history` items inside `active_game` or `sp_resume_game`'s `chatHistory` list) uses these **snake_case-ish** inner keys:

```
GameStage: LOBBY | PLAYING | FINAL_GUESS | GAME_OVER | PAUSED   // LOBBY = multiplayer pre-match only; PAUSED = singleplayer only
GameResult: WIN | LOSE
GameMode: SINGLEPLAYER | MULTIPLAYER
EvaluationResponse (raw LLM verdict, capitalized): Yes | No | Error

ChatHistoryItem {
  type: "question" | "guess"
  text: string          // player's raw input
  response: string       // "Yes." / "No." / "Error." / "Correct." / "Incorrect."
  analysis: string       // LLM's raw reasoning text
  author: string?        // multiplayer only: username of whoever submitted this turn
}

RoomPlayer {
  user_id: string
  username: string
  socket_id: string
  color: string          // hex color, host defaults "#1e40af", guest "#065f46"
  isHost: boolean
  is_guest: boolean
}
```

Category keys are dynamic (fetch from `/api/game/categories`); currently: `animals`, `countries`, `football_players`, `professions`, `food`, `everyday_objects`. Each category also has an `example_question` string in the backend config (not currently exposed via any API — if you want to show a hint like the web app conceptually could, you'd need to ask your partner to add it to the categories response; right now the endpoint only returns the bare list of category names).

---

## 5. App flow / screens to implement

Use this as a rough Compose navigation graph — screen names are suggestions, not required to match:

1. **Auth screen** — 3 sub-modes (tabs or segmented buttons): Login (identity + password), Sign Up (username + email + password), Guest (nickname, optional). On success, persist the JWT + username/isGuest/email (use `DataStore`/`EncryptedSharedPreferences`, not `SharedPreferences` plaintext, for the token) and proceed to Dashboard.
2. **Dashboard / main menu** — buttons: Single Player, Multiplayer, Leaderboard, Profile, plus a persistent top-bar profile menu (username, guest/rank badge, XP, Sign Out). On boot with an existing token, call `getUserInfo()` + `getLeaderboard()` and open the socket connection immediately (so multiplayer room events etc. work app-wide) — mirrors `boot()` in `main.js`.
3. **Singleplayer setup screen**:
   - If `active_game` came back non-null from `user_info`: show a "resume or forfeit" card instead of category selection (category, turns used/max, Resume button → `sp_resume_game`, Forfeit button → `sp_quit_game` with a confirmation dialog).
   - Otherwise: category grid (from `/api/game/categories`), tap to select, then a Launch button → `sp_start_game`.
4. **Multiplayer entrance screen**: "Create Room" button (`create_room`) or a 4-char room code input + "Join" (`join_room`).
5. **Multiplayer lobby screen**: room code display (shareable), live player list (from `room_state_updated`), host-only category grid + "Launch Match" (disabled until a category is picked and 2 players present), guest sees a waiting note. On `match_launched`, navigate to gameplay.
6. **Gameplay screen** (shared for both modes, branch on `gameMode`):
   - Category badge, turns-used counter (`turnsUsed / maxQuestions`).
   - Scrolling chat/transcript: alternating bubbles — AI judge messages (left-aligned) vs. player messages (right-aligned, question vs. guess styled differently; in multiplayer, style by which player sent it, using their assigned `color`).
   - Two inputs: a question text field + "Ask" button, and a guess text field + "Guess" button. In `FINAL_GUESS` stage, disable the question input and push the user toward guessing. In multiplayer, disable both inputs entirely when it's not your `currentTurnHolder` turn (show "Waiting for `<name>`'s move…" placeholder state).
   - Singleplayer-only: Pause button (confirm dialog → `sp_pause_game` → back to dashboard) and Forfeit/Abandon button (confirm dialog → `sp_quit_game`).
   - Multiplayer-only: Forfeit button (confirm dialog → `forfeit_match`); no pause.
   - Game-over panel: win/lose heading, message (see the win/lose text-composition logic in `gameplayView.js`'s `handleGameOverUI` for exact tone/wording to replicate), secret word reveal, an optional "show AI reasoning" toggle (singleplayer fetches lazily via `sp_get_analysis`; multiplayer already has `analysis` cached in memory as turns arrive — no extra fetch needed), and a "Play Another" button (singleplayer: back to setup screen; multiplayer: `return_to_lobby`, wait for `returned_to_lobby` broadcast before navigating so both players move in sync).
7. **Leaderboard screen**: ranked list (position, username, XP, avg turns, rank badge), highlight the logged-in user's own row.
8. **Profile screen**: username, guest badge if applicable, total XP, rank badge + a note about unlock requirements, avg-turns-to-win stat, win-rate stat, and a tabbed history list (Singleplayer / Multiplayer) — multiplayer rows additionally show the opponent's username.

---

## 6. Notable behaviors / edge cases worth replicating deliberately

- **One paused singleplayer game per account.** Attempting `sp_start_game` while one is paused returns an error — the setup screen should proactively route to the "resume/forfeit" state instead of letting the user hit that error.
- **`FINAL_GUESS` locks question-asking.** Both singleplayer and multiplayer.
- **Error answers don't cost a turn.** If the LLM can't confidently parse a question, `response` comes back `"Error."` and `turnsUsed` does not increment — don't treat this as a wasted attempt in the UI, just show the bubble and let them try again.
- **Guests never persist stats.** `is_guest` users always get `xp: 0`, no rank, no history — don't call `sp_get_analysis`/history endpoints expecting anything for them beyond the in-session chat transcript.
- **JWTs expire in 24h and don't auto-refresh.** Handle `401`s on REST calls and `connect_error` on the socket by forcing a re-login.
- **Multiplayer has no reconnect-into-room support server-side.** If the socket drops mid-match, the room is torn down and the counterpart gets `room_terminated` — don't build a "reconnect to my match" flow expecting it to work; the backend doesn't support it yet (this is called out as a known limitation in `room_manager.py`'s docstring, which anticipates it as a *future* feature only).
- **Room codes are 4 chars, uppercase alphanumeric.** Uppercase user input client-side before sending `join_room`.
- **XP formula** (client can replicate for optimistic UI, but always trust the server's returned `xpEarned`): `xp = max(21 - turns_used, 0)` if the player won, else `0`.

---

## 7. Suggested Kotlin/Compose project shape

- `data/remote/AuthApi.kt` — Retrofit interface for `/api/auth/*` + `/api/game/categories`.
- `data/remote/SocketManager.kt` — a singleton wrapping `io.socket.client.Socket`, exposing Kotlin `Flow`/`SharedFlow`/callback-based emitters for each event in §3. Handle connect/reconnect/token-refresh-on-reject here.
- `data/model/` — the data classes from §4, plus request/response DTOs for §2's REST payloads (use `kotlinx.serialization` or Moshi/Gson, whichever your partner's project already uses).
- `data/repository/GameRepository.kt`, `AuthRepository.kt` — wrap the above into suspend functions / flows for ViewModels to consume.
- `ui/auth/`, `ui/dashboard/`, `ui/singleplayer/`, `ui/multiplayer/`, `ui/gameplay/`, `ui/leaderboard/`, `ui/profile/` — one `ViewModel` + Composable screen per section, mirroring the JS `views/*.js` split.
- Central app `UiState`/`GameState` (a Kotlin equivalent of `state.js`) held in a shared ViewModel or a simple app-level state holder, since multiplayer broadcasts can arrive while the user is on a different screen (e.g., you want the socket connection and its listeners alive at the NavHost level, not scoped to just the gameplay screen).
- Secure token storage via `androidx.security:security-crypto` (`EncryptedSharedPreferences`) or `DataStore` with manual encryption — do not store the JWT in plain `SharedPreferences`.

This should be enough to start scaffolding the Android app end-to-end against the live backend without needing to guess at any payload shapes.
