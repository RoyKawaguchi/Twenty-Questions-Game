import os

class Config:
    def __init__(self):
        self.MONGO_URI = os.getenv("MONGO_URI")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.FLASK_ENV = os.getenv("FLASK_ENV", "development")
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        
    def validate(self):
        """Validates that all critical configuration variables are loaded."""
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