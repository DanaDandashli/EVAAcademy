import json
import random
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from django.db import models
from django.views.decorators.http import require_POST
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.cache import cache
from functools import wraps
from .models import (NODE_XP, Avatar, StudentProfile, Lesson, Section, Slide, UserProgress,
                     ALL_ACHIEVEMENTS, Quest, UserQuest, EVAConversation, Task, TaskAttempt,
                     TestQuestion, TestAttempt, Project)
from .ai import (eva_chat, generate_slides, get_student_context, PYTHON_CURRICULUM_FOUNDATION,
                 generate_next_task, should_complete_application, validate_task,
                 generate_next_test_question, should_complete_test, generate_competition_challenge,
                 generate_solution, validate_generated_task, review_project, generate_project_idea)

User = get_user_model()


def get_completed_topics(lesson_titles):
    """Return a flat list of topics for the given lesson title(s)."""
    if isinstance(lesson_titles, str):
        lesson_titles = [lesson_titles]
    topics = []
    for curriculum_lesson in PYTHON_CURRICULUM_FOUNDATION:
        if curriculum_lesson['title'] in lesson_titles:
            topics.extend(curriculum_lesson['topics'])
    return topics


def get_completed_lessons(user, exclude_lesson=None):
    """Return list of completed lesson titles for a user."""
    qs = Lesson.objects.filter(
        sections__userprogress__user=user,
        sections__userprogress__completed=True
    ).distinct()
    if exclude_lesson:
        qs = qs.exclude(id=exclude_lesson.id)
    return list(qs.values_list('title', flat=True))


def get_taught_concepts(lesson):
    """Return slide titles from the introduction section of a lesson."""
    intro = Section.objects.filter(
        lesson=lesson, node_type='introduction').first()
    if intro:
        return list(intro.slides.all().values_list('title', flat=True))
    return []


def get_weak_areas(user, lesson):
    """Return weak areas for a user based on failed task attempts."""
    app_section = Section.objects.filter(
        lesson=lesson, node_type='application').first()
    if not app_section:
        return []
    failed = TaskAttempt.objects.filter(
        user=user, section=app_section, passed=False
    ).values_list('task_order', flat=True)
    return [f"tasks {list(failed)}"] if failed else []


def IndexView(request):
    return render(request, 'index.html')


def ChildrenView(request):
    return render(request, 'children.html')


def TeenView(request):
    return render(request, 'teen.html')


def AdultView(request):
    return render(request, 'adult.html')


def LoginView(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        if not username:
            messages.error(request, 'Username is required.')
            return render(request, 'login.html', {'username': username})
        if not password:
            messages.error(request, 'Password is required.')
            return render(request, 'login.html', {'username': username})

        # ── Rate limiting ──
        cache_key = f'login_attempts_{username}'
        attempts = cache.get(cache_key, 0)

        if attempts >= 5:
            messages.error(
                request, 'Too many failed attempts. Please try again in 15 minutes.')
            return render(request, 'login.html', {'username': username})

        user = authenticate(request, username=username, password=password)

        if user is not None:
            cache.delete(cache_key)
            login(request, user)
            return redirect('dashboard')
        else:
            cache.set(cache_key, attempts + 1, timeout=900)
            remaining = 4 - attempts
            messages.error(
                request, f'Invalid username or password. {remaining} attempts remaining.')
            return render(request, 'login.html', {'username': username})

    return render(request, 'login.html')


def RegisterView(request):
    if request.user.is_authenticated:
        return redirect('dashboard')

    avatars = Avatar.objects.all()

    if request.method == 'POST':
        age_group = request.POST.get('age_group', '').strip()

        if age_group == 'child':
            username = request.POST.get('username', '').strip()
        else:
            username = request.POST.get('adult_username', '').strip()

        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        confirm = request.POST.get('confirm', '')
        avatar_id = request.POST.get('avatar_id', None)
        pin = request.POST.get('pin', '')

        ctx = {'avatars': avatars, 'age_group': age_group,
               'username': username, 'email': email}

        if not age_group:
            messages.error(request, 'Please select a learning path.')
            return render(request, 'register.html', ctx)
        if not username or len(username) < 2:
            messages.error(request, 'Username must be at least 2 characters.')
            return render(request, 'register.html', ctx)
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already taken.')
            return render(request, 'register.html', ctx)

        if age_group == 'child':
            if len(pin) < 4:
                messages.error(request, 'Please enter a 4-digit secret code.')
                return render(request, 'register.html', ctx)
            password = pin
        else:
            if not email:
                messages.error(request, 'Email is required.')
                return render(request, 'register.html', ctx)
            if email and User.objects.filter(email=email).exists():
                messages.error(request, 'Email already registered.')
                return render(request, 'register.html', ctx)
            if len(password) < 8:
                messages.error(
                    request, 'Password must be at least 8 characters.')
                return render(request, 'register.html', ctx)
            if password != confirm:
                messages.error(request, 'Passwords do not match.')
                return render(request, 'register.html', ctx)
            try:
                validate_password(password)
            except ValidationError as e:
                messages.error(request, ' '.join(e.messages))
                return render(request, 'register.html', ctx)

        avatar = None
        if age_group == 'child' and avatar_id:
            try:
                avatar = Avatar.objects.get(id=avatar_id)
            except Avatar.DoesNotExist:
                pass

        if age_group == 'child':
            user = User(username=username, email=email, age_group=age_group,
                        gender='other', role='student', avatar=avatar)
            user.set_password(password)
            user.save()
        else:
            user = User.objects.create_user(
                username=username, email=email, password=password,
                age_group=age_group, gender='other', role='student', avatar=None,
            )

        StudentProfile.objects.get_or_create(user=user)
        login(request, user)
        return redirect('dashboard')

    return render(request, 'register.html', {'avatars': avatars})


def LogoutView(request):
    logout(request)
    return redirect('index')


def student_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if request.user.role != 'student':
            return redirect('login')
        return view_func(request, *args, **kwargs)
    return wrapper


# ════════════════════════════════════════════════
# Dashboard helper functions
# ════════════════════════════════════════════════

def _get_level_threshold(level):
    """XP needed to reach this level."""
    if level <= 1:
        return 0
    return int(100 * (level ** 1.8))


def _get_level(xp):
    level = 1
    while _get_level_threshold(level + 1) <= xp:
        level += 1
    return level


def _calculate_xp_and_level(user, profile, completed_progress):
    """Calculate XP from all sources, sync profile, return level stats."""
    xp = sum(NODE_XP.get(p.section.node_type, 0) for p in completed_progress)
    
    xp += profile.compete_wins * NODE_XP['competition']
    if user.age_group != 'child':
        xp += Project.objects.filter(user=user,
                                     status='published').count() * 100

    new_level = _get_level(xp)
    if profile.xp_total != xp or profile.level != new_level:
        profile.xp_total = xp
        profile.level = new_level
        profile.save()

    xp_cur = profile.xp_total
    level = profile.level
    xp_next = _get_level_threshold(level + 1)
    xp_prev = _get_level_threshold(level)
    xp_range = xp_next - xp_prev
    xp_pct = min(round(((xp_cur - xp_prev) / xp_range) * 100),
                 100) if xp_range else 0
    return level, xp_cur, xp_next, xp_pct


def _get_rank_title(level):
    """Return rank title string for a given level."""
    level_titles = [
        (range(1,   3),   'Python Rookie'),
        (range(3,   5),   'Beginner Coder'),
        (range(5,   7),   'Apprentice Developer'),
        (range(7,   9),   'Intermediate Developer'),
        (range(9,  11),   'Advanced Developer'),
        (range(11, 13),   'Senior Developer'),
        (range(13, 15),   'Expert Pythonista'),
        (range(15, 17),   'Python Architect'),
        (range(17, 100),  'Master Developer'),
        (range(100, 999), 'Python Engineer'),
    ]
    for r, title in level_titles:
        if level in r:
            return title
    return 'Python Rookie'


def _build_lessons_data(completed_section_ids):
    """Build the full learning path data structure."""
    lessons = Lesson.objects.filter(
        age_group='child'
    ).prefetch_related('sections').order_by('order')

    lessons_data = []
    total_sections = 0
    completed_sections_count = 0
    current_lesson = None
    current_section = None
    all_previous_completed = True

    for lesson in lessons:
        sections = lesson.sections.all()
        lesson_sections = []
        lesson_completed = len(sections) > 0
        lesson_is_locked = not all_previous_completed

        for section in sections:
            is_completed = section.id in completed_section_ids
            if not is_completed:
                lesson_completed = False
                if current_section is None and not lesson_is_locked:
                    current_section = section
                    current_lesson = lesson

            lesson_sections.append({
                'section':      section,
                'is_completed': is_completed,
                'is_current':   current_section == section,
                'is_locked':    lesson_is_locked or (not is_completed and current_section != section),
            })
            total_sections += 1
            if is_completed:
                completed_sections_count += 1

        lessons_data.append({
            'lesson':          lesson,
            'sections':        lesson_sections,
            'is_completed':    lesson_completed,
            'completed_count': sum(1 for s in lesson_sections if s['is_completed']),
            'total_count':     len(lesson_sections),
            'is_locked':       lesson_is_locked,
        })

        if not lesson_completed:
            all_previous_completed = False

    overall_pct = round(
        (completed_sections_count / total_sections * 100) if total_sections else 0
    )
    return lessons_data, total_sections, completed_sections_count, current_lesson, current_section, overall_pct


def _build_leaderboard(user, profile):
    """Return mini leaderboard, user rank, and total players."""
    leaderboard = StudentProfile.objects.select_related('user').filter(
        user__age_group=user.age_group
    ).order_by('-xp_total', 'created_at')[:3]

    user_rank = StudentProfile.objects.filter(
        user__age_group=user.age_group
    ).filter(
        models.Q(xp_total__gt=profile.xp_total) |
        models.Q(xp_total=profile.xp_total, created_at__lt=profile.created_at)
    ).count() + 1

    total_players = StudentProfile.objects.filter(
        user__age_group=user.age_group
    ).count()

    return leaderboard, user_rank, total_players


def _calculate_daily_goal(completed_progress):
    """Return today's XP, daily goal, and completion percentage."""
    today = timezone.now().date()
    xp_today = sum(
        NODE_XP.get(p.section.node_type, 0)
        for p in completed_progress
        if p.completed_at and p.completed_at.date() == today
    )
    daily_goal = 50
    xp_today = min(xp_today, daily_goal)
    daily_goal_pct = round((xp_today / daily_goal) * 100) if daily_goal else 0
    return xp_today, daily_goal, daily_goal_pct


def _build_achievements(completed_progress, profile):
    """Split achievements into earned and unearned."""
    earned = []
    unearned = []
    for achievement in ALL_ACHIEVEMENTS:
        if achievement.is_earned(completed_progress, profile):
            earned.append(achievement)
        else:
            unearned.append(achievement)
    return earned, unearned, len(earned)


def _build_quests(user, lessons_data, completed_progress):
    """Evaluate and update quest progress, return user_quests list."""
    quests = Quest.objects.filter(age_group=user.age_group, is_active=True)
    user_quests = []

    for quest in quests:
        if quest.node_type:
            progress = completed_progress.filter(
                section__node_type=quest.node_type
            ).count()
        else:
            progress = sum(1 for l in lessons_data if l['is_completed'])

        progress = min(progress, quest.target_count)
        is_complete = progress >= quest.target_count
        pct = round((progress / quest.target_count) *
                    100) if quest.target_count else 0

        uq, _ = UserQuest.objects.get_or_create(user=user, quest=quest)
        if is_complete and not uq.completed:
            uq.completed = True
            uq.completed_at = timezone.now()
            uq.save()
        uq.progress = progress
        uq.save()

        user_quests.append({
            'quest':       quest,
            'progress':    progress,
            'target':      quest.target_count,
            'pct':         pct,
            'is_complete': is_complete,
        })

    completed_quests_count = sum(1 for uq in user_quests if uq['is_complete'])
    return user_quests, completed_quests_count


def _build_eva_context(user, lessons_data, level, completed_sections_count, completed_lessons):
    """Build EVA advisor context from weak areas."""
    weak_areas = []

    for lesson in lessons_data:
        if lesson['is_locked'] or lesson['completed_count'] == 0:
            continue

        lesson_obj = lesson['lesson']
        app_section = Section.objects.filter(
            lesson=lesson_obj, node_type='application').first()

        if app_section:
            failed_tasks = TaskAttempt.objects.filter(
                user=user, section=app_section, passed=False, attempts__gte=2
            ).order_by('-attempts')
            for attempt in failed_tasks[:2]:
                task = Task.objects.filter(
                    section=app_section, user=user, order=attempt.task_order
                ).first()
                if task:
                    weak_areas.append({
                        'lesson':    lesson_obj.title,
                        'node_type': 'application',
                        'concept':   task.instruction[:80],
                        'attempts':  attempt.attempts,
                    })

        test_section = Section.objects.filter(
            lesson=lesson_obj, node_type='test').first()
        if test_section:
            failed_questions = TestAttempt.objects.filter(
                user=user, section=test_section, passed=False, attempts__gte=2
            ).order_by('-attempts')
            for attempt in failed_questions[:2]:
                question = TestQuestion.objects.filter(
                    section=test_section, user=user, order=attempt.question_order
                ).first()
                if question:
                    weak_areas.append({
                        'lesson':    lesson_obj.title,
                        'node_type': 'test',
                        'concept':   question.instruction[:80],
                        'attempts':  attempt.attempts,
                    })

    return {
        'level':             level,
        'completed_count':   completed_sections_count,
        'weak_areas':        weak_areas[:5],
        'completed_lessons': completed_lessons,
    }


def _check_section_access(user, section):
    """Return True if the student is allowed to access this section. Handle user URL access."""
    try:
        completed_section_ids = set(
            UserProgress.objects.filter(
                user=user, completed=True
            ).values_list('section_id', flat=True)
        )
        lessons_data, _, _, _, _, _ = _build_lessons_data(
            completed_section_ids)
        for lesson_data in lessons_data:
            for s in lesson_data['sections']:
                if s['section'] and s['section'].id == section.id:
                    return not s['is_locked']
        return False
    except Exception:
        return False


# ════════════════════════════════════════════════
# Dashboard View
# ════════════════════════════════════════════════

@student_required
def DashboardView(request):
    user = request.user
    profile, _ = StudentProfile.objects.get_or_create(user=user)
    completed_progress = UserProgress.objects.filter(
        user=user, completed=True
    ).select_related('section', 'section__lesson').order_by('-completed_at')
    completed_section_ids = set(p.section_id for p in completed_progress)

    # ── Core calculations ──
    level, xp_cur, xp_next, xp_pct = _calculate_xp_and_level(
        user, profile, completed_progress)
    rank_title = _get_rank_title(level)

    # ── Learning path ──
    lessons_data, total_sections, completed_sections_count, current_lesson, current_section, overall_pct = \
        _build_lessons_data(completed_section_ids)

    # ── Supporting data ──
    leaderboard, user_rank, total_players = _build_leaderboard(user, profile)
    xp_today, daily_goal, daily_goal_pct = _calculate_daily_goal(
        completed_progress)
    earned_achievements, unearned_achievements, total_badges = _build_achievements(
        completed_progress, profile)
    user_quests, completed_quests_count = _build_quests(
        user, lessons_data, completed_progress)

    # ── Derived data ──
    completed_lessons = [
        l['lesson'].title for l in lessons_data if l['is_completed']]
    completed_topics = ', '.join(
        completed_lessons) if completed_lessons else 'No topics yet'
    certs_earned = sum(1 for l in lessons_data if l['is_completed'])
    certs_remaining = len(lessons_data) - certs_earned
    intro_count = sum(
        1 for p in completed_progress if p.section.node_type == 'introduction')
    app_count = sum(
        1 for p in completed_progress if p.section.node_type == 'application')
    comp_count = sum(
        1 for p in completed_progress if p.section.node_type == 'competition')
    test_count = sum(
        1 for p in completed_progress if p.section.node_type == 'test')
    comp_losses = profile.compete_battles - profile.compete_wins
    comp_xp = profile.compete_wins * NODE_XP['competition']
    compete_win_rate = round((profile.compete_wins / profile.compete_battles)
                             * 100) if profile.compete_battles > 0 else 0

    # ── EVA context ──
    eva_context = _build_eva_context(
        user, lessons_data, level, completed_sections_count, completed_lessons)
    eva_history = list(reversed(
        list(EVAConversation.objects.filter(user=user).order_by(
            '-created_at')[:10].values('role', 'content'))
    ))

    # ── Avatar & Track ──
    avatar_url = request.build_absolute_uri(
        user.avatar.image.url) if user.avatar and user.avatar.image else ''
    track_label = {'child': 'Child Track', 'teen': 'Teen Track',
                   'adult': 'Adult Track'}.get(user.age_group, 'Learning Track')

    context = {
        'user':       user,
        'profile':    profile,
        'avatar_url': avatar_url,
        'rank_title': rank_title,

        'xp_cur':     xp_cur,
        'xp_next':    xp_next,
        'xp_pct':     xp_pct,
        'xp_remain':  100 - xp_pct,
        'level':      level,
        'level_next': level + 1,
        'track_label': track_label,

        'lessons_data':    lessons_data,
        'current_lesson':  current_lesson,
        'current_section': current_section,
        'current_lesson_num': next(
            (i + 1 for i, l in enumerate(lessons_data)
             if not l['is_completed']),
            len(lessons_data)
        ),
        'total_lessons':            len(lessons_data),
        'total_sections':           total_sections,
        'completed_sections_count': completed_sections_count,
        'overall_pct':              overall_pct,

        'leaderboard':   leaderboard,
        'user_rank':     user_rank,
        'total_players': total_players,

        'xp_today':       xp_today,
        'daily_goal':     daily_goal,
        'daily_goal_pct': daily_goal_pct,
        'user_quests':    user_quests,
        'completed_quests_count': completed_quests_count,

        'total_completed':       len(completed_section_ids),
        'earned_achievements':   earned_achievements,
        'unearned_achievements': unearned_achievements,
        'total_badges':          total_badges,

        'completed_lessons':  completed_lessons,
        'completed_topics':   completed_topics,
        'completed_progress': completed_progress,
        'certs_earned':       certs_earned,
        'certs_remaining':    certs_remaining,
        'intro_count':        intro_count,
        'app_count':          app_count,
        'comp_count':         comp_count,
        'test_count':         test_count,
        'comp_losses':        comp_losses,
        'comp_xp':            comp_xp,
        'compete_win_rate':   compete_win_rate,

        'eva_context': eva_context,
        'eva_history': eva_history,
    }
    if user.age_group == 'child':
        template = 'dashboard-kids.html'
    else:
        template = 'dashboard-teen-adult.html'
    return render(request, template, context)


@student_required
def IntroductionView(request, section_id):
    section = Section.objects.filter(
        id=section_id, node_type='introduction').first()
    if not _check_section_access(request.user, section):
        return redirect('dashboard')
    slides = list(section.slides.all().order_by('order'))

    # ── Generate slides if none exist ──
    if not slides:
        user = request.user
        completed_lessons = get_completed_lessons(
            user, exclude_lesson=section.lesson)
        student_context = get_student_context(user)
        lesson_topics = get_completed_topics(section.lesson.title)

        generated = generate_slides(
            lesson_title=section.lesson.title,
            age_group=user.age_group,
            completed_lessons=completed_lessons,
            student_context=student_context,
            lesson_topics=lesson_topics,
        )

        for slide_data in generated:
            code = slide_data.get('code', '')
            # Remove surrounding quotes if AI added them
            if code.startswith('"') and code.endswith('"'):
                code = code[1:-1]
            if code.startswith("'") and code.endswith("'"):
                code = code[1:-1]

            Slide.objects.create(
                section=section,
                order=slide_data.get('order', 1),
                title=slide_data.get('title', ''),
                explanation=slide_data.get('explanation', ''),
                code=code,
            )

        slides = list(section.slides.all().order_by('order'))

    context = {
        'section':      section,
        'lesson':       section.lesson,
        'user':         request.user,
        'slides':       slides,
        'total_slides': len(slides),
        'slides_json':  json.dumps([{'order': i+1, 'code': s.code} for i, s in enumerate(slides)]),
    }
    return render(request, 'nodes/introduction.html', context)


@student_required
@require_POST
def CompleteSectionView(request, section_id):
    section = Section.objects.filter(id=section_id).first()
    if not _check_section_access(request.user, section):
        return redirect('dashboard')
    UserProgress.objects.update_or_create(
        user=request.user,
        section=section,
        defaults={
            'completed':    True,
            'score':        100,
            'completed_at': timezone.now(),
        }
    )

    if section.node_type == 'competition':
        won = request.POST.get('won', 'false') == 'true'
        if won:
            profile = StudentProfile.objects.get(user=request.user)
            profile.competition_wins += 1
            profile.save()

    # Find next section in same lesson
    next_section = Section.objects.filter(
        lesson=section.lesson,
        order__gt=section.order
    ).first()

    if next_section:
        return redirect(f'/lesson/{next_section.id}/{next_section.node_type}/')
    else:
        # Lesson complete — go back to dashboard
        return redirect('dashboard')


@student_required
def ApplicationView(request, section_id):
    section = Section.objects.filter(
        id=section_id, node_type='application').first()
    if not _check_section_access(request.user, section):
        return redirect('dashboard')
    user = request.user
    completed_lessons = get_completed_lessons(
        user, exclude_lesson=section.lesson)
    student_context = get_student_context(user)
    lesson_topics = get_completed_topics(section.lesson.title)

    attempts = TaskAttempt.objects.filter(
        user=user, section=section).order_by('task_order')
    passed_count = attempts.filter(passed=True).count()
    failed_count = attempts.filter(passed=False).count()
    avg_attempts = attempts.aggregate(avg=models.Avg('attempts'))['avg'] or 1

    already_completed = UserProgress.objects.filter(
        user=user, section=section, completed=True
    ).exists()

    # ── If already completed — return immediately, no task generation ──
    if already_completed:
        return render(request, 'nodes/application.html', {
            'section':                  section,
            'lesson':                   section.lesson,
            'user':                     user,
            'tasks_json':               json.dumps([]),
            'total_tasks':              passed_count,
            'passed_count':             passed_count,
            'already_completed':        True,
            'completed_lessons':        completed_lessons,
            'level':                    student_context.get('level', 1),
            'completed_sections_count': TaskAttempt.objects.filter(user=user, passed=True).count(),
        })

    # ── Current task order = passed + 1 ──
    next_order = passed_count + 1
    current_task = section.tasks.filter(user=user, order=next_order).first()

    # ── Generate current task if it doesn't exist ──
    if not current_task:
        previous_tasks = list(section.tasks.filter(user=user).order_by('order').values(
            'instruction', 'hint', 'starter_code', 'topic_covered'
        ))
        task_data = None
        for _attempt in range(3):
            candidate = generate_next_task(
                lesson_title=section.lesson.title,
                task_number=next_order,
                previous_tasks=previous_tasks,
                student_performance={
                    'passed_count': passed_count,
                    'failed_count': failed_count,
                    'avg_attempts': avg_attempts,
                },
                age_group=user.age_group,
                completed_lessons=completed_lessons,
                student_context=student_context,
                lesson_topics=lesson_topics,
            )
            if candidate:
                valid, reason = validate_generated_task(
                    candidate, lesson_topics)
                if valid:
                    task_data = candidate
                    break
                print(f"Task rejected (attempt {_attempt + 1}): {reason}")

        if task_data:
            current_task = Task.objects.create(
                section=section,
                user=user,
                order=next_order,
                topic_covered=task_data.get('topic_covered', ''),
                instruction=task_data.get('instruction', ''),
                hint=task_data.get('hint', ''),
                starter_code=task_data.get(
                    'code_template', '') or '# Write your solution here\n',
                expected_output=task_data.get('expected_output', ''),
                check_regex=task_data.get('check_regex', ''),
                task_type=task_data.get('task_type', 'free_code'),
                difficulty=task_data.get('difficulty', 'easy'),
                correct_answer=task_data.get('correct_answer', ''),
                code_template=task_data.get('code_template', ''),
            )

    return render(request, 'nodes/application.html', {
        'section':                  section,
        'lesson':                   section.lesson,
        'user':                     user,
        'tasks_json':               json.dumps([{
            'id':              current_task.id,
            'order':           current_task.order,
            'instruction':     current_task.instruction,
            'hint':            current_task.hint,
            'starter_code':    current_task.starter_code,
            'expected_output': current_task.expected_output,
            'check_regex':     current_task.check_regex,
            'task_type':       current_task.task_type,
            'difficulty':      current_task.difficulty,
            'correct_answer':  current_task.correct_answer,
            'code_template':   current_task.code_template,
            'topic_covered':   current_task.topic_covered,
        }] if current_task else []),
        'total_tasks':              6,
        'passed_count':             passed_count,
        'already_completed':        False,
        'completed_lessons':        completed_lessons,
        'level':                    student_context.get('level', 1),
        'completed_sections_count': TaskAttempt.objects.filter(user=user, passed=True).count(),
    })


@student_required
@require_POST
def GenerateNextTaskView(request, section_id):
    section = Section.objects.filter(
        id=section_id, node_type='application').first()
    if not _check_section_access(request.user, section):
        return JsonResponse({'error': 'Access denied'}, status=403)
    user = request.user
    data = json.loads(request.body)

    passed_task_order = data.get('passed_task_order', 1)
    student_code = data.get('code', '')

    # Save task attempt
    attempt, created = TaskAttempt.objects.get_or_create(
        user=user,
        section=section,
        task_order=passed_task_order,
        defaults={'attempts': 0}
    )
    attempt.passed = True
    attempt.code = student_code
    if created:
        attempt.attempts = 1
    else:
        attempt.attempts = attempt.attempts + 1
    attempt.save()

    # Get performance stats
    attempts = TaskAttempt.objects.filter(user=user, section=section)
    passed_count = attempts.filter(passed=True).count()
    failed_count = attempts.filter(passed=False).count()
    avg_attempts = attempts.aggregate(
        avg=models.Avg('attempts'))['avg'] or 1

    # Lesson topics — used for both completion check and task generation
    lesson_topics = get_completed_topics(section.lesson.title)

    # Check if node should be completed — must cover 75% of lesson topics
    if should_complete_application(passed_count, failed_count, avg_attempts, total_topics=len(lesson_topics)):
        return JsonResponse({'complete': True, 'passed_count': passed_count})

    # Get existing tasks
    existing_tasks = list(section.tasks.filter(user=user).order_by('order').values(
        'instruction', 'hint', 'starter_code', 'topic_covered'
    ))

    completed_lessons = get_completed_lessons(
        user, exclude_lesson=section.lesson)
    student_context = get_student_context(user)
    next_order = section.tasks.filter(user=user).count() + 1
    task_data = None
    for _attempt in range(3):
        candidate = generate_next_task(
            lesson_title=section.lesson.title,
            task_number=next_order,
            previous_tasks=existing_tasks,
            student_performance={
                'passed_count': passed_count,
                'failed_count': failed_count,
                'avg_attempts': avg_attempts,
            },
            age_group=user.age_group,
            completed_lessons=completed_lessons,
            student_context=student_context,
            lesson_topics=lesson_topics,
        )
        if candidate:
            valid, reason = validate_generated_task(candidate, lesson_topics)
            if valid:
                task_data = candidate
                break
            print(f"Task rejected (attempt {_attempt + 1}): {reason}")

    if not task_data:
        return JsonResponse({'error': 'Failed to generate valid task'}, status=500)

    # Save new task
    new_task = Task.objects.create(
        section=section,
        user=user,
        order=next_order,
        topic_covered=task_data.get('topic_covered', ''),
        instruction=task_data.get('instruction', ''),
        hint=task_data.get('hint', ''),
        starter_code=task_data.get(
            'code_template', '') or '# Write your solution here\n',
        expected_output=task_data.get('expected_output', ''),
        check_regex=task_data.get('check_regex', ''),
        task_type=task_data.get('task_type', 'free_code'),
        difficulty=task_data.get('difficulty', 'easy'),
        correct_answer=task_data.get('correct_answer', ''),
        code_template=task_data.get('code_template', ''),
    )

    return JsonResponse({
        'complete': False,
        'task': {
            'id':              new_task.id,
            'order':           new_task.order,
            'instruction':     new_task.instruction,
            'hint':            new_task.hint,
            'starter_code':    new_task.starter_code,
            'expected_output': new_task.expected_output,
            'check_regex':     new_task.check_regex,
            'task_type':       new_task.task_type,
            'difficulty':      new_task.difficulty,
            'correct_answer':  new_task.correct_answer,
            'code_template':   new_task.code_template,
        }
    })


@student_required
def CompetitionView(request, section_id):
    section = Section.objects.filter(
        id=section_id, node_type='competition').first()
    if not _check_section_access(request.user, section):
        return redirect('dashboard')
    user = request.user
    profile = StudentProfile.objects.get(user=user)

    # Get lesson topics from curriculum
    lesson_topics = get_completed_topics(section.lesson.title)
    taught_concepts = get_taught_concepts(section.lesson)
    completed_lessons = get_completed_lessons(
        user, exclude_lesson=section.lesson)
    student_context = get_student_context(user)

    # Generate challenge
    challenge = generate_competition_challenge(
        lesson_title=section.lesson.title,
        age_group=user.age_group,
        completed_lessons=completed_lessons,
        student_context=student_context,
        lesson_topics=taught_concepts if taught_concepts else lesson_topics,
    )

    # AI opponent based on student ELO
    elo = profile.elo_rating
    opp_level = profile.level

    # Professional AI opponent names
    opp_names = [
        'EVA Challenger',
        'EVA Pro',
        'EVA Elite',
        'EVA Master',
        'EVA Champion',
    ]
    opp_name = random.choice(opp_names)

    context = {
        'section':         section,
        'lesson':          section.lesson,
        'user':            user,
        'profile':         profile,
        'challenge':       challenge,
        'challenge_json':  json.dumps(challenge) if challenge else '{}',
        'opp_name':        opp_name,
        'opp_level':       opp_level,
        'section_id':      section.id,
    }
    return render(request, 'nodes/competition.html', context)


@student_required
def TestView(request, section_id):
    section = Section.objects.filter(
        id=section_id, node_type='test').first()
    if not _check_section_access(request.user, section):
        return redirect('dashboard')
    user = request.user
    completed_lessons = get_completed_lessons(
        user, exclude_lesson=section.lesson)
    student_context = get_student_context(user)
    weak_areas = get_weak_areas(user, section.lesson)
    lesson_topics = get_completed_topics(section.lesson.title)
    taught_concepts = get_taught_concepts(section.lesson)

    # Get test attempts
    attempts = TestAttempt.objects.filter(user=user, section=section)
    passed_count = attempts.filter(passed=True).count()
    total_score = passed_count * 20

    # Already completed
    already_completed = UserProgress.objects.filter(
        user=user, section=section, completed=True
    ).exists()

    # Get questions for this student
    questions = list(section.questions.filter(user=user).order_by('order'))

    # Generate first question if none exist
    if not questions:
        question_data = generate_next_test_question(
            lesson_title=section.lesson.title,
            question_number=1,
            weak_areas=weak_areas,
            previous_questions=[],
            age_group=user.age_group,
            completed_lessons=completed_lessons,
            lesson_topics=lesson_topics,
            taught_concepts=taught_concepts,
            student_context=student_context,
        )
        if question_data:
            TestQuestion.objects.create(
                section=section,
                user=user,
                order=1,
                instruction=question_data.get('instruction', ''),
                starter_code='# Write your solution here\n',
                expected_output=question_data.get('expected_output', ''),
                check_regex=question_data.get('check_regex', ''),
                points=20,
            )
            questions = list(section.questions.filter(
                user=user).order_by('order'))

    context = {
        'section':          section,
        'lesson':           section.lesson,
        'user':             user,
        'questions':        questions,
        'questions_json':   json.dumps([{
            'id':             q.id,
            'order':          q.order,
            'instruction':    q.instruction,
            'starter_code':   q.starter_code,
            'expected_output': q.expected_output,
            'check_regex':    q.check_regex,
            'points':         q.points,
        } for q in questions]),
        'total_questions':  len(questions),
        'passed_count':     passed_count,
        'total_score':      total_score,
        'already_completed': already_completed,
        'section_id':       section.id,
    }
    return render(request, 'nodes/test.html', context)


@student_required
@require_POST
def GenerateNextTestQuestionView(request, section_id):
    section = Section.objects.filter(
        id=section_id, node_type='test').first()
    if not _check_section_access(request.user, section):
        return JsonResponse({'error': 'Access denied'}, status=403)
    user = request.user
    data = json.loads(request.body)

    passed_question_order = data.get('passed_question_order', 1)
    student_code = data.get('code', '')

    # Save test attempt
    attempt, _ = TestAttempt.objects.get_or_create(
        user=user,
        section=section,
        question_order=passed_question_order,
    )
    attempt.passed = True
    attempt.code = student_code
    attempt.attempts = attempt.attempts + 1
    attempt.save()

    MAX_QUESTIONS = 5

    # Get performance stats
    attempts = TestAttempt.objects.filter(user=user, section=section)
    passed_count = attempts.filter(passed=True).count()
    total_score = passed_count * 20
    avg_attempts = attempts.aggregate(
        avg=models.Avg('attempts'))['avg'] or 1

    # Complete when all 5 passed
    if passed_count >= MAX_QUESTIONS:
        return JsonResponse({'complete': True, 'score': 100})

    # Get existing questions
    existing_questions = list(section.questions.filter(user=user).order_by('order').values(
        'instruction', 'starter_code'
    ))

    completed_lessons = get_completed_lessons(
        user, exclude_lesson=section.lesson)
    student_context = get_student_context(user)
    weak_areas = get_weak_areas(user, section.lesson)
    lesson_topics = get_completed_topics(section.lesson.title)
    taught_concepts = get_taught_concepts(section.lesson)

    # Generate next question
    next_order = section.questions.filter(user=user).count() + 1
    question_data = generate_next_test_question(
        lesson_title=section.lesson.title,
        question_number=next_order,
        weak_areas=weak_areas,
        previous_questions=existing_questions,
        age_group=user.age_group,
        completed_lessons=completed_lessons,
        lesson_topics=lesson_topics,
        taught_concepts=taught_concepts,
        student_context=student_context,
        avg_attempts=avg_attempts,
    )

    if not question_data:
        return JsonResponse({'error': 'Failed to generate question'}, status=500)

    new_question = TestQuestion.objects.create(
        section=section,
        user=user,
        order=next_order,
        instruction=question_data.get('instruction', ''),
        starter_code='# Write your solution here\n',
        expected_output=question_data.get('expected_output', ''),
        check_regex=question_data.get('check_regex', ''),
        points=20,
    )

    return JsonResponse({
        'complete': False,
        'score':    total_score,
        'question': {
            'id':             new_question.id,
            'order':          new_question.order,
            'instruction':    new_question.instruction,
            'starter_code':   new_question.starter_code,
            'expected_output': new_question.expected_output,
            'check_regex':    new_question.check_regex,
            'points':         new_question.points,
        }
    })


@student_required
def CompeteRoomView(request):
    profile = StudentProfile.objects.get(user=request.user)
    completed_lessons = get_completed_lessons(request.user)
    completed_topics = get_completed_topics(completed_lessons)

    context = {
        'user':              request.user,
        'profile':           profile,
        'completed_lessons': completed_lessons,
        'completed_topics':  completed_topics,
        'csrf_token':        request.META.get("CSRF_COOKIE", ""),
    }
    return render(request, 'compete-room.html', context)


@student_required
@require_POST
def CompeteResultView(request):
    data = json.loads(request.body)
    won = data.get('won', False)
    profile = StudentProfile.objects.get(user=request.user)

    profile.compete_battles += 1
    if won:
        profile.compete_wins += 1
        profile.elo_rating += 25
    else:
        profile.elo_rating = max(0, profile.elo_rating - 10)
    profile.save()

    return JsonResponse({'status': 'ok'})


# --- AI Generation ---#
@student_required
def AdvisorChatView(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    data = json.loads(request.body)
    user_message = data.get('message', '').strip()
    user_code = data.get('code', '')
    lesson_title = data.get('lesson', 'Python')
    eva_context = data.get('eva_context', {})
    is_greeting = data.get('is_greeting', False)
    mode = data.get('mode', 'chat')
    output = data.get('output', '')
    task_type = data.get('task_type', 'free_code')
    correct_answer = data.get('correct_answer', '')

    if not user_message:
        return JsonResponse({'error': 'No message'}, status=400)

    if mode == 'validate':
        reply = validate_task(
            instruction=user_message,
            code=user_code,
            output=output,
            age_group=request.user.age_group,
            task_type=task_type,
            correct_answer=correct_answer,
            fail_count=0,
        )
    elif mode == 'solution':
        reply = generate_solution(
            instruction=user_message,
            age_group=request.user.age_group,
        )
    else:
        # Load conversation history from DB
        history = list(
            EVAConversation.objects.filter(user=request.user)
            .order_by('-created_at')[:10]
            .values('role', 'content')
        )
        history = list(reversed(history))

        # ── Save user message (skip if auto greeting) ──
        if not is_greeting:
            EVAConversation.objects.create(
                user=request.user,
                role='user',
                content=user_message,
                lesson=lesson_title,
                code=user_code,
            )

        # ── Get EVA response ──
        reply = eva_chat(
            user_message,
            user_code,
            lesson_title,
            age_group=request.user.age_group,
            eva_context=eva_context,
            history=history,
        )

        # ── Save EVA response ──
        EVAConversation.objects.create(
            user=request.user,
            role='assistant',
            content=reply,
            lesson=lesson_title,
            code='',
        )

    return JsonResponse({'reply': reply})


@student_required
def LeaderboardAPIView(request):
    offset = int(request.GET.get('offset', 0))
    limit = 10
    user = request.user

    profiles = StudentProfile.objects.select_related('user').filter(
        user__age_group=user.age_group
    ).order_by('-xp_total', 'created_at')

    total = profiles.count()
    batch = profiles[offset: offset + limit]

    rows = []
    for i, p in enumerate(batch):
        rank = offset + i + 1
        rows.append({
            'rank':     rank,
            'username': p.user.username,
            'level':    p.level,
            'xp':       p.xp_total,
            'is_you':   p.user_id == user.id,
        })

    return JsonResponse({
        'rows':     rows,
        'total':    total,
        'has_more': (offset + limit) < total,
    })


# ── Challenges Panel ──
@student_required
def ChallengesView(request):
    user = request.user
    profile, _ = StudentProfile.objects.get_or_create(user=user)

    # Get active project
    active_project = Project.objects.filter(user=user, is_active=True).first()

    # Get completed lessons and topics
    completed_lessons = get_completed_lessons(user)
    completed_topics = get_completed_topics(completed_lessons)

    # Get published projects for portfolio
    published_projects = Project.objects.filter(
        user=user, status='published'
    ).order_by('-updated_at')

    context = {
        'user':               user,
        'profile':            profile,
        'active_project':     active_project,
        'published_projects': published_projects,
        'completed_topics':   completed_topics,
        'completed_lessons':  completed_lessons,
        'csrf_token':         request.META.get('CSRF_COOKIE', ''),
    }
    return render(request, 'challenges.html', context)


# ── Save Project Code ──
@student_required
def SaveProjectView(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    data = json.loads(request.body)
    project_id = data.get('project_id')
    code = data.get('code', '')

    try:
        project = Project.objects.get(
            id=project_id, user=request.user, is_active=True)
        project.code = code
        project.save()
        return JsonResponse({'success': True})
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=404)


# ── Request EVA Review ──
@student_required
def ReviewProjectView(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    data = json.loads(request.body)
    project_id = data.get('project_id')
    code = data.get('code', '')

    try:
        project = Project.objects.get(
            id=project_id, user=request.user, is_active=True)
        project.code = code
        project.status = 'submitted'
        project.save()

        # EVA reviews the project
        feedback = review_project(
            title=project.title,
            description=project.description,
            code=code,
            topics=project.topics_used,
            age_group=request.user.age_group,
        )

        project.eva_feedback = feedback
        project.status = 'reviewed'
        project.save()

        return JsonResponse({'success': True, 'feedback': feedback})
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=404)


# ── Publish Project ──
@student_required
def PublishProjectView(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    data = json.loads(request.body)
    project_id = data.get('project_id')

    try:
        project = Project.objects.get(
            id=project_id, user=request.user, status='reviewed')
        project.status = 'published'
        project.is_active = False
        project.save()

        return JsonResponse({'success': True})
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=404)


# ── Generate New Project ──
@student_required
def GenerateProjectView(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    data = json.loads(request.body)
    completed_topics = data.get('completed_topics', [])
    completed_lessons = data.get('completed_lessons', [])

    # Build weak areas from DB
    weak_areas = []
    failed_tasks = TaskAttempt.objects.filter(
        user=request.user, passed=False, attempts__gte=2
    ).order_by('-attempts')[:5]

    for attempt in failed_tasks:
        task = Task.objects.filter(
            section=attempt.section,
            user=request.user,
            order=attempt.task_order
        ).first()
        if task:
            weak_areas.append(task.instruction[:80])

    # Generate project idea via EVA
    previous_projects = list(
        Project.objects.filter(user=request.user)
        .values_list('title', flat=True)
    )

    result = generate_project_idea(
        completed_topics=completed_topics,
        completed_lessons=completed_lessons,
        weak_areas=weak_areas,
        age_group=request.user.age_group,
        previous_projects=previous_projects,
    )

    # Deactivate any existing active project
    Project.objects.filter(
        user=request.user, is_active=True).update(is_active=False)

    # Save to DB
    project = Project.objects.create(
        user=request.user,
        title=result['title'],
        description=result['description'],
        topics_used=completed_topics,
        code='',
        status='draft',
        is_active=True,
    )

    return JsonResponse({
        'success':     True,
        'project_id':  project.id,
        'title':       project.title,
        'description': project.description,
    })
