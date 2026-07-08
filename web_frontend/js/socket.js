import { state, GAME_MODES, GAME_STAGES } from './state.js';
import { renderLobbyView } from './views/lobbyView.js';
import { appendResponsiveMessageBubble, synchronizeInputControls } from './views/gameplayView.js';

export let socket = null;

/**
 * Initializes the global Socket instance and sets up inbound broadcast channels.
 */
export function initializeSocketConnection(callbacks = {}) {
    if (socket) return; 

    const targetUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? "http://127.0.0.1:8080"
        : window.location.origin;

    socket = io(targetUrl, {
        auth: { token: state.token },
        transports: ['websocket', 'polling']
    });

    // ==========================================
    // 1. LIFECYCLE & SYSTEM EVENTS
    // ==========================================
    socket.on("connect", () => {
        console.log(`📡 Persistent Socket Channel Opened. Session ID: ${socket.id}`);
    });

    socket.on("connect_error", (err) => {
        console.warn("⚠️ Socket connection rejected:", err.message);
        if (callbacks.onConnectError) callbacks.onConnectError(err);
    });

    socket.on("disconnect", () => {
        console.warn("⚠️ Socket connection lost.");
    });

    socket.on("socket_error", (data) => {
        alert(`❌ Matching Exception: ${data.message}`);
        synchronizeInputControls();
    });

    // ==========================================
    // 2. MULTIPLAYER ASYNC BROADCAST CHANNELS
    // ==========================================
    socket.on("room_state_updated", (roomData) => {
        console.log("📥 Room state update received from backend:", roomData);
    
        state.roomCode = roomData.roomCode; 
        state.players = roomData.players || [];
        
        const me = roomData.players.find(p => p.username === state.username);
        if (me) {
            state.isHost = me.isHost;
        }
        
        state.selectedCategory = roomData.category || state.selectedCategory || null;
        renderLobbyView();
    });

    socket.on("match_launched", (data) => {
        console.log("🎬 Match launch broadcast received!", data);

        state.gameMode = GAME_MODES.MULTIPLAYER;
        state.gameId = data.gameId;
        state.category = data.category;
        state.roomCode = data.roomCode;
        state.maxQuestions = data.maxQuestions || 20;
        state.gameStage = GAME_STAGES.PLAYING;
        state.currentTurnHolder = data.currentTurnHolder;
        state.turnsUsed = 0;

        if (callbacks.onMatchLaunchTriggered) {
            callbacks.onMatchLaunchTriggered();
        }

        const category_text = state.category
        ? state.category.charAt(0).toUpperCase() + state.category.replace("_", " ").slice(1)
        : "Unknown category";
        
        appendResponsiveMessageBubble(
            "AI JUDGE",
            `I am thinking of an item in the following category: ${category_text}. Begin asking Yes or No questions!`,
            "AI",
            false
        );
    });

    socket.on('turn_broadcast_received', (data) => {
        appendResponsiveMessageBubble(data.senderName, data.messageText, data.senderType, false);
    });

    socket.on('ai_response_broadcast_received', (data) => {
        console.log("📥 AI processed packet received:", data);
    
        state.turnsUsed = data.turnsUsed;
        state.gameStage = data.gameStage;
        state.currentTurnHolder = data.currentTurnHolder;
    
        appendResponsiveMessageBubble("AI JUDGE", data.messageText, "AI", true);
        if (callbacks && callbacks.onAiResponseProcessed) {
            callbacks.onAiResponseProcessed(data);
        }

        if (data.gameStage !== "GAME_OVER") {
            synchronizeInputControls();
        }
    });

    socket.on("room_terminated", (data) => {
        alert(data.reason || "The match room has been closed by the host or system server.");
        window.location.reload();
    });

    socket.on("returned_to_lobby", (data) => {
        state.players = data.players || state.players;
        state.roomCode = data.roomCode || state.roomCode;
        if (callbacks.onReturnedToLobby) callbacks.onReturnedToLobby(data);
    });
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// ==========================================
// 3. OUTBOUND GATEWAY SERVICE LAYER
// ==========================================
export const socketService = {
    // --- SINGLEPLAYER REQUEST-RESPONSE WRAPPERS ---
    startSingleplayer(category, callback) {
        socket.emit("sp_start_game", { category }, (response) => {
            if (!response || response.error) return callback({ error: response?.error || "Unknown Error" });
            
            state.gameId = response.gameId;
            state.category = response.category;
            state.maxQuestions = response.maxQuestions;
            state.gameStage = response.gameStage;
            state.turnsUsed = 0;
            state.analysisHistory = [];
            
            callback(null, response);
        });
    },

    resumeSingleplayer(gameId, callback) {
        socket.emit("sp_resume_game", { game_id: gameId }, (response) => {
            if (!response || response.error) return callback({ error: response?.error || "Unknown Error" });
            
            state.gameMode = GAME_MODES.SINGLEPLAYER;
            state.gameId = response.gameId;
            state.category = response.category;
            state.turnsUsed = response.turnsUsed;
            state.maxQuestions = response.maxQuestions;
            state.gameStage = response.gameStage;
            state.analysisHistory = [];

            callback(null, response);
        });
    },

    submitSingleplayerTurn(type, text, callback) {
        socket.emit("sp_submit_turn", { game_id: state.gameId, type, text }, (response) => {
            if (!response || response.error) return callback({ error: response?.error || "Unknown Error" });
            
            state.turnsUsed = response.turnsUsed;
            state.gameStage = response.gameStage;
            
            callback(null, response);
        });
    },

    pauseSingleplayer(callback) {
        socket.emit("sp_pause_game", { game_id: state.gameId }, (response) => {
            if (!response || response.error) return callback({ error: response?.error || "Unknown Error" });
            callback(null, response);
        });
    },

    quitSingleplayer(gameId, callback) {
        socket.emit("sp_quit_game", { game_id: gameId }, (response) => {
            if (!response || response.error) return callback({ error: response?.error || "Unknown Error" });
            callback(null, response);
        });
    },

    getSingleplayerAnalysis(callback) {
        socket.emit("sp_get_analysis", { game_id: state.gameId }, (response) => {
            if (!response || response.error) return callback({ error: response?.error || "Unknown Error" });
            state.analysisHistory = response.chatHistory || [];
            callback(null, state.analysisHistory);
        });
    },

    // --- MULTIPLAYER ROOM TRIGGERS ---
    createMultiplayerRoom() {
        if (socket) socket.emit("create_room", {});
    },

    joinMultiplayerRoom(roomCode) {
        if (socket) socket.emit("join_room", { roomCode });
    },

    updateRoomSettings(roomCode, category) {
        if (socket) socket.emit("update_room_settings", { roomCode, category });
    },

    launchMultiplayerMatch(roomCode, category) {
        if (socket) socket.emit("launch_match", { roomCode, category });
    },

    submitMultiplayerTurn(roomCode, type, text) {
        if (socket) socket.emit("submit_multiplayer_turn", { roomCode, type, text });
    },

    forfeitMultiplayerMatch(roomCode) {
        if (socket) socket.emit("forfeit_match", { roomCode });
    },

    returnToLobby(roomCode) {
        if (socket) socket.emit("return_to_lobby", { roomCode });
    }
};