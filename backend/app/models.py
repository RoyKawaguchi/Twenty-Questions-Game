from typing import TypedDict, List, Optional, Dict

class ChatHistoryItem(TypedDict):
    type: str          # "question" | "guess"
    text: str          # The player's raw string
    response: str      # "Yes" | "No" | "Error" | "Correct" | "Incorrect"
    analysis: str      # LLM's raw processing reasoning

class GameSession(TypedDict):
    _id: str           # UUID string acting as unique game_id
    category: str      # The item's subset category
    secret_answer: str # Zero-knowledge protected word
    turns_used: int    # Tracks question/guess counters
    max_questions: int # Default: 20
    game_stage: str    # "PLAYING" | "FINAL_GUESS" | "GAME_OVER"
    chat_history: List[ChatHistoryItem]
    game_result: Optional[str] # None | "WIN" | "LOSE"
    created_at: str    # ISO datetime backing TTL index expiration