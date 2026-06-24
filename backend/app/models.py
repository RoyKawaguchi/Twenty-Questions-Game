from typing import TypedDict, List, Optional
from enum import Enum

# ==========================================
# 1. ENUMS (Used in Python logic & LLM Parsing)
# ==========================================

class GameStage(str, Enum):
    PLAYING = "PLAYING"
    FINAL_GUESS = "FINAL_GUESS"
    GAME_OVER = "GAME_OVER"

class GameResult(str, Enum):
    WIN = "WIN"
    LOSE = "LOSE"

class GameMode(str, Enum):
    SINGLEPLAYER = "SINGLEPLAYER"
    MULTIPLAYER = "MULTIPLAYER"

class EvaluationResponse(str, Enum):
    YES = "yes"
    NO = "no"
    ERROR = "error"
    CORRECT = "correct"
    INCORRECT = "incorrect"


# ==========================================
# 2. DOCUMENT SCHEMAS (For Documentation & IDE Autocomplete)
# ==========================================

class ChatHistoryItem(TypedDict):
    type: str          # Stored as "question" or "guess"
    text: str          # The player's raw string input
    response: str      # E.g., "Yes.", "No.", "Correct!", "Incorrect."
    analysis: str      # LLM's raw processing reasoning

class GameSession(TypedDict):
    _id: str           # Unique string ID (UUID4)
    game_mode: str     # Stored as "SINGLEPLAYER" or "MULTIPLAYER"
    category: str      # The item's subset category
    secret_answer: str # The word being guessed
    turns_used: int    # Current question/guess count
    error_count: int   # Count of questions resulting in an error
    max_questions: int # Max allowed attempts (default 20)
    game_stage: str    # Stored as "PLAYING", "FINAL_GUESS", or "GAME_OVER"
    chat_history: List[ChatHistoryItem]
    game_result: Optional[str] # Stored as "WIN", "LOSE", or None
    created_at: str    # ISO datetime string for database TTL tracking