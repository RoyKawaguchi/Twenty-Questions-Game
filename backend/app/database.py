import logging
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.client = None
        self.db = None

    def init_app(self, app):
        """Initializes the MongoDB connection pool using app config settings."""
        mongo_uri = app.config.get("MONGO_URI")
        try:
            self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            
            # Safe extraction of DB Name from URI string
            path_part = mongo_uri.split("//")[-1].split("/", 1)[-1] if "/" in mongo_uri.split("//")[-1] else ""
            if "?" in path_part:
                path_part = path_part.split("?")[0]
            
            db_name = path_part.strip("/")
            if not db_name:
                db_name = "20questionsgame"
                
            self.db = self.client[db_name]
            
            # Verify live deployment state
            self.client.admin.command('ping')
            logger.info(f"✅ Successfully linked and authenticated with MongoDB database: '{db_name}'")
            
            # Enforce automatic cleanup of old sessions
            self._ensure_ttl_indices()
            
        except ConnectionFailure as e:
            logger.error(f"❌ Critical error: Failed to connect to MongoDB cluster at startup: {e}")
            raise e

    def _ensure_ttl_indices(self):
        """Creates background index that drops session documents after 24 hours.
        
        Requires fields mapped to this index to be serialized as BSON datetimes.
        """
        if self.db is not None:
            self.db.game_sessions.create_index(
                [("created_at", ASCENDING)], 
                expireAfterSeconds=86400    # 24 hours
            )
            logger.info("⏱️ TTL automated session indexing is active on 'game_sessions.created_at'.")

db_wrapper = Database()