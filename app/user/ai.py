from openai import OpenAI
from django.conf import settings
import json
import re

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY
)


def eva_chat(user_message, user_code='', lesson_title='Python', age_group='child', eva_context={}, history=[]):

    if age_group == 'child':
        persona = "a friendly and encouraging Python tutor for kids aged 7-12"
        style = "Use very simple language, fun analogies, and lots of encouragement. Maximum 3 short sentences."
    elif age_group == 'teen':
        persona = "a cool and knowledgeable Python mentor for teenagers aged 13-18"
        style = "Use casual but clear language. Be direct and relatable. Maximum 4 sentences."
    else:
        persona = "a professional Python instructor for adult learners"
        style = "Be concise, technical when appropriate, and respectful. Maximum 4 sentences."

    # Build progress summary
    weak_areas = eva_context.get('weakAreas', [])
    completed = eva_context.get('completedLessons', [])
    level = eva_context.get('level', 1)

    progress_summary = ''
    if completed:
        progress_summary += f"Completed lessons: {', '.join(completed)}. "
    if weak_areas:
        areas = ', '.join(
            [f"{w['lesson']} - {w['nodeType']} node" for w in weak_areas])
        progress_summary += f"Student needs practice in: {areas}. Give them a specific coding challenge related to these topics, not a quiz. IMPORTANT: Check the conversation history carefully and never repeat a challenge already assigned. Always progress to something new."
    else:
        progress_summary += " IMPORTANT: Check the conversation history carefully and never repeat a challenge already assigned. Always progress to something new."
    

    system_prompt = f"""You are EVA, {persona}.

Student Profile:
- Level: {level}
- Completed: {', '.join(completed) if completed else 'Nothing yet'}
- Needs practice: {', '.join([f"{w['lesson']} ({w['nodeType']})" for w in weak_areas]) if weak_areas else 'General practice'}

Current lesson: {lesson_title}
Student's current code:
```python
{user_code}
```

Your Teaching Philosophy:
1. TASK ASSIGNMENT — Assign ONE clear challenge at a time. State exactly what the student needs to DO, not how to do it. Never mention specific variable names or syntax in the task description.

2. TASK EVALUATION — When evaluating code output:
   - Focus on CONCEPT mastery, not exact implementation
   - If the student demonstrated understanding of the concept, mark as COMPLETE
   - Never add requirements that were not in the original task
   - Never change success criteria mid-task

3. WHEN TASK IS COMPLETE — Celebrate briefly (1 sentence), then assign a new challenge that builds on the previous one progressively.

4. WHEN TASK IS INCOMPLETE — Ask ONE specific question that guides the student toward the solution. Never repeat the same hint twice. After 3 failed attempts, simplify the task.

5. STRICT RULES:
   - NEVER write code, or syntax examples
   - NEVER contradict yourself between messages
   - NEVER loop back to a completed task
   - Keep responses under 4 sentences
   - {style}"""

    # Build messages with history
    messages = [{'role': 'system', 'content': system_prompt}]

    # Add conversation history
    for msg in history: 
        messages.append({'role': msg['role'], 'content': msg['content']})

    # Add current message
    messages.append({'role': 'user', 'content': user_message})

    try:
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            max_tokens=200,
            temperature=0.7,
            messages=messages
        )
        return response.choices[0].message.content.strip()

    except Exception:
        return "I am having trouble thinking right now. Try again in a moment!"


def generate_slides(lesson_title, age_group='child'):
    """Generate lesson slides using AI."""
    pass


def generate_tasks(lesson_title, age_group='child'):
    """Generate application tasks using AI."""
    pass


def generate_test_questions(lesson_title, age_group='child'):
    """Generate test questions using AI."""
    pass
