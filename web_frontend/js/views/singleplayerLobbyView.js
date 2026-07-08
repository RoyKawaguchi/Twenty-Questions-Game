import { state } from '../state.js';

// Dedicated DOM Cache for Singleplayer Pre-game Configuration Workspace
export const singleplayerLobbyElements = {
    singleplayerContainer: document.getElementById("singleplayer-container"),
    categorySelectionWorkspace: document.getElementById("category-selection-workspace"),
    categoryGrid: document.getElementById("category-grid"),
    categoryBadge: document.getElementById("category-badge"),
    singleplayerLaunchBtn: document.getElementById("singleplayer-launch-btn")
};

// Internal module reference states to manage clean redraw loops
let cachedCategorySelectCallback = null;
let cachedCategoriesArray = [];

/**
 * Initializes or wakes up the singleplayer config workspace.
 * Pulls current state variables to decide whether to hide or show landing panels.
 */
export function setupSingleplayerWorkspace() {
    if (singleplayerLobbyElements.categorySelectionWorkspace) {
        singleplayerLobbyElements.categorySelectionWorkspace.classList.remove("hidden");
    }
    resetCategoryLaunchUI();
}

/**
 * Renders the singleplayer categories grid list dynamically.
 * Automatically handles class assignments based on the active global state.
 */
export function renderSingleplayerCategories(categories, onSelectCategory) {
    if (categories && categories.length > 0) cachedCategoriesArray = categories;
    if (onSelectCategory) cachedCategorySelectCallback = onSelectCategory;

    if (!singleplayerLobbyElements.categoryGrid) return;
    singleplayerLobbyElements.categoryGrid.innerHTML = "";

    cachedCategoriesArray.forEach(cat => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-secondary category-btn";
        btn.textContent = cat.replace("_", " ").toUpperCase();

        // Evaluate whether this category card matches active selections
        if (state.selectedCategory === cat) {
            btn.classList.add("btn-chosen");
        } else {
            btn.classList.remove("btn-chosen");
        }

        btn.addEventListener("click", () => {
            if (cachedCategorySelectCallback) {
                cachedCategorySelectCallback(cat);
            }
            // Trigger an immediate UI state sync layout refresh upon selection
            highlightSelectedCategory(cat);
        });

        singleplayerLobbyElements.categoryGrid.appendChild(btn);
    });
}

/**
 * Synchronizes the visual selection states across the button grid and layout badges.
 */
export function highlightSelectedCategory(category) {
    if (!singleplayerLobbyElements.categoryGrid) return;

    // 1. Update selection borders across all buttons in the grid container
    const buttons = singleplayerLobbyElements.categoryGrid.querySelectorAll(".category-btn");
    buttons.forEach(btn => {
        const cleanText = btn.textContent.trim().toLowerCase().replace(" ", "_");
        if (cleanText === category?.toLowerCase()) {
            btn.classList.add("btn-chosen");
        } else {
            btn.classList.remove("btn-chosen");
        }
    });

    // 2. Synchronize lower launch panel tags and trigger configurations
    if (category) {
        if (singleplayerLobbyElements.categoryBadge) {
            singleplayerLobbyElements.categoryBadge.textContent = category.replace("_", " ").toUpperCase();
            singleplayerLobbyElements.categoryBadge.classList.remove("hidden");
        }
        if (singleplayerLobbyElements.singleplayerLaunchBtn) {
            singleplayerLobbyElements.singleplayerLaunchBtn.disabled = false;
            singleplayerLobbyElements.singleplayerLaunchBtn.classList.remove("disabled");
            singleplayerLobbyElements.singleplayerLaunchBtn.textContent = "🚀 Launch Investigation";
        }
    } else {
        resetCategoryLaunchUI();
    }
}

/**
 * Sweeps the launch layout context back into a safe, locked starting index state.
 */
export function resetCategoryLaunchUI() {
    if (singleplayerLobbyElements.categoryBadge) {
        singleplayerLobbyElements.categoryBadge.textContent = "";
        singleplayerLobbyElements.categoryBadge.classList.add("hidden");
    }

    if (singleplayerLobbyElements.singleplayerLaunchBtn) {
        singleplayerLobbyElements.singleplayerLaunchBtn.disabled = true;
        singleplayerLobbyElements.singleplayerLaunchBtn.classList.add("disabled");
        singleplayerLobbyElements.singleplayerLaunchBtn.textContent = "Select a Category Above";
    }
}