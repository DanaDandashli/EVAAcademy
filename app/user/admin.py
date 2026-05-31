from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Avatar, User, StudentProfile, Lesson, Section, Slide, Task, TestQuestion, UserProgress, Quest, UserQuest


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'age_group',
                    'role', 'is_active', 'date_joined']
    list_filter = ['age_group', 'role', 'is_active']
    search_fields = ['username', 'email']
    fieldsets = UserAdmin.fieldsets + (
        ('EVA Academy', {'fields': ('age_group', 'gender', 'role', 'avatar')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('EVA Academy', {'fields': ('age_group', 'gender', 'role', 'avatar')}),
    )


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'xp_total',
                    'competition_wins', 'last_active']
    list_filter = ['level']
    search_fields = ['user__username']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'order', 'age_group', 'level_required']
    list_filter = ['age_group']
    search_fields = ['title']


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'lesson', 'node_type', 'order']
    list_filter = ['node_type']
    search_fields = ['title', 'lesson__title']


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'section', 'completed', 'score', 'completed_at']
    list_filter = ['completed']
    search_fields = ['user__username']


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ['title', 'age_group',
                    'node_type', 'xp_reward', 'is_active']
    list_filter = ['age_group', 'is_active']


@admin.register(Avatar)
class AvatarAdmin(admin.ModelAdmin):
    list_display = ['name', 'image']


admin.site.register(Slide)
admin.site.register(Task)
admin.site.register(TestQuestion)
admin.site.register(UserQuest)
