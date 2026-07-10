import os

class Config:
    """Application configuration state."""
    
    def __init__(self):
        # Define all required keys
        self.REQUIRED_KEYS = ["MONGO_URI", "OPENAI_API_KEY", "JWT_SECRET_KEY"]
        
        # Pull environment configurations dynamically
        self.FLASK_ENV = os.getenv("FLASK_ENV", "development")
        self.MONGO_URI = os.getenv("MONGO_URI")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    def validate(self):
        """Validates that all critical configuration variables are loaded safely."""
        missing = [key for key in self.REQUIRED_KEYS if not getattr(self, key)]
            
        if missing:
            raise ValueError(
                f"CRITICAL CONFIG ERROR: Missing required environment variables: {', '.join(missing)}. "
                f"Please ensure your backend/.env file is populated."
            )

# Create the instance to be imported elsewhere
config = Config()