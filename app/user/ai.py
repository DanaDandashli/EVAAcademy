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
    # ── Beginner ──
    {'order': 1,  'title': 'The Basics',                    'level_required': 1,  'category': 'beginner',
     'topics': ['print', 'input', 'variables', 'data types', 'type casting', 'comments', 'basic arithmetic operators (+, -, *, /, //, %)', 'string concatenation', 'f-strings', 'string multiplication', 'multiple assignment']},
    {'order': 2,  'title': 'Control Flow',                  'level_required': 1,  'category': 'beginner',
     'topics': ['if statements', 'else', 'elif', 'comparison operators', 'logical operators', 'nested conditions', 'truthy and falsy values', 'pass statement']},
    {'order': 3,  'title': 'Functions',                     'level_required': 2,  'category': 'beginner',
     'topics': ['defining functions', 'parameters', 'default parameters', 'return values', 'scope', 'multiple return values', 'docstrings', '*args', '**kwargs']},
    {'order': 4,  'title': 'Loops',                         'level_required': 2,  'category': 'beginner',
     'topics': ['for loops', 'while loops', 'range', 'break', 'continue', 'pass', 'nested loops', 'enumerate', 'loop else', 'zip in loops']},
    {'order': 5,  'title': 'Lists',                         'level_required': 3,  'category': 'beginner',
     'topics': ['creating lists', 'indexing', 'negative indexing', 'slicing', 'append', 'remove', 'pop', 'sort', 'list methods', 'iterating', 'len', 'in operator', 'list concatenation']},
    {'order': 6,  'title': 'Tuples & Sets',                 'level_required': 3,  'category': 'beginner',
     'topics': ['creating tuples', 'tuple unpacking', 'immutability', 'creating sets', 'set operations', 'union', 'intersection', 'difference', 'frozen sets', 'len', 'in operator']},
    {'order': 7,  'title': 'Dictionaries',                  'level_required': 4,  'category': 'beginner',
     'topics': ['key-value pairs', 'accessing values', 'adding and updating keys', 'deleting keys', 'dictionary methods', 'iterating dictionaries', 'nested dictionaries', 'dict comprehension', 'get() method', 'in operator for keys']},
    {'order': 8,  'title': 'String Methods',                'level_required': 4,  'category': 'beginner',
     'topics': ['string indexing', 'slicing', 'upper and lower', 'strip', 'split', 'join', 'replace', 'find', 'count', 'startswith and endswith', 'len', 'isdigit and isalpha']},
    {'order': 9,  'title': 'Comprehensions',                'level_required': 4,  'category': 'beginner',
     'topics': ['list comprehension', 'dict comprehension', 'set comprehension', 'conditional comprehension', 'nested comprehension', 'generator expressions']},

    # ── Intermediate ──
    {'order': 10, 'title': 'Lambda & Functional Programming', 'level_required': 5, 'category': 'intermediate',
     'topics': ['lambda functions', 'map', 'filter', 'reduce', 'zip', 'sorted with key', 'any and all', 'functools']},
    {'order': 11, 'title': 'Built-in Functions',            'level_required': 5,  'category': 'intermediate',
     'topics': ['len', 'sorted and reversed', 'sum', 'min and max', 'abs and round', 'pow and divmod', 'type and isinstance', 'chr and ord']},
    {'order': 12, 'title': 'Error Handling',                'level_required': 5,  'category': 'intermediate',
     'topics': ['try and except', 'catching specific errors', 'else clause', 'finally clause', 'raising exceptions', 'custom exceptions', 'common built-in errors']},
    {'order': 13, 'title': 'Modules & Libraries',           'level_required': 6,  'category': 'intermediate',
     'topics': ['import', 'from import', 'aliasing modules', 'math module', 'random module', 'string module', 'pip', 'standard library']},
    {'order': 14, 'title': 'Type Hints & Annotations',      'level_required': 6,  'category': 'intermediate',
     'topics': ['variable annotations', 'function annotations', 'return type hints', 'Optional', 'List and Dict type hints', 'Union', 'typing module']},
    {'order': 15, 'title': 'Context Managers',              'level_required': 6,  'category': 'intermediate',
     'topics': ['with statement', '__enter__ and __exit__', 'custom context managers', 'contextlib', 'multiple context managers', 'exception handling in context managers']},

    # ── Advanced ──
    {'order': 16, 'title': 'OOP Basics',                    'level_required': 7,  'category': 'advanced',
     'topics': ['classes', 'objects', 'attributes', 'methods', '__init__', 'self', 'instance vs class variables', '__str__ method']},
    {'order': 17, 'title': 'OOP Advanced',                  'level_required': 7,  'category': 'advanced',
     'topics': ['inheritance', 'super()', 'method overriding', 'encapsulation', 'private attributes', 'polymorphism', 'abstract classes', 'multiple inheritance']},
    {'order': 18, 'title': 'Recursion',                     'level_required': 8,  'category': 'advanced',
     'topics': ['recursive functions', 'base case', 'recursive case', 'call stack', 'factorial', 'fibonacci', 'tree traversal', 'memoization']},
    {'order': 19, 'title': 'Decorators',                    'level_required': 8,  'category': 'advanced',
     'topics': ['function decorators', 'functools wraps', 'decorator with arguments', 'class decorators', 'staticmethod', 'classmethod', 'property decorator']},
    {'order': 20, 'title': 'Generators',                    'level_required': 9,  'category': 'advanced',
     'topics': ['yield', 'generator functions', 'generator expressions', 'lazy evaluation', 'next()', 'send()', 'infinite generators', 'itertools']},
    {'order': 21, 'title': 'Itertools & Built-in Tools',    'level_required': 9,  'category': 'advanced',
     'topics': ['itertools chain', 'itertools product', 'itertools combinations', 'itertools permutations', 'itertools cycle', 'itertools islice', 'itertools groupby', 'zip_longest', 'collections Counter', 'collections defaultdict', 'collections OrderedDict', 'collections namedtuple']},

    # ── Expert ──
    {'order': 22, 'title': 'Data Structures',               'level_required': 10, 'category': 'expert',
     'topics': ['stacks', 'queues', 'deque', 'linked lists', 'binary trees', 'hash maps', 'heaps', 'graphs']},
    {'order': 23, 'title': 'Algorithms',                    'level_required': 10, 'category': 'expert',
     'topics': ['bubble sort', 'selection sort', 'insertion sort', 'merge sort', 'quick sort', 'binary search', 'linear search', 'big O notation', 'time complexity']},
    {'order': 24, 'title': 'Testing & Debugging',           'level_required': 11, 'category': 'expert',
     'topics': ['assert statements', 'print debugging', 'defensive programming', 'input validation', 'error messages', 'tracing code manually', 'common bugs', 'logical errors vs syntax errors']},
    {'order': 25, 'title': 'Regular Expressions',           'level_required': 11, 'category': 'expert',
     'topics': ['patterns', 're module', 'match', 'search', 'findall', 'sub and replace', 'groups', 'special characters', 'flags']},
    {'order': 26, 'title': 'JSON & Data Serialization',               'level_required': 12, 'category': 'expert',
     'topics': ['json module', 'json loads and dumps', 'json formatting', 'nested JSON', 'JSON with lists', 'JSON with dictionaries', 'parsing JSON responses', 'error handling in JSON', 'data serialization']},
    {'order': 27, 'title': 'Design Patterns',               'level_required': 12, 'category': 'expert',
     'topics': ['singleton pattern', 'factory pattern', 'observer pattern', 'strategy pattern', 'decorator pattern', 'iterator pattern', 'builder pattern', 'facade pattern']},
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


def _get_age_constraints(age_group):
    """Return task complexity constraints based on age group."""
    if age_group == 'child':
        return {
            'max_lines':    4,
            'complexity':   'simple — single concept, real-world objects kids understand',
            'forbidden':    'complex math, business logic, technical jargon, financial calculations',
            'output_style': 'fun and relatable — use simple numbers and concrete real-world objects',
        }
    elif age_group == 'teen':
        return {
            'max_lines':    8,
            'complexity':   'moderate — can combine 2 concepts, real-world practical scenarios',
            'forbidden':    'overly corporate or academic scenarios',
            'output_style': 'engaging and practical',
        }
    else:
        return {
            'max_lines':    12,
            'complexity':   'professional — real-world business or technical scenarios with precise requirements',
            'forbidden':    'childish or oversimplified scenarios',
            'output_style': 'professional and precise',
        }


def _clean_json(content):
    content = content.strip()
    content = re.sub(r'^```(?:json|python|javascript)?\s*\n?', '', content)
    content = re.sub(r'\n?```\s*$', '', content)
    content = content.strip()
    return content


def _call_ai(prompt, system='Return only raw valid JSON. No markdown.', max_tokens=None, temperature=None):
    """Centralized AI API call helper."""
    try:
        response = client.chat.completions.create(
            model=__Model__,
            max_tokens=max_tokens or __MaxTokens__,
            temperature=temperature if temperature is not None else __Temperature__,
            messages=[
                {'role': 'system', 'content': system},
                {'role': 'user',   'content': prompt},
            ]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f'AI call error: {e}')
        return None


def _fix_code(code):
    """Fix code for Skulpt compatibility."""
    code = code.replace('\\"', '"')
    # Fix single-quoted strings containing apostrophes — convert to double quotes

    def fix_apostrophe(m):
        content = m.group(1)
        if "'" in content:
            return '"' + content + '"'
        return m.group(0)
    code = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'", fix_apostrophe, code)
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
    constraints = _get_age_constraints(age_group)
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

Age constraints:
- Max lines of code per slide: {constraints['max_lines']}
- Complexity: {constraints['complexity']}
- Forbidden scenarios: {constraints['forbidden']}

IMPORTANT: Only teach these specific topics: {topics_str}
Do NOT include any other topics outside this list.

Decide how many slides this topic needs (minimum 15, maximum 30) based on complexity.

Generate slides that teach "{lesson_title}" progressively from simple to complex.
Each slide must teach ONE concept from the topics list only.

STRICT CODE RULES:
- Every code example must be fully self-contained and runnable
- Every variable used MUST be defined in the same code block
- NEVER reference a variable that isn't declared in the same snippet
- CRITICAL: NEVER use apostrophes (') inside single-quoted strings. ALWAYS use double quotes for ANY string containing an apostrophe or contraction (it's, don't, can't, I'm, etc.). Example: use "It's hot!" NOT 'It\'s hot!'
- CRITICAL: NEVER generate code with contractions inside single-quoted strings — this breaks the browser Python environment
- NEVER use these functions — they are NOT supported in the browser Python environment:
  help(), dir(), vars(), globals(), locals(), open(), os, sys, subprocess,
  import os, import sys, import re, import json, import datetime,
  __import__(), eval(), exec(), compile(), memoryview(), bytearray()
- To demonstrate docstrings, use print(function.__doc__) instead of help()
- Never import any external modules — only pure Python built-ins
- Max {constraints['max_lines']} lines per code example

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
        raw = _call_ai(
            prompt,
            system='You are a JSON generator. Return ONLY a valid JSON array. No markdown. No code blocks. No backticks. No explanation. Start your response with [ and end with ].',
            max_tokens=4000
        )
        if not raw:
            return []
        result = json.loads(_clean_json(raw))
        for slide in result:
            slide['code'] = _fix_code(slide.get('code', ''))
        return result
    except Exception as e:
        print(f'generate_slides error: {e}')
        return []


def validate_task(instruction, code, output, age_group='child', task_type='free_code', correct_answer='', fail_count=0):
    """Strictly validate if student completed the task."""

    # ── Bug fix: compare against correct answer ──
    if task_type == 'bug_fix' and correct_answer:
        task_context = f"""Task type: BUG FIX
The correct fixed code is:
{correct_answer}

PASS if the student's code matches the correct answer.
If the student's code is identical to the correct answer, always PASS immediately.
FAIL only if the original buggy code is unchanged."""
    elif task_type == 'fill_blank':
        task_context = f"""Task type: FILL IN THE BLANK
Student's answer: "{code}"
Correct answer: "{correct_answer}"

PASS if the student's answer is semantically correct
- Do NOT require exact string match — evaluate conceptual correctness
FAIL only if the answer is clearly wrong or shows misunderstanding."""
    else:
        task_context = """CRITICAL RULES:
- Check if the student used the CONCEPT required, not just achieved the output
- The student must demonstrate they learned the specific concept
- NEVER require a specific function when multiple functions solve the task correctly
- If code uses input(), output will vary — do NOT compare exact output values
- Placeholder values or generic strings = FAIL"""

    prompt = f"""You are a strict Python task validator.

Task: "{instruction}"
Student code:
{code}
Output: "{output}"

{task_context}

Reply EXACTLY with:
PASS
[1-2 sentences of encouraging feedback]

OR

FAIL
[1 guiding question that helps student understand what concept they missed, no code]"""

    try:
        raw = _call_ai(
            prompt,
            system='You are a strict but fair task validator. First line must be exactly PASS or FAIL.'
        )
        return raw or 'FAIL\nI am having trouble validating. Try again!'
    except Exception:
        return 'FAIL\nI am having trouble validating. Try again!'


def generate_next_task(lesson_title, task_number, previous_tasks=None, student_performance=None, age_group='child', completed_lessons=None, student_context=None, lesson_topics=None):
    """Generate ONE task based on student performance so far."""
    if completed_lessons is None:
        completed_lessons = []
    if student_context is None:
        student_context = {}
    if previous_tasks is None:
        previous_tasks = []
    if student_performance is None:
        student_performance = {}
    if lesson_topics is None:
        lesson_topics = []

    level = student_context.get('level', 1)
    passed_count = student_performance.get('passed_count', 0)
    failed_count = student_performance.get('failed_count', 0)
    avg_attempts = student_performance.get('avg_attempts', 1)
    constraints = _get_age_constraints(age_group)

    # ── Difficulty adjustment ──
    if failed_count > passed_count:
        difficulty_adj = "easier"
    elif avg_attempts == 1 and passed_count >= 2:
        difficulty_adj = "harder"
    else:
        difficulty_adj = "same"

    # ── Task type and difficulty rotation ──
    type_rotation = ['bug_fix', 'free_code', 'free_code', 'bug_fix', 'free_code', 'free_code']
    diff_rotation = ['easy', 'easy', 'medium', 'medium', 'hard', 'expert']
    idx = min(task_number - 1, len(type_rotation) - 1)
    task_type = type_rotation[idx]
    difficulty = diff_rotation[idx]

    # ── Topic tracking ──
    covered_topics = [t.get('topic_covered', '')
                      for t in previous_tasks if t.get('topic_covered')]
    non_testable_topics = ['comments']
    remaining_topics = [
        t for t in lesson_topics if t not in covered_topics and t not in non_testable_topics]
    topic = remaining_topics[0] if remaining_topics else (
        lesson_topics[0] if lesson_topics else 'general')
    topics_str = ', '.join(lesson_topics) if lesson_topics else lesson_title
    prev_tasks = ', '.join([t.get('instruction', '')[:40]
                           for t in previous_tasks]) if previous_tasks else 'none'
    covered_topics_str = ', '.join(
        covered_topics) if covered_topics else 'none'

    # ── Type rules ──
    if task_type == 'fill_blank':
        type_rule = "Write one line with _____ replacing a COMPLETE word or value — never split a word. code_template has the full line with _____. correct_answer must be ONLY the exact missing word (e.g. if template is '_____('Hello')', correct_answer is 'print')."
    elif task_type == 'bug_fix':
        type_rule = """Task type: BUG FIX
    Write 2-4 lines of Python code testing: {topic}
    Introduce ONE real bug that causes WRONG OUTPUT or RUNTIME ERROR.
    Bug must require understanding of {topic} to fix — not a typo or comment issue.
    The correct_answer MUST fix ONLY the bug — keep all other logic identical.
    NEVER simplify or remove lines in the correct_answer — only fix the specific bug.
    code_template = buggy code, correct_answer = fixed code.
    Instruction = 'This code has a bug — find and fix it.'"""
    else:
        type_rule = "Student writes from scratch. code_template and correct_answer are empty."

    prompt = f"""Generate a Python task. Return ONLY JSON.

Lesson: {lesson_title} | Topics: {topics_str}
Task #{task_number} | Target topic: {topic} | Type: {task_type} | Difficulty: {difficulty} ({difficulty_adj})
Age: {age_group} | Level: {level}
Already covered: {covered_topics_str}
Previous tasks: {prev_tasks}

Age constraints:
- Max lines of code: {constraints['max_lines']}
- Complexity: {constraints['complexity']}
- Forbidden scenarios: {constraints['forbidden']}
- Output style: {constraints['output_style']}

Type rule: {type_rule}

Rules:
- Test ONLY this topic: {topic}
- Skip already covered topics: {covered_topics_str}
- No repeated tasks
- NEVER mention function names, keywords, or syntax in instruction or hint
- NEVER mix user input with hardcoded values in the same task — choose one approach only
- If the task uses user input, do NOT specify what value should be entered
- Student knows ONLY: {topics_str} — nothing else exists for them
- If solution needs anything outside {topics_str}, generate a different task

JSON:
{{
  "order": {task_number},
  "task_type": "{task_type}",
  "difficulty": "{difficulty}",
  "topic_covered": "{topic}",
  "instruction": "...",
  "hint": "...",
  "expected_output": "...",
  "check_regex": "...",
  "correct_answer": "...",
  "code_template": "..."
}}"""

    try:
        raw = _call_ai(prompt, max_tokens=__MaxTokens__)
        if not raw:
            return None
        return json.loads(_clean_json(raw))
    except Exception as e:
        print(f'generate_next_task error: {e}')
        return None


def validate_generated_task(task_data, lesson_topics):
    """Validate AI-generated task before showing to student."""
    task_type = task_data.get('task_type', 'free_code')
    code_template = task_data.get('code_template', '')
    correct_answer = task_data.get('correct_answer', '').strip()
    instruction = task_data.get('instruction', '')

    if not instruction:
        return False, "Missing instruction"

    if task_type == 'fill_blank':
        if '_____' not in code_template:
            return False, "No blank in template"
        if not correct_answer:
            return False, "Missing correct answer"
    elif task_type == 'bug_fix':
        if not code_template:
            return False, "Missing buggy code"
        if not correct_answer:
            return False, "Missing correct answer"
        if code_template.strip() == correct_answer.strip():
            return False, "Buggy code identical to correct answer"
        # Reject if they differ only by punctuation/spaces — no real bug
        template_clean = re.sub(r'[\s\'".,!]', '', code_template)
        answer_clean = re.sub(r'[\s\'".,!]', '', correct_answer)
        if template_clean == answer_clean:
            return False, "Bug fix task has no meaningful difference between template and answer"
    return True, "OK"


def should_complete_application(passed_count, failed_count, avg_attempts, total_topics=8):
    """Decide if student has mastered the application node."""
    # Must cover at least 75% of lesson topics
    min_tasks = 6

    if passed_count < min_tasks:
        return False

    # Struggling student — allow completion after covering min topics with more attempts
    if avg_attempts > 3.0:
        return passed_count >= min_tasks

    # Normal learner — covered min topics with reasonable attempts
    if passed_count >= min_tasks and avg_attempts <= 2.5:
        return True

    return False


def generate_next_test_question(lesson_title, question_number, weak_areas=None, previous_questions=None, age_group='child', completed_lessons=None, student_context=None, lesson_topics=None, taught_concepts=None, avg_attempts=1):
    """Generate ONE test question based on what was actually taught."""
    if completed_lessons is None:
        completed_lessons = []
    if student_context is None:
        student_context = {}
    if weak_areas is None:
        weak_areas = []
    if previous_questions is None:
        previous_questions = []
    if lesson_topics is None:
        lesson_topics = []
    if taught_concepts is None:
        taught_concepts = []

    # Difficulty based on performance
    if avg_attempts <= 1.2:
        difficulty = "challenging"
    elif avg_attempts >= 2.5:
        difficulty = "easy"
    else:
        difficulty = "moderate"

    style = _get_style(age_group)
    constraints = _get_age_constraints(age_group)
    level = student_context.get('level', 1)

    # Assign one specific topic per question
    topics_to_use = taught_concepts if taught_concepts else lesson_topics
    current_topic = topics_to_use[(question_number - 1) %
                              len(topics_to_use)] if topics_to_use else lesson_title

    prev_q_titles = ', '.join([q.get('instruction', '')[
                              :50] for q in previous_questions]) if previous_questions else 'none'
    weak_context = f"Weak areas: {', '.join(weak_areas)}." if weak_areas else ''
    taught_str = ', '.join(
        taught_concepts) if taught_concepts else ', '.join(lesson_topics)

    prompt = f"""Create Python test question #{question_number} of 5 for lesson "{lesson_title}".

This is a FINAL TEST — questions must be harder than practice tasks.
Test ONLY this topic: {current_topic}
All lesson topics: {taught_str}
Previous questions: {prev_q_titles} — do NOT repeat.
{weak_context}

Student: age_group={age_group}, level={level}, difficulty={difficulty}

Age constraints:
- Max lines of code in solution: {constraints['max_lines']}
- Complexity: {constraints['complexity']}
- Forbidden scenarios: {constraints['forbidden']}

CRITICAL RULES:
- Use ONLY concepts from this exact list: {taught_str}
- STRICTLY FORBIDDEN to repeat similar scenarios — previous questions: {prev_q_titles}
- Student ONLY knows: {taught_str} — nothing else exists for them
- The solution must be achievable using ONLY: {taught_str}

Return ONLY valid JSON:
{{
  "order": {question_number},
  "instruction": "Write a Python program that...",
  "expected_output": "exact output if deterministic, else empty string",
  "check_regex": "simple regex validating correct concept was used",
  "points": 20
}}"""

    try:
        raw = _call_ai(prompt)
        if not raw:
            return None
        return json.loads(_clean_json(raw))
    except Exception as e:
        print(f'generate_next_test_question error: {e}')
        return None


def should_complete_test(passed_count, total_questions, total_score, max_score):
    """Decide if student has passed the test."""
    if total_questions == 0:
        return False
    score_pct = (total_score / max_score * 100) if max_score > 0 else 0
    # Must answer at least 3 questions and score 70%+
    return total_questions >= 3 and score_pct >= 70


def generate_competition_challenge(lesson_title, age_group='child', completed_lessons=None, student_context=None, lesson_topics=None):
    """Generate a competition challenge based on completed lessons."""
    if completed_lessons is None:
        completed_lessons = []
    if student_context is None:
        student_context = {}
    if lesson_topics is None:
        lesson_topics = []

    style = _get_style(age_group)
    constraints = _get_age_constraints(age_group)
    level = student_context.get('level', 1)
    topics_str = ', '.join(lesson_topics) if lesson_topics else lesson_title

    prompt = f"""Create a Python competition challenge for lesson "{lesson_title}".

Topics to test: {topics_str}
Student level: {level}
Style: {style}

Age constraints:
- Max lines of code in solution: {constraints['max_lines']}
- Complexity: {constraints['complexity']}
- Forbidden scenarios: {constraints['forbidden']}

The challenge must:
- Require combining MULTIPLE concepts from: {topics_str}
- NOT be a simple print, variable assignment, or single-operation task
- Require real problem-solving — the student must think, not just recall syntax
- Be significantly harder than application tasks
- Be solvable within the age constraint above
- Have a clear expected output

Return ONLY valid JSON:
{{
  "title": "short challenge title",
  "description": "exciting challenge description",
  "instruction": "Write a Python program that...",
  "expected_output": "exact expected output",
  "check_regex": "regex to validate solution",
  "time_limit": 600
}}"""

    try:
        raw = _call_ai(prompt)
        if not raw:
            return None
        return json.loads(_clean_json(raw))
    except Exception as e:
        print(f'generate_competition_challenge error: {e}')
        return None


def eva_chat(user_message, user_code='', lesson_title='Python', age_group='child', eva_context={}, history=[], node_type='advisor'):
    """EVA Advisor chat — returns AI response. Behavior adapts per node_type."""

    if age_group == 'child':
        persona = "a friendly and encouraging Python tutor for kids aged 7-12"
        style = "Use very simple language, fun analogies, and lots of encouragement. Maximum 3 short sentences."
    elif age_group == 'teen':
        persona = "a cool and knowledgeable Python mentor for teenagers aged 13-18"
        style = "Use casual but clear language. Be direct and relatable. Maximum 4 sentences."
    else:
        persona = "a professional Python instructor for adult learners"
        style = "Be concise, technical when appropriate, and respectful. Maximum 4 sentences."

    level = eva_context.get('level', 1)

    # ── Node-specific system prompts ──
    if node_type == 'application':
        task_instruction = eva_context.get('taskInstruction', '')
        system_prompt = f"""You are EVA, {persona}.

The student is working on the Application node for lesson: {lesson_title}.
Current task: "{task_instruction}"
Student's current code:
```python
{user_code}
```

Your ONLY job is to guide the student toward completing the current task above.
NEVER assign a new challenge — the task is already defined.
NEVER change or extend the task requirements.

Your Teaching Philosophy:
1. GUIDE — Ask ONE Socratic question that nudges the student toward the solution. Never give the answer directly.
2. ON ERROR — Identify what went wrong in 1 sentence and ask a guiding question.
3. ON ENCOURAGEMENT — Celebrate progress in 1 sentence and guide next step.

STRICT RULES — NO EXCEPTIONS:
- NEVER write any code, not even a single character of Python syntax
- NEVER use backticks or code blocks of any kind
- Keep responses under 3 sentences
- {style}"""

    elif node_type == 'competition':
        challenge_instruction = eva_context.get('challengeInstruction', '')
        system_prompt = f"""You are EVA, {persona}.

The student is in the Competition node for lesson: {lesson_title}.
Current challenge: "{challenge_instruction}"
Student's current code:
```python
{user_code}
```

Your ONLY job is to give ONE Socratic hint that guides the student toward solving this challenge.
NEVER solve it for them. NEVER assign a different challenge.

STRICT RULES — NO EXCEPTIONS:
- NEVER write any code, not even a single character of Python syntax
- NEVER use backticks or code blocks of any kind
- ONE guiding question or hint only
- Keep responses under 2 sentences
- {style}"""

    else:
        # ── Dashboard advisor — full challenge-assigning behavior ──
        weak_areas = eva_context.get('weakAreas', [])
        completed = eva_context.get('completedLessons', [])

        progress_summary = ''
        if completed:
            progress_summary += f"Completed lessons: {', '.join(completed)}. "
        if weak_areas:
            areas = []
            for w in weak_areas:
                concept = w.get('concept', '')
                attempts = w.get('attempts', 0)
                if concept:
                    areas.append(
                        f"{w['lesson']} — struggled {attempts}x with: {concept[:60]}")
                else:
                    areas.append(f"{w['lesson']} ({w.get('nodeType', '')})")
            progress_summary += f"Student's specific weak areas: {'; '.join(areas)}. IMPORTANT: Immediately assign ONE targeted practice challenge that addresses the first weak area. Do not just mention the weak area — give a specific coding task related to it."
        else:
            progress_summary += f" Assign ONE meaningful challenge appropriate for Level {level} based on completed lessons above. Avoid trivially simple tasks like printing a single word. Check conversation history and never repeat a challenge already assigned."
            
        system_prompt = f"""You are EVA, {persona}.

Student Profile:
- Level: {level}
{progress_summary}

Current lesson: {lesson_title}
Student's current code:
```python
{user_code}
```

IMPORTANT: Always analyze the student's code above, not just their message. If the code doesn't use the required concept (variables, loops, etc.), the task is NOT complete regardless of the output.

Your Teaching Philosophy:
1. TASK ASSIGNMENT — Assign ONE clear challenge at a time. State exactly what the student needs to DO, not how to do it. Never mention specific variable names or syntax in the task description.

2. TASK EVALUATION — When evaluating code output:
   - Focus on CONCEPT mastery, not exact implementation
   - If the student demonstrated understanding of the concept, mark as COMPLETE
   - ABSOLUTE RULE: If the output satisfies the task requirement, it is COMPLETE — do not ask for more
   - NEVER add requirements that were not explicitly stated in the original task
   - NEVER ask for descriptive output unless the task specifically said "descriptive"
   - NEVER change success criteria mid-task

3. WHEN TASK IS COMPLETE — Celebrate briefly (1 sentence), then assign a new challenge that builds on the previous one progressively.

4. WHEN TASK IS INCOMPLETE — Ask ONE specific question that guides the student toward the solution. Never repeat the same hint twice. After 3 failed attempts, simplify the task.

5. STRICT RULES — THESE ARE ABSOLUTE, NO EXCEPTIONS:
   - NEVER write any code, not even a single character of Python syntax
   - NEVER show function names, operators, brackets, or any code-like text
   - NEVER use backticks or code blocks of any kind
   - If you are tempted to write code — ask a guiding question instead
   - NEVER contradict yourself between messages
   - NEVER loop back to a completed task
   - Keep responses under 4 sentences
   - {style}"""

    # Build messages with history
    messages = [{'role': 'system', 'content': system_prompt}]
    for msg in history:
        messages.append({'role': msg['role'], 'content': msg['content']})
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
        return 'I am having trouble thinking right now. Try again in a moment!'


def generate_solution(instruction, age_group='child'):
    """Generate a solution with explanation for a challenge."""
    style = _get_style(age_group)
    prompt = f"""A student just finished a Python challenge. Show them the correct solution.

Challenge: "{instruction}"

Provide:
1. The complete Python solution in a code block
2. A brief explanation of each line in simple terms

Style: {style}
Be encouraging and educational."""

    raw = _call_ai(
        prompt, system='You are an educational Python tutor. Always provide the solution when asked after a challenge is completed.')
    return raw or 'Solution unavailable. Practice the challenge again!'


def generate_project_idea(completed_topics, completed_lessons, weak_areas, age_group='teen', previous_projects=None):
    """Generate a personalized mini project idea based on student's completed topics and weak areas."""
    if previous_projects is None:
        previous_projects = []
    style = _get_style(age_group)
    constraints = _get_age_constraints(age_group)
    topics_str = ', '.join(
        completed_topics) if completed_topics else 'Python basics'
    lessons_str = ', '.join(
        completed_lessons) if completed_lessons else 'introductory lessons'
    weak_str = ', '.join(weak_areas[:3]) if weak_areas else 'none identified'

    prompt = f"""A student has completed the following Python lessons: {lessons_str}.
Their mastered topics include: {topics_str}.
Their weak areas are: {weak_str}.

Generate ONE personalized mini Python project idea that:
- Uses ONLY the topics the student has already learned: {topics_str}
- Targets their weak areas where possible: {weak_str}
- Is a real, complete program — not a single function or isolated task
- Takes 30-60 minutes to build
- Has a clear, practical purpose the student will find meaningful
- Is appropriate for this style: {style}
- Complexity: {constraints['complexity']}
- Forbidden scenarios: {constraints['forbidden']}

STRICTLY FORBIDDEN to generate any of these previously seen projects: {', '.join(previous_projects) if previous_projects else 'none'}
The new project must be completely different in concept and purpose.

Return ONLY raw JSON, no markdown:
{{
  "title": "short project title (max 6 words)",
  "description": "2-3 sentence description of what the student will build, what it does, and why it is useful. Do not mention syntax or implementation details."
}}"""

    try:
        raw = _call_ai(prompt, temperature=0.8)
        if not raw:
            raise ValueError('empty response')
        return json.loads(_clean_json(raw))
    except Exception as e:
        print(f'generate_project_idea error: {e}')
        return {
            'title':       'My Python Project',
            'description': 'Build a Python program that solves a real problem using what you have learned so far.',
        }


def review_project(title, description, code, topics, age_group='teen'):
    """EVA reviews the student's project code and gives qualitative feedback."""
    style = _get_style(age_group)
    topics_str = ', '.join(topics) if topics else 'Python basics'

    prompt = f"""A student has completed a Python mini project and is requesting a code review.

Project Title: {title}
Project Description: {description}
Topics used: {topics_str}

Student's code:
```python
{code}
```

Review this code as a professional mentor. Evaluate:
1. Does the code achieve the project's goal?
2. Is the logic correct and complete?
3. Code quality — naming, structure, readability
4. One specific thing done well
5. One specific improvement suggestion

Style: {style}

RULES:
- Be encouraging but honest
- Never rewrite the code for the student
- Give specific, actionable feedback
- If the code is empty or incomplete, tell the student kindly what is missing
- End with a clear verdict: APPROVED (ready to publish) or NEEDS WORK (with specific guidance)"""

    raw = _call_ai(
        prompt, system='You are EVA, a professional Python mentor giving a code review. Be constructive, specific, and encouraging.')
    return raw or 'I could not review your project at this moment. Please try again.'
