import uuid
import datetime
from flask import Blueprint, jsonify, request, current_app
import jwt
import bcrypt
from functools import wraps
from app.database import db_wrapper
from app.models import GameStage, GameMode

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

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"error": "Access denied. Authentication token missing."}), 401

        try:
            payload = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            current_user = {
                "user_id": payload["user_id"],
                "username": payload["username"],
                "is_guest": payload["is_guest"]
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please sign in again."}), 401
        except (jwt.InvalidTokenError, jwt.PyJWTError):
            return jsonify({"error": "Invalid token. Please authenticate again."}), 401

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
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "history_singleplayer": [],
        "history_multiplayer": [],
        "xp": 0
    }

    users_db.insert_one(user_doc)

    token = generate_token(user_doc["_id"], username, is_guest=False)
    return jsonify({
        "token": token,
        "username": username,
        "is_guest": False,
        "email": email
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticates an existing user profile against stored hashes."""
    data = request.get_json() or {}
    identity = data.get('identity', '').strip()  
    password = data.get('password', '')

    if not identity or not password:
        return jsonify({"error": "Missing identity or password fields"}), 400

    users_db = get_db_collection().users

    user_doc = users_db.find_one({"$or": [{"email": identity}, {"username": identity}]})
    if not user_doc:
        return jsonify({"error": "Invalid username, email, or password"}), 401

    if not bcrypt.checkpw(password.encode('utf-8'), user_doc['password_hash'].encode('utf-8')):
        return jsonify({"error": "Invalid username, email, or password"}), 401

    token = generate_token(user_doc["_id"], user_doc["username"], is_guest=False)
    return jsonify({
        "token": token,
        "username": user_doc["username"],
        "is_guest": False,
        "email": user_doc.get("email", "")
    }), 200


@auth_bp.route('/guest', methods=['POST'])
def guest_login():
    """Creates a zero-commitment guest session with an optionally customized gaming tag."""
    import secrets
    data = request.get_json() or {}
    chosen_name = data.get('nickname', '').strip()

    if not chosen_name:
        chosen_name = "Guest"

    suffix = secrets.token_hex(3)[:5]
    unique_guest_name = f"{chosen_name}-{suffix}"

    guest_id = str(uuid.uuid4())
    token = generate_token(guest_id, unique_guest_name, is_guest=True)

    return jsonify({
        "token": token,
        "username": unique_guest_name,
        "is_guest": True,
        "email": ""
    }), 200

@auth_bp.route("/user_info", methods=["GET"])
@token_required
def get_user_info(current_user):
    """Returns a comprehensive profile payload including profile analytics."""
    try:
        user_id = current_user["user_id"]
        is_guest = current_user["is_guest"]

        if is_guest:
            return jsonify({
                "username": current_user["username"],
                "xp": 0,
                "is_guest": True,
                "rank": "-",
                "avg_turns_to_win": 0.0,
                "win_rate": 0,
                "history_singleplayer": [],
                "history_multiplayer": [],
                "active_game": None
            }), 200

        user_doc = get_db_collection().users.find_one({"_id": user_id})
        if not user_doc:
            return jsonify({"error": "User account record not found."}), 404

        history = user_doc.get("history_singleplayer", [])
        
        # ✨ MODULARIZED: Swapped out legacy manual calculations for our helper
        avg_turns, rank_tier, win_rate = calculate_singleplayer_analytics(history)

        # Separate mapping tracking to preserve mutation isolation rules
        processed_singleplayer = []
        for entry in sorted(history, key=lambda x: x.get("played_at") or datetime.datetime.min, reverse=True):
            item = dict(entry)  
            if isinstance(item.get("played_at"), datetime.datetime):
                item["played_at"] = item["played_at"].isoformat()
            processed_singleplayer.append(item)

        processed_multiplayer = []
        multi_history = user_doc.get("history_multiplayer", [])
        for entry in sorted(multi_history, key=lambda x: x.get("played_at") or datetime.datetime.min, reverse=True):
            item = dict(entry)
            if isinstance(item.get("played_at"), datetime.datetime):
                item["played_at"] = item["played_at"].isoformat()
            processed_multiplayer.append(item)

        # Active game lookup pipeline
        active_match = get_db_collection().game_sessions.find_one({
            "user_id": user_id,
            "game_mode": GameMode.SINGLEPLAYER.value,
            "game_stage": GameStage.PAUSED.value
        })

        active_game_payload = None
        if active_match:
            active_game_payload = {
                "game_id": active_match["_id"],
                "category": active_match["category"],
                "turns_used": active_match["turns_used"],
                "max_questions": active_match["max_questions"],
                "chat_history": active_match["chat_history"]
            }

        return jsonify({
            "username": user_doc["username"],
            "xp": user_doc.get("xp", 0),
            "is_guest": False,
            "rank": rank_tier,
            "avg_turns_to_win": avg_turns,
            "win_rate": win_rate,
            "history_singleplayer": processed_singleplayer,
            "history_multiplayer": processed_multiplayer,
            "active_game": active_game_payload
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error fetching user metadata: {str(e)}")
        return jsonify({"error": "Internal server error fetching user information."}), 500

@auth_bp.route("/leaderboard", methods=["GET"])
@token_required
def get_leaderboard(current_user):
    """Returns a simple global leaderboard based on recent average turns used to win."""
    try:
        # Fetch all registered users from the database
        users_cursor = get_db_collection().users.find({})
        leaderboard_entries = []

        for user_doc in users_cursor:
            history = user_doc.get("history_singleplayer", [])
            avg_turns, rank_tier, _ = calculate_singleplayer_analytics(history)
            xp = user_doc.get("xp")

            # Only include competitive players who have unlocked a valid rank tier (min 5 games)
            if rank_tier != "-":
                leaderboard_entries.append({
                    "username": user_doc["username"],
                    "avg_turns": avg_turns,
                    "rank": rank_tier,
                    "xp": xp,
                })

        # Sort ascending: players with LOWER average turns are higher on the leaderboard
        leaderboard_entries.sort(key=lambda x: x["avg_turns"])

        # Inject numerical leaderboard placement positions dynamically (1st, 2nd, 3rd...)
        for index, entry in enumerate(leaderboard_entries):
            entry["position"] = index + 1

        return jsonify({"leaderboard": leaderboard_entries}), 200

    except Exception as e:
        current_app.logger.error(f"Error compiling global leaderboard metrics: {str(e)}")
        return jsonify({"error": "Internal server error processing leaderboard records."}), 500

def calculate_singleplayer_analytics(history):
    """
    Computes analytics across a user's singleplayer match history.
    Unifies scoring rules between the profile view and the global leaderboard.
    """
    total_games = len(history)
    wins = [game for game in history if game.get("result") == "WIN"]
    total_wins = len(wins)

    # Calculate global win rate
    win_rate = int((total_wins / total_games) * 100) if total_games > 0 else 0

    # Sort wins descending by timestamp to target recent achievements
    sorted_wins = sorted(wins, key=lambda x: x.get("played_at") or datetime.datetime.min, reverse=True)
    recent_wins = sorted_wins[:5]  # Evaluates the past 5 single player wins

    if recent_wins:
        avg_turns = round(sum(game["turns_used"] for game in recent_wins) / len(recent_wins), 1)
    else:
        avg_turns = 0.0

    # Evaluate dynamic rank thresholds
    if not recent_wins or total_games < 5:
        rank_tier = "-"
    elif avg_turns <= 7.0:
        rank_tier = "S"
    elif avg_turns <= 11.0:
        rank_tier = "A"
    elif avg_turns <= 15.0:
        rank_tier = "B"
    else:
        rank_tier = "C"

    return avg_turns, rank_tier, win_rate

@game_bp.route("/categories", methods=["GET"])
@token_required
def get_categories(current_user):
    categories_dict = current_app.config.get("GAME_CATEGORIES", {})
    return jsonify({"categories": list(categories_dict.keys())}), 200