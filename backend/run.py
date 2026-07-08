from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    # Kept your custom target host configuration and port 8080 settings matching perfectly
    socketio.run(app, host="0.0.0.0", port=8080, debug=True)