from django.urls import path
from .views import (
    IndexView, ChildrenView, TeenView, AdultView,
    LoginView, RegisterView, LogoutView, DashboardView,
    IntroductionView, CompleteSectionView, ApplicationView, CompetitionView, TestView, CompeteRoomView, CompeteResultView,
    AdvisorChatView, GenerateNextTaskView, GenerateNextTestQuestionView, LeaderboardAPIView
)

urlpatterns = [
    path('',            IndexView,    name='index'),
    path('children/',   ChildrenView, name='children'),
    path('teen/',       TeenView,     name='teen'),
    path('adult/',      AdultView,    name='adult'),
    path('login/',      LoginView,    name='login'),
    # path('register/',   RegisterView, name='register'),
    path('logout/',     LogoutView,   name='logout'),
    path('dashboard/',  DashboardView, name='dashboard'),
    path('lesson/<int:section_id>/introduction/', IntroductionView, name='introduction'),
    path('lesson/<int:section_id>/complete/', CompleteSectionView, name='complete_section'),
    path('lesson/<int:section_id>/application/',  ApplicationView,  name='application'),
    path('lesson/<int:section_id>/next-task/', GenerateNextTaskView, name='next_task'),
    path('lesson/<int:section_id>/competition/',  CompetitionView,  name='competition'),
    path('lesson/<int:section_id>/test/', TestView, name='test'),
    path('lesson/<int:section_id>/next-question/', GenerateNextTestQuestionView, name='next_question'),
    path('compete/', CompeteRoomView, name='compete_room'),
    path('compete/result/', CompeteResultView, name='compete_result'),

    # AI Generation
    path('advisor/chat/', AdvisorChatView, name='advisor_chat'),
    path('leaderboard/', LeaderboardAPIView, name='leaderboard_api'),
]
