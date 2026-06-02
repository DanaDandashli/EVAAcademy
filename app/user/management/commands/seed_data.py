from django.core.management.base import BaseCommand
from app.user.models import Lesson, Section, Quest
from app.user.ai import PYTHON_CURRICULUM_FOUNDATION


class Command(BaseCommand):
    help = 'Seed initial data'

    def handle(self, *args, **kwargs):
        self.seed_lessons()
        self.seed_quests()
        self.stdout.write(self.style.SUCCESS('Data seeded successfully'))

    def seed_lessons(self):
        if Lesson.objects.exists():
            self.stdout.write('Lessons already seeded — skipping')
            return

        for curriculum_lesson in PYTHON_CURRICULUM_FOUNDATION:
            lesson = Lesson.objects.create(
                title=curriculum_lesson['title'],
                order=curriculum_lesson['order'],
                age_group='child',
                level_required=curriculum_lesson['level_required'],
                description=f"Learn Python {curriculum_lesson['title']}",
            )
            Section.objects.create(
                lesson=lesson, title='Introduction', order=1, node_type='introduction')
            Section.objects.create(
                lesson=lesson, title='Application',  order=2, node_type='application')
            Section.objects.create(
                lesson=lesson, title='Competition',  order=3, node_type='competition')
            Section.objects.create(
                lesson=lesson, title='Test',         order=4, node_type='test', is_boss=True)

        self.stdout.write(
            f'{Lesson.objects.count()} lessons seeded from curriculum')

    def seed_quests(self):
        if Quest.objects.exists():
            self.stdout.write('Quests already seeded — skipping')
            return

        Quest.objects.create(
            title='Knowledge Seeker', description='Complete 3 Introduction nodes',
            icon='fas fa-book-open', color='#3b82f6', xp_reward=30,
            age_group='child', node_type='introduction', target_count=3
        )
        Quest.objects.create(
            title='Practice Makes Perfect', description='Complete 3 Application nodes',
            icon='fas fa-code', color='#10b981', xp_reward=50,
            age_group='child', node_type='application', target_count=3
        )
        Quest.objects.create(
            title='Battle Ready', description='Complete 1 Competition node',
            icon='fas fa-swords', color='#f97316', xp_reward=60,
            age_group='child', node_type='competition', target_count=1
        )
        Quest.objects.create(
            title='Test Taker', description='Complete 2 Test nodes',
            icon='fas fa-dragon', color='#ef4444', xp_reward=80,
            age_group='child', node_type='test', target_count=2
        )
        Quest.objects.create(
            title='Lesson Master', description='Complete a full lesson',
            icon='fas fa-trophy', color='#008080', xp_reward=100,
            age_group='child', node_type='', target_count=4
        )

        self.stdout.write('Quests seeded')
