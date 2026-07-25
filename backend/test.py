import os
from dotenv import load_dotenv
from openai import OpenAI

# Load .env from the current directory
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("OPENAI_API_KEY not found.")
    raise SystemExit

print(f"Key starts with: {api_key[:10]}")
print(f"Key ends with: {api_key[-4:]}")
print(f"Length: {len(api_key)}")

client = OpenAI(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "user", "content": "Say hello."}
        ],
    )
    print("\nSuccess!")
    print(response.choices[0].message.content)
except Exception as e:
    print("\nRequest failed:")
    print(e)