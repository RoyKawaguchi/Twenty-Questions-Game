import random
import string
import logging

from app.models import GameStage

logger = logging.getLogger(__name__)


class RoomManager:
    """
    Owns all in-memory multiplayer room/connection state.

    Isolating this from the socket transport layer (sockets.py) means future
    features -- persisted room snapshots, reconnect-into-room, spectators,
    match history queries -- only need to touch this module.
    """

    def __init__(self):
        self.connected_users = {}   # sid -> user identity dict
        self.active_rooms = {}      # room_code -> room dict

    # ---- connection identity ----
    def register_user(self, sid, user):
        self.connected_users[sid] = user

    def get_user(self, sid):
        return self.connected_users.get(sid)

    def drop_user(self, sid):
        self.connected_users.pop(sid, None)

    # ---- room lookups ----
    def get_room(self, room_code):
        return self.active_rooms.get(room_code)

    def room_exists(self, room_code):
        return room_code in self.active_rooms

    def find_room_by_sid(self, sid):
        for room_code, room in self.active_rooms.items():
            for player in room["players"]:
                if player["socket_id"] == sid:
                    return room_code, room
        return None, None

    def delete_room(self, room_code):
        self.active_rooms.pop(room_code, None)

    # ---- room lifecycle ----
    def create_room(self, host_player):
        while True:
            room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            if room_code not in self.active_rooms:
                break

        self.active_rooms[room_code] = {
            "players": [host_player],
            "selected_category": None,
            "game_id": None,
            "game_stage": GameStage.LOBBY.value,
            "current_turn_holder": None,
        }
        return room_code

    def reset_to_lobby(self, room_code):
        """Clears match-specific fields so the room can host another match
        while keeping the same players/room code intact (rematch flow)."""
        room = self.active_rooms.get(room_code)
        if not room:
            return None
        room["selected_category"] = None
        room["game_id"] = None
        room["game_stage"] = GameStage.LOBBY.value
        room["current_turn_holder"] = None
        return room


room_manager = RoomManager()