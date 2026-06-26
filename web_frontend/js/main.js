import * as api from "./api.js";
import { state, resetState } from "./state.js";
import { elements, renderCategoryButtons, switchViewToMatch, switchViewToSetup, updateMetaLabels, appendMessageBubble, setInputsEnabled, handleGameOverUI, injectReasoningBoxes, clearReasoningBoxes } from "./ui.js";

async function boot() {
    try {
        const data = await api.fetchCategories();
        renderCategoryButtons(data.categories, selectCategoryTrigger);
    } catch (err) {
        alert("Failed to connect to game backend pipeline: " + err.message);
    }
}

async function selectCategoryTrigger(category) {
    try {
        const gameData = await api.startGame(category);
        state.gameId = gameData.game_id;
        state.category = gameData.category;
        state.maxQuestions = gameData.max_questions;
        state.turnsUsed = 0;
        state.gameStage = gameData.game_stage;

        switchViewToMatch();
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
    switchViewToSetup();
    boot();
});

// Initialize on load
document.addEventListener("DOMContentLoaded", boot);