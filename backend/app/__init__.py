from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import os

from app.config import Config
from app.database import db_wrapper  

def create_app():
    base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    env_path = os.path.join(base_dir, ".env")
    
    if os.path.exists(env_path):
        load_dotenv(env_path)

    app = Flask(__name__)
    
    config_obj = Config()
    config_obj.validate()
    app.config.from_object(config_obj)

    CORS(app, resources={r"/*": {"origins": "*"}})

    # Initializing DB connection pool
    db_wrapper.init_app(app)

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "message": "Game engine server is alive!"
        }), 200

    return app