import random
import string
import logging

logger = logging.getLogger(__name__)


class RoomManager:
    """
    Owns transient socket connection state and pre-game lobby metadata.
    Does NOT own game rules or match state (delegated to MongoDB game_sessions).
    """

    def __init__(self):
        self.connected_users = {}   # sid -> user identity dict
        self.active_rooms = {}      # room_code -> room dict

    # ---- Connection Identity ----
    def register_user(self, sid, user):
        self.connected_users[sid] = user

    def get_user(self, sid):
        return self.connected_users.get(sid)

    def drop_user(self, sid):
        self.connected_users.pop(sid, None)

    # ---- Room Lookups ----
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

    def get_room_by_sid(self, sid):
        for room_code, room in self.active_rooms.items():
            for player in room["players"]:
                if player["socket_id"] == sid:
                    return room_code, room, player
        return None, None, None

    def delete_room(self, room_code):
        self.active_rooms.pop(room_code, None)

    # ---- Room Lifecycle ----
    def create_room(self, host_player):
        while True:
            room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            if room_code not in self.active_rooms:
                break

        self.active_rooms[room_code] = {
            "host_username": host_player["username"],
            "players": [host_player],
            "selected_category": None,
            "game_id": None,          # Links to MongoDB game_session when match starts
            "is_processing": False,   # Prevents double-submit socket spam during turns
        }
        return room_code

    def reset_to_lobby(self, room_code):
        """Clears match link & settings for rematches without dropping connected players."""
        room = self.active_rooms.get(room_code)
        if not room:
            return None
        room["selected_category"] = None
        room["game_id"] = None
        room["is_processing"] = False
        return room


room_manager = RoomManager()