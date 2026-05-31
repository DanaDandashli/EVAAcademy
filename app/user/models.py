from django.contrib.auth.models import AbstractUser
from django.db import models
from eva_academy import settings

NODE_XP = {
    'introduction': 10,
    'application':  30,
    'competition':  50,
    'test':         100,
}


class Avatar(models.Model):
    name = models.CharField(max_length=50)
    image = models.ImageField(upload_to='avatars/')

    def __str__(self):
        return self.name


class User(AbstractUser):

    class GenderChoices(models.TextChoices):
        # VALUE = "database_value", "human_readable_label"
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"

    class RoleChoices(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        ADMIN = "admin", "Admin"

    class AgeGroupChoices(models.TextChoices):
        CHILD = "child", "Child"
        TEEN = "teen", "Teen"
        ADULT = "adult", "Adult"

    email = models.EmailField(unique=True, blank=True, null=True)
    
    age = models.PositiveIntegerField(
        null=True,
        blank=True
    )

    age_group = models.CharField(
        max_length=10,
        choices=AgeGroupChoices.choices,
        default=AgeGroupChoices.ADULT
    )

    gender = models.CharField(
        max_length=10,
        choices=GenderChoices.choices,
        default=GenderChoices.OTHER
    )

    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.STUDENT
    )

    avatar = models.ForeignKey(
        Avatar,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )

    def __str__(self):
        return self.username


class StudentProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile"
    )

    elo_rating = models.IntegerField(default=1000)
    level = models.IntegerField(default=1)
    xp_total = models.IntegerField(default=0)

    learning_speed = models.FloatField(default=0.0)
    competition_wins = models.IntegerField(default=0)
    speed_runs = models.IntegerField(default=0)

    status = models.CharField(
        max_length=20,
        default="active"
    )

    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Lesson(models.Model):
    title = models.CharField(max_length=100)  # "Lesson 1 — Python Basics"
    order = models.IntegerField()              # 1, 2, 3...
    age_group = models.CharField(
        max_length=10, choices=User.AgeGroupChoices.choices)
    description = models.TextField(blank=True)
    level_required = models.IntegerField(default=1)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.title} ({self.age_group})"


class Section(models.Model):

    class NodeType(models.TextChoices):
        INTRODUCTION = 'introduction', 'Introduction'
        APPLICATION = 'application', 'Application'
        COMPETITION = 'competition', 'Competition'
        TEST = 'test', 'Test'

    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=100)
    order = models.IntegerField()
    is_boss = models.BooleanField(default=False)
    node_type = models.CharField(
        max_length=20,
        choices=NodeType.choices,
        default=NodeType.INTRODUCTION
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.lesson.title} → {self.title} ({self.node_type})"


class Slide(models.Model):
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='slides'
    )
    order = models.IntegerField()
    title = models.CharField(max_length=200)
    explanation = models.TextField()
    code = models.TextField(blank=True, default='')
    highlighted_lines = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Comma-separated line numbers to highlight e.g. '1,3,5'"
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.section.lesson.title} → Slide {self.order}: {self.title}"
    

class Task(models.Model):
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    order = models.IntegerField()
    instruction = models.TextField()
    hint = models.TextField(blank=True, default='')
    starter_code = models.TextField(blank=True, default='')
    expected_output = models.TextField(blank=True, default='')
    check_regex = models.CharField(max_length=500, blank=True, default='')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.section.lesson.title} → Task {self.order}"


class TestQuestion(models.Model):
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    order = models.IntegerField()
    instruction = models.TextField()
    starter_code = models.TextField(blank=True, default='')
    expected_output = models.TextField(blank=True, default='')
    check_regex = models.CharField(max_length=500, blank=True, default='')
    points = models.IntegerField(default=25)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.section.lesson.title} → Question {self.order}"
    

class UserProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE, related_name='progress')
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    score = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'section')

    def __str__(self):
        return f"{self.user.username} — {self.section.title}"
    

class Achievement:
    def __init__(self, id, title, description, icon, color):
        self.id = id
        self.title = title
        self.description = description
        self.icon = icon
        self.color = color

    def is_earned(self, progress, profile):
        raise NotImplementedError


# ── Progression (nodes completed) ──
class FirstStepAchievement(Achievement):
    def __init__(self):
        super().__init__('first_step', 'First Step',
                         'Complete your first node', 'fas fa-fire', '#f59e0b')

    def is_earned(self, progress, profile):
        return progress.count() >= 1


class DedicatedAchievement(Achievement):
    def __init__(self):
        super().__init__('dedicated', 'Dedicated',
                         'Complete 10 nodes', 'fas fa-bolt', '#7c3aed')

    def is_earned(self, progress, profile):
        return progress.count() >= 10


class ScholarAchievement(Achievement):
    def __init__(self):
        super().__init__('scholar', 'Scholar', 'Complete 50 nodes',
                         'fas fa-graduation-cap', '#3b82f6')

    def is_earned(self, progress, profile):
        return progress.count() >= 50


# ── Level ──
class BeginnerAchievement(Achievement):
    def __init__(self):
        super().__init__('beginner', 'Beginner', 'Reach Level 2', 'fas fa-seedling', '#10b981')

    def is_earned(self, progress, profile):
        return profile.level >= 2


class IntermediateAchievement(Achievement):
    def __init__(self):
        super().__init__('intermediate', 'Intermediate',
                         'Reach Level 5', 'fas fa-star', '#6366f1')

    def is_earned(self, progress, profile):
        return profile.level >= 5


class AdvancedAchievement(Achievement):
    def __init__(self):
        super().__init__('advanced', 'Advanced', 'Reach Level 10', 'fas fa-crown', '#f59e0b')

    def is_earned(self, progress, profile):
        return profile.level >= 10


class ExpertAchievement(Achievement):
    def __init__(self):
        super().__init__('expert', 'Expert', 'Reach Level 20', 'fas fa-gem', '#ec4899')

    def is_earned(self, progress, profile):
        return profile.level >= 20


class MasterAchievement(Achievement):
    def __init__(self):
        super().__init__('master', 'Master', 'Reach Level 50', 'fas fa-dragon', '#ef4444')

    def is_earned(self, progress, profile):
        return profile.level >= 50


# ── Competition ──
class FirstWinAchievement(Achievement):
    def __init__(self):
        super().__init__('first_win', 'First Win',
                         'Win your first competition', 'fas fa-swords', '#f97316')

    def is_earned(self, progress, profile):
        return profile.competition_wins >= 1


class FighterAchievement(Achievement):
    def __init__(self):
        super().__init__('fighter', 'Fighter', 'Win 10 competitions',
                         'fas fa-shield-halved', '#7c3aed')

    def is_earned(self, progress, profile):
        return profile.competition_wins >= 10


class ChampionAchievement(Achievement):
    def __init__(self):
        super().__init__('champion', 'Champion',
                         'Win 50 competitions', 'fas fa-trophy', '#f59e0b')

    def is_earned(self, progress, profile):
        return profile.competition_wins >= 50


# ── Performance ──
class PerfectScoreAchievement(Achievement):
    def __init__(self):
        super().__init__('perfect_score', 'Perfect Score',
                         'Get 100% on a test', 'fas fa-medal', '#10b981')

    def is_earned(self, progress, profile):
        return progress.filter(section__node_type='test', score=100).count() >= 1


class SpeedRunAchievement(Achievement):
    def __init__(self):
        super().__init__('speed_run', 'Speed Run',
                         'Complete a test in under 3 minutes', 'fas fa-gauge-high', '#3b82f6')

    def is_earned(self, progress, profile):
        return profile.speed_runs >= 1


# ── Mastery ──
class BookwormAchievement(Achievement):
    def __init__(self):
        super().__init__('bookworm', 'Bookworm',
                         'Complete 5 Introduction nodes', 'fas fa-book-open', '#6366f1')

    def is_earned(self, progress, profile):
        return progress.filter(section__node_type='introduction').count() >= 5


class CodeMonkeyAchievement(Achievement):
    def __init__(self):
        super().__init__('code_monkey', 'Coder',
                         'Complete 5 Application nodes', 'fas fa-code', '#059669')

    def is_earned(self, progress, profile):
        return progress.filter(section__node_type='application').count() >= 5


class BossSlayerAchievement(Achievement):
    def __init__(self):
        super().__init__('boss_slayer', 'Boss Slayer',
                         'Complete 3 Test nodes', 'fas fa-dragon', '#ef4444')

    def is_earned(self, progress, profile):
        return progress.filter(section__node_type='test').count() >= 3


# ── Registry ──
ALL_ACHIEVEMENTS = [
    FirstStepAchievement(),
    DedicatedAchievement(),
    ScholarAchievement(),
    BeginnerAchievement(),
    IntermediateAchievement(),
    AdvancedAchievement(),
    ExpertAchievement(),
    MasterAchievement(),
    FirstWinAchievement(),
    FighterAchievement(),
    ChampionAchievement(),
    PerfectScoreAchievement(),
    SpeedRunAchievement(),
    BookwormAchievement(),
    CodeMonkeyAchievement(),
    BossSlayerAchievement(),
]


class Quest(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='fas fa-scroll')
    color = models.CharField(max_length=20, default='#7c3aed')
    xp_reward = models.IntegerField(default=50)
    age_group = models.CharField(
        max_length=10, choices=User.AgeGroupChoices.choices, default='child')
    node_type = models.CharField(
        max_length=20, choices=Section.NodeType.choices, blank=True, default='')
    target_count = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_by_ai = models.BooleanField(default=False)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class UserQuest(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE, related_name='quests')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE)
    progress = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'quest')

    def __str__(self):
        return f"{self.user.username} — {self.quest.title}"
