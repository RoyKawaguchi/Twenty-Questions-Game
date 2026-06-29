import uuid
import random
import datetime
from flask import Blueprint, jsonify, request, current_app
import jwt
import bcrypt
from functools import wraps
from app.database import db_wrapper
from app.services.llm_service import evaluate_question, evaluate_guess
from app.models import GameStage, GameMode, GameResult, EvaluationResponse

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
game_bp = Blueprint("game", __name__, url_prefix="/api/game")

def get_db_collection():
    """Helper to ensure we safely access the collection only after db is initialized."""
    if db_wrapper.db is None:
        raise RuntimeError("Database connection has not been initialized yet.")
    return db_wrapper.db

def generate_token(user_id: str, username: str, is_guest: bool = False) -> str:
    """Mints a 24-hour self-contained JWT token for the authenticated user/guest."""
    payload = {
        "user_id": user_id,
        "username": username,
        "is_guest": is_guest,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 1. Extract token from the Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            # Header typically looks like: "Bearer eyJhbGciOi..."
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Access denied. Authentication token missing."}), 401

        try:
            # 2. Decode the token using our secret key
            payload = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            
            # 3. Pull out the identity data we stored during authentication
            current_user = {
                "user_id": payload["user_id"],
                "username": payload["username"],
                "is_guest": payload["is_guest"]
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please sign in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token. Please authenticate again."}), 401

        # Pass the extracted user context down into the route logic
        return f(current_user, *args, **kwargs)

    return decorated

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Registers a new persistent user account into MongoDB Atlas."""
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not email or not username or not password:
        return jsonify({"error": "Missing required fields: email, username, and password"}), 400

    users_db = get_db_collection().users

    existing_user = users_db.find_one({"$or": [{"email": email}, {"username": username}]})
    if existing_user:
        return jsonify({"error": "A user with this email or username already exists"}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    user_doc = {
        "_id": str(uuid.uuid4()),
        "email": email,
        "username": username,
        "password_hash": hashed_password,
        "created_at": datetime.datetime.now(datetime.timezone.utc)
    }

    users_db.insert_one(user_doc)

    token = generate_token(user_doc["_id"], username, is_guest=False)
    return jsonify({
        "token": token,
        "username": username,
        "is_guest": False
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticates an existing user profile against stored hashes."""
    data = request.get_json() or {}
    identity = data.get('identity', '').strip()  # Either username or email
    password = data.get('password', '')

    if not identity or not password:
        return jsonify({"error": "Missing identity or password fields"}), 400

    users_db = get_db_collection().users

    # Find user profile by email or username match
    user_doc = users_db.find_one({"$or": [{"email": identity}, {"username": identity}]})
    if not user_doc:
        return jsonify({"error": "Invalid username, email, or password"}), 401

    # Verify password against securely stored bcrypt hash
    if not bcrypt.checkpw(password.encode('utf-8'), user_doc['password_hash'].encode('utf-8')):
        return jsonify({"error": "Invalid username, email, or password"}), 401

    token = generate_token(user_doc["_id"], user_doc["username"], is_guest=False)
    return jsonify({
        "token": token,
        "username": user_doc["username"],
        "is_guest": False
    }), 200


@auth_bp.route('/guest', methods=['POST'])
def guest_login():
    """Creates a zero-commitment guest session with an optionally customized gaming tag."""
    import secrets
    data = request.get_json() or {}
    chosen_name = data.get('nickname', '').strip()

    if not chosen_name:
        chosen_name = "Guest"

    # Generate a clean, 5-character distinct hex suffix tag (e.g. 'roy-d3f1a')
    suffix = secrets.token_hex(3)[:5]
    unique_guest_name = f"{chosen_name}-{suffix}"
    
    guest_id = str(uuid.uuid4())
    token = generate_token(guest_id, unique_guest_name, is_guest=True)

    return jsonify({
        "token": token,
        "username": unique_guest_name,
        "is_guest": True
    }), 200

@game_bp.route("/categories", methods=["GET"])
def get_categories():
    """
    Returns a JSON object of the categories as strings.
    """
    categories_dict = current_app.config.get("GAME_CATEGORIES", {})
    return jsonify({"categories": list(categories_dict.keys())}), 200

@game_bp.route("/start", methods=["POST"])
@token_required
def start_game(current_user):
    """
    Initializes the game by selecting secret_word at random, generating game_id 
    and saving the session_record to DB linked to the current authenticated user.
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
            "user_id": current_user["user_id"],
            "username": current_user["username"],
            "is_guest": current_user["is_guest"],

            "game_mode": game_mode.value,  # Saved as string
            "category": category,
            "secret_answer": secret_word,
            "turns_used": 0,
            "error_count": 0,
            "max_questions": max_questions,
            "game_stage": GameStage.PLAYING.value,  # Saved as string
            "chat_history": [],
            "game_result": None,
            "created_at": datetime.datetime.now(datetime.timezone.utc)
        }

        get_db_collection().game_sessions.insert_one(session_record)

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
@token_required
def submit_question(current_user):
    """
    Processes a question by the user, verifying session ownership via JWT. 
    """
    try:
        data = request.get_json() or {}
        game_id = data.get("game_id")
        question_text = data.get("question_text")

        if not game_id or not question_text:
            return jsonify({"error": "Missing game_id or question_text."}), 400

        game = get_db_collection().game_sessions.find_one({"_id": game_id})
        if not game:
            return jsonify({"error": "Game session not found."}), 404

        # ─── SECURITY CHECK: VERIFY SESSION OWNER ───
        if game["user_id"] != current_user["user_id"]:
            return jsonify({"error": "Unauthorized. You do not own this game session."}), 403

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

        get_db_collection().game_sessions.update_one(
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

    except Exception as e:
        return jsonify({"error": "Internal server error processing question."}), 500

@game_bp.route("/guess", methods=["POST"])
@token_required
def submit_guess(current_user):
    """
    Processes a guess made by the user, verifying session ownership via JWT. 
    """
    try:
        data = request.get_json() or {}
        game_id = data.get("game_id")
        guess_text = data.get("guess_text", "").strip()

        if not game_id or not guess_text:
            return jsonify({"error": "Missing game_id or guess_text."}), 400

        game = get_db_collection().game_sessions.find_one({"_id": game_id})
        if not game:
            return jsonify({"error": "Game session not found."}), 404

        # ─── SECURITY CHECK: VERIFY SESSION OWNER ───
        if game["user_id"] != current_user["user_id"]:
            return jsonify({"error": "Unauthorized. You do not own this game session."}), 403

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

        get_db_collection().game_sessions.update_one(
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

    except Exception as e:
        return jsonify({"error": "Internal server error processing guess."}), 500

@game_bp.route("/<game_id>/analysis", methods=["GET"])
@token_required
def get_game_analysis(current_user, game_id):
    """
    Returns a JSON object of the chat_history if the game is over and the user matches the session.
    """
    try:
        game = get_db_collection().game_sessions.find_one({"_id": game_id})
        if not game:
            return jsonify({"error": "Game session not found"}), 404

        # ─── SECURITY CHECK: VERIFY SESSION OWNER ───
        if game["user_id"] != current_user["user_id"]:
            return jsonify({"error": "Unauthorized. You do not have permission to view this analysis."}), 403

        if game["game_stage"] != GameStage.GAME_OVER.value:
            return jsonify({"error": "Analysis is locked until the match completely concludes."}), 403

        return jsonify({"chat_history": game["chat_history"]}), 200

    except Exception as e:
        return jsonify({"error": "Internal server error retrieving metrics."}), 500