from typing import TypedDict, List, Optional
from enum import Enum
from datetime import datetime

# ==========================================
# 1. ENUMS (Used in Python logic & LLM Parsing)
# ==========================================

class GameStage(str, Enum):
    LOBBY = "LOBBY"             # Multiplayer only: waiting in the room pre-match
    PLAYING = "PLAYING"
    FINAL_GUESS = "FINAL_GUESS"
    GAME_OVER = "GAME_OVER"
    PAUSED = "PAUSED"           # Singleplayer only

class GameResult(str, Enum):
    WIN = "WIN"
    LOSE = "LOSE"

class GameMode(str, Enum):
    SINGLEPLAYER = "SINGLEPLAYER"
    MULTIPLAYER = "MULTIPLAYER"

class EvaluationResponse(str, Enum):
    YES = "Yes"
    NO = "No"
    ERROR = "Error"


# ==========================================
# 2. DOCUMENT SCHEMAS
# ==========================================

class ChatHistoryItem(TypedDict):
    type: str              # "question" or "guess"
    text: str              # Player's raw input
    response: str          # "Yes", "No", "Error", "Correct", "Incorrect"
    analysis: str          # LLM's raw reasoning text
    author: Optional[str]  # Multiplayer: username of the player who ran this turn

class RoomPlayer(TypedDict):
    user_id: str            
    username: str
    socket_id: str          # Volatile real-time live connection ID
    color: str
    isHost: bool
    is_guest: bool

class GameSession(TypedDict, total=False):
    _id: str                # Unique String UUID4
    game_mode: str           # "SINGLEPLAYER" or "MULTIPLAYER"
    category: str            
    secret_answer: str       
    turns_used: int          
    error_count: int         
    max_questions: int       
    game_stage: str          
    chat_history: List[ChatHistoryItem]
    game_result: Optional[str]  
    created_at: datetime     # MongoDB TTL tracking expects datetime object

    # ─── SINGLEPLAYER FIELDS ───
    user_id: str
    username: str
    is_guest: bool

    # ─── MULTIPLAYER FIELDS ───
    room_code: str
    players: List[RoomPlayer]
    current_turn_holder: str    # Username string
    winner_username: Optional[str]