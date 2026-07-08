import { state } from '../state.js';

// Dedicated DOM Cache for Multiplayer Lobby Configurations
export const lobbyElements = {
    entrancePortal: document.getElementById("mp-entrance-portal"),
    roomLobbyArena: document.getElementById("mp-room-lobby-arena"),
    codeDisplay: document.getElementById("lobby-code-display"),
    statusText: document.getElementById("lobby-status-text"),
    playerList: document.getElementById("lobby-player-list"),
    hostControls: document.getElementById("mp-host-category-controls"),
    guestNote: document.getElementById("mp-guest-waiting-note"),
    launchBtn: document.getElementById("mp-launch-match-btn"),
    mpCategoryGrid: document.getElementById("mp-category-grid")
};

// Internal module reference states to manage clean redraw loops
let cachedSelectCategoryCallback = null;
let cachedCategoriesList = [];

/**
 * Updates the structural layout state of the multiplayer lobby screen.
 * Rebuilds the connected player list grid accurately based on server room syncs.
 */
export function renderLobbyView() {
    if (!lobbyElements.entrancePortal || !lobbyElements.roomLobbyArena) return;

    // Switch container viewing views smoothly
    lobbyElements.entrancePortal.classList.add("hidden");
    lobbyElements.roomLobbyArena.classList.remove("hidden");
    
    // Synchronize Room Code Display
    lobbyElements.codeDisplay.textContent = state.roomCode ? state.roomCode.toUpperCase() : "----";
    
    // Clean out old player node buffers safely before appending fresh allocations
    lobbyElements.playerList.innerHTML = "";
    
    state.players.forEach(player => {
        const badge = document.createElement("div");
        badge.className = "lobby-player-badge";
        
        if (player.isHost) {
            badge.classList.add("lobby-pulse-note", "status-ready");
            badge.innerHTML = `<span>👑 ${player.username.toUpperCase()} <small>(Host)</small></span>`;
        } else {
            badge.innerHTML = `<span>👤 ${player.username.toUpperCase()}</span>`;
        }
        
        if (player.username === state.username) {
            badge.style.border = "2px solid var(--accent-color, #007aff)";
        }
        
        lobbyElements.playerList.appendChild(badge);
    });

    // Synchronize Panel Views depending on user permissions (Host vs Guest)
    synchronizeLobbyControls(state.selectedCategory);
}

/**
 * Renders the multiplayer categories grid list inside the host panel wrapper.
 */
export function renderLobbyCategories(categories, onSelectCategory) {
    if (categories && categories.length > 0) cachedCategoriesList = categories;
    if (onSelectCategory) cachedSelectCategoryCallback = onSelectCategory;

    if (!lobbyElements.mpCategoryGrid) return;
    lobbyElements.mpCategoryGrid.innerHTML = "";
    
    cachedCategoriesList.forEach(cat => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-secondary category-btn compact-btn";
        btn.textContent = cat.replace("_", " ").toUpperCase();
        
        if (state.selectedCategory === cat) {
            btn.classList.add("btn-chosen", "mp-chosen-category");
        } else {
            btn.classList.remove("btn-chosen", "mp-chosen-category");
        }
        
        btn.addEventListener("click", () => {
            if (cachedSelectCategoryCallback) {
                cachedSelectCategoryCallback(cat);
            }
            // Fix: Shift away from heavy whole-view redraw loops to lightweight localized updates
            highlightLobbyCategory(cat);
        });
        
        lobbyElements.mpCategoryGrid.appendChild(btn);
    });
}

/**
 * Fast targeted highlighter that swaps element styles without triggering complete room redraw loops.
 */
export function highlightLobbyCategory(category) {
    if (!lobbyElements.mpCategoryGrid) return;

    const buttons = lobbyElements.mpCategoryGrid.querySelectorAll(".category-btn");
    buttons.forEach(btn => {
        const cleanText = btn.textContent.trim().toLowerCase().replace(" ", "_");
        if (cleanText === category?.toLowerCase()) {
            btn.classList.add("btn-chosen", "mp-chosen-category");
        } else {
            btn.classList.remove("btn-chosen", "mp-chosen-category");
        }
    });

    // Keep active controls and launch constraints fully synchronized with the selection change
    synchronizeLobbyControls(category);
}

/**
 * Local utility layout manager that handles visibility toggles and active states for both hosts and guests.
 */
function synchronizeLobbyControls(category) {
    if (state.isHost) {
        if (lobbyElements.hostControls) lobbyElements.hostControls.classList.remove("hidden");
        if (lobbyElements.guestNote) lobbyElements.guestNote.classList.add("hidden");
        
        if (lobbyElements.launchBtn) {
            if (category) {
                lobbyElements.launchBtn.disabled = false;
                lobbyElements.launchBtn.classList.remove("disabled");
                lobbyElements.launchBtn.textContent = "🚀 Launch Match";
            } else {
                lobbyElements.launchBtn.disabled = true;
                lobbyElements.launchBtn.classList.add("disabled");
                lobbyElements.launchBtn.textContent = "Select a Category";
            }
        }
    } else {
        if (lobbyElements.hostControls) lobbyElements.hostControls.classList.add("hidden");
        if (lobbyElements.guestNote) {
            lobbyElements.guestNote.classList.remove("hidden");
            if (category) {
                lobbyElements.guestNote.textContent = `Host selected: ${category.replace("_", " ").toUpperCase()}. Waiting for launch...`;
                lobbyElements.guestNote.className = "lobby-pulse-note status-ready";
            } else {
                lobbyElements.guestNote.textContent = "Waiting for host to select a category...";
                lobbyElements.guestNote.className = "lobby-pulse-note status-waiting";
            }
        }
    }
}