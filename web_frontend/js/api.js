import { state } from './state.js';

const GAME_BASE_URL = "http://127.0.0.1:8080/api/game";
const AUTH_BASE_URL = "http://127.0.0.1:8080/api/auth";

/**
 * Shared internal helper to attach authentication bearer headers to outgoing requests.
 * @param {Object} customHeaders - Existing route headers
 * @returns {Object} Maintained header object combined with secure token string
 */
function getAuthenticatedHeaders(customHeaders = {}) {
    const baseHeaders = {
        'Content-Type': 'application/json',
        ...customHeaders
    };
    if (state.token) {
        baseHeaders['Authorization'] = `Bearer ${state.token}`;
    }
    return baseHeaders;
}

// =====================================================================
// AUTHENTICATION BLUEPRINT API CALLS
// =====================================================================

export async function registerUser(username, email, password) {
    const response = await fetch(`${AUTH_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up.');
    }
    return data;
}

export async function loginUser(identity, password) {
    const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, password })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials.');
    }
    return data;
}

export async function initializeGuestSession(nickname) {
    const response = await fetch(`${AUTH_BASE_URL}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to join as guest.');
    }
    return data;
}

export async function getUserInfo() {
    const response = await fetch(`${AUTH_BASE_URL}/user_info`, {
        method: "GET",
        headers: getAuthenticatedHeaders()
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to retrieve user info from pipeline.");
    }

    return await response.json(); 
}

// =====================================================================
// CORE GAME PLAYPLAY API CALLS (SECURED VIA JWT BEARER TOKENS)
// =====================================================================

export async function fetchCategories() {
    const response = await fetch(`${GAME_BASE_URL}/categories`, {
        method: 'GET',
        headers: getAuthenticatedHeaders()
    });
    if (!response.ok) throw new Error("Failed to load categories.");

    return await response.json(); // Returns { categories: [...] }
}

export async function startGame(category) {
    const headers = { 'Content-Type': 'application/json' };
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    } else {
        console.warn("WARNING: state.token is missing or null right now!");
    }

    const response = await fetch(`${GAME_BASE_URL}/start`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ category })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to start game session.');
    }
    return data;
}

export async function askQuestion(gameId, questionText) {
    const res = await fetch(`${GAME_BASE_URL}/question`, {
        method: "POST",
        headers: getAuthenticatedHeaders(),
        body: JSON.stringify({ game_id: gameId, question_text: questionText }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit question.");
    return data; // Returns { game_id, response, turns_used, game_stage }
}

export async function submitGuess(gameId, guessText) {
    const res = await fetch(`${GAME_BASE_URL}/guess`, {
        method: "POST",
        headers: getAuthenticatedHeaders(),
        body: JSON.stringify({ game_id: gameId, guess_text: guessText }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit guess.");
    return data; // Returns { game_id, game_stage, game_result, response, turns_used, [secret_answer], final_message }
}

export async function pauseGame(gameId) {
    const response = await fetch(`${GAME_BASE_URL}/pause`, {
        method: "POST",
        headers: getAuthenticatedHeaders(),
        body: JSON.stringify({ game_id: gameId })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to hibernate the active match session.");
    }

    return await response.json(); // Returns { message, game_stage }
}

export async function quitGame(gameId) {
    const response = await fetch(`${GAME_BASE_URL}/quit`, {
        method: "POST",
        headers: getAuthenticatedHeaders(),
        body: JSON.stringify({ game_id: gameId })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to forfeit match session.");
    }

    return await response.json(); // Returns { message, game_stage, secret_answer }
}

export async function fetchAnalysis(gameId) {
    const res = await fetch(`${GAME_BASE_URL}/${gameId}/analysis`, {
        method: "GET",
        headers: getAuthenticatedHeaders()
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve analysis logs.");
    return data; // Returns { chat_history: [...] }
}