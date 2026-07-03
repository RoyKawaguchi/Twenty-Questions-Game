import * as api from "./api.js";
import { state, resetState } from "./state.js";
import { 
    elements, renderCategoryButtons, setupMatchViewUI,
    updateMetaLabels, appendMessageBubble, setInputsEnabled, handleGameOverUI, 
    injectReasoningBoxes, clearReasoningBoxes, activateAuthForm, showAuthError, 
    toggleProfileDropdown, closeProfileDropdown, 
    renderProfileMenuDetails, renderUserProfileView, unselectAuthBtns,
    highlightSelectedCategory, resetCategoryLaunchUI,
    setupSingleplayerWorkspace, rebuildChatHistoryUI
} from "./ui.js";

/**
 * Centralized View Engine Layout Manager
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
        if (container) container.classList.add("hidden");
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

async function boot() {
    setupCoreApplicationListeners();

    if (!state.token) {
        switchViewToAuth();
        setupAuthListeners();
        return;
    }

    try {
        const profileData = await api.getUserInfo();        
        renderProfileMenuDetails(profileData.username, profileData.is_guest, state.email);
        
        // Synchronize any active paused game waiting on the server database
        state.activeGame = profileData.active_game || null; 
        
        switchViewToDashboard();
    } catch (err) {
        console.error("Boot payload sync failed:", err);
        switchViewToDashboard();
    }
}

function switchViewToDashboard() { switchView(elements.dashboardContainer); }
function switchViewToAuth() { switchView(elements.authContainer); }

async function switchViewToSingleplayer() {
    if (!state.token) {
        switchViewToAuth();
        setupAuthListeners();
        return;
    }

    try {
        switchView(elements.singleplayerContainer);
        
        // Pass our active game state token straight over to our UI layer logic matrix
        setupSingleplayerWorkspace(state.activeGame);

        // If there is no active game, load the categories choice buttons as usual
        if (!state.activeGame) {
            const data = await api.fetchCategories();
            renderCategoryButtons(data.categories, selectCategoryTrigger);
        }
    } catch (err) {
        alert("Failed to connect to game backend pipeline: " + err.message);
    }
}

function switchViewToMultiplayer() { switchView(elements.multiplayerContainer); }
function switchViewToLeaderboard() { switchView(elements.leaderboardContainer); }

async function switchViewToProfile() {
    try {
        switchView(elements.profileContainer);
        const profileData = await api.getUserInfo();
        renderUserProfileView(profileData);
    } catch (err) {
        alert("Could not synchronize profile metrics: " + err.message);
    }
}

function switchViewToMatch() { 
    switchView(elements.gameContainer); 
    elements.chatDisplay.innerHTML = "";
    
    setupMatchViewUI();
}

/**
 * Single-Run Core Event Wireframe Registration
 */
function setupCoreApplicationListeners() {
    if (window.coreListenersInitialized) return;
    window.coreListenersInitialized = true;

    // 1. Top Navbar Header Dropdown Controls
    elements.profileMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleProfileDropdown();
    });

    window.addEventListener("click", (e) => {
        if (!elements.profileDropdownPanel.classList.contains("hidden")) {
            if (!elements.profileDropdownPanel.contains(e.target) && !elements.profileMenuBtn.contains(e.target)) {
                closeProfileDropdown();
            }
        }
    });

    // 2. Dashboard Hub Navigation Connections
    elements.menuSingleplayerBtn.addEventListener("click", switchViewToSingleplayer);
    elements.menuMultiplayerBtn.addEventListener("click", switchViewToMultiplayer);
    elements.menuLeaderboardBtn.addEventListener("click", switchViewToLeaderboard);
    elements.menuProfileBtn.addEventListener("click", switchViewToProfile);

    // 3. Sub-View Centered Navigation Layout Return Flow Mapping
    const backBtnMappings = [
        { id: "singleplayer-back-btn", target: switchViewToDashboard },
        { id: "multiplayer-back-btn", target: switchViewToDashboard },
        { id: "leaderboard-back-btn", target: switchViewToDashboard },
        { id: "profile-back-btn", target: switchViewToDashboard }
    ];

    backBtnMappings.forEach(mapping => {
        const btn = document.getElementById(mapping.id);
        if (btn) {
            btn.addEventListener("click", () => {
                if (mapping.id === "singleplayer-back-btn") {
                    resetCategoryLaunchUI();
                    state.selectedCategory = null;
                }
                mapping.target();
            });
        }
    });

    // 4. Category Grid Primary Launcher Button Trigger
    elements.singleplayerLaunchBtn.addEventListener("click", async () => {
        if (!state.selectedCategory) return;
        try {
            elements.singleplayerLaunchBtn.disabled = true;
            const gameData = await api.startGame(state.selectedCategory);
            
            // Prime our runtime tracking session states
            state.gameId = gameData.game_id;
            state.category = gameData.category;
            state.maxQuestions = gameData.max_questions;
            state.turnsUsed = 0;
            state.gameStage = gameData.game_stage;
            state.analysisHistory = null;

            resetCategoryLaunchUI();
            state.selectedCategory = null; 

            switchViewToMatch();
            updateMetaLabels();
            appendMessageBubble(
                "AI", 
                `I am thinking of an item in the following category: ${state.category}. Begin asking Yes or No questions!`,
                true);
        } catch (err) {
            alert("Could not spin up match context: " + err.message);
            elements.singleplayerLaunchBtn.disabled = false;
        }
    });

    // ─── 5. NEW ACTIVE DOSSIER PORTAL EXECUTORS ───
    elements.portalResumeBtn.addEventListener("click", () => {
        if (!state.activeGame) return;

        // Copy cached data parameters back onto main active runtime variables
        state.gameId = state.activeGame.game_id;
        state.category = state.activeGame.category;
        state.turnsUsed = state.activeGame.turns_used;
        state.maxQuestions = state.activeGame.max_questions || 20;
        state.gameStage = "PLAYING"; 
        state.analysisHistory = null;

        switchViewToMatch();
        updateMetaLabels();

        // Rebuild historical dialogue logs cleanly inside view layout arrays
        rebuildChatHistoryUI(state.activeGame.chat_history);
        
        // Notify user that execution pipeline is back online
        appendMessageBubble(
            "AI", 
            `Investigation re-established! You have ${state.maxQuestions - state.turnsUsed} questions remaining.`,
            false
        );
        setInputsEnabled(true);
        
        // Empty out activeGame buffer cache since it's now our main live game
        state.activeGame = null;
    });

    elements.portalForfeitBtn.addEventListener("click", async () => {
        if (!state.activeGame) return;
        const confirmForfeit = confirm("Are you sure you want to forfeit this case? This counts as an automatic loss on your global ranking records!");
        if (!confirmForfeit) return;

        try {
            elements.portalForfeitBtn.disabled = true;
            const result = await api.abandonGame(state.activeGame.game_id);
            
            alert(`Case file closed. The answer was: ${result.secret_answer}`);
            
            state.activeGame = null; // Clear out active dossier cache
            setupSingleplayerWorkspace(null); // Re-render clean slate grid layout
            
            // Re-render selection button grid maps
            const data = await api.fetchCategories();
            renderCategoryButtons(data.categories, selectCategoryTrigger);
        } catch (err) {
            alert("Failed to close case safely: " + err.message);
        } finally {
            elements.portalForfeitBtn.disabled = false;
        }
    });

    // ─── 6. NEW MID-GAMEPLAY CONTROLLER ROW ACTIONS ───
    elements.gamePauseBtn.addEventListener("click", async () => {
        if (!state.gameId) return;
        try {
            setInputsEnabled(false);
            
            const confirmPause = confirm("Pause and save match for later?");
            if (!confirmPause) {
                setInputsEnabled(true);
                return;
            }

            await api.pauseGame(state.gameId);
            
            resetState();
            boot();
        } catch (err) {
            alert("Failed to hibernate current match: " + err.message);
            setInputsEnabled(true);
        }
    });

    elements.gameAbandonBtn.addEventListener("click", async () => {
        if (!state.gameId) return;
        const confirmAbandon = confirm("Abandon match? This will be logged as a loss.");
        if (!confirmAbandon) return;

        try {
            setInputsEnabled(false);
            const result = await api.abandonGame(state.gameId);
            
            // Reuse your structural end game overlay pipeline to display details cleanly
            handleGameOverUI("LOSS", result.secret_answer, "You forefeited the match.");
        } catch (err) {
            alert("Failed to terminate match: " + err.message);
            setInputsEnabled(true);
        }
    });

    // 7. Session Termination Clean Loops
    elements.signoutActionBtn.addEventListener("click", () => {
        state.token = null;
        state.username = null;
        state.isGuest = false;
        state.email = null;

        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("isGuest");
        localStorage.removeItem("email");

        closeProfileDropdown();
        resetState();
        state.analysisHistory = null; 
        state.activeGame = null;
        
        boot();
    });
}

function setupAuthListeners() {
    if (window.authListenersInitialized) return;
    window.authListenersInitialized = true;

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

    elements.signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const data = await api.registerUser(
                document.getElementById("signup-username").value.trim(),
                document.getElementById("signup-email").value.trim(),
                document.getElementById("signup-password").value
            );
            handleAuthSuccess(data);
        } catch (err) { showAuthError(err.message); }
    });

    elements.loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const data = await api.loginUser(
                document.getElementById("login-identity").value.trim(),
                document.getElementById("login-password").value
            );
            handleAuthSuccess(data);
        } catch (err) { showAuthError(err.message); }
    });

    elements.guestForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const data = await api.initializeGuestSession(
                document.getElementById("guest-nickname").value.trim()
            );
            handleAuthSuccess(data);
        } catch (err) { showAuthError(err.message); }
    });
}

function handleAuthSuccess(payload) {
    state.token = payload.token;
    state.username = payload.username;
    state.isGuest = payload.is_guest;
    state.email = payload.email || "";

    localStorage.setItem("token", payload.token);
    localStorage.setItem("username", payload.username);
    localStorage.setItem("isGuest", payload.is_guest);
    localStorage.setItem("email", payload.email || "");

    boot();
}

function selectCategoryTrigger(category) {
    state.selectedCategory = category;
    highlightSelectedCategory(category);
}

// Gameplay Action Form Event Hookups
elements.questionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const qText = elements.questionInput.value.trim();
    if (!qText) return;

    elements.questionInput.value = "";
    appendMessageBubble("USER_QUESTION", qText, false);
    setInputsEnabled(false);

    try {
        const result = await api.askQuestion(state.gameId, qText);
        state.turnsUsed = result.turns_used;
        state.gameStage = result.game_stage;
        
        updateMetaLabels();

        appendMessageBubble("AI", result.response, true);

        if (state.gameStage === "FINAL_GUESS") {
            appendMessageBubble(
                "AI", 
                "That's all for the Q&A's! Please enter your final guess now!",
                false
            );
        }
    } catch (err) {
        appendMessageBubble("AI", "Error: " + err.message, false);
    } finally { setInputsEnabled(true); }
});

elements.guessForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const gText = elements.guessInput.value.trim();
    if (!gText) return;

    elements.guessInput.value = "";
    appendMessageBubble("USER_GUESS", gText, false);
    setInputsEnabled(false);

    try {
        const result = await api.submitGuess(state.gameId, gText);
        state.turnsUsed = result.turns_used;
        state.gameStage = result.game_stage;

        updateMetaLabels();
        appendMessageBubble("AI", `${result.response}`, true);

        if (state.gameStage === "GAME_OVER") {
            handleGameOverUI(result.game_result, result.secret_answer, result.response);
        }
    } catch (err) {
        appendMessageBubble("AI", "Error: " + err.message, false);
    } finally { setInputsEnabled(true); }
});

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

elements.restartBtn.addEventListener("click", () => {
    resetState();
    state.analysisHistory = null;
    state.activeGame = null;
    switchViewToSingleplayer();
});

// Document Initialization Bootstrap Hook
document.addEventListener("DOMContentLoaded", boot);