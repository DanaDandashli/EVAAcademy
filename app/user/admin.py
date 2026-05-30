from django.contrib import admin
from .models import Avatar, Lesson, Section, Slide, Task, TestQuestion, UserProgress

admin.site.register(Avatar)
admin.site.register(Lesson)
admin.site.register(Section)
admin.site.register(UserProgress)
admin.site.register(Slide)
admin.site.register(Task)
admin.site.register(TestQuestion)