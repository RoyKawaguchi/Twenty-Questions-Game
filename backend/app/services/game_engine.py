import uuid
import random
import datetime
import logging
from flask import current_app

from app.database import db_wrapper
from app.models import GameStage, GameMode, GameResult, EvaluationResponse
from app.services.llm_service import evaluate_question, evaluate_guess

logger = logging.getLogger(__name__)

PLAYER_COLORS = [
    "#2563EB",  # Player 1 - Blue
    "#DC2626",  # Player 2 - Red
    "#16A34A",  # Player 3 - Green
    "#EAB308",  # Player 4 - Yellow
]

def get_db_collection():
    if db_wrapper.db is None:
        raise RuntimeError("Database connection has not been initialized yet.")
    return db_wrapper.db


def get_categories_config():
    return current_app.config.get("GAME_CATEGORIES", {})


def get_max_questions():
    return current_app.config.get("DEFAULT_MAX_QUESTIONS", 20)


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc)


# ==========================================
# SESSION CREATION
# ==========================================

def create_game_session(category, game_mode, user=None, room_code=None, players=None):
    """Builds and persists a new game_sessions document."""
    categories_dict = get_categories_config()

    if not category or category not in categories_dict:
        raise ValueError(f"Invalid category. Choose from: {list(categories_dict.keys())}")

    category_data = categories_dict[category]

    words_list = category_data["words"]
    secret_answer = random.choice(words_list)

    category_info = {
        "categoryName": category,
        "categorySingular": categories_dict[category]["category_singular"],
        "exampleQuestion": categories_dict[category]["example_question"],
        "exampleAnswer": categories_dict[category]["example_answer"],
    }
    
    # UNCOMMENT FOR TESTING
    print("secret_answer = ", secret_answer)
    max_questions = get_max_questions()
    game_id = str(uuid.uuid4())

    session_record = {
        "_id": game_id,
        "game_mode": game_mode.value if isinstance(game_mode, GameMode) else game_mode,
        "category": category,
        "category_info": category_info,
        "secret_answer": secret_answer,
        "turns_used": 0,
        "error_count": 0,
        "max_questions": max_questions,
        "game_stage": GameStage.PLAYING.value,
        "chat_history": [],
        "game_result": None,
        "created_at": now_iso(),
    }

    if (game_mode == GameMode.SINGLEPLAYER or game_mode == GameMode.SINGLEPLAYER.value) and user is not None:
        session_record.update({
            "user_id": user["user_id"],
            "username": user["username"],
            "is_guest": user["is_guest"],
        })
    else:
        players = players or []
        shuffled_players = players.copy()
        random.shuffle(shuffled_players)

        if players is None:
            print("room['players'] found to be None! VERY BAD")

        session_record.update({
            "room_code": room_code,
            "players": players,
            "current_turn_holder": shuffled_players[0]["username"] if players else None,
            "winner_username": None,
        })

    get_db_collection().game_sessions.insert_one(session_record)
    return session_record


# ==========================================
# TURN PROCESSING
# ==========================================

def process_question(game, question_text):
    """Evaluates a question against the secret answer and returns the outcome."""
    evaluation = evaluate_question(game["category"], game["secret_answer"], question_text)
    llm_response = evaluation["response"]  # This is a string from our service layer ("Yes"/"No"/"Error")
    llm_analysis = evaluation["analysis"]

    # Use direct string values for comparison to match structural models
    if llm_response in {EvaluationResponse.YES.value, EvaluationResponse.NO.value}:
        new_turns = game["turns_used"] + 1
        new_error_count = game["error_count"]
    else:
        new_turns = game["turns_used"]
        new_error_count = game["error_count"] + 1

    new_stage = GameStage.FINAL_GUESS.value if new_turns >= game["max_questions"] else GameStage.PLAYING.value
    response_text = f"{llm_response.value}."

    return {
        "response_text": response_text,
        "analysis": llm_analysis,
        "new_turns": new_turns,
        "new_error_count": new_error_count,
        "new_stage": new_stage,
        "is_correct": None,
    }

def process_guess(game, guess_text):
    """Evaluates a guess against the secret answer and returns the outcome."""
    evaluation = evaluate_guess(guess_text, game["secret_answer"])
    
    # Check directly against string value
    is_correct = (evaluation["response"] == EvaluationResponse.YES.value)
    new_turns = game["turns_used"] + 1

    if is_correct:
        new_stage = GameStage.GAME_OVER.value
        new_result = GameResult.WIN.value
        response_text = "Correct!"
    else:
        if new_turns >= game["max_questions"] or game["game_stage"] == GameStage.FINAL_GUESS.value:
            new_stage = GameStage.GAME_OVER.value
            new_result = GameResult.LOSE.value
        else:
            new_stage = GameStage.PLAYING.value
            new_result = None
        response_text = "Incorrect."

    return {
        "response_text": response_text,
        "analysis": evaluation["analysis"],
        "new_turns": new_turns,
        "new_error_count": game["error_count"],
        "new_stage": new_stage,
        "new_result": new_result,
        "is_correct": is_correct,
    }

def apply_turn_update(game_id, turn_type, text, outcome, extra_set=None, author=None):
    """Persists a processed turn (question or guess) onto the game_sessions document."""

    user_chat_entry = {
        "type": turn_type,
        "sender": author,
        "text": text,
    }

    ai_chat_entry = {
        "type": "response",
        "sender": "ai",
        "text": outcome["response_text"],
        "analysis": outcome["analysis"],
    }

    add_chat_entry(game_id, user_chat_entry)
    add_chat_entry(game_id, ai_chat_entry)

    set_fields = {
        "turns_used": outcome["new_turns"],
        "error_count": outcome["new_error_count"],
        "game_stage": outcome["new_stage"],
    }

    if turn_type == "guess" or outcome["new_stage"] == GameStage.GAME_OVER.value:
        set_fields["game_result"] = outcome.get("new_result")

    if extra_set:
        set_fields.update(extra_set)

    get_db_collection().game_sessions.update_one(
        {"_id": game_id},
        {"$set": set_fields},
    )


def add_chat_entry(game_id, chat_entry):
    """Appends a pre-built chat entry to the game's chat history."""

    get_db_collection().game_sessions.update_one(
        {"_id": game_id},
        {
            "$push": {
                "chat_history": chat_entry
            }
        }
    )

def count_user_chat_entries(game_id, username):
    """Returns the number of chat entries sent by the given user."""

    game_session = get_db_collection().game_sessions.find_one(
        {"_id": game_id},
        {"chat_history": 1}
    )

    if not game_session:
        return 0

    chat_history = game_session.get("chat_history", [])

    return sum(
        1
        for entry in chat_history
        if entry.get("sender") == username
    )



# ==========================================
# XP / HISTORY BOOKKEEPING
# ==========================================

def compute_xp(turns_used, won, num_players=1):
    winner_xp = max(21 - turns_used, 0)
    if won:
        return winner_xp
    else:
        if num_players == 1:
            return 0
        else:
            return winner_xp // num_players
    
def record_singleplayer_history(user_id, game_id, category, result, turns_used):
    xp_earned = compute_xp(turns_used, result == GameResult.WIN.value)

    history_entry = {
        "game_id": game_id,
        "category": category,
        "result": result,
        "turns_used": turns_used,
        "xp_earned": xp_earned,
        "played_at": now_iso(),
    }

    get_db_collection().users.update_one(
        {"_id": user_id},
        {
            "$inc": {"xp": xp_earned},
            "$push": {"history_singleplayer": history_entry},
        },
    )

    # Fetch the updated user document after the update
    user_doc = get_db_collection().users.find_one({"_id": user_id}) or {}

    rating, rank_tier, win_rate = calculate_singleplayer_analytics(
        user_doc.get("history_singleplayer", [])
    )

    return {
        "xpEarned": xp_earned,
        "xp": user_doc.get("xp", 0),
        "rating": rating,
        "rank": rank_tier,
        "winRate": win_rate,
    }


def record_multiplayer_history(user_id, game_id, room_code, category, result, turns_used, opponents):
    xp_earned = compute_xp(
        turns_used,
        result == GameResult.WIN.value,
        num_players=len(opponents) + 1,
    )

    history_entry = {
        "game_id": game_id,
        "room_code": room_code,
        "category": category,
        "result": result,
        "turns_used": turns_used,
        "xp_earned": xp_earned,
        "opponents": opponents,
        "played_at": now_iso(),
    }

    get_db_collection().users.update_one(
        {"_id": user_id},
        {
            "$inc": {"xp": xp_earned},
            "$push": {"history_multiplayer": history_entry},
        },
    )

    # Fetch the updated user document after the update
    user_doc = get_db_collection().users.find_one({"_id": user_id}) or {}

    turns_submitted = count_user_chat_entries(
        game_id,
        user_doc.get("username", "")
    )

    return {
        "xpEarned": xp_earned,
        "xp": user_doc.get("xp", 0),
        "turnsSubmitted": turns_submitted,
    }


def calculate_singleplayer_analytics(history):
    """
    Computes analytics across a user's singleplayer match history.

    Rating:
    - 0-100 scale
    - Based on the last 5 games (or fewer if fewer exist)
    - Fast wins earn higher scores
    - Losses score 0
    - More recent games are weighted more heavily

    Rank:
    - Fewer than 3 games: Unranked
    - Otherwise determined from Rating

    Returns:
        rating, rank_tier, win_rate
    """
    RECENT_WEIGHTS = [5, 4, 3, 2, 1]

    total_games = len(history)

    if total_games == 0:
        return 0, "-", 0

    # Lifetime win rate
    total_wins = sum(game.get("result") == "WIN" for game in history)
    win_rate = round((total_wins / total_games) * 100)

    # Most recent first
    recent_games = sorted(
        history,
        key=lambda x: x.get("played_at") or datetime.datetime.min,
        reverse=True,
    )[:5]

    if total_games < 3:
        return 0, "-", win_rate

    weighted_score = 0
    total_weight = 0

    for i, game in enumerate(recent_games):
        weight = RECENT_WEIGHTS[i]

        if game.get("result") == "WIN":
            turns = max(1, min(20, game["turns_used"]))

            # 1 turn -> 100
            # 20 turns -> 5
            game_score = 100 - ((turns - 1) / (20 - 1)) * 95
        else:
            # Any loss
            game_score = 0

        weighted_score += game_score * weight
        total_weight += weight

    rating = round(weighted_score / total_weight)

    # Small experience adjustment
    if total_games == 3:
        rating = round(rating * 0.90)
    elif total_games == 4:
        rating = round(rating * 0.95)

    rating = max(0, min(100, rating))

    # Rank thresholds
    if rating >= 95:
        rank_tier = "Master"
    elif rating >= 85:
        rank_tier = "Expert"
    elif rating >= 70:
        rank_tier = "Skilled"
    elif rating >= 55:
        rank_tier = "Apprentice"
    else:
        rank_tier = "Rookie"

    return rating, rank_tier, win_rate