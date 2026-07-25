import random
import logging

import jwt
from flask import request, current_app
from flask_socketio import emit, join_room as sio_join_room, leave_room as sio_leave_room

from app.models import GameStage, GameMode, GameResult
from app.services import game_engine
from app.services.room_manager import room_manager

logger = logging.getLogger(__name__)

def _current_user():
    """Returns the authenticated identity bound to this socket, or None."""
    return room_manager.get_user(request.sid)


def _require_auth():
    """Emits socket_error and returns None if unauthenticated."""
    user = _current_user()
    if not user:
        emit('socket_error', {"message": "Not authenticated. Please reconnect."})
        return None
    return user


def _get_auth_user():
    """For ack-style handlers: returns the user or None."""
    return _current_user()


def register_socket_events(socketio):

    # ==========================================
    # HELPER FUNCTIONS & DEPARTURE LOGIC
    # ==========================================

    PLAYER_COLORS = [
        'CORAL', 'AMBER', 'EMERALD', 'AZURE', 'VIOLET', 'MAGENTA'
    ]

    def broadcast_room_update(room_code):
        """Helper to centralize room state emissions."""
        room = room_manager.get_room(room_code)
        if room:
            players_payload = [
                {**p, "isHost": (p["username"] == room.get("host_username"))}
                for p in room["players"]
            ]
            emit("room_state_updated", {
                "roomCode": room_code,
                "players": players_payload,
                "hostUsername": room.get("host_username") or None,
                "selectedCategory": room.get("selected_category")
            }, to=room_code)

    def _handle_player_departure(room_code, room, leaving_player):
        """Shared logic for when a player disconnects or explicitly leaves a room."""
        if leaving_player in room["players"]:
            room["players"].remove(leaving_player)

        # Reassign host if necessary
        if room.get("host_username") == leaving_player["username"]:
            room["host_username"] = (
                room["players"][0]["username"] if room["players"] else None
            )

        # Delete empty room
        if not room["players"]:
            room_manager.delete_room(room_code)
            logger.info(f"🗑️ Room {room_code} deleted (empty).")
            return

        # Fetch active game document from DB
        game = (
            game_engine.get_db_collection().game_sessions.find_one({"_id": room["game_id"]})
            if room.get("game_id")
            else None
        )

        if game is None:
            return

        active_match = game and game.get("game_stage") != GameStage.GAME_OVER.value

        if active_match:
            # Only 1 player remaining -> Win by default/forfeit
            if len(room["players"]) == 1:
                winner = room["players"][0]
                game_engine.get_db_collection().game_sessions.update_one(
                    {"_id": room["game_id"]},
                    {"$set": {
                        "game_stage": GameStage.GAME_OVER.value,
                        "game_result": GameResult.WIN.value,
                        "winner_username": winner["username"],
                        "current_turn_holder": None,
                    }}
                )

                refreshed_game = game_engine.get_db_collection().game_sessions.find_one(
                    {"_id": room["game_id"]}
                )

                stats = _finalize_multiplayer_match(
                    room_code,
                    room,
                    refreshed_game,
                    winner["username"],
                )

                # Emit game over state to active match screen
                emit('ai_response_broadcast_received', {
                    "turnsUsed": refreshed_game.get("turns_used", 0),
                    "currentTurnHolder": None,
                    "gameStage": GameStage.GAME_OVER.value,
                    "messageText": f"{leaving_player['username']} left the match.",
                    "analysis": None,
                    "victory": False,
                    "winnerUsername": "",
                    "secretAnswer": "",
                    "forfeit": True,
                    "stats": stats,
                }, to=room_code)

                room_manager.reset_to_lobby(room_code)
                broadcast_room_update(room_code)

            else:
                # 2+ players remaining -> Pass turn to next player if leaving player held turn
                current_turn_holder = game.get("current_turn_holder")

                if current_turn_holder == leaving_player["username"]:
                    new_turn_holder = room["players"][0]["username"]
                    game_engine.get_db_collection().game_sessions.update_one(
                        {"_id": room["game_id"]},
                        {"$set": {"current_turn_holder": new_turn_holder}}
                    )
                    current_turn_holder = new_turn_holder

                broadcast_room_update(room_code)
                emit(
                    "player_disconnected",
                    {
                        "username": leaving_player["username"],
                        "currentTurnHolder": current_turn_holder,
                    },
                    to=room_code,
                )
        else:
            broadcast_room_update(room_code)

    # ==========================================
    # CONNECTION LIFECYCLE
    # ==========================================

    @socketio.on('connect')
    def handle_connect(auth):
        """Authenticates the socket using JWTs issued by /api/auth/*."""
        token = None
        if isinstance(auth, dict):
            token = auth.get('token')

        if not token:
            logger.warning("🔌 Rejected socket connection: missing auth token.")
            return False

        try:
            payload = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        except jwt.PyJWTError:
            logger.warning("🔌 Rejected socket connection: invalid/expired token.")
            return False

        room_manager.register_user(request.sid, {
            "user_id": payload["user_id"],
            "username": payload["username"],
            "is_guest": payload["is_guest"],
        })
        logger.info(f"📡 Authenticated socket connected: {payload['username']} ({request.sid})")

    @socketio.on("disconnect")
    def handle_disconnect():
        room_code, room, leaving_player = room_manager.get_room_by_sid(request.sid)

        if not room or not leaving_player:
            room_manager.drop_user(request.sid)
            return

        logger.info(f"🔌 {leaving_player['username']} disconnected.")
        _handle_player_departure(room_code, room, leaving_player)
        room_manager.drop_user(request.sid)

    # ==========================================
    # SINGLEPLAYER GAME EVENTS
    # ==========================================

    @socketio.on('sp_start_game')
    def handle_sp_start_game(data):
        user = _get_auth_user()
        if not user:
            return {"error": "Not authenticated. Please reconnect."}

        category = (data or {}).get('category')

        if not user["is_guest"]:
            existing_paused = game_engine.get_db_collection().game_sessions.find_one({
                "user_id": user["user_id"],
                "game_mode": GameMode.SINGLEPLAYER.value,
                "game_stage": {
                    "$in": [GameStage.PLAYING.value]
                }
            })

            if existing_paused:
                return {"error": "You have an unfinished game in progress. You must resume or forfeit it first."}

        try:
            game = game_engine.create_game_session(category, GameMode.SINGLEPLAYER, user=user)
        except ValueError as e:
            return {"error": str(e)}

        instruction = {
            "type": "instruction",
            "sender": "system",
            "text": f"I'm thinking of {game['category_info']['categorySingular']}. Ask the AI yes/no questions to figure it out!"
        }

        game_engine.add_chat_entry(game["_id"], instruction)

        return {
            "gameId": game["_id"],
            "categoryInfo": game["category_info"],
            "maxQuestions": game["max_questions"],
            "gameStage": game["game_stage"],
            "instruction": instruction,
        }

    def _get_owned_sp_game(user, game_id):
        game = game_engine.get_db_collection().game_sessions.find_one({"_id": game_id})
        if not game:
            return None, {"error": "Game session not found."}
        if game["game_mode"] != GameMode.SINGLEPLAYER.value or game["user_id"] != user["user_id"]:
            return None, {"error": "Unauthorized. You do not own this game session."}
        return game, None

    @socketio.on('sp_submit_turn')
    def handle_sp_submit_turn(data):
        user = _get_auth_user()
        if not user:
            return {"error": "Not authenticated. Please reconnect."}

        data = data or {}
        game_id = data.get('game_id')
        turn_type = data.get('type')
        text = (data.get('text') or '').strip()

        if not game_id or not text or turn_type not in ("QUESTION", "GUESS"):
            return {"error": "Missing or invalid game_id/type/text."}

        game, err = _get_owned_sp_game(user, game_id)
        if err:
            return err
        if not game:
            return None, {"error": "Game session not found."}

        current_stage = game["game_stage"]

        if current_stage == GameStage.GAME_OVER.value:
            return {"error": "Game is already over."}

        if turn_type == "QUESTION":
            if current_stage == GameStage.FINAL_GUESS.value:
                return {"error": "You have exhausted your questions! You must make a final guess."}

            outcome = game_engine.process_question(game, text)
            game_engine.apply_turn_update(game_id, "question", text, outcome, author=user["username"])
            ai_response = {
                "type": "response",
                "sender": "ai",
                "text": outcome["response_text"]
            }

            instruction = None
            
            if outcome["new_stage"] == GameStage.FINAL_GUESS.value:
                instruction = {
                    "type": "instruction",
                    "sender": "system",
                    "text": "That's all for the Q&A's! Please enter your final guess now!"
                }
                game_engine.add_chat_entry(game_id, instruction)

            return {
                "gameId": game_id,
                "type": "QUESTION",
                "instruction": instruction or None,
                "response": ai_response,
                "turnsUsed": outcome["new_turns"],
                "gameStage": outcome["new_stage"],
            }

        outcome = game_engine.process_guess(game, text)
        game_engine.apply_turn_update(game_id, "guess", text, outcome, author=user["username"])

        ai_response = {
            "type": "response",
            "sender": "ai",
            "text": outcome["response_text"]
        }

        response_payload = {
            "gameId": game_id,
            "type": "GUESS",
            "response": ai_response,
            "turnsUsed": outcome["new_turns"],
            "gameStage": outcome["new_stage"],
            "gameResult": outcome["new_result"],
        }

        if outcome["new_stage"] == GameStage.GAME_OVER.value:
            response_payload["secretAnswer"] = game["secret_answer"]
            if not user["is_guest"]:
                stats = game_engine.record_singleplayer_history(
                    user["user_id"], game_id, game["category"],
                    outcome["new_result"], outcome["new_turns"]
                )
                response_payload["stats"] = stats

        return response_payload

    @socketio.on('sp_pause_game')
    def handle_sp_pause_game(data):
        user = _get_auth_user()
        if not user:
            return {"error": "Not authenticated. Please reconnect."}
        game_id = (data or {}).get('game_id')
        game, err = _get_owned_sp_game(user, game_id)
        if err:
            return err
        if not game:
            return None, {"error": "Game session not found."}

        if game["game_stage"] == GameStage.GAME_OVER.value:
            return {"error": "Cannot pause a game that is already over."}

        game_engine.get_db_collection().game_sessions.update_one(
            {"_id": game_id}, {"$set": {"game_stage": GameStage.PLAYING.value}}
        )
        return {"gameStage": GameStage.PLAYING.value}

    @socketio.on('sp_resume_game')
    def handle_sp_resume_game(data):
        user = _get_auth_user()
        if not user:
            return {"error": "Not authenticated. Please reconnect."}
        game_id = (data or {}).get('game_id')
        game, err = _get_owned_sp_game(user, game_id)
        if err:
            return err
        if not game:
            return None, {"error": "Game session not found."}

        game_engine.get_db_collection().game_sessions.update_one(
            {"_id": game_id}, {"$set": {"game_stage": GameStage.PLAYING.value}}
        )        
        
        chat_history = []
        for message in game["chat_history"]:
            msg = dict(message)
            msg.pop("analysis", None)
            chat_history.append(msg)
        
        instruction = {
            "type": "instruction",
            "sender": "system",
            "text": "Game re-opened. Welcome back!",
        }

        game_engine.add_chat_entry(game_id, instruction)
        chat_history.append(instruction)

        return {
            "gameId": game_id,
            "categoryInfo": game["category_info"],
            "turnsUsed": game["turns_used"],
            "maxQuestions": game["max_questions"],
            "gameStage": GameStage.PLAYING.value,
            "chatHistory": chat_history,
        }

    @socketio.on('sp_quit_game')
    def handle_sp_quit_game(data):
        user = _get_auth_user()
        if not user:
            return {"error": "Not authenticated. Please reconnect."}
        game_id = (data or {}).get('game_id')
        game, err = _get_owned_sp_game(user, game_id)
        if err:
            return err
        if not game:
            return None, {"error": "Game session not found."}

        if game["game_stage"] == GameStage.GAME_OVER.value:
            return {"error": "Game is already over."}

        game_engine.get_db_collection().game_sessions.update_one(
            {"_id": game_id},
            {"$set": {"game_stage": GameStage.GAME_OVER.value, "game_result": GameResult.LOSE.value}}
        )

        stats = None
        if not user["is_guest"]:
            stats = game_engine.record_singleplayer_history(
                user["user_id"], game_id, game["category"], GameResult.LOSE.value, game["turns_used"]
            )
        
        instruction = {
            "type": "instruction",
            "sender": "system",
            "text": "Forfeiting game..."
        }
        game_engine.add_chat_entry(game_id, instruction)

        return {
            "gameResult": "LOSE",
            "gameStage": GameStage.GAME_OVER.value,
            "secretAnswer": game["secret_answer"],
            "xp": 0,
            "instruction": instruction,
            "stats": stats,
        }

    @socketio.on("sp_get_analysis")
    def handle_sp_get_analysis(data):
        user = _get_auth_user()
        if not user:
            return {"error": "Not authenticated. Please reconnect."}

        game_id = (data or {}).get("game_id")
        game, err = _get_owned_sp_game(user, game_id)
        if err:
            return err
        if not game:
            return {"error": "Game session not found."}

        if game["game_stage"] != GameStage.GAME_OVER.value:
            return {"error": "Analysis is locked until the match completely concludes."}

        chat_history = []
        for message in game["chat_history"]:
            chat_history.append({
                "type": message.get("type"),
                "sender": message.get("sender"),
                "text": message.get("text"),
                "analysis": message.get("analysis"),
            })

        return {
            "gameId": game_id,
            "chatHistory": chat_history,
        }

    # ==========================================
    # MULTIPLAYER LOBBY + MATCH EVENTS
    # ==========================================

    @socketio.on('create_room')
    def handle_create_room(data):
        user = _require_auth()
        if not user:
            return

        host_player = {
            "user_id": user["user_id"],
            "username": user["username"],
            "socket_id": request.sid,
            "is_guest": user["is_guest"],
            "isHost": True,
            "color": PLAYER_COLORS[0],
        }

        room_code = room_manager.create_room(host_player)
        sio_join_room(room_code)

        room = room_manager.get_room(room_code)
        if room is None:
            return

        room["host_username"] = user["username"]
        broadcast_room_update(room_code)

    @socketio.on('update_room_settings')
    def handle_update_room_settings(data):
        user = _require_auth()
        if not user:
            return
        data = data or {}
        room_code = data.get('roomCode')
        category = data.get('category')

        room = room_manager.get_room(room_code)
        if room:
            if room.get("host_username") != user["username"]:
                emit('socket_error', {"message": "Unauthorized: Only the host can change settings."})
                return
                
            room["selected_category"] = category
            broadcast_room_update(room_code)

    @socketio.on('change_player_color')
    def handle_change_player_color(data):
        user = _require_auth()
        if not user:
            return
        data = data or {}
        room_code = data.get('roomCode')
        requested_color = data.get('colorId')

        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Room does not exist."})
            return

        player = next((p for p in room["players"] if p["username"] == user["username"]), None)
        if player is None:
            emit('socket_error', {"message": "Player does not exist in room."})
            return
        
        if requested_color not in PLAYER_COLORS:
            emit('socket_error', {"message": f"The requested color {requested_color} is not valid."})
        
        taken_colors = {p["color"] for p in room["players"] if p["user_id"] != user["user_id"]}

        if requested_color in taken_colors:
            emit('socket_error', {"message": f"The color {requested_color} is already taken."})
            return
        player["color"] = requested_color

        broadcast_room_update(room_code)

    @socketio.on('launch_match')
    def handle_launch_match(data):
        user = _require_auth()
        if not user:
            return

        data = data or {}
        room_code = data.get('roomCode')
        
        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Room context no longer exists."})
            return

        category = data.get('category')
        if not category:
            emit('socket_error', {"message": "Please select a category before launching."})
            return

        if room.get("host_username") != user["username"]:
            emit('socket_error', {"message": "Unauthorized: Only the host can launch the game."})
            return

        if len(room["players"]) < 2:
            emit('socket_error', {"message": "Cannot launch with less than 2 players."})
            return

        try:
            game = game_engine.create_game_session(
                category, GameMode.MULTIPLAYER, user=None,
                room_code=room_code, players=room["players"]
            )

            room["game_id"] = game["_id"]

            instruction = {
                "type": "instruction",
                "sender": "system",
                "text": f"I'm thinking of {game['category_info']['categorySingular']}. Ask the AI yes/no questions to figure it out! @{game['current_turn_holder']} goes first!"
            }

            game_engine.add_chat_entry(game["_id"], instruction)

            emit('match_launched', {
                "gameId": game["_id"],
                "roomCode": room_code,
                "categoryInfo": game["category_info"],
                "maxQuestions": game["max_questions"],
                "players": game["players"],
                "currentTurnHolder": game["current_turn_holder"],
                "instruction": instruction,
            }, to=room_code)

            logger.info(f"🚀 Multiplayer Match launched for Room {room_code}. First turn: {game['current_turn_holder']}")

        except Exception as e:
            logger.error(f"Failed to launch multiplayer match pipeline: {e}")
            emit('socket_error', {"message": f"Backend failure spinning up match: {str(e)}"})

    @socketio.on('join_room')
    def handle_join_room(data):
        user = _require_auth()
        if not user:
            return

        room_code = (data or {}).get('roomCode', '').strip().upper()

        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Requested room code does not exist."})
            return

        existing_player = next((p for p in room["players"] if p["user_id"] == user["user_id"]), None)
        if existing_player:
            existing_player["socket_id"] = request.sid
            sio_join_room(room_code)
            broadcast_room_update(room_code)
            return

        if len(room["players"]) >= 4:
            emit('socket_error', {"message": "Room capacity limit reached. Max 4 players."})
            return

        taken_colors = {player["color"] for player in room["players"]}
        color = next((c for c in PLAYER_COLORS if c not in taken_colors), None)
        if color is None:
            emit("socket_error", {"message": "No player colors available."})
            return
        

        room["players"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "socket_id": request.sid,
            "is_guest": user["is_guest"],
            "isHost": user["username"] == room["host_username"],
            "color": color,
        })

        sio_join_room(room_code)
        broadcast_room_update(room_code)
        logger.info(f"👥 Player {user['username']} successfully connected to Room {room_code}")

    @socketio.on('leave_mp_room')
    def handle_leave_mp_room(data):
        user = _require_auth()
        if not user:
            return

        room_code = (data or {}).get('roomCode')
        room = room_manager.get_room(room_code)
        if not room:
            return

        leaving_player = next((p for p in room["players"] if p["user_id"] == user["user_id"]), None)
        if not leaving_player:
            return

        sio_leave_room(room_code)
        _handle_player_departure(room_code, room, leaving_player)
        logger.info(f"🚪 Player {leaving_player['username']} left room {room_code}.")

    @socketio.on('cancel_mp_game')
    def handle_cancel_mp_game(data):
        user = _require_auth()
        if not user:
            return

        room_code = (data or {}).get('roomCode')
        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Room no longer exists."})
            return

        if room.get("host_username") != user["username"]:
            emit('socket_error', {"message": "Unauthorized: Only the host can cancel the game."})
            return

        if room.get("game_id"):
            game_engine.get_db_collection().game_sessions.update_one(
                {"_id": room["game_id"]},
                {"$set": {
                    "game_stage": GameStage.GAME_OVER.value,
                    "forfeit": True
                }}
            )

        emit('game_cancelled', {
            "roomCode": room_code,
            "message": "The host has cancelled the game."
        }, to=room_code)

        logger.info(f"🛑 Game in Room {room_code} cancelled by host {user['username']}.")

    @socketio.on('return_to_lobby')
    def handle_return_to_lobby(data):
        user = _require_auth()
        if not user:
            return

        room_code = (data or {}).get('roomCode')
        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Room no longer exists."})
            return

        requester = next((p for p in room["players"] if p["socket_id"] == request.sid), None)
        if not requester:
            return

        room_manager.reset_to_lobby(room_code)

        emit('returned_to_lobby', {
            "roomCode": room_code,
            "players": room["players"],
            "hostUsername": room.get("host_username")
        }, to=room_code)
        
        logger.info(f"🔁 Room {room_code} reset to lobby by {requester['username']} for a rematch.")

    def _finalize_multiplayer_match(room_code, room, game, winner_username):
        game_engine.get_db_collection().game_sessions.update_one(
            {"_id": game["_id"]},
            {"$set": {"winner_username": winner_username}}
        )

        stats = {}
        for player in room["players"]:
            opponents = [
                p["username"]
                for p in room["players"]
                if p["username"] != player["username"]
            ]

            result = (
                GameResult.WIN.value
                if player["username"] == winner_username
                else GameResult.LOSE.value
            )

            player_stats = game_engine.record_multiplayer_history(
                player["user_id"],
                player["username"],
                game["_id"],
                room_code,
                game["category"],
                result,
                game["turns_used"],
                opponents,
                player["is_guest"]
            )

            print(f"stats for {player["username"]}: {player_stats["questionsSubmitted"]} questions, {player_stats["guessesSubmitted"]} guesses")

            stats[player["username"]] = player_stats

        return stats

    
    @socketio.on('submit_multiplayer_turn')
    def handle_submit_multiplayer_turn(data):
        user = _require_auth()
        if not user:
            return

        data = data or {}
        room_code = data.get('roomCode')
        turn_type = data.get('type')
        text = (data.get('text') or '').strip()

        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Room no longer exists or has been closed."})
            return
            
        if room.get("is_processing"):
            return

        if not text or turn_type not in ("QUESTION", "GUESS"):
            emit('socket_error', {"message": "Missing or invalid type/text."})
            return

        game = game_engine.get_db_collection().game_sessions.find_one({"_id": room.get("game_id")})
        if not game:
            emit('socket_error', {"message": "Match record not found."})
            return

        if game["game_stage"] == GameStage.GAME_OVER.value:
            emit('socket_error', {"message": "Match is already over."})
            return

        sender = next((p for p in room["players"] if p["socket_id"] == request.sid), None)
        if not sender or sender["username"] != game.get("current_turn_holder"):
            emit('socket_error', {"message": "Out of turn action request ignored."})
            return

        if turn_type == "QUESTION" and game["game_stage"] == GameStage.FINAL_GUESS.value:
            emit('socket_error', {"message": "Out of questions — a final guess is required."})
            return

        emit('turn_broadcast_received', {
            "sender": sender["username"],
            "type": turn_type,
            "text": text,
        }, to=room_code)

        room["is_processing"] = True
        
        try:
            current_index = next(
                (i for i, p in enumerate(room["players"]) if p["username"] == sender["username"]),
                0
            )

            next_turn_holder = room["players"][
                (current_index + 1) % len(room["players"])
            ]["username"]

            if turn_type == "QUESTION":
                outcome = game_engine.process_question(game, text)
                game_ended = outcome["new_stage"] == GameStage.GAME_OVER.value
                new_turn_holder = None if game_ended else next_turn_holder

                game_engine.apply_turn_update(
                    room["game_id"],
                    "question",
                    text,
                    outcome,
                    author=sender["username"],
                    extra_set={"current_turn_holder": new_turn_holder}
                )

                emit('ai_response_broadcast_received', {
                    "turnsUsed": outcome["new_turns"],
                    "currentTurnHolder": new_turn_holder,
                    "gameStage": outcome["new_stage"],
                    "messageText": outcome["response_text"],
                    "victory": None,
                    "winnerUsername": None,
                    "secretAnswer": game["secret_answer"] if game_ended else None,
                    "forfeit": False,
                }, to=room_code)
                return

            outcome = game_engine.process_guess(game, text)
            winner_username = sender["username"] if outcome["is_correct"] else None

            game_over = outcome["new_stage"] == GameStage.GAME_OVER.value
            new_turn_holder = None if game_over else next_turn_holder

            extra_set = {"current_turn_holder": new_turn_holder}
            if game_over:
                extra_set["winner_username"] = winner_username

            game_engine.apply_turn_update(
                room["game_id"],
                "guess",
                text,
                outcome,
                author=sender["username"],
                extra_set=extra_set
            )

            stats = {}
            chat_history = []
            if game_over:
                refreshed_game = game_engine.get_db_collection().game_sessions.find_one({"_id": room["game_id"]})
                stats = _finalize_multiplayer_match(room_code, room, refreshed_game, winner_username)

                # Now include analysis
                if refreshed_game:
                    for message in refreshed_game["chat_history"]:
                        chat_history.append({
                            "type": message.get("type"),
                            "sender": message.get("sender"),
                            "text": message.get("text"),
                            "analysis": message.get("analysis"),
                        })

            emit('ai_response_broadcast_received', {
                "turnsUsed": outcome["new_turns"],
                "currentTurnHolder": new_turn_holder,
                "gameStage": outcome["new_stage"],
                "messageText": outcome["response_text"],
                "victory": bool(outcome["is_correct"]),
                "winnerUsername": winner_username,
                "secretAnswer": game["secret_answer"] if game_over else None,
                "forfeit": False,
                "stats": stats,
                "chatHistory": chat_history or None,
            }, to=room_code)
            
        finally:
            room["is_processing"] = False