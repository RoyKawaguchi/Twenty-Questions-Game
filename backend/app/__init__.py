from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_file
import os

from app.config import Config

def create_app():
    # Load environment variables from .env file explicitly
    base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    env_path = os.path.join(base_dir, ".env")
    
    if os.path.exists(env_path):
        from dotenv import load_dotenv
        load_dotenv(env_path)

    app = Flask(__name__)
    
    # 1. Initialize and Validate Config
    config_obj = Config()
    config_obj.validate()
    app.config.from_object(config_obj)

    # 2. Configure CORS (Wide open during dev per design decisions)
    CORS(app, resources={r"/*": {"origins": "*"}})

    # 3. Core Health Route
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "message": "Game engine server is alive!"
        }), 200

    return app