// Strict Enum-style Constants to prevent string comparison bugs across the app
export const GAME_MODES = {
    SINGLEPLAYER: "SINGLEPLAYER",
    MULTIPLAYER: "MULTIPLAYER"
};

export const GAME_STAGES = {
    LOBBY: "LOBBY",
    PLAYING: "PLAYING",
    FINAL_GUESS: "FINAL_GUESS",
    GAME_OVER: "GAME_OVER"
};

export const state = {
    // Auth & Identity Profiles (Synced securely with LocalStorage)
    token: localStorage.getItem("token") || null,
    username: localStorage.getItem("username") || null,
    isGuest: localStorage.getItem("isGuest") === "true",
    email: localStorage.getItem("email") || null,

    // Shared Matchmaking Runtime Parameters
    gameMode: GAME_MODES.SINGLEPLAYER,    
    gameId: null,
    category: null,
    selectedCategory: null,      
    turnsUsed: 0,
    maxQuestions: 20,
    gameStage: GAME_STAGES.PLAYING,        
    analysisHistory: [],       // Initialized as an empty array to prevent rendering maps from crashing
    activeGame: null,            

    // Multiplayer Room Synchronization Engine Parameters
    roomCode: null,
    isHost: false,
    players: [],                 
    currentTurnHolder: null      
};

/**
 * Completely purges match-specific data back to clean, predictable baselines.
 * Accepts an optional targetStage fallback context to prevent skipping lobby screens.
 * * @param {string} targetStage - The stage to initialize into (Defaults to "PLAYING")
 */
export function resetState(targetStage = GAME_STAGES.PLAYING) {
    state.gameId = null;
    state.category = null;
    state.selectedCategory = null;
    state.turnsUsed = 0;
    state.maxQuestions = 20;
    state.gameStage = targetStage;
    state.analysisHistory = []; // Safe fallback array container
    state.activeGame = null;
    
    // Reset room bindings safely
    state.roomCode = null;
    state.isHost = false;
    state.players = [];
    state.currentTurnHolder = null;
}

/**
 * Clears only match-specific fields, preserving room membership
 * (roomCode / isHost / players) so a multiplayer rematch can reuse the room.
 */
export function resetMatchState(targetStage = GAME_STAGES.PLAYING) {
    state.gameId = null;
    state.category = null;
    state.selectedCategory = null;
    state.turnsUsed = 0;
    state.maxQuestions = 20;
    state.gameStage = targetStage;
    state.analysisHistory = [];
    state.activeGame = null;
    state.currentTurnHolder = null;
}