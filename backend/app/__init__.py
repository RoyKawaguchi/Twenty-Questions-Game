import json
import os
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.database import db_wrapper

def create_app():

    # Load .env file located in the root
    base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    env_path = os.path.join(base_dir, ".env")
    
    from dotenv import load_dotenv
    if os.path.exists(env_path):
        load_dotenv(env_path)

    app = Flask(__name__)
    
    config_obj = Config()
    config_obj.validate()
    
    app.config.update(
        MONGO_URI=config_obj.MONGO_URI,
        OPENAI_API_KEY=config_obj.OPENAI_API_KEY,
        FLASK_ENV=config_obj.FLASK_ENV
    )

    # Load and map configuration dataset dynamically
    json_config_path = os.path.join(os.path.dirname(__file__), "config.json")
<<<<<<< HEAD
    with open(json_config_path, "r", encoding='utf-8') as f:
=======
    with open(json_config_path, "r", encoding="utf-8") as f:
>>>>>>> a2e2cc32c3f0f1ce383f503761a887f37f7e80b6
        game_data = json.load(f)
        app.config["GAME_CATEGORIES"] = game_data["categories"]
        app.config["DEFAULT_MAX_QUESTIONS"] = game_data.get("max_questions", 20)

    CORS(app, resources={r"/*": {"origins": "*"}})
    db_wrapper.init_app(app)

    # Import and register game engine blueprints here dynamically
    from app.routes import game_bp
    app.register_blueprint(game_bp)

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "message": "Game engine server is alive!"
        }), 200

    return app