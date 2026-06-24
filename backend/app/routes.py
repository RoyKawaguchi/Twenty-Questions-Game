import uuid
import random
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, current_app
from app.database import db_wrapper
from app.services.llm_service import evaluate_question, evaluate_guess
from app.models import GameStage, GameMode, GameResult, EvaluationResponse

game_bp = Blueprint("game", __name__, url_prefix="/api/game")

def get_db_collection():
    """Helper to ensure we safely access the collection only after db is initialized."""
    if db_wrapper.db is None:
        raise RuntimeError("Database connection has not been initialized yet.")
    return db_wrapper.db.game_sessions

@game_bp.route("/categories", methods=["GET"])
def get_categories():
    """
    Returns a JSON object of the categories as strings.
    """
    categories_dict = current_app.config.get("GAME_CATEGORIES", {})
    return jsonify({"categories": list(categories_dict.keys())}), 200

@game_bp.route("/start", methods=["POST"])
def start_game():
    """
    Initializes the game by selecting secret_word at random, generating game_id 
    and saving the session_record to DB.
    """
    try:
        data = request.get_json() or {}
        category = data.get("category")
        categories_dict = current_app.config.get("GAME_CATEGORIES", {})

        if not category or category not in categories_dict:
            return jsonify({"error": f"Invalid category. Choose from: {list(categories_dict.keys())}"}), 400
        
        raw_game_mode = data.get("game_mode", "SINGLEPLAYER")
        try:
            game_mode = GameMode(raw_game_mode)
        except ValueError:
            return jsonify({"error": "Invalid game_mode. Choose SINGLEPLAYER or MULTIPLAYER"}), 400

        words_list = categories_dict[category]["words"]
        secret_word = random.choice(words_list)
        
        game_id = str(uuid.uuid4())
        max_questions = current_app.config.get("DEFAULT_MAX_QUESTIONS", 20)

        session_record = {
            "_id": game_id,
            "game_mode": game_mode.value,  # Saved as string
            "category": category,
            "secret_answer": secret_word,
            "turns_used": 0,
            "error_count": 0,
            "max_questions": max_questions,
            "game_stage": GameStage.PLAYING.value,  # Saved as string
            "chat_history": [],
            "game_result": None,
            "created_at": datetime.now(timezone.utc)
        }

        get_db_collection().insert_one(session_record)

        return jsonify({
            "game_id": game_id,
            "game_mode": game_mode.value,
            "category": category,
            "max_questions": max_questions,
            "game_stage": GameStage.PLAYING.value
        }), 201

    except Exception as e:
        return jsonify({"error": "Failed to create game session due to an internal server error."}), 500

@game_bp.route("/question", methods=["POST"])
def submit_question():
    """
    Processes a question by the user. 
    """
    data = request.get_json() or {}
    game_id = data.get("game_id")
    question_text = data.get("question_text")

    if not game_id or not question_text:
        return jsonify({"error": "Missing game_id or question_text."}), 400

    game = get_db_collection().find_one({"_id": game_id})
    if not game:
        return jsonify({"error": "Game session not found."}), 404

    # DB returns plain strings, so we explicitly compare against the Enum string values
    if game["game_stage"] == GameStage.GAME_OVER.value:
        return jsonify({"error": "Game is already over."}), 400
    if game["game_stage"] == GameStage.FINAL_GUESS.value:
        return jsonify({
            "error": "You have exhausted your questions! You must make a final guess.",
            "game_stage": GameStage.FINAL_GUESS.value
        }), 400

    # Get LLM evaluation (returns an EvaluationResponse Enum object)
    evaluation = evaluate_question(game["category"], game["secret_answer"], question_text)
    llm_response = evaluation["response"]   
    llm_analysis = evaluation["analysis"]

    if llm_response in {EvaluationResponse.YES, EvaluationResponse.NO}:
        new_turns = game["turns_used"] + 1
        new_error_count = game["error_count"]
    else:
        new_turns = game["turns_used"]
        new_error_count = game["error_count"] + 1

    # Decide new stage and extract its string value
    if new_turns >= game["max_questions"]:
        new_stage = GameStage.FINAL_GUESS.value
    else:
        new_stage = GameStage.PLAYING.value

    # Capitalize and add a full stop for human display on frontend
    final_response_text = f"{llm_response.value.capitalize()}."   

    get_db_collection().update_one(
        {"_id": game_id},
        {
            "$set": {
                "turns_used": new_turns, 
                "error_count": new_error_count, 
                "game_stage": new_stage
            },
            "$push": {
                "chat_history": {
                    "type": "question",
                    "text": question_text,
                    "response": final_response_text,
                    "analysis": llm_analysis
                }
            }
        }
    )

    return jsonify({
        "game_id": game_id,
        "response": final_response_text,
        "turns_used": new_turns,
        "game_stage": new_stage
    }), 200

@game_bp.route("/guess", methods=["POST"])
def submit_guess():
    """
    Processes a guess made by the user. 
    """
    data = request.get_json() or {}
    game_id = data.get("game_id")
    guess_text = data.get("guess_text", "").strip()

    if not game_id or not guess_text:
        return jsonify({"error": "Missing game_id or guess_text."}), 400

    game = get_db_collection().find_one({"_id": game_id})
    if not game:
        return jsonify({"error": "Game session not found."}), 404

    if game["game_stage"] == GameStage.GAME_OVER.value:
        return jsonify({"error": "Game is already over."}), 400

    # Get LLM evaluation (returns an EvaluationResponse Enum object)
    evaluation = evaluate_guess(guess_text, game["secret_answer"])
    is_correct = (evaluation["response"] == EvaluationResponse.YES)

    new_turns = game["turns_used"] + 1
    
    if is_correct:
        new_game_stage = GameStage.GAME_OVER.value
        new_game_result = GameResult.WIN.value
        response_text = f"{EvaluationResponse.CORRECT.value.capitalize()}!"  # "Correct!"
    else:
        # Match against string literal representation from DB
        if new_turns >= game["max_questions"] or game["game_stage"] == GameStage.FINAL_GUESS.value:
            new_game_stage = GameStage.GAME_OVER.value
            new_game_result = GameResult.LOSE.value
            response_text = f"{EvaluationResponse.INCORRECT.value.capitalize()}."  # "Incorrect."
        else:
            new_game_stage = GameStage.PLAYING.value
            new_game_result = None
            response_text = f"{EvaluationResponse.INCORRECT.value.capitalize()}."  # "Incorrect."

    get_db_collection().update_one(
        {"_id": game_id},
        {
            "$set": {
                "turns_used": new_turns, 
                "game_stage": new_game_stage, 
                "game_result": new_game_result
            },
            "$push": {
                "chat_history": {
                    "type": "guess",
                    "text": guess_text,
                    "response": response_text,
                    "analysis": evaluation["analysis"]
                }
            }
        }
    )

    response_json = {
        "game_id": game_id,
        "game_stage": new_game_stage,
        "game_result": new_game_result,
        "response": response_text,
        "turns_used": new_turns
    }

    if new_game_stage == GameStage.GAME_OVER.value:
        response_json["secret_answer"] = game["secret_answer"]

    return jsonify(response_json), 200

@game_bp.route("/<game_id>/analysis", methods=["GET"])
def get_game_analysis(game_id):
    """
    Returns a JSON object of the chat_history, but only if the game_stage is "GAME_OVER".
    """
    game = get_db_collection().find_one({"_id": game_id})
    if not game:
        return jsonify({"error": "Game session not found"}), 404

    if game["game_stage"] != GameStage.GAME_OVER.value:
        return jsonify({"error": "Analysis is locked until the match completely concludes."}), 403

    return jsonify({"chat_history": game["chat_history"]}), 200