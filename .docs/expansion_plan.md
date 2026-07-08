# 🔁 Master Reference: AI 20-Questions Rebuild & Expansion Document

This document provides a comprehensive, self-contained snapshot of the AI 20-Questions architecture, its current code modules, full function contracts, and finalized blueprints for upcoming feature implementations.

## 📁 1. Authoritative Folder Structure

```text
ai-20-questions/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask Application Factory & configuration loader
│   │   ├── config.py            # Configuration validation class layer
│   │   ├── config.json          # Core word list dataset matrix and question boundaries
│   │   ├── database.py          # MongoDB MongoClient connection pool and TTL indexing
│   │   ├── models.py            # TypedDict database document structural maps
│   │   ├── llm_service.py       # OpenAI API chat completion integrations
│   │   └── routes.py            # REST API Endpoint routes (Categories, Questions, Guesses)
│   ├── tests/
│   ├── .env                     # Local environment file (Ignored by Git)
│   ├── .env.example             # Clean configuration template distribution file
│   ├── .gitignore               # System, IDE, Python, and Android build ignore rules
│   ├── requirements.txt         # Pinned stable package dependencies
│   └── run.py                   # Application server bootstrap execution script
├── frontend/
│   ├── css/
│   │   └── style.css            # Custom UI stylesheet layout and component specifications
│   ├── js/
│   │   ├── api.js               # Isolated browser network abstraction wrapper
│   │   ├── state.js             # Client application memory context container
│   │   ├── ui.js                # Explicit Document Object Model (DOM) layout view renderer
│   │   └── main.js              # Central application lifecycle initialization coordinator
│   └── index.html               # Main user interface semantic markup layout
└── android/                     # Native Android Kotlin application repository space

```

---

## ⚙️ 2. Core Modules & Function Signatures

### Backend Architecture

#### `app/config.py`

* `Config.__init__(self)`
* **Description:** Instantiates the configuration layer from environment variables (`MONGO_URI`, `OPENAI_API_KEY`, `FLASK_ENV`).
* **Return Type:** `None`


* `Config.validate(self)`
* **Description:** Confirms presence of mandatory variables. Raises a `ValueError` if configurations are missing.
* **Return Type:** `None`



#### `app/database.py`

* `Database.init_app(self, app: Flask)`
* **Description:** Configures the centralized connection pool wrapper with MongoDB and runs a server ping check.
* **Return Type:** `None`


* `Database._ensure_ttl_indices(self)`
* **Description:** Internal routine that builds a background Time-To-Live index on `game_sessions.created_at` set to auto-expire records after 86,400 seconds (24 hours).
* **Return Type:** `None`



#### `app/llm_service.py`

* `evaluate_question(category: str, secret_answer: str, question: str) -> dict`
* **Description:** Evaluates a player's query against a target word list item using structured `gpt-4o-mini` calls. Handles compound logical operators (OR execution logic).
* **Return Shape:** `{"analysis": str, "response": "Yes" | "No" | "Error"}`


* `evaluate_guess(guess: str, answer: str) -> dict`
* **Description:** Performs a semantic evaluation to check if a user's guess aligns with the target word (handling synonyms, typos, or articles).
* **Return Shape:** `{"analysis": str, "response": "yes" | "no"}`



#### `app/routes.py` (REST Endpoints - Port: 8080)

* `GET /api/game/categories` $\rightarrow$ Returns available configuration keys.
* `POST /api/game/start` $\rightarrow$ Creates a new zero-knowledge session. Request: `{"category": str}`.
* `POST /api/game/question` $\rightarrow$ Submits a query. Request: `{"game_id": str, "question_text": str}`.
* `POST /api/game/guess` $\rightarrow$ Submits a guess. Request: `{"game_id": str, "guess_text": str}`.
* `GET /api/game/<game_id>/analysis` $\rightarrow$ Returns the AI's internal reasoning logs. Locked until `GAME_OVER`.

---

### Web Frontend Architecture

#### `js/api.js`

* `fetchCategories() -> Promise<dict>`
* `startGame(category: str) -> Promise<dict>`
* `askQuestion(gameId: str, questionText: str) -> Promise<dict>`
* `submitGuess(gameId: str, guessText: str) -> Promise<dict>`
* `fetchAnalysis(gameId: str) -> Promise<dict>`

#### `js/state.js`

* `state` $\rightarrow$ Isolated object storing `gameId`, `category`, `turnsUsed`, `maxQuestions`, `gameStage`, and `analysisHistory`.
* `resetState() -> void`

#### `js/ui.js`

* `renderCategoryButtons(categories: Array, onSelectCategory: Function) -> void`
* `appendMessageBubble(senderType: "AI" | "USER_QUESTION" | "USER_GUESS", messageText: str) -> void` *(Fixes bug by tracking separate USER_QUESTION and USER_GUESS style targets)*
* `handleGameOverUI(result: "WIN" | "LOSE", secretAnswer: str) -> void`
* `injectReasoningBoxes(history: Array) -> void`

---

## 🚀 3. Phase 9 Expansion Specifications: New Features

### Feature A: Authentication System

* **Database Collections:** `users`
* **Schema Schema:** `{ _id: uuid, email: str, username: str, password_hash: str, created_at: timestamp }`


* **Flow:** Landing screen forces a choice between "Login/Register" or "Continue as Guest".
* **Guest Handling:** Guests receive a temporary `is_guest: true` token payload context. Guest scores are excluded from writing to global Leaderboards.

### Feature B: 1v1 Competitive Multiplayer Mode

* **Core Driver:** `Flask-SocketIO` to support real-time state synchronization over WebSockets.
* **Gameplay Flow:**
1. User selects **Multiplayer Mode**.
2. User chooses **Host Room** (generates a 6-digit alphanumeric room code) or **Join Room** (inputs the active code).
3. Once two players occupy the socket room namespace, the match initiates.


* **Match Rules:**
* No maximum question ceiling.
* Players alternate turns dynamically (`current_turn_player_id`).
* Each turn permits either a question or a guess.
* The first player to successfully trigger a semantic match validation via `evaluate_guess` wins the match.



### Feature C: Scoring Engine & Leaderboards

* **Single-Player Scoring Mechanics:** Calculated instantly upon game over using the formula:

$$\text{Points} = (20 - \text{turns\_used}) + 1$$



*(Only awarded on a "WIN" status for authenticated profiles)*
* **Leaderboard Collections:** `leaderboards`
* **Document Schema:** `{ user_id: uuid, username: str, single_player_high_score: int, total_multiplayer_wins: int }`


* **Endpoints Required:**
* `GET /api/leaderboard/singleplayer` $\rightarrow$ Returns top 10 profiles sorted by highest single-player scores.
* `GET /api/leaderboard/multiplayer` $\rightarrow$ Returns top 10 profiles sorted by total matchmaking wins.



---

## 📲 4. Current Android Action Items (For Your Partner)

While you wire up the backend updates, your partner can use the current infrastructure endpoints (running on Port `8080`) to scaffold the Android client in Android Studio:

1. **Network Setup:** Implement **Retrofit** or **Ktor Client** matching the `POST` and `GET` shapes in `app/routes.py`. Ensure `android:usesCleartextTraffic="true"` is declared in the local manifest for dev loop testing against `http://10.0.2.2:8080` (the Android Emulator route to your machine's localhost).
2. **UI Layout Build:** Replicate the modular Web view states using Jetpack Compose components:
* `CategorySelectionScreen` (Grid layouts built using `LazyVerticalGrid`).
* `GameSessionScreen` (Scrollable list elements mapped via `LazyColumn` for chat history bubbles, utilizing distinct background decorations for questions vs. guesses).
* `GameOverScreen` (Conditional layouts revealing hidden elements and handling the toggle switch for viewing underlying reasoning logs).