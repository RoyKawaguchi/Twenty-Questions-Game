import { state } from "./state.js";

// DOM Caching elements
export const elements = {
    singleplayerContainer: document.getElementById("singleplayer-container"),
    dashboardContainer: document.getElementById("dashboard-container"),
    multiplayerContainer: document.getElementById("multiplayer-container"),
    leaderboardContainer: document.getElementById("leaderboard-container"),
    profileContainer: document.getElementById("profile-container"),
    menuGrid: document.getElementById("menu-grid"),
    menuSingleplayerBtn: document.getElementById("menu-singleplayer-btn"),
    menuMultiplayerBtn: document.getElementById("menu-multiplayer-btn"),
    menuLeaderboardBtn: document.getElementById("menu-leaderboard-btn"),
    menuProfileBtn: document.getElementById("menu-profile-btn"),
    
    gameContainer: document.getElementById("game-container"),
    categorySelectionWorkspace: document.getElementById("category-selection-workspace"),
    categoryGrid: document.getElementById("category-grid"),
    categoryBadge: document.getElementById("category-badge"),
    singleplayerLaunchBtn: document.getElementById("singleplayer-launch-btn"),

    turnCounter: document.getElementById("turn-counter"),
    chatDisplay: document.getElementById("chatDisplay") || document.getElementById("chat-display"),
    inputSection: document.getElementById("input-section"),
    questionForm: document.getElementById("question-form"),
    questionInput: document.getElementById("question-input"),
    guessForm: document.getElementById("guess-form"),
    guessInput: document.getElementById("guess-input"),
    gamePauseBtn: document.getElementById("game-pause-btn"),
    gameAbandonBtn: document.getElementById("game-abandon-btn"),

    gameOverPanel: document.getElementById("game-over-panel"),
    endStatusHeading: document.getElementById("end-status-heading"),
    endMessageText: document.getElementById("end-message-text"),
    revealBox: document.getElementById("reveal-box"),
    secretWordDisplay: document.getElementById("secret-word-display"),
    analysisToggle: document.getElementById("analysis-toggle"),
    restartBtn: document.getElementById("restart-btn"),

    authContainer: document.getElementById("auth-container"),
    showLoginBtn: document.getElementById("show-login-btn"),
    showSignupBtn: document.getElementById("show-signup-btn"),
    showGuestBtn: document.getElementById("show-guest-btn"),
    loginForm: document.getElementById("login-form"),
    signupForm: document.getElementById("signup-form"),
    guestForm: document.getElementById("guest-form"),
    authErrorMsg: document.getElementById("auth-error-message"),

    profileMenuBtn: document.getElementById("profile-menu-btn"),
    profileDropdownPanel: document.getElementById("profile-dropdown-panel"),
    dropdownUsername: document.getElementById("dropdown-username"),
    dropdownEmail: document.getElementById("dropdown-email"),
    signoutActionBtn: document.getElementById("signout-action-btn"),

    profileUsernameDisplay: document.getElementById("profile-username-display"),
    profileXpDisplay: document.getElementById("profile-xp-display"),
    profileRankBadge: document.getElementById("profile-rank-badge"),
    profileRankNote: document.getElementById("profile-rank-note"),
    statAvgTurns: document.getElementById("stat-avg-turns"),
    statWinRate: document.getElementById("stat-win-rate"),
    profileHistoryList: document.getElementById("profile-history-list"),

    // ─── NEW DOSSIER PAUSE/RESUME PORTAL NODES ───
    activeInvestigationPortal: document.getElementById("active-investigation-portal"),
    portalMetaCategory: document.getElementById("portal-meta-category"),
    portalMetaTurns: document.getElementById("portal-meta-turns"),
    portalResumeBtn: document.getElementById("portal-resume-btn"),
    portalForfeitBtn: document.getElementById("portal-forfeit-btn"),
};

export function renderCategoryButtons(categories, onSelectCategory) {
    elements.categoryGrid.innerHTML = "";
    categories.forEach(category => {
        const button = document.createElement("button");
        button.className = "btn btn-secondary category-btn";
        button.textContent = category.replace("_", " ").toUpperCase();
        
        button.addEventListener("click", () => onSelectCategory(category));
        elements.categoryGrid.appendChild(button);
    });
}

/**
 * Pure layout configuration tool for the active arena state.
 */
export function setupMatchViewUI() {
    elements.profileMenuBtn.classList.remove("hidden");
    elements.gameOverPanel.classList.add("hidden");
    elements.inputSection.classList.remove("hidden");
}

export function highlightSelectedCategory(selectedButtonName) {
    const categoryButtons = elements.categoryGrid.querySelectorAll(".btn");
    categoryButtons.forEach(btn => {
        if (btn.textContent.trim().toLowerCase() === selectedButtonName.replace("_", " ").toLowerCase()) {
            btn.classList.add("btn-chosen");
        } else {
            btn.classList.remove("btn-chosen");
        }
    });
    elements.singleplayerLaunchBtn.disabled = false;
    elements.singleplayerLaunchBtn.classList.add("ready-to-play");
}

export function resetCategoryLaunchUI() {
    elements.singleplayerLaunchBtn.disabled = true;
    elements.singleplayerLaunchBtn.classList.remove("ready-to-play");
}

export function updateMetaLabels() {
    elements.categoryBadge.textContent = `Category: ${state.category}`;
    elements.turnCounter.textContent = `Turns Used: ${state.turnsUsed} / ${state.maxQuestions}`;
}

export function appendMessageBubble(senderType, messageText, shouldTrackAnalysis = false) {
    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble");

    if (senderType === "USER_QUESTION") {
        bubble.classList.add("user-q");
    } else if (senderType === "USER_GUESS") {
        bubble.classList.add("user-g");
    } else if (senderType === "AI") {
        bubble.classList.add("ai-a");
        
        // Dynamic counter indexing calculation without relying on local file state variables
        if (shouldTrackAnalysis) {
            const currentAiMatches = elements.chatDisplay.querySelectorAll(".ai-a[data-ai-index]");
            bubble.setAttribute("data-ai-index", currentAiMatches.length);
        }
    }

    bubble.textContent = messageText;
    elements.chatDisplay.appendChild(bubble);
    elements.chatDisplay.scrollTop = elements.chatDisplay.scrollHeight;
}

export function setInputsEnabled(enabled) {
    const inputsAndButtons = [
        elements.questionInput, elements.guessInput,
        document.getElementById("ask-btn"), document.getElementById("guess-btn")
    ];
    inputsAndButtons.forEach(el => {
        if (el) el.disabled = !enabled;
    });
    elements.questionInput.focus();
}

export function handleGameOverUI(result, secretAnswer, response) {
    elements.inputSection.classList.add("hidden");
    elements.gameOverPanel.classList.remove("hidden");
    elements.analysisToggle.checked = false;

    if (result === "WIN") {
        elements.endStatusHeading.textContent = "🎉 Victory!";
    } else {
        elements.endStatusHeading.textContent = "😔 Defeat!";
    }
    elements.endMessageText.textContent = `${response}`;

    if (secretAnswer) {
        elements.secretWordDisplay.textContent = secretAnswer.toUpperCase();
        elements.revealBox.classList.remove("hidden");
    } else {
        elements.revealBox.classList.add("hidden");
    }
}

export function injectReasoningBoxes(analysisHistory) {
    clearReasoningBoxes();
    const aiBubbles = elements.chatDisplay.querySelectorAll('.ai-a[data-ai-index]');

    aiBubbles.forEach(bubble => {
        const index = parseInt(bubble.getAttribute("data-ai-index"), 10);
        const analysisData = analysisHistory[index];

        if (analysisData) {
            const reasoningBox = document.createElement("div");
            reasoningBox.classList.add("ai-reasoning-box");
            reasoningBox.textContent = `Reasoning: ${analysisData.analysis || analysisData.text}`;
            bubble.parentNode.insertBefore(reasoningBox, bubble.nextSibling);
        }
    });
}

export function clearReasoningBoxes() {
    const boxes = elements.chatDisplay.querySelectorAll(".ai-reasoning-box");
    boxes.forEach(box => box.remove());
}

export function setupSingleplayerWorkspace(activeGame) {
    if (activeGame) {
        elements.portalMetaCategory.textContent = activeGame.category;
        elements.portalMetaTurns.textContent = `${activeGame.turns_used} / ${activeGame.max_questions}`;
        elements.categorySelectionWorkspace.classList.add("hidden");
        elements.activeInvestigationPortal.classList.remove("hidden");
        document.getElementById("singleplayer-view-title").textContent = "Active Investigation Pending";
    } else {
        elements.activeInvestigationPortal.classList.add("hidden");
        elements.categorySelectionWorkspace.classList.remove("hidden");
        document.getElementById("singleplayer-view-title").textContent = "Select a Category to Start";
        elements.singleplayerLaunchBtn.disabled = true;
        elements.singleplayerLaunchBtn.classList.remove("ready-to-play");
    }
}

export function rebuildChatHistoryUI(historyArray) {
    elements.chatDisplay.innerHTML = "";

    historyArray.forEach(msg => {
        if (msg.type === "question") {
            appendMessageBubble("USER_QUESTION", msg.text);
            appendMessageBubble("AI", msg.response, true); 
        } else if (msg.type === "guess") {
            appendMessageBubble("USER_GUESS", msg.text);
            appendMessageBubble("AI", msg.response, true);
        }
    });
}

export function activateAuthForm(activeFormElement) {
    elements.profileMenuBtn.classList.add("hidden");
    if (elements.authErrorMsg) {
        elements.authErrorMsg.textContent = "";
        elements.authErrorMsg.classList.add("hidden");
    }
    elements.loginForm.classList.add("hidden");
    elements.signupForm.classList.add("hidden");
    elements.guestForm.classList.add("hidden");
    activeFormElement.classList.remove("hidden");
}

export function showAuthError(message) {
    if (elements.authErrorMsg) {
        elements.authErrorMsg.textContent = message;
        elements.authErrorMsg.classList.remove("hidden");
    }
}

export function toggleProfileDropdown() {
    elements.profileDropdownPanel.classList.toggle("hidden");
}

export function closeProfileDropdown() {
    elements.profileDropdownPanel.classList.add("hidden");
}

export function renderProfileMenuDetails(username, isGuest, email) {
    elements.dropdownUsername.textContent = username;
    if (isGuest) {
        elements.dropdownEmail.textContent = "Temporary Guest Account";
        document.querySelector(".tier-badge").textContent = "Guest Speculator";
    } else {
        elements.dropdownEmail.textContent = `${email}` || "No email provided";
        document.querySelector(".tier-badge").textContent = "Novice Detective";
    }
}

export function renderUserProfileView(data) {
    elements.profileUsernameDisplay.textContent = data.username + (data.is_guest ? " (Guest)" : "");
    elements.profileXpDisplay.textContent = `${data.xp} XP Total`;
    elements.statAvgTurns.textContent = data.is_guest ? "0.0" : data.avg_turns_to_win;
    elements.statWinRate.textContent = `${data.win_rate}%`;

    elements.profileRankBadge.textContent = data.rank;
    elements.profileRankBadge.className = "rank-circle"; 
    elements.profileRankBadge.classList.add(`rank-${data.rank.toLowerCase()}`);

    if (data.is_guest) {
        elements.profileRankNote.textContent = "Create an account to be ranked!";
    } else if (data.history_singleplayer.length < 5) {
        elements.profileRankNote.textContent = "Play at least 5 matches to be ranked!";
    }

    elements.profileHistoryList.innerHTML = "";

    if (!data.history_singleplayer || data.history_singleplayer.length === 0) {
        elements.profileHistoryList.innerHTML = `
            <p class="empty-history-text">No matches played yet. Go crack some cases!</p>
        `;
        return;
    }

    data.history_singleplayer.forEach(match => {
        const row = document.createElement("div");
        row.className = "history-item-row";
        const formattedCategory = match.category.replace("_", " ").toLowerCase();
        
        const matchDate = new Date(match.played_at).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const resultClass = match.result === "WIN" ? "pill-win" : "pill-lose";

        row.innerHTML = `
            <div class="history-left-block">
                <span class="history-category">${formattedCategory}</span>
                <span class="history-date">${matchDate}</span>
            </div>
            <div class="history-right-block">
                <span class="history-turns">${match.turns_used} turn(s)</span>
                <span class="history-xp">+${match.xp_earned} XP</span>
                <span class="status-pill ${resultClass}">${match.result}</span>
            </div>
        `;
        elements.profileHistoryList.appendChild(row);
    });
}

export function unselectAuthBtns() {
    elements.showLoginBtn.classList.remove("btn-chosen");
    elements.showSignupBtn.classList.remove("btn-chosen");
    elements.showGuestBtn.classList.remove("btn-chosen");
}