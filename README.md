# EVA Academy 🤖

A Python learning platform designed for children, teenagers, and adults. EVA Academy uses an interactive learning path, 1v1 competitions, and an AI-powered mentor to make coding fun and engaging.

## Features

- **Age-based learning tracks** — separate experiences for children, teens, and adults
- **Snake learning path** — structured lessons with 4 node types per lesson
- **4 node types:**
  - 📖 Introduction — slide-based concept teaching
  - ⚡ Application — hands-on coding with EVA hints
  - ⚔️ Competition — 1v1 battle against a simulated opponent
  - 🐉 Test — timed coding challenge to complete the lesson
- **XP & level system** — earn XP per node, level up as you progress
- **Achievements** — 16 auto-unlocking milestones across 5 categories
- **Quests** — practice challenges assigned by EVA
- **Leaderboard** — ranked by age group
- **1v1 Compete Arena** — free battle space independent from the learning path
- **EVA Advisor** — free Python sandbox with a personal AI mentor
- **Real-time progress tracking** — skills, XP, badges, and competition wins

## Tech Stack

- **Backend:** Django 6
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Editor:** CodeMirror 5
- **Database:** SQLite (development), PostgreSQL (production)
- **Authentication:** Django session-based auth

## Installation

```bash

pip install django djangorestframework django-cors-headers python-dotenv Pillow djangorestframework-simplejwt openai django-codemirror2 gunicorn whitenoise requests reportlab psycopg2-binary dj-database-url

# Clone the repository
git clone https://github.com/yourusername/EVAAcademy.git
cd EVAAcademy

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run the server
python manage.py runserver
```

## Environment Variables

```env
OPENROUTER_API_KEY=your-api-key
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

## Project Structure

```
EVAAcademy/
├── app/
│   └── user/
│       ├── models.py       # User, Lesson, Section, Slide, Task, Quest models
│       ├── views.py        # Dashboard, node, and compete views
│       ├── urls.py         # URL routing
│       └── static/         # CSS, JS, images
├── templates/
|   ├── index               # main page
│   ├── dashboard-kids.html # kids dashboard
│   ├── nodes/              # Introduction, Application, Competition, Test
├── requirements.txt
└── manage.py
```

## Roadmap

- [ ] AI-generated lessons and tasks using Anthropic API
- [ ] Real-time multiplayer competition using WebSockets
- [ ] Teen and Adult dashboards
- [ ] Avatar picker

