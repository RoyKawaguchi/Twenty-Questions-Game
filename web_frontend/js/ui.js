import { state } from "./state.js";

// DOM Caching elements
export const elements = {
    setupContainer: document.getElementById("setup-container"),
    gameContainer: document.getElementById("game-container"),
    categoryGrid: document.getElementById("category-grid"),
    categoryBadge: document.getElementById("category-badge"),
    turnCounter: document.getElementById("turn-counter"),
    chatDisplay: document.getElementById("chatDisplay") || document.getElementById("chat-display"),
    inputSection: document.getElementById("input-section"),
    questionForm: document.getElementById("question-form"),
    questionInput: document.getElementById("question-input"),
    guessForm: document.getElementById("guess-form"),
    guessInput: document.getElementById("guess-input"),
    gameOverPanel: document.getElementById("game-over-panel"),
    endStatusHeading: document.getElementById("end-status-heading"),
    endMessageText: document.getElementById("end-message-text"),
    revealBox: document.getElementById("reveal-box"),
    secretWordDisplay: document.getElementById("secret-word-display"),
    analysisToggle: document.getElementById("analysis-toggle"),
    restartBtn: document.getElementById("restart-btn")
};

let aiMessageCounter = 0;

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

export function switchViewToMatch() {
    elements.setupContainer.classList.add("hidden");
    elements.gameContainer.classList.remove("hidden");
    elements.gameOverPanel.classList.add("hidden");
    elements.inputSection.classList.remove("hidden");
    elements.chatDisplay.innerHTML = "";
    aiMessageCounter = 0;
}

export function switchViewToSetup() {
    elements.gameContainer.classList.add("hidden");
    elements.setupContainer.classList.remove("hidden");
}

export function updateMetaLabels() {
    elements.categoryBadge.textContent = `Category: ${state.category}`;
    elements.turnCounter.textContent = `Turns Used: ${state.turnsUsed} / ${state.maxQuestions}`;
}

export function appendMessageBubble(senderType, messageText) {
    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble");

    if (senderType === "USER_QUESTION") {
        bubble.classList.add("user-q");
    } else if (senderType === "USER_GUESS") {
        bubble.classList.add("user-g");
    } else if (senderType === "AI") {
        bubble.classList.add("ai-a");
        bubble.setAttribute("data-ai-index", aiMessageCounter);
        aiMessageCounter++;
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

export function handleGameOverUI(result, secretAnswer, turnsUsed) {
    elements.inputSection.classList.add("hidden");
    elements.gameOverPanel.classList.remove("hidden");
    elements.analysisToggle.checked = false;

    if (result === "WIN") {
        elements.endStatusHeading.textContent = "🎉 Victory!";
        elements.endMessageText.textContent = `Amazing! You deduced the correct item in ${turnsUsed}.`;
    } else {
        elements.endStatusHeading.textContent = "😔 Defeat!";
        elements.endMessageText.textContent = "You ran out of attempts. Better luck next game!";
    }

    if (secretAnswer) {
        elements.secretWordDisplay.textContent = secretAnswer.toUpperCase();
        elements.revealBox.classList.remove("hidden");
    } else {
        elements.revealBox.classList.add("hidden");
    }
}

export function injectReasoningBoxes(history) {
    let aiIndex = 1;    // The first message has no analysis
    history.forEach(turn => {
        const targetBubble = elements.chatDisplay.querySelector(`[data-ai-index="${aiIndex}"]`);
        if (targetBubble) {
            const thoughtBox = document.createElement("div");
            thoughtBox.className = "ai-thought-box";
            thoughtBox.innerHTML = `<strong>Explanation:</strong><br>${turn.analysis}`;
            targetBubble.appendChild(thoughtBox);
        }
        aiIndex++;
    });
}

export function clearReasoningBoxes() {
    const boxes = elements.chatDisplay.querySelectorAll(".ai-thought-box");
    boxes.forEach(box => box.remove());
}

export function switchToFinalGuess() {
    // TODO: disable guess input
}