import os

class Config:
    def __init__(self):
        self.MONGO_URI = os.getenv("MONGO_URI")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.FLASK_ENV = os.getenv("FLASK_ENV", "development")
        
    def validate(self):
        """Validates that all critical configuration variables are loaded."""
        missing = []
        if not self.MONGO_URI:
            missing.append("MONGO_URI")
        if not self.OPENAI_API_KEY:
            missing.append("OPENAI_API_KEY")
            
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}. "
                f"Please check your backend/.env file."
            )