import * as api from "./api.js";
import { state, resetState, resetMatchState, GAME_STAGES, GAME_MODES } from "./state.js";
import {
    elements, activateAuthForm, showAuthError,
    toggleProfileDropdown, closeProfileDropdown,
    renderProfileMenuDetails, renderUserProfileView, unselectAuthBtns,
    renderLeaderboardView
} from "./ui.js";

import { initializeSocketConnection, disconnectSocket, socketService } from './socket.js';
import { renderLobbyView, renderLobbyCategories, lobbyElements } from './views/lobbyView.js';
import {
    gameplayElements, setupMatchViewUI, appendResponsiveMessageBubble,
    synchronizeInputControls, handleGameOverUI, injectReasoningBoxes,
    clearReasoningBoxes, rebuildChatHistoryUI, setInputsEnabled
} from './views/gameplayView.js';
import {
    singleplayerLobbyElements, setupSingleplayerWorkspace,
    renderSingleplayerCategories, highlightSelectedCategory, resetCategoryLaunchUI
} from './views/singleplayerLobbyView.js';
import { renderAboutView } from './views/aboutView.js';

function switchView(targetContainer) {
    const containers = [
        elements.authContainer,
        elements.dashboardContainer,
        elements.singleplayerContainer,
        elements.multiplayerContainer,
        elements.leaderboardContainer,
        elements.profileContainer,
        elements.gameContainer,
        elements.aboutContainer,
    ];

    containers.forEach(container => {
        if (container) container.classList.add("hidden");
    });

    if (targetContainer) targetContainer.classList.remove("hidden");

    if (elements.profileMenuBtn) {
        if (targetContainer === elements.authContainer) {
            elements.profileMenuBtn.classList.add("hidden");
        } else {
            elements.profileMenuBtn.classList.remove("hidden");
        }
    }
}

async function boot() {
    setupCoreApplicationListeners();
    setupMultiplayerActionListeners(); 

    if (!state.token) {
        switchViewToAuth();
        setupAuthListeners();
        return;
    }

    initializeSocketConnection({
        onMatchLaunchTriggered: handleMatchLaunchTriggered,
        onAiResponseProcessed: handleAiResponseProcessed,
        onReturnedToLobby: handleReturnedToLobby,   // <-- added
        onConnectError: (err) => {
            console.error("Realtime channel rejected the session:", err.message);
        }
    });

    try {
        refreshLeaderboard();
        refreshProfileMenu();

        const profileData = await api.getUserInfo();

        state.activeGame = profileData.active_game || null;
        switchViewToDashboard();
    } catch (err) {
        console.error("Boot payload sync failed:", err);
        switchViewToDashboard();
    }
}

async function refreshLeaderboard() {
    const leaderboardData = await api.getLeaderboard();
    renderLeaderboardView(leaderboardData);
}

async function refreshProfileMenu() {
    const profileData = await api.getUserInfo();
    renderProfileMenuDetails(profileData.username, profileData.is_guest, state.email, profileData.rank || "Unranked", profileData.xp || 0);
}

function switchViewToDashboard() { switchView(elements.dashboardContainer); }
function switchViewToAuth() { switchView(elements.authContainer); }

async function switchViewToSingleplayer() {
    state.gameMode = GAME_MODES.SINGLEPLAYER;
    if (!state.token) {
        switchViewToAuth();
        setupAuthListeners();
        return;
    }

    try {
        switchView(elements.singleplayerContainer);
        
        const portal = document.getElementById("active-investigation-portal");
        const workspace = singleplayerLobbyElements.categorySelectionWorkspace;
        const title = document.getElementById("singleplayer-view-title");

        if (state.activeGame) {
            if (portal) portal.classList.remove("hidden");
            if (workspace) workspace.classList.add("hidden");
            if (title) title.textContent = "Active Game Pending";
            
            const metaCat = document.getElementById("portal-meta-category");
            const metaTurns = document.getElementById("portal-meta-turns");
            if (metaCat) metaCat.textContent = state.activeGame.category;
            if (metaTurns) metaTurns.textContent = `${state.activeGame.turns_used} / ${state.activeGame.max_questions}`;
        } else {
            if (portal) portal.classList.add("hidden");
            if (workspace) workspace.classList.remove("hidden");
            if (title) title.textContent = "Select a Category to Start";
            
            setupSingleplayerWorkspace();
            const data = await api.fetchCategories();
            renderSingleplayerCategories(data.categories, selectCategoryTrigger);
        }
    } catch (err) {
        alert("Failed to connect to game backend pipeline: " + err.message);
    }
}

function switchViewToMultiplayer() {
    state.gameMode = GAME_MODES.MULTIPLAYER;
    state.gameStage = GAME_STAGES.LOBBY;
    switchView(elements.multiplayerContainer);

    if (lobbyElements.entrancePortal && lobbyElements.roomLobbyArena) {
        lobbyElements.entrancePortal.classList.remove("hidden");
        lobbyElements.roomLobbyArena.classList.add("hidden");
    }
    setupMultiplayerActionListeners();
}

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

function switchViewToContactUs() {
    const contactUsUrl = "https://forms.office.com/Pages/ResponsePage.aspx?id=74FucSK1c0SOMRC9Asz25S6YC81q8MhLkNet_nLcVbJUQkY2Q0cwUlU1SjBMMUwyWFdCS0RDN0FQRC4u"; 
    window.open(contactUsUrl, "_blank");
}

function switchViewToAbout() {
    console.log("Switching to About view...");
    switchView(elements.aboutContainer);
    renderAboutView();
}

function switchViewToMatch() {
    switchView(elements.gameContainer);
    setupMatchViewUI();
}

async function loadLobbyCategoryGridSelections() {
    try {
        const data = await api.fetchCategories();
        const categoryList = data.categories || [];

        renderLobbyCategories(categoryList, (selectedCat) => {
            state.selectedCategory = selectedCat;
            socketService.updateRoomSettings(state.roomCode, selectedCat);
        });
    } catch (err) {
        console.error("Failed to sync word banks from database server:", err);
    }
}

function setupCoreApplicationListeners() {
    if (window.coreListenersInitialized) return;
    window.coreListenersInitialized = true;

    if (elements.profileMenuBtn) {
        elements.profileMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleProfileDropdown();
        });
    }

    window.addEventListener("click", (e) => {
        if (elements.profileDropdownPanel && !elements.profileDropdownPanel.classList.contains("hidden")) {
            if (!elements.profileDropdownPanel.contains(e.target) && !elements.profileMenuBtn.contains(e.target)) {
                closeProfileDropdown();
            }
        }
    });

    if (elements.menuSingleplayerBtn) elements.menuSingleplayerBtn.addEventListener("click", switchViewToSingleplayer);
    if (elements.menuMultiplayerBtn) elements.menuMultiplayerBtn.addEventListener("click", switchViewToMultiplayer);
    if (elements.menuLeaderboardBtn) elements.menuLeaderboardBtn.addEventListener("click", switchViewToLeaderboard);
    if (elements.menuProfileBtn) elements.menuProfileBtn.addEventListener("click", switchViewToProfile);
    if (elements.contactUsBtn) elements.contactUsBtn.addEventListener("click", switchViewToContactUs);
    if (elements.aboutBtn) elements.aboutBtn.addEventListener("click", switchViewToAbout);

    const backBtnMappings = [
        { id: "singleplayer-back-btn", target: switchViewToDashboard },
        { id: "multiplayer-back-btn", target: switchViewToDashboard },
        { id: "leaderboard-back-btn", target: switchViewToDashboard },
        { id: "profile-back-btn", target: switchViewToDashboard },
        { id: "about-back-btn", target: switchViewToDashboard },
    ];

    backBtnMappings.forEach(mapping => {
        const btn = document.getElementById(mapping.id);
        if (btn) {
            btn.addEventListener("click", () => {
                if (mapping.id === "singleplayer-back-btn") {
                    resetCategoryLaunchUI();
                    state.selectedCategory = null;
                }
                if (mapping.id === "multiplayer-back-btn") {
                    resetState(GAME_STAGES.LOBBY);
                }
                mapping.target();
            });
        }
    });

    if (singleplayerLobbyElements.singleplayerLaunchBtn) {
        singleplayerLobbyElements.singleplayerLaunchBtn.addEventListener("click", () => {
            if (!state.selectedCategory) return;
            state.gameMode = GAME_MODES.SINGLEPLAYER;
            state.gameStage = GAME_STAGES.PLAYING;
            singleplayerLobbyElements.singleplayerLaunchBtn.disabled = true;

            socketService.startSingleplayer(state.selectedCategory, (err, response) => {
                if (err) {
                    alert("Could not spin up match context: " + err.error);
                    singleplayerLobbyElements.singleplayerLaunchBtn.disabled = false;
                    return;
                }

                state.category = state.selectedCategory;
                resetCategoryLaunchUI();
                state.selectedCategory = null;
                switchViewToMatch();
                synchronizeInputControls();

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
        });
    }

    const portalResumeBtn = document.getElementById("portal-resume-btn");
    if (portalResumeBtn) {
        portalResumeBtn.addEventListener("click", () => {
            if (!state.activeGame) return;

            socketService.resumeSingleplayer(state.activeGame.game_id, (err, response) => {
                if (err) {
                    alert("Could not resume game: " + err.error);
                    return;
                }

                state.gameId = state.activeGame.game_id;
                state.category = state.activeGame.category;
                state.turnsUsed = state.activeGame.turns_used;
                state.maxQuestions = state.activeGame.max_questions || 20;
                state.gameStage = response.gameStage || GAME_STAGES.PLAYING;

                switchViewToMatch();
                synchronizeInputControls();
                rebuildChatHistoryUI(response.chatHistory);

                appendResponsiveMessageBubble(
                    "AI JUDGE",
                    `Game re-established! You have ${state.maxQuestions - state.turnsUsed} questions remaining. Category: ${state.category.charAt(0).toUpperCase() + state.category.replace("_", " ").slice(1)}. Begin asking Yes or No questions!`,
                    "AI",
                    false
                );
                state.activeGame = null;
            });
        });
    }

    const portalForfeitBtn = document.getElementById("portal-forfeit-btn");
    if (portalForfeitBtn) {
        portalForfeitBtn.addEventListener("click", () => {
            if (!state.activeGame) return;
            const confirmForfeit = confirm("Are you sure you want to forfeit this case? This counts as an automatic loss on your global ranking records!");
            if (!confirmForfeit) return;

            portalForfeitBtn.disabled = true;
            const targetGameId = state.activeGame.game_id;

            socketService.quitSingleplayer(targetGameId, (err, response) => {
                portalForfeitBtn.disabled = false;

                if (err) {
                    alert("Failed to close case safely: " + err.error);
                    return;
                }

                alert(`Case file closed. The answer was: ${response.secretAnswer}`);
                state.activeGame = null;
                switchViewToSingleplayer();
            });
        });
    }

    if (gameplayElements.pauseBtn) {
        gameplayElements.pauseBtn.addEventListener("click", () => {
            if (!state.gameId || state.gameMode === GAME_MODES.MULTIPLAYER) return;

            const confirmPause = confirm("Pause and save match for later?");
            if (!confirmPause) return;

            setInputsEnabled(false);

            socketService.pauseSingleplayer((err) => {
                if (err) {
                    alert("Failed to hibernate current match: " + err.error);
                    synchronizeInputControls();
                    return;
                }
                resetState();
                boot();
            });
        });
    }

    if (gameplayElements.abandonBtn) {
        gameplayElements.abandonBtn.addEventListener("click", () => {
            if (state.gameMode === GAME_MODES.MULTIPLAYER) {
                const confirmAbandon = confirm("Forfeit multiplayer match? This counts as an instant loss.");
                if (!confirmAbandon) return;
                socketService.forfeitMultiplayerMatch(state.roomCode);
                return;
            }

            if (!state.gameId) return;
            const confirmAbandon = confirm("Abandon match? This will be logged as a loss.");
            if (!confirmAbandon) return;

            setInputsEnabled(false);

            socketService.quitSingleplayer(state.gameId, (err, response) => {
                if (err) {
                    alert("Failed to terminate match: " + err.error);
                    synchronizeInputControls();
                    return;
                }
                handleGameOverUI("LOSE", response.secretAnswer, null, true, 0);
            });
        });
    }

    if (elements.signoutActionBtn) {
        elements.signoutActionBtn.addEventListener("click", () => {
            state.token = null;
            state.username = null;
            state.isGuest = false;
            state.email = null;

            localStorage.clear();

            disconnectSocket();
            closeProfileDropdown();
            resetState();
            state.analysisHistory = [];
            state.activeGame = null;

            boot();
        });
    }
}

function setupAuthListeners() {
    if (window.authListenersInitialized) return;
    window.authListenersInitialized = true;

    if (elements.showLoginBtn) {
        elements.showLoginBtn.addEventListener("click", () => {
            activateAuthForm(elements.loginForm);
            unselectAuthBtns();
            elements.showLoginBtn.classList.add("btn-chosen");
        });
    }
    if (elements.showSignupBtn) {
        elements.showSignupBtn.addEventListener("click", () => {
            activateAuthForm(elements.signupForm);
            unselectAuthBtns();
            elements.showSignupBtn.classList.add("btn-chosen");
        });
    }
    if (elements.showGuestBtn) {
        elements.showGuestBtn.addEventListener("click", () => {
            activateAuthForm(elements.guestForm);
            unselectAuthBtns();
            elements.showGuestBtn.classList.add("btn-chosen");
        });
    }

    if (elements.signupForm) {
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
    }

    if (elements.loginForm) {
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
    }

    if (elements.guestForm) {
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

function setupMultiplayerActionListeners() {
    if (elements.mpCreateBtn) {
        elements.mpCreateBtn.onclick = async () => {
            state.gameMode = GAME_MODES.MULTIPLAYER;
            state.gameStage = GAME_STAGES.LOBBY;
            state.isHost = true; 
            
            socketService.createMultiplayerRoom();
            await loadLobbyCategoryGridSelections();
        };
    }

    if (elements.mpJoinForm) {
        elements.mpJoinForm.onsubmit = (e) => {
            e.preventDefault();
            const inputEl = document.getElementById("mp-room-code-input");
            const codeInput = inputEl ? inputEl.value.trim().toUpperCase() : "";
            if (codeInput.length !== 4) return;

            state.gameMode = GAME_MODES.MULTIPLAYER;
            state.gameStage = GAME_STAGES.LOBBY;
            state.isHost = false; 
            
            socketService.joinMultiplayerRoom(codeInput);
        };
    }

    if (lobbyElements.launchBtn) {
        lobbyElements.launchBtn.onclick = () => {
            if (!state.isHost || !state.selectedCategory) return;
            socketService.launchMultiplayerMatch(state.roomCode, state.selectedCategory);
        };
    }
}

async function handleMatchLaunchTriggered() {
    switchViewToMatch();
    synchronizeInputControls();
}

function handleAiResponseProcessed(data) {
    state.turnsUsed = data.turnsUsed;
    state.gameStage = data.gameStage;
    state.currentTurnHolder = data.currentTurnHolder;

    if (!state.analysisHistory) state.analysisHistory = [];
    state.analysisHistory.push({
        author: "AI JUDGE",
        text: data.messageText,
        analysis: data.analysis || "AI evaluation successfully verified against secret game rules matrix."
    });

    synchronizeInputControls();

    if (data.gameStage === GAME_STAGES.GAME_OVER) {
        handleGameOverUI(
            data.victory ? "WIN" : "LOSE", 
            data.secretAnswer, 
            data.winnerUsername,
            data.forfeit,
            data.xpEarned || 0
        );
    }
}

async function handleReturnedToLobby(data) {
    state.players = data.players || state.players;
    resetMatchState(GAME_STAGES.LOBBY);
    switchView(elements.multiplayerContainer);
    renderLobbyView();
    await loadLobbyCategoryGridSelections();
}

if (gameplayElements.questionForm) {
    gameplayElements.questionForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const qText = gameplayElements.questionInput.value.trim();
        if (!qText) return;

        gameplayElements.questionInput.value = "";

        if (state.gameMode === GAME_MODES.SINGLEPLAYER) {
            appendResponsiveMessageBubble(state.username || "YOU", qText, "USER_QUESTION", false);
            setInputsEnabled(false);

            socketService.submitSingleplayerTurn("QUESTION", qText, (err, response) => {
                if (err) {
                    appendResponsiveMessageBubble("AI JUDGE", "Error: " + err.error, "AI", false);
                    synchronizeInputControls();
                    return;
                }

                if (response.turnsUsed !== undefined) state.turnsUsed = response.turnsUsed;
                if (response.gameStage !== undefined) state.gameStage = response.gameStage;

                synchronizeInputControls();
                appendResponsiveMessageBubble("AI JUDGE", response.response, "AI", true);

                if (state.gameStage === GAME_STAGES.FINAL_GUESS) {
                    appendResponsiveMessageBubble("AI JUDGE", "That's all for the Q&A's! Please enter your final guess now!", "AI", false);
                }
                synchronizeInputControls();
            });
        } else {
            setInputsEnabled(false);
            socketService.submitMultiplayerTurn(state.roomCode, "QUESTION", qText);
        }
    });
}

if (gameplayElements.guessForm) {
    gameplayElements.guessForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const gText = gameplayElements.guessInput.value.trim();
        if (!gText) return;

        gameplayElements.guessInput.value = "";

        if (state.gameMode === GAME_MODES.SINGLEPLAYER) {
            appendResponsiveMessageBubble(state.username || "YOU", gText, "USER_GUESS", false);
            setInputsEnabled(false);

            socketService.submitSingleplayerTurn("GUESS", gText, (err, response) => {
                if (err) {
                    appendResponsiveMessageBubble("AI JUDGE", "Error: " + err.error, "AI", false);
                    synchronizeInputControls();
                    return;
                }

                if (response.turnsUsed !== undefined) state.turnsUsed = response.turnsUsed;
                if (response.gameStage !== undefined) state.gameStage = response.gameStage;

                synchronizeInputControls();
                appendResponsiveMessageBubble("AI JUDGE", response.response, "AI", true);

                if (state.gameStage === GAME_STAGES.GAME_OVER) {
                    handleGameOverUI(response.gameResult, response.secretAnswer, response.winnerUsername, response.forfeit, response.xpEarned || 0);
                } else {
                    synchronizeInputControls();
                }
            });
        } else {
            setInputsEnabled(false);
            socketService.submitMultiplayerTurn(state.roomCode, "GUESS", gText);
        }
    });
}

if (gameplayElements.analysisToggle) {
    gameplayElements.analysisToggle.addEventListener("change", () => {
        if (gameplayElements.analysisToggle.checked) {
            if (state.gameMode === GAME_MODES.MULTIPLAYER) {
                injectReasoningBoxes(state.analysisHistory || []);
                return;
            }

            if (!state.analysisHistory || state.analysisHistory.length === 0) {
                socketService.getSingleplayerAnalysis((err, history) => {
                    if (err) {
                        alert("Failed fetching analysis layer logs: " + err.error);
                        gameplayElements.analysisToggle.checked = false;
                        return;
                    }
                    injectReasoningBoxes(history);
                });
                return;
            }
            injectReasoningBoxes(state.analysisHistory);
        } else {
            clearReasoningBoxes();
        }
    });
}

if (gameplayElements.restartBtn) {
    gameplayElements.restartBtn.addEventListener("click", () => {
        refreshLeaderboard();
        refreshProfileMenu();
        if (state.gameMode === GAME_MODES.MULTIPLAYER) {
            socketService.returnToLobby(state.roomCode);
            return; // UI switches when 'returned_to_lobby' arrives for everyone
        }
        resetState();
        state.analysisHistory = [];
        state.activeGame = null;
        switchViewToSingleplayer();
    });
}

document.addEventListener("DOMContentLoaded", boot);