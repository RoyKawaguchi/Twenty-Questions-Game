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

export async function getLeaderboard() {
    const response = await fetch(`${AUTH_BASE_URL}/leaderboard`, {
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
// STATIC REFERENCE DATA (kept on REST — no need for a live socket round-trip)
// =====================================================================

export async function fetchCategories() {
    const response = await fetch(`${GAME_BASE_URL}/categories`, {
        method: 'GET',
        headers: getAuthenticatedHeaders()
    });
    if (!response.ok) throw new Error("Failed to load categories.");

    return await response.json(); // Returns { categories: [...] }
}

// NOTE: All gameplay actions (start/question/guess/pause/resume/quit/analysis,
// for both singleplayer and multiplayer) have moved to socket.js — see the
// sp_* and multiplayer events wired up there. This keeps REST scoped to
// authentication + static reference data only.
