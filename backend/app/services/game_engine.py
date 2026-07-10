import uuid
import random
import datetime
import logging
from flask import current_app

from app.database import db_wrapper
from app.models import GameStage, GameMode, GameResult, EvaluationResponse
from app.services.llm_service import evaluate_question, evaluate_guess

logger = logging.getLogger(__name__)


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

    words_list = categories_dict[category]["words"]
    secret_answer = random.choice(words_list)
    
    # UNCOMMENT FOR TESTING
    # print("secret_answer = ", secret_answer)
    max_questions = get_max_questions()
    game_id = str(uuid.uuid4())

    session_record = {
        "_id": game_id,
        "game_mode": game_mode.value if isinstance(game_mode, GameMode) else game_mode,
        "category": category,
        "secret_answer": secret_answer,
        "turns_used": 0,
        "error_count": 0,
        "max_questions": max_questions,
        "game_stage": GameStage.PLAYING.value,
        "chat_history": [],
        "game_result": None,
        "created_at": now_iso(),
    }

    if game_mode == GameMode.SINGLEPLAYER or game_mode == GameMode.SINGLEPLAYER.value:
        session_record.update({
            "user_id": user["user_id"],
            "username": user["username"],
            "is_guest": user["is_guest"],
        })
    else:
        session_record.update({
            "room_code": room_code,
            "players": players,
            "current_turn_holder": players[0]["username"] if players else None,
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
    chat_entry = {
        "type": turn_type,
        "text": text,
        "response": outcome["response_text"],
        "analysis": outcome["analysis"],
    }
    if author:
        chat_entry["author"] = author

    set_fields = {
        "turns_used": outcome["new_turns"],
        "error_count": outcome["new_error_count"],
        "game_stage": outcome["new_stage"],
    }
    
    # Ensure game_result keys update accurately if modified
    if turn_type == "guess" or outcome["new_stage"] == GameStage.GAME_OVER.value:
        set_fields["game_result"] = outcome.get("new_result")

    if extra_set:
        set_fields.update(extra_set)

    get_db_collection().game_sessions.update_one(
        {"_id": game_id},
        {"$set": set_fields, "$push": {"chat_history": chat_entry}}
    )


# ==========================================
# XP / HISTORY BOOKKEEPING
# ==========================================

def compute_xp(turns_used, won):
    if not won:
        return 0
    xp = 21 - turns_used
    return max(xp, 0)


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
        {"$inc": {"xp": xp_earned}, "$push": {"history_singleplayer": history_entry}}
    )
    return xp_earned


def record_multiplayer_history(user_id, game_id, room_code, category, result, turns_used, opponent_username):
    xp_earned = compute_xp(turns_used, result == GameResult.WIN.value)
    history_entry = {
        "game_id": game_id,
        "room_code": room_code,
        "category": category,
        "result": result,
        "turns_used": turns_used,
        "xp_earned": xp_earned,
        "opponent_username": opponent_username,
        "played_at": now_iso(),
    }
    get_db_collection().users.update_one(
        {"_id": user_id},
        {"$inc": {"xp": xp_earned}, "$push": {"history_multiplayer": history_entry}}
    )
    return xp_earned