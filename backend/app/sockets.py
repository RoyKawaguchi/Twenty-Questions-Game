import random
import logging

import jwt
from flask import request, current_app
from flask_socketio import emit, join_room as sio_join_room

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
    # CONNECTION LIFECYCLE
    # ==========================================

    @socketio.on('connect')
    def handle_connect(auth):
        """Authenticates the socket using the same JWTs issued by /api/auth/*."""
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

    @socketio.on('disconnect')
    def handle_disconnect():
        room_code, room = room_manager.find_room_by_sid(request.sid)
        if room_code and room:
            leaving_player = next((p for p in room["players"] if p["socket_id"] == request.sid), None)
            if leaving_player:
                logger.info(f"🔌 Socket connection broken: {leaving_player['username']} dropped offline.")
                room["players"].remove(leaving_player)

                # Explicitly close and forfeit the active database record context before removing memory traces
                if room.get("game_id"):
                    try:
                        game_engine.get_db_collection().game_sessions.update_one(
                            {"_id": room["game_id"]},
                            {"$set": {"game_stage": GameStage.GAME_OVER.value, "game_result": GameResult.LOSE.value}}
                        )
                        # Archive stats for remaining non-guest player if match context exists
                        if room["players"]:
                            surviving_player = room["players"][0]
                            if not surviving_player["is_guest"]:
                                game_engine.record_multiplayer_history(
                                    surviving_player["user_id"], room["game_id"], room_code,
                                    "Unknown", GameResult.WIN.value, 0, leaving_player["username"]
                                )
                    except Exception as e:
                        logger.error(f"Failed cleaning up matching session document on disconnect: {e}")

                if len(room["players"]) == 0:
                    room_manager.delete_room(room_code)
                else:
                    # Notify surviving connection slot BEFORE tearing down active instance references
                    emit('room_terminated', {
                        "reason": f"Match terminated: {leaving_player['username']} went offline."
                    }, to=room_code)
                    room_manager.delete_room(room_code)

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
                "game_stage": GameStage.PAUSED.value
            })
            if existing_paused:
                return {"error": "You have an unfinished game in progress. You must resume or forfeit it first."}

        try:
            game = game_engine.create_game_session(category, GameMode.SINGLEPLAYER, user=user)
        except ValueError as e:
            return {"error": str(e)}

        return {
            "gameId": game["_id"],
            "category": game["category"],
            "maxQuestions": game["max_questions"],
            "gameStage": game["game_stage"],
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
        if current_stage == GameStage.PAUSED.value:
            current_stage = GameStage.PLAYING.value
            game["game_stage"] = current_stage

        if current_stage == GameStage.GAME_OVER.value:
            return {"error": "Game is already over."}

        if turn_type == "QUESTION":
            if current_stage == GameStage.FINAL_GUESS.value:
                return {"error": "You have exhausted your questions! You must make a final guess."}

            outcome = game_engine.process_question(game, text)
            game_engine.apply_turn_update(game_id, "question", text, outcome)

            return {
                "gameId": game_id,
                "type": "QUESTION",
                "response": outcome["response_text"],
                "turnsUsed": outcome["new_turns"],
                "gameStage": outcome["new_stage"],
            }

        outcome = game_engine.process_guess(game, text)
        game_engine.apply_turn_update(game_id, "guess", text, outcome)

        response_payload = {
            "gameId": game_id,
            "type": "GUESS",
            "response": outcome["response_text"],
            "turnsUsed": outcome["new_turns"],
            "gameStage": outcome["new_stage"],
            "gameResult": outcome["new_result"],
        }

        if outcome["new_stage"] == GameStage.GAME_OVER.value:
            response_payload["secretAnswer"] = game["secret_answer"]
            if not user["is_guest"]:
                xp = game_engine.record_singleplayer_history(
                    user["user_id"], game_id, game["category"],
                    outcome["new_result"], outcome["new_turns"]
                )
                response_payload["xpEarned"] = xp

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
            {"_id": game_id}, {"$set": {"game_stage": GameStage.PAUSED.value}}
        )
        return {"gameStage": GameStage.PAUSED.value}

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

        return {
            "gameId": game_id,
            "category": game["category"],
            "turnsUsed": game["turns_used"],
            "maxQuestions": game["max_questions"],
            "gameStage": GameStage.PLAYING.value,
            "chatHistory": game["chat_history"],
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

        if not user["is_guest"]:
            game_engine.record_singleplayer_history(
                user["user_id"], game_id, game["category"], GameResult.LOSE.value, game["turns_used"]
            )

        return {
            "gameStage": GameStage.GAME_OVER.value,
            "secretAnswer": game["secret_answer"],
            "xp": 0,
        }

    @socketio.on('sp_get_analysis')
    def handle_sp_get_analysis(data):
        user = _get_auth_user()
        if not user:
            return {"error": "Not authenticated. Please reconnect."}
        game_id = (data or {}).get('game_id')
        game, err = _get_owned_sp_game(user, game_id)
        if err:
            return err
        if not game:
            return None, {"error": "Game session not found."}

        if game["game_stage"] != GameStage.GAME_OVER.value:
            return {"error": "Analysis is locked until the match completely concludes."}

        return {"gameId": game_id, "chatHistory": game["chat_history"]}

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
            "color": "#1e40af",
            "isHost": True,
            "is_guest": user["is_guest"],
        }

        room_code = room_manager.create_room(host_player)
        sio_join_room(room_code)

        room = room_manager.get_room(room_code)
        if room is None:
            return

        emit("room_state_updated", {
            "roomCode": room_code,
            "players": room["players"]
        })

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
            room["selected_category"] = category
            emit('room_state_updated', {
                "roomCode": room_code,
                "players": room["players"]
            }, to=room_code)

    @socketio.on('launch_match')
    def handle_launch_match(data):
        user = _require_auth()
        if not user:
            return

        data = data or {}
        room_code = data.get('roomCode')
        category = data.get('category')

        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Room context no longer exists."})
            return

        # Verify that the launcher is actually the room host
        launcher = next((p for p in room["players"] if p["socket_id"] == request.sid), None)
        if not launcher or not launcher.get("isHost"):
            emit('socket_error', {"message": "Unauthorized: Only the host can launch the game."})
            return

        if len(room["players"]) < 2:
            emit('socket_error', {"message": "Cannot launch with less than 2 players."})
            return

        try:
            # Spin up the official multiplayer game session, persisting room_code/players
            # so a completed match can be reconstructed from the DB alone (match history, leaderboard).
            game = game_engine.create_game_session(
                category, GameMode.MULTIPLAYER, user=None,
                room_code=room_code, players=room["players"]
            )

            room["game_id"] = game["_id"]
            room["game_stage"] = GameStage.PLAYING.value

            # Select a random player to hold the first turn token dynamically
            starting_player = random.choice(room["players"])
            room["current_turn_holder"] = starting_player["username"]

            emit('match_launched', {
                "roomCode": room_code,
                "category": game["category"],
                "maxQuestions": game["max_questions"],
                "currentTurnHolder": room["current_turn_holder"]
            }, to=room_code)

            logger.info(f"🚀 Multiplayer Match launched for Room {room_code}. First turn: {room['current_turn_holder']}")

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

        # 🛡️ GUARD: Check if this user is ALREADY in the room (Idempotency)
        existing_player = next((p for p in room["players"] if p["user_id"] == user["user_id"]), None)
        if existing_player:
            # Update their socket ID in case they refreshed or reconnected
            existing_player["socket_id"] = request.sid
            sio_join_room(room_code)

            # Send the state update back silently without triggering an error popup
            emit('room_state_updated', {
                "roomCode": room_code,
                "players": room["players"]
            }, to=room_code)
            return

        # Now we can safely check the capacity limit for NEW players
        if len(room["players"]) >= 2:
            emit('socket_error', {"message": "Room capacity limit reached. Max 2 investigators."})
            return

        username = user["username"]
        if any(p["username"] == username for p in room["players"]):
            username = f"{username}_2"

        room["players"].append({
            "user_id": user["user_id"],
            "username": username,
            "socket_id": request.sid,
            "color": "#065f46",  # Dedicated Guest Emerald Theme
            "isHost": False,
            "is_guest": user["is_guest"],
        })

        sio_join_room(room_code)

        emit('room_state_updated', {
            "roomCode": room_code,
            "players": room["players"]
        }, to=room_code)
        logger.info(f"👥 Player {username} successfully connected to Room {room_code}")

    @socketio.on('return_to_lobby')
    def handle_return_to_lobby(data):
        """Either player can trigger a rematch: resets the room's match fields
        while keeping the same players/room code, and pushes both clients
        back into the lobby together."""
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
        }, to=room_code)
        logger.info(f"🔁 Room {room_code} reset to lobby by {requester['username']} for a rematch.")

    def _finalize_multiplayer_match(room_code, room, game, winner_username):
        """Persists final match details and updates XP/history arrays."""
        game_engine.get_db_collection().game_sessions.update_one(
            {"_id": game["_id"]},
            {"$set": {"winner_username": winner_username}}
        )

        winner_xp = 0

        for player in room["players"]:
            if player["is_guest"]:
                continue
            opponent = next((p for p in room["players"] if p["username"] != player["username"]), None)
            result = GameResult.WIN.value if player["username"] == winner_username else GameResult.LOSE.value
            player_xp = game_engine.record_multiplayer_history(
                player["user_id"], game["_id"], room_code, game["category"],
                result, game["turns_used"], opponent["username"] if opponent else "Unknown"
            )
            if player_xp > 0:
                winner_xp = player_xp
        return winner_xp

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

        if not text or turn_type not in ("QUESTION", "GUESS"):
            emit('socket_error', {"message": "Missing or invalid type/text."})
            return

        sender = next((p for p in room["players"] if p["socket_id"] == request.sid), None)
        if not sender or sender["username"] != room.get("current_turn_holder"):
            emit('socket_error', {"message": "Out of turn action request ignored."})
            return

        game = game_engine.get_db_collection().game_sessions.find_one({"_id": room["game_id"]})
        if not game:
            emit('socket_error', {"message": "Match record not found."})
            return

        if game["game_stage"] == GameStage.GAME_OVER.value:
            emit('socket_error', {"message": "Match is already over."})
            return

        if turn_type == "QUESTION" and game["game_stage"] == GameStage.FINAL_GUESS.value:
            emit('socket_error', {"message": "Out of questions — a final guess is required."})
            return

        emit('turn_broadcast_received', {
            "senderName": sender["username"],
            "senderType": f"USER_{turn_type}",
            "messageText": text,
        }, to=room_code)

        opponent = next(p for p in room["players"] if p["username"] != sender["username"])

        if turn_type == "QUESTION":
            outcome = game_engine.process_question(game, text)
            game_engine.apply_turn_update(
                room["game_id"], "question", text, outcome, author=sender["username"]
            )

            # Rotate turn tokens only if game stage remains active
            game_ended = outcome["new_stage"] == GameStage.GAME_OVER.value
            room["current_turn_holder"] = None if game_ended else opponent["username"]

            emit('ai_response_broadcast_received', {
                "turnsUsed": outcome["new_turns"],
                "currentTurnHolder": room["current_turn_holder"],
                "gameStage": outcome["new_stage"],
                "messageText": outcome["response_text"],
                "analysis": outcome["analysis"],
                "victory": None,
                "winnerUsername": "unknown",
                "secretAnswer": game["secret_answer"] if game_ended else None,
                "forfeit": False,
            }, to=room_code)
            return

        outcome = game_engine.process_guess(game, text)
        winner_username = sender["username"] if outcome["is_correct"] else None

        extra_set = {}
        game_over = outcome["new_stage"] == GameStage.GAME_OVER.value
        if game_over:
            extra_set["winner_username"] = winner_username

        game_engine.apply_turn_update(
            room["game_id"], "guess", text, outcome, author=sender["username"], extra_set=extra_set
        )

        room["current_turn_holder"] = None if game_over else opponent["username"]

        winner_xp = 0
        if game_over:
            refreshed_game = game_engine.get_db_collection().game_sessions.find_one({"_id": room["game_id"]})
            winner_xp = _finalize_multiplayer_match(room_code, room, refreshed_game, winner_username)

        emit('ai_response_broadcast_received', {
            "turnsUsed": outcome["new_turns"],
            "currentTurnHolder": room["current_turn_holder"],
            "gameStage": outcome["new_stage"],
            "messageText": outcome["response_text"],
            "analysis": outcome["analysis"],
            "victory": bool(outcome["is_correct"]),
            "winnerUsername": winner_username,
            "secretAnswer": game["secret_answer"] if game_over else None,
            "forfeit": False,
            "xpEarned": winner_xp,
        }, to=room_code)

    @socketio.on('forfeit_match')
    def handle_forfeit_match(data):
        user = _require_auth()
        if not user:
            return
        data = data or {}
        room_code = data.get('roomCode')

        room = room_manager.get_room(room_code)
        if not room:
            emit('socket_error', {"message": "Room no longer exists or has been closed."})
            return

        forfeiter = next((p for p in room["players"] if p["socket_id"] == request.sid), None)
        if not forfeiter or not room.get("game_id"):
            return

        winner = next((p for p in room["players"] if p["username"] != forfeiter["username"]), None)
        game = game_engine.get_db_collection().game_sessions.find_one({"_id": room["game_id"]})
        if not game or game["game_stage"] == GameStage.GAME_OVER.value:
            return

        game_engine.get_db_collection().game_sessions.update_one(
            {"_id": room["game_id"]},
            {"$set": {
                "game_stage": GameStage.GAME_OVER.value,
                "game_result": GameResult.LOSE.value,
                "winner_username": winner["username"] if winner else None,
            }}
        )

        refreshed_game = game_engine.get_db_collection().game_sessions.find_one({"_id": room["game_id"]})
        _finalize_multiplayer_match(room_code, room, refreshed_game, winner["username"] if winner else None)

        room["current_turn_holder"] = None

        emit('ai_response_broadcast_received', {
            "turnsUsed": game["turns_used"],
            "currentTurnHolder": None,
            "gameStage": GameStage.GAME_OVER.value,
            "messageText": f"{forfeiter['username']} forfeited the match.",
            "victory": False,
            "winnerUsername": winner["username"] if winner else None,
            "secretAnswer": game["secret_answer"],
            "forfeit": True,
            "xpEarned": 0,
        }, to=room_code)