import * as api from "./api.js";
import { state, resetState } from "./state.js";
import { 
    elements, renderCategoryButtons, switchViewToMatch, 
    updateMetaLabels, appendMessageBubble, setInputsEnabled, handleGameOverUI, 
    injectReasoningBoxes, clearReasoningBoxes, activateAuthForm, showAuthError, 
    switchViewToAuth, toggleProfileDropdown, closeProfileDropdown, 
    renderProfileMenuDetails, unselectAuthBtns
} from "./ui.js";

/**
 * Centralized View Engine Layout Manager
 * Systematically isolates containers to guarantee no multiple screens leak through.
 */
function switchView(targetContainer) {
    const containers = [
        elements.authContainer,
        elements.dashboardContainer,
        elements.singleplayerContainer,
        elements.multiplayerContainer,
        elements.leaderboardContainer,
        elements.profileContainer,
        elements.gameContainer
    ];

    containers.forEach(container => {
        if (container) {
            container.classList.add("hidden");
        }
    });

    if (targetContainer) {
        targetContainer.classList.remove("hidden");
    }

    if (targetContainer === elements.authContainer) {
        elements.profileMenuBtn.classList.add("hidden");
    } else {
        elements.profileMenuBtn.classList.remove("hidden");
    }
}

function boot() {
    // If the player isn't logged in, redirect them immediately to the gateway
    if (!state.token) {
        switchViewToAuth(); // UI framework explicit helper
        setupAuthListeners(); // Initialize buttons once
        return;
    }

    try {
        renderProfileMenuDetails(state.username, state.isGuest);
        setupGlobalNavigationListeners();
        switchViewToDashboard();
    } catch (err) {
        alert("Failed to connect to game backend pipeline: " + err.message);
    }
}

function switchViewToDashboard() {
    switchView(elements.dashboardContainer);
    setupMenu();
}

async function switchViewToSingleplayer() {
    if (!state.token) {
        switchViewToAuth();
        setupAuthListeners();
        return;
    }

    try {
        renderProfileMenuDetails(state.username, state.isGuest);
        setupGlobalNavigationListeners();
        switchView(elements.singleplayerContainer);

        const data = await api.fetchCategories();
        renderCategoryButtons(data.categories, selectCategoryTrigger);
    } catch (err) {
        alert("Failed to connect to game backend pipeline: " + err.message);
    }
}

function switchViewToMultiplayer() {
    switchView(elements.multiplayerContainer);
}

function switchViewToLeaderboard() {
    switchView(elements.leaderboardContainer);
}

function switchViewToProfile() {
    switchView(elements.profileContainer);
}

function setupMenu() {
    if (window.dashboardInitialized) {
        return;
    }
    window.dashboardInitialized = true;

    // Grid Dashboard Menu Item Actions
    elements.menuSingleplayerBtn.addEventListener("click", () => {
        switchViewToSingleplayer();
    });
    elements.menuMultiplayerBtn.addEventListener("click", () => {
        switchViewToMultiplayer();
    });
    elements.menuLeaderboardBtn.addEventListener("click", () => {
        switchViewToLeaderboard();
    });
    elements.menuProfileBtn.addEventListener("click", () => {
        switchViewToProfile();
    });

    // Sub-view Return Navigation Flows
    const backBtnMappings = [
        { btn: document.getElementById("singleplayer-back-btn"), target: switchViewToDashboard },
        { btn: document.getElementById("multiplayer-back-btn"), target: switchViewToDashboard },
        { btn: document.getElementById("leaderboard-back-btn"), target: switchViewToDashboard },
        { btn: document.getElementById("profile-back-btn"), target: switchViewToDashboard }
    ];

    backBtnMappings.forEach(mapping => {
        if (mapping.btn) {
            mapping.btn.addEventListener("click", mapping.target);
        }
    });
}

// Separate helper to register event listeners for auth buttons and forms
function setupAuthListeners() {
    // Prevent duplicate registrations if boot cycles
    if (window.authListenersInitialized) {
        return;
    }
    window.authListenersInitialized = true;

    // View Switching Toggles
    elements.showLoginBtn.addEventListener("click", () => {
        activateAuthForm(elements.loginForm);
        unselectAuthBtns();
        elements.showLoginBtn.classList.add("btn-chosen");
    });
    elements.showSignupBtn.addEventListener("click", () => {
        activateAuthForm(elements.signupForm);
        unselectAuthBtns();
        elements.showSignupBtn.classList.add("btn-chosen");
    });
    elements.showGuestBtn.addEventListener("click", () => {
        activateAuthForm(elements.guestForm);
        unselectAuthBtns();
        elements.showGuestBtn.classList.add("btn-chosen");
    });

    // Handle Form Submissions
    elements.signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("signup-username").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;

        try {
            const data = await api.registerUser(username, email, password);
            handleAuthSuccess(data);
        } catch (err) {
            showAuthError(err.message);
        }
    });

    elements.loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const identity = document.getElementById("login-identity").value.trim();
        const password = document.getElementById("login-password").value;

        try {
            const data = await api.loginUser(identity, password);
            handleAuthSuccess(data);
        } catch (err) {
            showAuthError(err.message);
        }
    });

    elements.guestForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nickname = document.getElementById("guest-nickname").value.trim();

        try {
            const data = await api.initializeGuestSession(nickname);
            handleAuthSuccess(data);
        } catch (err) {
            showAuthError(err.message);
        }
    });
}

function handleAuthSuccess(payload) {
    // 1. Commit token details to state object
    state.token = payload.token;
    state.username = payload.username;
    state.isGuest = payload.is_guest;

    // 2. Persist profile info across browser updates
    localStorage.setItem("token", payload.token);
    localStorage.setItem("username", payload.username);
    localStorage.setItem("isGuest", payload.is_guest);

    // 3. Shift view into the Menu Ecosystem Dashboard
    boot();
}

async function selectCategoryTrigger(category) {
    try {
        const gameData = await api.startGame(category);
        state.gameId = gameData.game_id;
        state.category = gameData.category;
        state.maxQuestions = gameData.max_questions;
        state.turnsUsed = 0;
        state.gameStage = gameData.game_stage;

        switchViewToMatch(); // Updates visibility wrapper for gameplay
        updateMetaLabels();
        appendMessageBubble("AI", `I am thinking of an item in the following category: ${category}. Begin asking Yes or No questions!`);
    } catch (err) {
        alert("Could not spin up match context: " + err.message);
    }
}

// 1. Hook up Question Input Handler
elements.questionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const qText = elements.questionInput.value.trim();
    if (!qText) return;

    elements.questionInput.value = "";
    appendMessageBubble("USER_QUESTION", qText);
    setInputsEnabled(false);

    try {
        const result = await api.askQuestion(state.gameId, qText);
        state.turnsUsed = result.turns_used;
        state.gameStage = result.game_stage;
        
        updateMetaLabels();
        appendMessageBubble("AI", result.response);

        if (state.gameStage === "FINAL_GUESS") {
            appendMessageBubble("AI", "That's all for the Q&A's! Please enter your final guess now!");
        }
    } catch (err) {
        appendMessageBubble("AI", "Error: " + err.message);
    } finally {
        setInputsEnabled(true);
    }
});

// 2. Hook up Guess Input Handler
elements.guessForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const gText = elements.guessInput.value.trim();
    if (!gText) return;

    elements.guessInput.value = "";
    appendMessageBubble("USER_GUESS", gText);
    setInputsEnabled(false);

    try {
        const result = await api.submitGuess(state.gameId, gText);
        state.turnsUsed = result.turns_used;
        state.gameStage = result.game_stage;

        updateMetaLabels();
        appendMessageBubble("AI", `Result validation returned: ${result.response}`);

        if (state.gameStage === "GAME_OVER") {
            handleGameOverUI(result.game_result, result.secret_answer, state.turnsUsed);
        }
    } catch (err) {
        appendMessageBubble("AI", "Error: " + err.message);
    } finally {
        setInputsEnabled(true);
    }
});

// 3. Hook up "Examine AI Reasoning" Switch Toggle
elements.analysisToggle.addEventListener("change", async () => {
    if (elements.analysisToggle.checked) {
        if (!state.analysisHistory) {
            try {
                const logs = await api.fetchAnalysis(state.gameId);
                state.analysisHistory = logs.chat_history;
            } catch (err) {
                alert("Failed fetching analysis layer logs: " + err.message);
                elements.analysisToggle.checked = false;
                return;
            }
        }
        injectReasoningBoxes(state.analysisHistory);
    } else {
        clearReasoningBoxes();
    }
});

// 4. Hook up Match Reset Iteration
elements.restartBtn.addEventListener("click", () => {
    resetState();
    switchViewToSingleplayer();
});

// Initialize on load
document.addEventListener("DOMContentLoaded", boot);

function setupGlobalNavigationListeners() {
    if (window.navigationListenersInitialized) return;
    window.navigationListenersInitialized = true;

    // 1. Toggle open/close state on profile button click
    elements.profileMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleProfileDropdown();
    });

    // 2. Clear out container dropdown automatically if user clicks elsewhere
    window.addEventListener("click", (e) => {
        if (!elements.profileDropdownPanel.classList.contains("hidden")) {
            if (!elements.profileDropdownPanel.contains(e.target) && !elements.profileMenuBtn.contains(e.target)) {
                closeProfileDropdown();
            }
        }
    });

    // 3. SIGN OUT TRIGGER ACTION PIPELINE
    elements.signoutActionBtn.addEventListener("click", () => {
        state.token = null;
        state.username = null;
        state.isGuest = false;

        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("isGuest");

        closeProfileDropdown();
        resetState();
        
        boot();
    });
}