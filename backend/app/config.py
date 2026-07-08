import os
from dotenv import load_dotenv

# Ensure environment variables are pulled into local memory
load_dotenv()

class Config:
    """Application configuration state."""
    
    def __init__(self):
        self.MONGO_URI = os.getenv("MONGO_URI")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.FLASK_ENV = os.getenv("FLASK_ENV", "development")
        
        # Pull JWT key, fallback to a development string if not in production
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        if not self.JWT_SECRET_KEY and self.FLASK_ENV == "development":
            self.JWT_SECRET_KEY = "dev_secret_key_change_me_in_production"

    def validate(self):
        """Validates that all critical configuration variables are loaded safely."""
        missing = []
        if not self.MONGO_URI:
            missing.append("MONGO_URI")
        if not self.OPENAI_API_KEY:
            missing.append("OPENAI_API_KEY")
        if not self.JWT_SECRET_KEY:
            missing.append("JWT_SECRET_KEY")
            
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}. "
                f"Please check your backend/.env file."
            )

# Create a single instance to be used across your application modules
config = Config()