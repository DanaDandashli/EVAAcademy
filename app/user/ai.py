from openai import OpenAI
from django.conf import settings
import json
import re

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY
)
__Model__ = "google/gemini-2.5-flash-lite"
__Temperature__ = 0.7
__MaxTokens__ = 2000

# ── Python Curriculum Foundation ──
PYTHON_CURRICULUM_FOUNDATION = [
    {'order': 1,  'title': 'The Basics',         'level_required': 1, 'category': 'beginner',
        'topics': ['print', 'variables', 'data types', 'comments']},
    {'order': 2,  'title': 'Control Flow',        'level_required': 1, 'category': 'beginner',
        'topics': ['if statements', 'else', 'elif', 'comparison operators']},
    {'order': 3,  'title': 'Functions',           'level_required': 2, 'category': 'beginner',
        'topics': ['defining functions', 'parameters', 'return values']},
    {'order': 4,  'title': 'Loops',               'level_required': 2, 'category': 'beginner',
        'topics': ['for loops', 'while loops', 'range', 'break', 'continue']},
    {'order': 5,  'title': 'Lists',               'level_required': 3, 'category': 'beginner',
        'topics': ['creating lists', 'indexing', 'list methods', 'iterating']},
    {'order': 6,  'title': 'Dictionaries',        'level_required': 4, 'category': 'intermediate',
        'topics': ['key-value pairs', 'accessing values', 'dictionary methods']},
    {'order': 7,  'title': 'String Methods',      'level_required': 4, 'category': 'intermediate',
        'topics': ['string operations', 'slicing', 'formatting', 'common methods']},
    {'order': 8,  'title': 'File Handling',       'level_required': 5, 'category': 'intermediate',
        'topics': ['reading files', 'writing files', 'with statement']},
    {'order': 9,  'title': 'Error Handling',      'level_required': 5, 'category': 'intermediate',
        'topics': ['try/except', 'common errors', 'raising exceptions']},
    {'order': 10, 'title': 'Modules & Libraries', 'level_required': 6, 'category': 'intermediate',
        'topics': ['import', 'standard library', 'pip', 'common modules']},
    {'order': 11, 'title': 'OOP Basics',          'level_required': 7,
        'category': 'advanced',      'topics': ['classes', 'objects', 'methods', '__init__']},
    {'order': 12, 'title': 'OOP Advanced',        'level_required': 7,
        'category': 'advanced',      'topics': ['inheritance', 'encapsulation', 'polymorphism']},
    {'order': 13, 'title': 'Recursion',           'level_required': 8, 'category': 'advanced',
        'topics': ['recursive functions', 'base case', 'call stack']},
    {'order': 14, 'title': 'Decorators',          'level_required': 8, 'category': 'advanced',
        'topics': ['function decorators', 'class decorators', 'built-in decorators']},
    {'order': 15, 'title': 'Generators',          'level_required': 9, 'category': 'advanced',
        'topics': ['yield', 'generator functions', 'lazy evaluation']},
    {'order': 16, 'title': 'Data Structures',     'level_required': 10,
        'category': 'expert',       'topics': ['stacks', 'queues', 'linked lists', 'trees']},
    {'order': 17, 'title': 'Algorithms',          'level_required': 10,
        'category': 'expert',       'topics': ['sorting', 'searching', 'big O notation']},
    {'order': 18, 'title': 'Regular Expressions', 'level_required': 11, 'category': 'expert',
        'topics': ['patterns', 're module', 'match', 'search', 'replace']},
    {'order': 19, 'title': 'Web Scraping',        'level_required': 11,
        'category': 'expert',       'topics': ['requests', 'BeautifulSoup', 'parsing HTML']},
    {'order': 20, 'title': 'APIs & Requests',     'level_required': 12, 'category': 'expert',
        'topics': ['REST APIs', 'GET/POST', 'JSON responses', 'authentication']},
]


def get_student_context(user):
    """Build student profile for personalization."""
    from app.user.models import StudentProfile, UserProgress, Section

    try:
        profile = StudentProfile.objects.get(user=user)
    except Exception:
        return {'level': 1, 'weak_areas': [], 'common_mistakes': [], 'learning_speed': 'normal'}

    # Get weak areas from incomplete nodes
    completed_ids = set(
        UserProgress.objects.filter(user=user, completed=True)
        .values_list('section_id', flat=True)
    )

    weak_areas = []
    incomplete = Section.objects.exclude(
        id__in=completed_ids).select_related('lesson')
    for section in incomplete[:5]:
        if section.node_type in ['application', 'test']:
            weak_areas.append(f"{section.lesson.title} - {section.node_type}")

    # Determine learning speed based on XP and level
    learning_speed = 'normal'
    if profile.xp_total > 500 and profile.level >= 3:
        learning_speed = 'fast'
    elif profile.xp_total < 100 and profile.level <= 1:
        learning_speed = 'slow'

    return {
        'level':           profile.level,
        'weak_areas':      weak_areas,
        'common_mistakes': [],
        'learning_speed':  learning_speed,
    }


def _get_style(age_group):
    if age_group == 'child':
        return "very simple language with fun examples suitable for ages 7-12"
    elif age_group == 'teen':
        return "clear and engaging language suitable for ages 13-18"
    else:
        return "professional and concise suitable for adults"


def _get_depth(learning_speed):
    if learning_speed == 'slow':
        return "Use more examples and analogies. Break each concept into very small steps."
    elif learning_speed == 'fast':
        return "Be concise. Student learns quickly so keep examples slightly challenging."
    else:
        return "Use a balanced approach with clear examples."


def _clean_json(content):
    content = content.strip()
    # Remove markdown code blocks
    content = re.sub(r'^```(?:json|python|javascript)?\s*\n?', '', content)
    content = re.sub(r'\n?```\s*$', '', content)
    content = content.strip()
    return content


def _fix_code(code):
    """Replace escaped double quotes with single quotes for Skulpt compatibility."""
    # Unescape double quotes first
    code = code.replace('\\"', '"')
    # Replace double-quoted strings with single-quoted strings
    code = re.sub(r'"([^"]*)"', lambda m: "'" + m.group(1) + "'", code)
    return code


def generate_slides(lesson_title, age_group='child', completed_lessons=None, student_context=None, lesson_topics=None):
    """Generate slides — AI decides how many based on topic complexity."""
    if completed_lessons is None:
        completed_lessons = []
    if student_context is None:
        student_context = {}
    if lesson_topics is None:
        lesson_topics = []

    style = _get_style(age_group)
    prior_knowledge = ', '.join(
        completed_lessons) if completed_lessons else 'none'
    weak_areas = student_context.get('weak_areas', [])
    learning_speed = student_context.get('learning_speed', 'normal')
    level = student_context.get('level', 1)
    depth = _get_depth(learning_speed)
    weak_context = f"Student struggles with: {', '.join(weak_areas)}." if weak_areas else ''
    topics_str = ', '.join(lesson_topics) if lesson_topics else lesson_title

    prompt = f"""You are creating Python lesson slides for "{lesson_title}".

Student Profile:
- Age group: {age_group}
- Level: {level}
- Already knows: {prior_knowledge}
- {weak_context}

Style: {style}
Depth: {depth}

IMPORTANT: Only teach these specific topics: {topics_str}
Do NOT include any other topics outside this list.

Decide how many slides this topic needs (minimum 5, maximum 15) based on complexity.

Generate slides that teach "{lesson_title}" progressively from simple to complex.
Build on what the student already knows.
Each explanation MUST include the exact Python syntax being taught
Each slide must teach ONE concept from the topics list only.
Code examples must be short (max 6 lines) and runnable.

Return ONLY valid JSON, no markdown, no explanation:
[
  {{
    "order": 1,
    "title": "slide title",
    "explanation": "clear explanation in 2-3 sentences",
    "code": "python code example"
  }}
]"""

    try:
        response = client.chat.completions.create(
            model=__Model__,
            max_tokens=__MaxTokens__,
            temperature=__Temperature__,
            messages=[
                {"role": "system",
                    "content": "You are a JSON generator. Return ONLY a valid JSON array. No markdown. No code blocks. No backticks. No explanation. Start your response with [ and end with ]."},
                {"role": "user",   "content": prompt}
            ]
        )
        result = json.loads(_clean_json(response.choices[0].message.content))
        for slide in result:
            slide['code'] = _fix_code(slide.get('code', ''))
        return result
    except Exception as e:
        print(f"generate_slides error: {e}")
        return []


def generate_next_task(lesson_title, task_number, previous_tasks=None, student_performance=None, age_group='child', completed_lessons=None, student_context=None):
    """Generate ONE task based on student performance so far."""
    if completed_lessons is None:
        completed_lessons = []
    if student_context is None:
        student_context = {}
    if previous_tasks is None:
        previous_tasks = []
    if student_performance is None:
        student_performance = {}

    style = _get_style(age_group)
    prior_knowledge = ', '.join(
        completed_lessons) if completed_lessons else 'none'
    learning_speed = student_context.get('learning_speed', 'normal')
    level = student_context.get('level', 1)
    depth = _get_depth(learning_speed)

    # Build performance summary
    passed_count = student_performance.get('passed_count', 0)
    failed_count = student_performance.get('failed_count', 0)
    avg_attempts = student_performance.get('avg_attempts', 1)

    if failed_count > passed_count:
        difficulty = "easier — student is struggling. Simplify the concept."
    elif avg_attempts == 1 and passed_count >= 2:
        difficulty = "harder — student is mastering quickly. Increase challenge."
    else:
        difficulty = "similar difficulty to previous tasks."

    prev_task_titles = ', '.join([t.get('instruction', '')[:50]
                                 for t in previous_tasks]) if previous_tasks else 'none'

    prompt = f"""You are creating task #{task_number} for the Python lesson "{lesson_title}".

Student Profile:
- Age group: {age_group}
- Level: {level}
- Already knows: {prior_knowledge}
- Tasks completed so far: {passed_count}
- Tasks failed so far: {failed_count}
- Average attempts per task: {avg_attempts}
- Previous tasks covered: {prev_task_titles}

Style: {style}
Depth: {depth}
Difficulty adjustment: {difficulty}

Generate ONE coding task that:
- Builds on previous tasks
- Does NOT repeat concepts already practiced
- Is solvable in 3-8 lines of Python
- Has a helpful hint that guides without giving the answer

Return ONLY valid JSON, no markdown, no explanation:
{{
  "order": {task_number},
  "instruction": "clear task description",
  "hint": "helpful hint without giving the answer",
  "starter_code": "# starter code with comments\\n",
  "expected_output": "expected output if deterministic, else empty string",
  "check_regex": "regex pattern to validate solution"
}}"""

    try:
        response = client.chat.completions.create(
            model=__Model__,
            max_tokens=1000,
            temperature=__Temperature__,
            messages=[
                {"role": "system", "content": "You return only raw valid JSON. No markdown. No explanation."},
                {"role": "user",   "content": prompt}
            ]
        )
        return json.loads(_clean_json(response.choices[0].message.content))
    except Exception as e:
        print(f"generate_next_task error: {e}")
        return None


def should_complete_application(passed_count, failed_count, avg_attempts):
    """Decide if student has mastered the application node."""
    # Must pass at least 3 tasks
    if passed_count < 3:
        return False
    # Must have good performance — less than 2 avg attempts
    if avg_attempts > 2.5:
        return False
    # Fast learner — 3 passes with 1 attempt each
    if passed_count >= 3 and avg_attempts <= 1.5:
        return True
    # Normal learner — 4 passes
    if passed_count >= 4:
        return True
    return False


def generate_next_test_question(lesson_title, question_number, weak_areas=None, previous_questions=None, age_group='child', completed_lessons=None, student_context=None):
    """Generate ONE test question targeting weak areas."""
    if completed_lessons is None:
        completed_lessons = []
    if student_context is None:
        student_context = {}
    if weak_areas is None:
        weak_areas = []
    if previous_questions is None:
        previous_questions = []

    style = _get_style(age_group)
    prior_knowledge = ', '.join(
        completed_lessons) if completed_lessons else 'none'
    level = student_context.get('level', 1)

    weak_context = f"Focus on these weak areas: {', '.join(weak_areas)}." if weak_areas else ''
    prev_q_titles = ', '.join([q.get('instruction', '')[
                              :50] for q in previous_questions]) if previous_questions else 'none'

    prompt = f"""You are creating test question #{question_number} for the Python lesson "{lesson_title}".

Student Profile:
- Age group: {age_group}
- Level: {level}
- Already knows: {prior_knowledge}
- {weak_context}
- Previous questions covered: {prev_q_titles}

Style: {style}

Generate ONE test question that:
- Tests deeper understanding of "{lesson_title}"
- Does NOT repeat concepts from previous questions
- Is harder than application tasks
- Worth 25 points

Return ONLY valid JSON, no markdown, no explanation:
{{
  "order": {question_number},
  "instruction": "clear question description",
  "starter_code": "# starter code\\n",
  "expected_output": "expected output if deterministic, else empty string",
  "check_regex": "regex pattern to validate solution",
  "points": 25
}}"""

    try:
        response = client.chat.completions.create(
            model=__Model__,
            max_tokens=1000,
            temperature=__Temperature__,
            messages=[
                {"role": "system", "content": "You return only raw valid JSON. No markdown. No explanation."},
                {"role": "user",   "content": prompt}
            ]
        )
        return json.loads(_clean_json(response.choices[0].message.content))
    except Exception as e:
        print(f"generate_next_test_question error: {e}")
        return None


def should_complete_test(passed_count, total_questions, total_score, max_score):
    """Decide if student has passed the test."""
    if total_questions == 0:
        return False
    score_pct = (total_score / max_score * 100) if max_score > 0 else 0
    # Must answer at least 3 questions and score 70%+
    return total_questions >= 3 and score_pct >= 70


def eva_chat(user_message, user_code='', lesson_title='Python', age_group='child', eva_context={}, history=[]):
    """EVA Advisor chat — returns AI response."""

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
{progress_summary}

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
            model=__Model__,
            max_tokens=__MaxTokens__,
            temperature=__Temperature__,
            messages=messages
        )
        return response.choices[0].message.content.strip()

    except Exception:
        return "I am having trouble thinking right now. Try again in a moment!"
