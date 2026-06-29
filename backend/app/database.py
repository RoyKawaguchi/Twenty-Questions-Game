import logging
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure

# Setup logging
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
            # Setup standard connection pooling
            self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            
            # Extract the core path after the double-slash domain section
            path_part = mongo_uri.split("//")[-1].split("/", 1)[-1] if "/" in mongo_uri.split("//")[-1] else ""
            
            # Remove any trailing query parameters (like ?appName=...)
            if "?" in path_part:
                path_part = path_part.split("?")[0]
            
            # Clean up trailing or leading slashes
            db_name = path_part.strip("/")
            
            # Fallback to default if no explicit database name was provided in the URI string
            if not db_name:
                db_name = "20questionsgame"
                
            self.db = self.client[db_name]
            
            # Verify the deployment is live by issuing a ping command
            self.client.admin.command('ping')
            logger.info(f"✅ Successfully linked and authenticated with MongoDB database: '{db_name}'")
            
            # Establish TTL compilation on game_sessions collection
            self._ensure_ttl_indices()
            
        except ConnectionFailure as e:
            logger.error(f"❌ Critical error: Failed to connect to MongoDB cluster at startup: {e}")
            raise e

    def _ensure_ttl_indices(self):
        """Creates a background index that drops game sessions after 24 hours."""
        if self.db is not None:
            # 86400 seconds = 24 hours
            self.db.game_sessions.create_index(
                [("created_at", ASCENDING)], 
                expireAfterSeconds=86400
            )
            logger.info("⏱️ TTL automated session indexing is locked on 'game_sessions.created_at'.")

# Single shared instance export pattern
db_wrapper = Database()