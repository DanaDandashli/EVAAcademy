from openai import OpenAI
from dotenv import load_dotenv
import json
import os
import re

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENAI_API_KEY")
)


def generate_ai_questions(age_group):
    if age_group == "teen":
        prompt = """
        You are an educational AI.
        Generate exactly 3 multiple-choice Python beginner questions suitable for teenagers.
        Return ONLY valid JSON with no explanation, no markdown, no code blocks.
        Use this exact format:
        [
          {
            "question": "What does print() do in Python?",
            "choices": ["Adds numbers", "Displays output", "Creates a loop"],
            "answer": "Displays output"
          }
        ]
        """
    elif age_group == "adult":
        prompt = """
        You are an educational AI.
        Generate exactly 3 multiple-choice Python questions suitable for adults.
        - 1 easy
        - 1 medium
        - 1 hard
        Return ONLY valid JSON with no explanation, no markdown, no code blocks.
        Use this exact format:
        [
          {
            "question": "",
            "choices": ["", "", ""],
            "answer": ""
          }
        ]
        """
    else:
        raise ValueError("Invalid age group")

    response = client.chat.completions.create(
        model="google/gemini-2.5-flash-lite",
        max_tokens=10000,
        temperature=0.7,
        messages=[
            {"role": "system", "content": "You return only raw valid JSON. No markdown. No explanation."},
            {"role": "user", "content": prompt}
        ]
    )

    content = response.choices[0].message.content.strip()

    # robust cleanup — handles ```json, ```python, ``` variations
    content = re.sub(r'^```(?:json|python)?\n?', '', content)
    content = re.sub(r'\n?```$', '', content)
    content = content.strip()

    return json.loads(content)
