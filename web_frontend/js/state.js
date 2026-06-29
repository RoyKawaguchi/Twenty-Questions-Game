export const state = {
    token: localStorage.getItem("token") || null,
    username: localStorage.getItem("username") || null,
    isGuest: localStorage.getItem("isGuest") === "true",

    gameId: null,
    category: null,
    turnsUsed: 0,
    maxQuestions: 20,
    gameStage: "PLAYING",
    analysisHistory: null // Remains null until the game is over, then it will hold the analysis logs.
};

export function resetState() {
    state.gameId = null;
    state.category = null;
    state.turnsUsed = 0;
    state.maxQuestions = 20;
    state.gameStage = "PLAYING";
    state.analysisHistory = null;
}