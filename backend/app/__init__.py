import json
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO

from dotenv import load_dotenv
base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(base_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

from app.config import config 
from app.database import db_wrapper

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    
    # Run structural validations (Will instantly crash here if a key is missing)
    config.validate()
    
    # Bind environment keys cleanly to Flask core config space
    app.config.update(
        MONGO_URI=config.MONGO_URI,
        OPENAI_API_KEY=config.OPENAI_API_KEY,
        FLASK_ENV=config.FLASK_ENV,
        JWT_SECRET_KEY=config.JWT_SECRET_KEY,
        SECRET_KEY=config.JWT_SECRET_KEY  
    )

    # Load static word lists
    json_config_path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(json_config_path, "r", encoding='utf-8') as f:
        game_data = json.load(f)
        app.config["GAME_CATEGORIES"] = game_data["categories"]
        app.config["DEFAULT_SP_MAX_QUESTIONS"] = game_data.get("sp_max_questions", 20)
        app.config["DEFAULT_MP_MAX_QUESTIONS"] = game_data.get("mp_max_questions", 20)

    frontend_url = os.getenv("FRONTEND_URL", "*")

    # Configure API route permissions
    CORS(app, resources={r"/*": {"origins": frontend_url}})
    
    # Initialize shared persistence module pool
    db_wrapper.init_app(app)

    # Wrap application engine with real-time events capabilities safely
    socketio.init_app(app, cors_allowed_origins=frontend_url)

    # Bind active listener paths
    from app.sockets import register_socket_events
    register_socket_events(socketio)

    from app.routes import auth_bp, game_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(game_bp)

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "message": "Game engine server is alive!"
        }), 200

    return app