import json
import logging
from openai import OpenAI
from flask import current_app
from models import EvaluationResponse

logger = logging.getLogger(__name__)

def _get_client():
    """Instantiates a thread-safe OpenAI client context using validated configurations."""
    return OpenAI(api_key=current_app.config["OPENAI_API_KEY"])

def evaluate_question(category: str, secret_answer: str, question: str) -> dict:
    """
    Evaluates the user's question against a secret word using strict structural JSON.
    Includes a built-in retry strategy for transient external API drops.
    """
    system_prompt = (
        "Instructions:\n"
        "You are playing a game of 20 Questions. Your job is to answer the user's question about a secret object accurately based on facts.\n\n"
        "1. CRITICAL - Logical Evaluation: Before applying any other rule, check if the question contains a compound choice, list, or options (e.g., 'A or B', 'X or Y'). You MUST evaluate these using logical OR. If the secret topic matches ANY single one of the options provided, your final response MUST be 'yes'. You are strictly forbidden from answering 'no' just because one of the options is false.\n\n"
        "2. Think step-by-step: Briefly analyze the secret topic's physical properties, geography, characteristics, or real-world traits relevant to the question so that your answer is logically consistent and does not contradict common sense.\n\n"
        "3. Base your answer on majority facts:\n"
        "   - If the secret topic is a specific person or unique entity, answer based on absolute factual accuracy.\n"
        "   - If the topic represents a category or class, answer 'yes' if more than 50% of instances satisfy the condition, and 'no' if they do not.\n"
        "   - For location questions (e.g., 'found at home'), evaluate if the place is a standard, expected storage or usage point, even if the object is mobile.\n\n"
        "4. Roles and Professions: When the topic is a profession, role, or job, base your answer on the typical day-to-day execution of that role, not on its training requirements, educational pathway, history, origin, or related industries.\n\n"
        "5. Return 'error' only when:\n"
        "   - The user's input is unrelated to the game, nonsensical, unintelligible, or gibberish.\n"
        "   - The question is too ambiguous, context-dependent, or evenly split to justify a clear majority 'yes' or 'no' answer.\n"
        "Do not return 'error' merely because the question is difficult.\n\n"
        "6. Format your output strictly as a single-line JSON object with exactly two keys:\n"
        "{\"analysis\":\"Brief reasoning here\",\"response\":\"yes|no|error\"}"
    )

    user_content = f"Category: {category}\nSecret Object: {secret_answer}\nPlayer's Question: {question}"

    for attempt in range(2): # 1 initial attempt + 1 transient fallback retry safety net
        try:
            client = _get_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                temperature=0.0,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]
            )

            result = completion.choices[0].message.content
            parsed = json.loads(result)

            response_raw = str(parsed.get("response", "")).strip().lower()

            try:
                response_enum = EvaluationResponse(response_raw)
            except ValueError:
                response_enum = EvaluationResponse.ERROR
            
            return {
                "analysis": parsed.get("analysis", "No analysis provided."),
                "response": response_enum
            }
        except Exception as e:
            logger.warning(f"Transient issue during question evaluation (Attempt {attempt + 1}): {e}")
            if attempt == 1:
                return {"analysis": f"Failed evaluating question downstream: {str(e)}", "response": EvaluationResponse.ERROR}

def evaluate_guess(guess: str, answer: str) -> dict:
    """
    Verifies whether the semantic meaning of the guess matches the secret target answer.
    """
    system_prompt = (
        "You are a judge verifying a game submission. Determine whether the user's guess matches the secret answer.\n\n"
        "Instructions:\n\n"
        "1. Think step-by-step. Analyze the semantic and physical relationship between the guess and the answer before making a decision.\n\n"
        "2. Return 'yes' if the guess is the same object or concept as the answer, including minor typos, spelling mistakes, singular/plural differences, or insignificant wording differences.\n"
        "Examples: 'lasgna' matches 'lasagna'; 'dogs' matches 'dog'.\n\n"
        "3. Return 'yes' if the guess contains filler words, articles, or other non-essential modifiers.\n"
        "Examples: 'a sandwich' matches 'sandwich'; 'the bicycle' matches 'bicycle'.\n\n"
        "4. Return 'yes' if the guess is a common everyday synonym or a term that ordinary people would use interchangeably in normal conversation.\n"
        "Examples: 'couch' matches 'sofa'; 'cup' matches 'mug'.\n\n"
        "5. Return 'no' if the guess is a broader category, narrower category, subcategory, superclass, related object, or associated concept rather than the same thing.\n"
        "Examples: 'food' does not match 'lasagna'; 'pasta' does not match 'lasagna'; 'dog' does not match 'beagle'; 'beagle' does not match 'dog'.\n\n"
        "6. When uncertain, prefer 'no' unless the two terms would commonly be treated as the same answer by ordinary people playing a guessing game.\n\n"
        "Format your output as a single-line JSON object with exactly two keys:\n"
        "{\"analysis\":\"Brief reasoning here\",\"response\":\"yes|no\"}"
    )

    user_content = f"User Guess: '{guess}' | Target Secret Answer: '{answer}'"

    for attempt in range(2):
        try:
            client = _get_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                temperature=0.0,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]
            )

            result = completion.choices[0].message.content
            parsed = json.loads(result)

            response_raw = str(parsed.get("response", "")).strip().lower()
            
            try:
                response_enum = EvaluationResponse(response_raw)
            except ValueError:
                response_enum = EvaluationResponse.NO

            return {
                "analysis": parsed.get("analysis", "No analysis provided."),
                "response": response_enum
            }
        except Exception as e:
            logger.warning(f"Transient issue during guess verification (Attempt {attempt + 1}): {e}")
            if attempt == 1:
                return {"analysis": f"Failed evaluating guess downstream: {str(e)}", "response": EvaluationResponse.NO}