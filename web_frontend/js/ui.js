import { state } from "./state.js";

// Global Navigational Shell and Profile DOM Cache Registry
export const elements = {
    // Structural View Shells
    authContainer: document.getElementById("auth-container"),
    dashboardContainer: document.getElementById("dashboard-container"),
    singleplayerContainer: document.getElementById("singleplayer-container"),
    multiplayerContainer: document.getElementById("multiplayer-container"),
    leaderboardContainer: document.getElementById("leaderboard-container"),
    profileContainer: document.getElementById("profile-container"),
    gameContainer: document.getElementById("game-container"),

    // Global Menu Layout Buttons
    menuSingleplayerBtn: document.getElementById("menu-singleplayer-btn"),
    menuMultiplayerBtn: document.getElementById("menu-multiplayer-btn"),
    menuLeaderboardBtn: document.getElementById("menu-leaderboard-btn"),
    menuProfileBtn: document.getElementById("menu-profile-btn"),
    
    // Auth Forms & Indicators
    showLoginBtn: document.getElementById("show-login-btn"),
    showSignupBtn: document.getElementById("show-signup-btn"),
    showGuestBtn: document.getElementById("show-guest-btn"),
    loginForm: document.getElementById("login-form"),
    signupForm: document.getElementById("signup-form"),
    guestForm: document.getElementById("guest-form"),
    authErrorMsg: document.getElementById("auth-error-message"),

    // Profile Dropdown Panel
    profileMenuBtn: document.getElementById("profile-menu-btn"),
    profileDropdownPanel: document.getElementById("profile-dropdown-panel"),
    dropdownUsername: document.getElementById("dropdown-username"),
    dropdownEmail: document.getElementById("dropdown-email"),
    signoutActionBtn: document.getElementById("signout-action-btn"),

    // Main Profile View Metrics
    profileUsernameDisplay: document.getElementById("profile-username-display"),
    profileXpDisplay: document.getElementById("profile-xp-display"),
    profileRankBadge: document.getElementById("profile-rank-badge"),
    profileRankNote: document.getElementById("profile-rank-note"),
    statAvgTurns: document.getElementById("stat-avg-turns"),
    statWinRate: document.getElementById("stat-win-rate"),
    profileHistoryList: document.getElementById("profile-history-list"),
    tabSingleplayerBtn: document.getElementById("tab-singleplayer-btn"),
    tabMultiplayerBtn: document.getElementById("tab-multiplayer-btn"),

    // Leaderboard View Elements
    leaderboardList: document.getElementById("leaderboard-list"),

    // Multiplayer Gateway Submits
    mpCreateBtn: document.getElementById("mp-create-room-btn"),
    mpJoinForm: document.getElementById("mp-join-room-form")
};

/**
 * Handles toggling structural visibilities across the authorization workflows.
 */
export function activateAuthForm(activeFormElement) {
    if (elements.profileMenuBtn) elements.profileMenuBtn.classList.add("hidden");
    if (elements.authErrorMsg) {
        elements.authErrorMsg.textContent = "";
        elements.authErrorMsg.classList.add("hidden");
    }
    if (elements.loginForm) elements.loginForm.classList.add("hidden");
    if (elements.signupForm) elements.signupForm.classList.add("hidden");
    if (elements.guestForm) elements.guestForm.classList.add("hidden");
    
    if (activeFormElement) activeFormElement.classList.remove("hidden");
}

/**
 * Displays errors arriving from credential or guest registration sequences.
 */
export function showAuthError(message) {
    if (elements.authErrorMsg) {
        elements.authErrorMsg.textContent = message;
        elements.authErrorMsg.classList.remove("hidden");
    }
}

/**
 * Toggles the top navbar status dropdown wrapper overlay visibility.
 */
export function toggleProfileDropdown() {
    if (elements.profileDropdownPanel) elements.profileDropdownPanel.classList.toggle("hidden");
}

/**
 * Forces the navbar status dropdown overlay back into a hidden state.
 */
export function closeProfileDropdown() {
    if (elements.profileDropdownPanel) elements.profileDropdownPanel.classList.add("hidden");
}

/**
 * Synchronizes account data labels inside the quick access navigation dropdown overlay.
 */
export function renderProfileMenuDetails(username, isGuest, email, rank, xp) {
    if (elements.dropdownUsername) elements.dropdownUsername.textContent = username;
    const tierBadge = document.querySelector(".tier-badge");
    const xpBadge = document.querySelector(".xp-badge");
    
    if (elements.dropdownEmail) {
        if (isGuest) {
            elements.dropdownEmail.textContent = "Temporary Guest Account";
            if (tierBadge) tierBadge.textContent = "Guest Speculator";
            if (xpBadge) xpBadge.textContent = "0";
        } else {
            elements.dropdownEmail.textContent = email || "No email provided";
            if (tierBadge) tierBadge.textContent = rank || "Unranked";
            if (xpBadge) xpBadge.textContent = xp || "0";
        }
    }

    
}

/**
 * Fully renders the global singleplayer leaderboard view list dynamically.
 * Receives the matching JSON dictionary list array directly from the backend payload.
 */
export function renderLeaderboardView(leaderboardData) {
    if (!elements.leaderboardList) return;

    // Clear out any stale row templates or old data nodes before redrawing
    elements.leaderboardList.innerHTML = "";

    const rowsArray = leaderboardData.leaderboard || [];

    // Fallback presentation layout state if there are zero ranked users active
    if (rowsArray.length === 0) {
        elements.leaderboardList.innerHTML = `
            <div class="placeholder-content">
                <p>No ranked investigators found yet. Complete 5 matches to claim your spot!</p>
            </div>
        `;
        return;
    }

    // ✨ Inject leaderboard headers
    const headerRow = document.createElement("div");
    headerRow.className = "history-item-row leaderboard-header-row";
    headerRow.innerHTML = `
        <div class="history-left-block">
            <span class="leaderboard-header-label label-rank">Rank</span>
            <span class="leaderboard-header-label">Investigator</span>
        </div>
        <div class="history-right-block">
            <span class="leaderboard-header-label label-xp">XP</span>
            <span class="leaderboard-header-label label-turns">Avg Turns</span>
            <span class="leaderboard-header-label label-tier">Tier</span>
        </div>
    `;
    elements.leaderboardList.appendChild(headerRow);

    // Build leaderboard rows
    rowsArray.forEach(entry => {
        const row = document.createElement("div");
        row.className = "history-item-row leaderboard-item-row";

        // Highlight the logged-in user
        if (entry.username === state.username) {
            row.classList.add("leaderboard-self-highlight");
        }

        // Left block: placement + username
        const leftBlock = document.createElement("div");
        leftBlock.className = "history-left-block";

        const positionBadge = document.createElement("span");
        positionBadge.className = `leaderboard-position position-${entry.position}`;
        positionBadge.textContent = `#${entry.position}`;

        const usernameText = document.createElement("span");
        usernameText.className = "history-category leaderboard-username";
        usernameText.textContent = entry.username;

        leftBlock.appendChild(positionBadge);
        leftBlock.appendChild(usernameText);

        // Right block: XP + Avg Turns + Rank
        const rightBlock = document.createElement("div");
        rightBlock.className = "history-right-block";

        const xpText = document.createElement("span");
        xpText.className = "leaderboard-xp";
        xpText.textContent = entry.xp;

        const statsText = document.createElement("span");
        statsText.className = "history-turns leaderboard-score-val";
        statsText.textContent = entry.avg_turns;

        const rankBadge = document.createElement("span");
        rankBadge.textContent = entry.rank;
        rankBadge.className = `rank-circle rank-${entry.rank.toLowerCase()} compact-rank-badge`;

        rightBlock.appendChild(xpText);
        rightBlock.appendChild(statsText);
        rightBlock.appendChild(rankBadge);

        row.appendChild(leftBlock);
        row.appendChild(rightBlock);

        elements.leaderboardList.appendChild(row);
    });
}

// Cached so switching tabs doesn't require a re-fetch from the server
let cachedHistorySingleplayer = [];
let cachedHistoryMultiplayer = [];
let activeHistoryTab = "singleplayer";

export function renderUserProfileView(data) {
    if (elements.profileUsernameDisplay) {
        elements.profileUsernameDisplay.textContent = data.username + (data.is_guest ? " (Guest)" : "");
    }
    if (elements.profileXpDisplay) elements.profileXpDisplay.textContent = `${data.xp} XP Total`;
    if (elements.statAvgTurns) elements.statAvgTurns.textContent = data.is_guest ? "0.0" : data.avg_turns_to_win;
    if (elements.statWinRate) elements.statWinRate.textContent = `${data.win_rate}%`;

    if (elements.profileRankBadge) {
        elements.profileRankBadge.textContent = data.rank;
        elements.profileRankBadge.className = `rank-circle rank-${data.rank.toLowerCase()}`;
    }

    if (elements.profileRankNote) {
        if (data.is_guest) {
            elements.profileRankNote.textContent = "Create an account to be ranked!";
        } else if (!data.history_singleplayer || data.history_singleplayer.length < 5) {
            elements.profileRankNote.textContent = "Play at least 5 matches to be ranked!";
        } else {
            elements.profileRankNote.textContent = "Rank updated daily based on global performance metric indices.";
        }
    }

    cachedHistorySingleplayer = data.history_singleplayer || [];
    cachedHistoryMultiplayer = data.history_multiplayer || [];

    renderActiveHistoryTab();
}

/**
 * Renders whichever history tab (singleplayer / multiplayer) is currently active,
 * using the cached payload from the last profile fetch.
 */
function renderActiveHistoryTab() {
    if (!elements.profileHistoryList) return;

    const isMultiplayer = activeHistoryTab === "multiplayer";
    const list = isMultiplayer ? cachedHistoryMultiplayer : cachedHistorySingleplayer;

    if (elements.tabSingleplayerBtn) elements.tabSingleplayerBtn.classList.toggle("btn-chosen", !isMultiplayer);
    if (elements.tabMultiplayerBtn) elements.tabMultiplayerBtn.classList.toggle("btn-chosen", isMultiplayer);

    elements.profileHistoryList.innerHTML = "";

    if (!list || list.length === 0) {
        const emptyText = isMultiplayer
            ? "No multiplayer matches played yet. Challenge a friend!"
            : "No matches played yet. Go crack some cases!";
        elements.profileHistoryList.innerHTML = `<p class="empty-history-text">${emptyText}</p>`;
        return;
    }

    list.forEach(match => {
        elements.profileHistoryList.appendChild(buildHistoryRow(match, isMultiplayer));
    });
}

/**
 * Builds a single match-history row. Multiplayer rows additionally surface
 * the opponent's username so a win/loss can be read at a glance.
 */
function buildHistoryRow(match, isMultiplayer) {
    const row = document.createElement("div");
    row.className = "history-item-row";
    const formattedCategory = match.category.replace("_", " ").toLowerCase();

    const matchDate = new Date(match.played_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const resultClass = match.result === "WIN" ? "pill-win" : "pill-lose";
    const opponentTag = isMultiplayer
        ? `<span class="history-opponent">vs ${match.opponent_username || "Unknown"}</span>`
        : "";

    row.innerHTML = `
        <div class="history-left-block">
            <span class="history-category">${formattedCategory}</span>
            <span class="history-date">${matchDate}</span>
        </div>
        <div class="history-right-block">
            ${opponentTag}
            <span class="history-turns">${match.turns_used} turn(s)</span>
            <span class="history-xp">+${match.xp_earned} XP</span>
            <span class="status-pill ${resultClass}">${match.result}</span>
        </div>
    `;
    return row;
}

if (elements.tabSingleplayerBtn) {
    elements.tabSingleplayerBtn.addEventListener("click", () => {
        activeHistoryTab = "singleplayer";
        renderActiveHistoryTab();
    });
}

if (elements.tabMultiplayerBtn) {
    elements.tabMultiplayerBtn.addEventListener("click", () => {
        activeHistoryTab = "multiplayer";
        renderActiveHistoryTab();
    });
}

/**
 * Clears selection borders across the choice elements during authentication toggle steps.
 */
export function unselectAuthBtns() {
    if (elements.showLoginBtn) elements.showLoginBtn.classList.remove("btn-chosen");
    if (elements.showSignupBtn) elements.showSignupBtn.classList.remove("btn-chosen");
    if (elements.showGuestBtn) elements.showGuestBtn.classList.remove("btn-chosen");
}