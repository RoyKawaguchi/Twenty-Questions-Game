import { state, GAME_MODES, GAME_STAGES } from '../state.js';

export const gameplayElements = {
    // In-game elements
    chatDisplay: document.getElementById("chat-display"),
    inputSection: document.getElementById("input-section"),
    questionForm: document.getElementById("question-form"),
    questionInput: document.getElementById("question-input"),
    guessForm: document.getElementById("guess-form"),
    guessInput: document.getElementById("guess-input"),
    askBtn: document.getElementById("ask-btn"),
    guessBtn: document.getElementById("guess-btn"),
    pauseBtn: document.getElementById("game-pause-btn"),
    abandonBtn: document.getElementById("game-abandon-btn"),
    categoryBadge: document.getElementById("category-badge"),
    turnsCounter: document.getElementById("turns-counter") || document.getElementById("turn-counter") || document.querySelector(".turns-display-text"),

    // Endgame & Match Evaluation Panels
    gameOverPanel: document.getElementById("game-over-panel"),
    endStatusHeading: document.getElementById("end-status-heading"),
    endMessageText: document.getElementById("end-message-text"),
    revealBox: document.getElementById("reveal-box"),
    secretWordDisplay: document.getElementById("secret-word-display"),
    analysisToggle: document.getElementById("analysis-toggle"),
    restartBtn: document.getElementById("restart-btn")
};

/**
 * Prepares the structural gameplay workspace layout.
 * Clears input fields, wipes out old match streams, and resets post-match flags.
 */
export function setupMatchViewUI() {
    if (gameplayElements.gameOverPanel) gameplayElements.gameOverPanel.classList.add("hidden");
    if (gameplayElements.inputSection) gameplayElements.inputSection.classList.remove("hidden");

    if (gameplayElements.questionInput) gameplayElements.questionInput.value = "";
    if (gameplayElements.guessInput) gameplayElements.guessInput.value = "";
    if (gameplayElements.chatDisplay) gameplayElements.chatDisplay.innerHTML = "";
    if (gameplayElements.analysisToggle) gameplayElements.analysisToggle.checked = false;
    if (gameplayElements.categoryBadge) {
        gameplayElements.categoryBadge.classList.remove("hidden");
        const category_text = state.category
        ? state.category.charAt(0).toUpperCase() + state.category.replace("_", " ").slice(1)
        : "Unknown category";
        gameplayElements.categoryBadge.textContent = `Category:  ${category_text}`;
    }
}

/**
 * Appends a highly structured, responsive chat bubble using semantic class mappings.
 * Features an internal strict guard block protecting against XSS vectors from external strings.
 */
export function appendResponsiveMessageBubble(senderName, messageText, senderType, shouldTrackAnalysis = false) {
    if (!gameplayElements.chatDisplay) return;

    const wrapper = document.createElement("div");
    wrapper.className = "bubble-wrapper";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    if (senderType === "AI") {
        wrapper.classList.add("left-align");
        bubble.classList.add("ai-a");
        bubble.innerHTML = `
            <span class="bubble-header-tag ai-tag">AI JUDGE</span>
            <p class="bubble-body-text">${messageText}</p>
        `;
        
        if (shouldTrackAnalysis) {
            const currentTrackedCount = gameplayElements.chatDisplay.querySelectorAll(".ai-analysis-track").length;
            bubble.setAttribute("data-ai-index", currentTrackedCount);
            bubble.classList.add("ai-analysis-track", "clickable-analysis-bubble");
            bubble.title = "Click to inspect AI reasoning analysis!";
        }
    } else {
        wrapper.classList.add("right-align");
        
        let isHostPlayer = false;
        let accentColor = null;

        // Clean & Defensive Fallback Initialization
        const safeName = (senderName || state.username || "YOU").toUpperCase();

        if (state.gameMode === GAME_MODES.MULTIPLAYER) {
            const playerProfile = state.players.find(p => p.username === senderName);
            isHostPlayer = playerProfile ? playerProfile.isHost : (state.username === senderName ? state.isHost : false);
            accentColor = playerProfile?.color || null;
        } else {
            isHostPlayer = (senderName === state.username || senderName === null);
        }

        if (isHostPlayer) {
            bubble.classList.add("bubble-host-theme");
        } else {
            bubble.classList.add("bubble-guest-theme");
        }

        if (accentColor) {
            bubble.classList.add("bubble-player-theme");
            bubble.style.setProperty("--bubble-accent", accentColor);
        }

        if (senderType === "USER_GUESS") {
            bubble.classList.add("type-guess");
            bubble.innerHTML = `
                <span class="bubble-header-tag guess-tag">${safeName} • GUESS</span>
                <p class="bubble-body-text">${messageText}</p>
            `;
        } else {
            bubble.classList.add("type-question");
            bubble.innerHTML = `
                <span class="bubble-header-tag question-tag">${safeName} • QUESTION</span>
                <p class="bubble-body-text">${messageText}</p>
            `;
        }
    }

    wrapper.appendChild(bubble);
    gameplayElements.chatDisplay.appendChild(wrapper);
    gameplayElements.chatDisplay.scrollTop = gameplayElements.chatDisplay.scrollHeight;
}

/**
 * Autonomous local interface lock manager.
 */
export function setInputsEnabled(enabled) {
    const targets = [
        gameplayElements.questionInput, gameplayElements.guessInput, 
        gameplayElements.askBtn, gameplayElements.guessBtn
    ];
    
    targets.forEach(el => { if (el) el.disabled = !enabled; });

    if (enabled) {
        if (gameplayElements.questionInput) {
            gameplayElements.questionInput.value = "";
            gameplayElements.questionInput.focus();
        }
        if (gameplayElements.guessInput) {
            gameplayElements.guessInput.value = "";
        }
    }
}

/**
 * Evaluates application runtime configurations to assign placeholder metrics and toggle fields.
 */
export function synchronizeInputControls() {
    if (gameplayElements.turnsCounter) {
        gameplayElements.turnsCounter.textContent = `Turns Used: ${state.turnsUsed} / ${state.maxQuestions}`;
    }

    // --- 1. SINGLEPLAYER WORKSPACE ROUTINE ---
    if (state.gameMode === GAME_MODES.SINGLEPLAYER) {
        const isGameActive = (state.gameStage === GAME_STAGES.PLAYING || state.gameStage === GAME_STAGES.FINAL_GUESS);
        
        setInputsEnabled(isGameActive);
        _togglePauseButtonLayout();
        
        if (state.gameStage === GAME_STAGES.FINAL_GUESS) {
            if (gameplayElements.questionInput) {
                gameplayElements.questionInput.disabled = true;
                gameplayElements.questionInput.placeholder = "Out of questions! Final guess required...";
            }
        } else if (isGameActive) {
            if (gameplayElements.questionInput) gameplayElements.questionInput.placeholder = "Ask a Yes/No question about the secret object...";
            if (gameplayElements.guessInput) gameplayElements.guessInput.placeholder = "Type your guess here...";
        }
        return;
    }

    // --- 2. MULTIPLAYER ROOM ROUTINE ---
    if (state.gameStage === GAME_STAGES.PLAYING || state.gameStage === GAME_STAGES.FINAL_GUESS) {
        if (state.currentTurnHolder === state.username) {
            setInputsEnabled(true);
            _togglePauseButtonLayout();
            
            if (state.gameStage === GAME_STAGES.FINAL_GUESS) {
                if (gameplayElements.questionInput) {
                    gameplayElements.questionInput.disabled = true;
                    gameplayElements.questionInput.placeholder = "Out of questions! Enter your ultimate item guess...";
                }
                if (gameplayElements.guessInput) gameplayElements.guessInput.placeholder = "Make your absolute final guess...";
            } else {
                if (gameplayElements.questionInput) gameplayElements.questionInput.placeholder = "Your turn! Ask a Yes/No question...";
                if (gameplayElements.guessInput) gameplayElements.guessInput.placeholder = "Or submit an item guess...";
            }
        } else {
            setInputsEnabled(false);
            _togglePauseButtonLayout();
            
            const displayHolder = state.currentTurnHolder || 'opponent';
            if (gameplayElements.questionInput) gameplayElements.questionInput.placeholder = `Waiting for ${displayHolder}'s move...`;
            if (gameplayElements.guessInput) gameplayElements.guessInput.placeholder = `Waiting for ${displayHolder}'s move...`;
        }
    } else {
        setInputsEnabled(false);
        _togglePauseButtonLayout();
        if (state.gameStage === GAME_STAGES.GAME_OVER) {
            if (gameplayElements.questionInput) gameplayElements.questionInput.placeholder = "Investigation complete. Game Over.";
            if (gameplayElements.guessInput) gameplayElements.guessInput.placeholder = "Investigation complete. Game Over.";
        }
    }
}

/**
 * Handles full game conclusion pathways, presenting end statuses and target answers.
 */
export function handleGameOverUI(result, secretAnswer, winnerUsername = null, forfeit = false, xpEarned = 0) {
    if (gameplayElements.inputSection) gameplayElements.inputSection.classList.add("hidden");
    if (gameplayElements.gameOverPanel) gameplayElements.gameOverPanel.classList.remove("hidden");
    if (gameplayElements.analysisToggle) gameplayElements.analysisToggle.checked = false;

    let headingText = "😔 Defeat!";
    let finalMessage = "";
    let isWin = false;

    // --- 1. MULTIPLAYER ENDGAME ROUTING ---
    if (state.gameMode === GAME_MODES.MULTIPLAYER) {
        console.log("📊 GameplayView Evaluation Matrix:");
        console.log("- Received winnerUsername arg:", winnerUsername);
        console.log("- Received forfeit flag:", forfeit);
        console.log("- Local state.username:", state.username);

        const amITheWinner = (winnerUsername && winnerUsername === state.username);
        console.log("- Outcome amITheWinner:", amITheWinner);
        
        isWin = amITheWinner;

        // Check if the match ended via submission abandonment/forfeit
        if (forfeit) {
            if (amITheWinner) {
                headingText = "🎉 Victory!";
                finalMessage = "Your opponent conceded the investigation. You win by forfeit!";
            } else {
                headingText = "😔 Defeat!";
                finalMessage = "You surrendered the match. Case abandoned.";
            }
        } else {
            // Standard multiplayer conclusion (solving the word first)
            if (amITheWinner) {
                headingText = "🎉 Victory!";
                finalMessage = "Brilliant execution! You solved the case before your opponent.";
            } else {
                headingText = "😔 Defeat!";
                const victorName = winnerUsername ? winnerUsername : "Your opponent";
                finalMessage = `${victorName} discovered the secret item first. Better luck next time!`;
            }
        }
        
    // --- 2. SINGLEPLAYER ENDGAME ROUTING ---
    } else {
        if (result === "WIN") {
            isWin = true;
            headingText = "🎉 Victory!";
            finalMessage = "You successfully deduced the secret object!";
        } else {
            isWin = false;
            headingText = "😔 Defeat!";
            finalMessage = "You've run out of investigator moves.";
        }
    }

    // --- 3. DYNAMIC XP CALCULATION & INJECTION ---
    // If they won, apply passed runtime xp; if they lost, hard-guarantee a 0 baseline
    const activeXp = isWin ? xpEarned : 0;
    finalMessage += ` You earned ${activeXp} XP!`;

    if (state.isGuest) {
        finalMessage += " (Guest accounts do not save XP.)";
    }

    // --- 4. UI DOM MANIPULATIONS ---
    if (gameplayElements.endStatusHeading) gameplayElements.endStatusHeading.textContent = headingText;
    if (gameplayElements.endMessageText) gameplayElements.endMessageText.textContent = finalMessage;

    if (gameplayElements.revealBox && gameplayElements.secretWordDisplay) {
        if (secretAnswer) {
            gameplayElements.secretWordDisplay.textContent = secretAnswer.toUpperCase();
            gameplayElements.revealBox.classList.remove("hidden");
        } else {
            gameplayElements.revealBox.classList.add("hidden");
        }
    }
}

/**
 * Injects evaluation reasoning boxes directly beneath their matching index pairs.
 */
export function injectReasoningBoxes(analysisHistory) {
    clearReasoningBoxes();
    // Selects all AI bubbles since they are now all accurately indexed
    const aiBubbles = gameplayElements.chatDisplay.querySelectorAll('.ai-a[data-ai-index]');

    aiBubbles.forEach(bubble => {
        const index = parseInt(bubble.getAttribute("data-ai-index"), 10);
        const analysisData = analysisHistory[index];

        if (analysisData) {
            const reasoningBox = document.createElement("div");
            reasoningBox.className = "ai-reasoning-box";
            
            // Support property variations from both singleplayer and multiplayer backend nodes
            const rawReasoning = analysisData.reasoning || analysisData.analysis || analysisData.response || 'No raw reasoning logged.';
            reasoningBox.textContent = `Reasoning Check: ${rawReasoning}`;
            
            bubble.parentNode.insertBefore(reasoningBox, bubble.nextSibling);
        }
    });
}

/**
 * Purges all active reasoning overlay blocks from the screen workspace.
 */
export function clearReasoningBoxes() {
    if (!gameplayElements.chatDisplay) return;
    const boxes = gameplayElements.chatDisplay.querySelectorAll(".ai-reasoning-box");
    boxes.forEach(box => box.remove());
}

/**
 * Decodes and rebuilds full historical text logs dynamically during game initialization configurations.
 */
export function rebuildChatHistoryUI(historyArray) {
    if (!gameplayElements.chatDisplay) return;
    gameplayElements.chatDisplay.innerHTML = "";

    historyArray.forEach(msg => {
        const fallbackUser = msg.username || state.username || "YOU";
        if (msg.type === "question") {
            appendResponsiveMessageBubble(fallbackUser, msg.text, "USER_QUESTION");
            appendResponsiveMessageBubble("AI", msg.response, "AI", true); 
        } else if (msg.type === "guess") {
            appendResponsiveMessageBubble(fallbackUser, msg.text, "USER_GUESS");
            appendResponsiveMessageBubble("AI", msg.response, "AI", true);
        }
    });
}

export function setInputsLock(isLocked) {
    const targets = [
        gameplayElements.questionInput, gameplayElements.guessInput,
        gameplayElements.askBtn, gameplayElements.guessBtn
    ];
    targets.forEach(el => { if (el) el.disabled = isLocked; });
    _togglePauseButtonLayout();
}

export function setQuestionInputLock(isLocked) {
    if (gameplayElements.questionInput) gameplayElements.questionInput.disabled = isLocked;
    if (gameplayElements.askBtn) gameplayElements.askBtn.disabled = isLocked;
}

function _togglePauseButtonLayout() {
    if (!gameplayElements.pauseBtn) return;
    
    if (state.gameMode === GAME_MODES.MULTIPLAYER) {
        gameplayElements.pauseBtn.disabled = true;
        gameplayElements.pauseBtn.classList.add("hidden");
    } else {
        const isGameActive = (state.gameStage === GAME_STAGES.PLAYING || state.gameStage === GAME_STAGES.FINAL_GUESS);
        gameplayElements.pauseBtn.disabled = !isGameActive;
        if (isGameActive) {
            gameplayElements.pauseBtn.classList.remove("hidden");
        } else {
            gameplayElements.pauseBtn.classList.add("hidden");
        }
    }
}