const BASE_URL = "http://127.0.0.1:8080/api/game";

// This function fetches the list of available categories from the backend API.
export async function fetchCategories() {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error("Failed to load categories.");

  return await res.json(); // Returns { categories: [...] }
}

export async function startGame(category) {
  const res = await fetch(`${BASE_URL}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });
  if (!res.ok) throw new Error("Failed to start session.");
  return await res.json(); // Returns { game_id, category, max_questions, game_stage }
}

export async function askQuestion(gameId, questionText) {
  const res = await fetch(`${BASE_URL}/question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, question_text: questionText }),
  });
  if (!res.ok) throw new Error("Failed to submit question.");
  return await res.json(); // Returns { game_id, response, turns_used, game_stage }
}

export async function submitGuess(gameId, guessText) {
  const res = await fetch(`${BASE_URL}/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: gameId, guess_text: guessText }),
  });
  if (!res.ok) throw new Error("Failed to submit guess.");
  return await res.json(); // Returns { game_id, game_stage, game_result, response, turns_used, [secret_answer] }
}

export async function fetchAnalysis(gameId) {
  const res = await fetch(`${BASE_URL}/${gameId}/analysis`);
  if (!res.ok) throw new Error("Failed to retrieve analysis logs.");
  return await res.json(); // Returns { chat_history: [...] }
}
