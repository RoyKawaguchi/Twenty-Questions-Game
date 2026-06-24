import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, current_app
from app.database import db_wrapper

game_bp = Blueprint("game", __name__, url_prefix="/api/game")

@game_bp.route("/categories", methods=["GET"])
def get_categories():
    categories_dict = current_app.config.get("GAME_CATEGORIES", {})
    return jsonify({"categories": list(categories_dict.keys())}), 200

@game_bp.route("/start", methods=["POST"])
def start_game():
    """Initializes a brand-new zero-knowledge session."""
    try:
        data = request.get_json() or {}
        category = data.get("category")
        categories_dict = current_app.config.get("GAME_CATEGORIES", {})

        if not category or category not in categories_dict:
            return jsonify({
                "error": f"Invalid category. Choose from: {list(categories_dict.keys())}"
            }), 400

        import random
        words_list = categories_dict[category]["words"]
        secret_word = random.choice(words_list)
        
        game_id = str(uuid.uuid4())
        max_questions = current_app.config.get("DEFAULT_MAX_QUESTIONS", 20)

        # Structure record matching our precise Schema Spec
        session_record = {
            "_id": game_id,
            "category": category,
            "secret_answer": secret_word,
            "turns_used": 0,
            "max_questions": max_questions,
            "game_stage": "PLAYING",
            "chat_history": [],
            "game_result": None,
            "created_at": datetime.now(timezone.utc) # Backs TTL index
        }

        db_wrapper.db.game_sessions.insert_one(session_record)

        # Zero-knowledge: secret_answer is dropped from client response
        return jsonify({
            "game_id": game_id,
            "category": category,
            "max_questions": max_questions,
            "game_stage": "PLAYING"
        }), 201

    except Exception as e:
        return jsonify({"error": "Failed to create game session due to an internal server error."}), 500

@game_bp.route("/question", methods=["POST"])
def submit_question():
    """Evaluates a gameplay question turn (Stubbed LLM)."""
    data = request.get_json() or {}
    game_id = data.get("game_id")
    question_text = data.get("question_text")

    if not game_id or not question_text:
        return jsonify({"error": "Missing game_id or question_text."}), 400

    game = db_wrapper.db.game_sessions.find_one({"_id": game_id})
    if not game:
        return jsonify({"error": "Game session not found."}), 404

    if game["game_stage"] == "GAME_OVER":
        return jsonify({"error": "Game is already over."}), 400
    if game["game_stage"] == "FINAL_GUESS":
        return jsonify({
            "error": "You have exhausted your questions! You must make a final guess.",
            "game_stage": "FINAL_GUESS"
        }), 400

    # STUBBED EVALUATION LAYER: Fake a 'Yes' response for testing
    llm_response = "Yes" 
    llm_analysis = "Stubbed response: assuming positive matching attributes."

    # Decision #2: 'Error' strings do NOT consume a turn
    turn_increment = 1 if llm_response in ["Yes", "No"] else 0
    new_turns = game["turns_used"] + turn_increment

    # Move to final guess if questions are exhausted
    new_stage = "FINAL_GUESS" if new_turns >= game["max_questions"] else "PLAYING"

    db_wrapper.db.game_sessions.update_one(
        {"_id": game_id},
        {
            "$set": {"turns_used": new_turns, "game_stage": new_stage},
            "$push": {
                "chat_history": {
                    "type": "question",
                    "text": question_text,
                    "response": llm_response,
                    "analysis": llm_analysis
                }
            }
        }
    )

    return jsonify({
        "game_id": game_id,
        "response": llm_response,
        "turns_used": new_turns,
        "game_stage": new_stage
    }), 200

@game_bp.route("/guess", methods=["POST"])
def submit_guess():
    """Evaluates a word guess attempt (Stubbed LLM)."""
    data = request.get_json() or {}
    game_id = data.get("game_id")
    guess_text = (data.get("guess_text") or "").strip().lower()

    if not game_id or not guess_text:
        return jsonify({"error": "Missing game_id or guess_text."}), 400

    game = db_wrapper.db.game_sessions.find_one({"_id": game_id})
    if not game:
        return jsonify({"error": "Game session not found."}), 404

    if game["game_stage"] == "GAME_OVER":
        return jsonify({"error": "Game is already over."}), 400

    secret_answer = game["secret_answer"].strip().lower()
    
    # STUBBED EVALUATION LAYER: Exact string matching for stub phase
    is_correct = (guess_text == secret_answer)

    # Guesses always consume a turn
    new_turns = game["turns_used"] + 1 
    
    if is_correct:
        game_stage = "GAME_OVER"
        game_result = "WIN"
        response_text = "Correct"
    else:
        # Out of turns conditions
        if new_turns >= game["max_questions"] or game["game_stage"] == "FINAL_GUESS":
            game_stage = "GAME_OVER"
            game_result = "LOSE"
            response_text = "Incorrect"
        else:
            game_stage = "PLAYING"
            game_result = None
            response_text = "Incorrect"

    update_payload = {
        "turns_used": new_turns,
        "game_stage": game_stage,
        "game_result": game_result
    }

    history_item = {
        "type": "guess",
        "text": guess_text,
        "response": response_text,
        "analysis": f"Stubbed comparison between '{guess_text}' and target secret answer."
    }

    db_wrapper.db.game_sessions.update_one(
        {"_id": game_id},
        {"$set": update_payload, "$push": {"chat_history": history_item}}
    )

    response_json = {
        "game_id": game_id,
        "game_stage": game_stage,
        "game_result": game_result,
        "response": response_text,
        "turns_used": new_turns
    }

    # Only release secret_answer if game_stage is officially over
    if game_stage == "GAME_OVER":
        response_json["secret_answer"] = game["secret_answer"]

    return jsonify(response_json), 200

@game_bp.route("/<game_id>/analysis", methods=["GET"])
def get_game_analysis(game_id):
    """Fetches AI reasoning history once match completely concludes."""
    game = db_wrapper.db.game_sessions.find_one({"_id": game_id})
    if not game:
        return jsonify({"error": "Game session not found"}), 404

    if game["game_stage"] != "GAME_OVER":
        return jsonify({"error": "Analysis is locked until the match completely concludes."}), 403

    return jsonify({"chat_history": game["chat_history"]}), 200