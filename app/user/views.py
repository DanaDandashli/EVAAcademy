from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from django.utils import timezone
from django.db import models
from .models import NODE_XP, Avatar, StudentProfile, Lesson, Section, UserProgress, ALL_ACHIEVEMENTS, Quest, UserQuest
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.cache import cache
from functools import wraps

User = get_user_model()


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
            messages.error(request, f'Invalid username or password. {remaining} attempts remaining.')
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
            # if not avatar_id:
            #     messages.error(request, 'Please choose your character.')
            #     return render(request, 'register.html', ctx)
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


@student_required
def DashboardView(request):
    user = request.user
    profile, _ = StudentProfile.objects.get_or_create(user=user)

    # ── Completed sections ──
    completed_progress = UserProgress.objects.filter(
        user=user, completed=True
    ).select_related('section')

    completed_section_ids = set(p.section_id for p in completed_progress)

    # ── Sync XP from real progress using NODE_XP ──
    xp_from_progress = sum(
        NODE_XP.get(p.section.node_type, 0)
        for p in completed_progress
    )

    # Add competition wins XP (50 XP per win)
    xp_from_progress += profile.competition_wins * 50

    # ── Level thresholds ──
    LEVEL_THRESHOLDS = [0, 200, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400]

    def get_level(xp):
        level = 1
        for i, threshold in enumerate(LEVEL_THRESHOLDS):
            if xp >= threshold:
                level = i + 1
        return level

    new_level = get_level(xp_from_progress)

    if profile.xp_total != xp_from_progress or profile.level != new_level:
        profile.xp_total = xp_from_progress
        profile.level = new_level
        profile.save()

    xp_cur = profile.xp_total
    level = profile.level
    xp_next = LEVEL_THRESHOLDS[level] if level < len(
        LEVEL_THRESHOLDS) else LEVEL_THRESHOLDS[-1] + 1000
    xp_prev = LEVEL_THRESHOLDS[level - 1] if level - \
        1 < len(LEVEL_THRESHOLDS) else 0
    xp_range = xp_next - xp_prev
    xp_pct = min(round(((xp_cur - xp_prev) / xp_range) * 100),
                 100) if xp_range else 0

    # ── Rank title ──
    level_titles = [
        (range(1,  3),   'Beginner Coder'),
        (range(3,  6),   'Intermediate Coder'),
        (range(6,  9),   'Advanced Coder'),
        (range(9,  12),  'Expert Coder'),
        (range(12, 999), 'Master Coder'),
    ]
    rank_title = 'Beginner Coder'
    for r, title in level_titles:
        if level in r:
            rank_title = title
            break

    # ── Avatar ──
    avatar_url = ''
    if user.avatar and user.avatar.image:
        avatar_url = request.build_absolute_uri(user.avatar.image.url)

    # ── Track ──
    track_labels = {
        'child': 'Kids Track',
        'teen':  'Teen Track',
        'adult': 'Adult Track'
    }
    track_label = track_labels.get(user.age_group, 'Learning Track')

    # ── Learning path ──
    lessons = Lesson.objects.filter(
        age_group=user.age_group
    ).prefetch_related('sections').order_by('order')

    lessons_data = []
    total_sections = 0
    completed_sections_count = 0
    current_lesson = None
    current_section = None

    for lesson in lessons:
        sections = lesson.sections.all()
        lesson_sections = []
        lesson_completed = len(sections) > 0
        
        for section in sections:
            is_completed = section.id in completed_section_ids
            if not is_completed:
                lesson_completed = False
                if current_section is None:
                    current_section = section
                    current_lesson = lesson

            lesson_sections.append({
                'section':      section,
                'is_completed': is_completed,
                'is_current':   current_section == section,
                'is_locked': not is_completed and current_section != section,
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
            'is_locked':       level < lesson.level_required,
        })

    overall_pct = round(
        (completed_sections_count / total_sections * 100) if total_sections else 0
    )

    # ── Level gate data ──
    level_gates = []
    prev_level_required = None
    for lesson_data in lessons_data:
        lr = lesson_data['lesson'].level_required
        if prev_level_required is not None and lr != prev_level_required:
            xp_needed = LEVEL_THRESHOLDS[lr - 1] if lr - \
                1 < len(LEVEL_THRESHOLDS) else 0
            level_gates.append({
                'before_lesson': lesson_data['lesson'].id,
                'level':         lr,
                'unlocked':      level >= lr,
                'xp_needed':     xp_needed,
            })
        prev_level_required = lr

    # ── Leaderboard ──
    leaderboard = StudentProfile.objects.select_related('user').filter(
        user__age_group=user.age_group
    ).order_by('-xp_total', 'created_at')[:10]

    user_rank = StudentProfile.objects.filter(
        user__age_group=user.age_group
    ).filter(
        models.Q(xp_total__gt=profile.xp_total) |
        models.Q(xp_total=profile.xp_total, created_at__lt=profile.created_at)
    ).count() + 1

    total_players = StudentProfile.objects.filter(
        user__age_group=user.age_group
    ).count()

    # ── Daily goal ──
    today = timezone.now().date()
    xp_today = sum(
        NODE_XP.get(p.section.node_type, 0)
        for p in completed_progress
        if p.completed_at and p.completed_at.date() == today
    )
    daily_goal = 50
    xp_today = min(xp_today, daily_goal)
    daily_goal_pct = round((xp_today / daily_goal) * 100) if daily_goal else 0


    # ── Achievements ──
    # completed_progress = UserProgress.objects.filter(
    #     user=user, completed=True
    # ).select_related('section')

    earned_achievements = []
    unearned_achievements = []

    for achievement in ALL_ACHIEVEMENTS:
        if achievement.is_earned(completed_progress, profile):
            earned_achievements.append(achievement)
        else:
            unearned_achievements.append(achievement)

    total_badges = len(earned_achievements)

    # ── Quests ──
    quests = Quest.objects.filter(age_group=user.age_group, is_active=True)
    user_quests = []

    for quest in quests:
        if quest.node_type:
            progress = completed_progress.filter(
                section__node_type=quest.node_type
            ).count()
        else:
            # Lesson master — count completed full lessons
            progress = sum(1 for l in lessons_data if l['is_completed'])

        progress    = min(progress, quest.target_count)
        is_complete = progress >= quest.target_count
        pct         = round((progress / quest.target_count) * 100) if quest.target_count else 0

        # Create or update UserQuest
        uq, _ = UserQuest.objects.get_or_create(user=user, quest=quest)
        if is_complete and not uq.completed:
            uq.completed    = True
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


    # ── Completed topics for competition ──
    completed_lessons = [
        l['lesson'].title
        for l in lessons_data
        if l['completed_count'] > 0
    ]

    completed_topics = ', '.join(completed_lessons) if completed_lessons else 'No topics yet'
    completed_quests_count = sum(1 for uq in user_quests if uq['is_complete'])

    context = {
        'user':       user,
        'profile':    profile,
        'avatar_url': avatar_url,
        'rank_title': rank_title,

        'xp_cur':    xp_cur,
        'xp_next':   xp_next,
        'xp_pct':    xp_pct,
        'xp_remain': 100 - xp_pct,
        'level':     level,
        'level_next': level + 1,
        'track_label': track_label,

        'lessons_data':    lessons_data,
        'level_gates':     level_gates,
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

        'total_completed': len(completed_section_ids),
        'earned_achievements':   earned_achievements,
        'unearned_achievements': unearned_achievements,
        'total_badges':          total_badges,

        'completed_lessons': completed_lessons,
        'completed_topics':  completed_topics,
    }
    return render(request, 'dashboard-kids.html', context)


@student_required
def IntroductionView(request, section_id):
    section = get_object_or_404(
        Section, id=section_id, node_type='introduction')
    slides = section.slides.all()
    context = {
        'section': section,
        'lesson':  section.lesson,
        'user':    request.user,
        'slides':  slides,
        'total_slides': slides.count(),
    }
    return render(request, 'nodes/introduction.html', context)


@student_required
@require_POST
def CompleteSectionView(request, section_id):
    section = get_object_or_404(Section, id=section_id)

    UserProgress.objects.update_or_create(
        user=request.user,
        section=section,
        defaults={
            'completed':    True,
            'score':        100,
            'completed_at': timezone.now(),
        }
    )

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
    section = get_object_or_404(
        Section, id=section_id, node_type='application')
    tasks = section.tasks.all()
    context = {
        'section':     section,
        'lesson':      section.lesson,
        'user':        request.user,
        'tasks':       tasks,
        'total_tasks': tasks.count(),
        'tasks_json':  [
            {
                'id':          t.id,
                'order':       t.order,
                'instruction': t.instruction,
                'hint':        t.hint,
                'check_regex': t.check_regex,
            }
            for t in tasks
        ],
    }
    return render(request, 'nodes/application.html', context)


@student_required
def CompetitionView(request, section_id):
    section = get_object_or_404(
        Section, id=section_id, node_type='competition')
    profile = StudentProfile.objects.get(user=request.user)

    context = {
        'section': section,
        'lesson':  section.lesson,
        'user':    request.user,
        'profile': profile,
    }
    return render(request, 'nodes/competition.html', context)


@student_required
def TestView(request, section_id):
    section = get_object_or_404(Section, id=section_id, node_type='test')
    questions = section.questions.all()
    context = {
        'section':        section,
        'lesson':         section.lesson,
        'user':           request.user,
        'questions':      questions,
        'total_questions': questions.count(),
        'total_points':   sum(q.points for q in questions),
        'questions_json': [
            {
                'id':          q.id,
                'order':       q.order,
                'instruction': q.instruction,
                'check_regex': q.check_regex,
                'points':      q.points,
            }
            for q in questions
        ],
    }
    return render(request, 'nodes/test.html', context)


@student_required
def CompeteRoomView(request):
    profile = StudentProfile.objects.get(user=request.user)

    completed_progress = UserProgress.objects.filter(
        user=request.user, completed=True
    ).select_related('section')

    completed_lessons = list(
        Lesson.objects.filter(
            sections__userprogress__user=request.user,
            sections__userprogress__completed=True
        ).distinct().values_list('title', flat=True)
    )

    context = {
        'user':             request.user,
        'profile':          profile,
        'completed_lessons': completed_lessons,
        'completed_topics': ', '.join(completed_lessons),
    }
    return render(request, 'compete-room.html', context)


@student_required
@require_POST
def CompeteResultView(request):
    import json
    data = json.loads(request.body)
    won = data.get('won', False)
    profile = StudentProfile.objects.get(user=request.user)

    if won:
        profile.competition_wins += 1
        profile.save()

    return JsonResponse({'status': 'ok'})
