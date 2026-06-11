# EVA Academy 🤖

An AI-powered Python learning platform built for three age groups — children, teenagers, and adults. EVA Academy combines a structured learning path, AI-generated content, 1v1 competitions, and a personal AI mentor to make coding education engaging and effective.

**Live Demo:** [evaacademy.onrender.com](https://evaacademy.onrender.com)

---

<p align="center">
  <img src="assets/architecture.jpeg" width="900"/>
</p>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment (Render)](#deployment-render)
- [Admin & Seed Data](#admin--seed-data)
- [AI Integration](#ai-integration)

---

## Features

### Learning Path
- **Age-based tracks** — separate UX and content for children (7–12), teens (13–18), and adults
- **Snake learning path** — structured lessons with 4 node types per lesson
- **Mastery-based progression** — 100% pass rate required to advance

### 4 Node Types
| Node | Description |
|------|-------------|
| 📖 Introduction | AI-generated slide-based concept teaching, per age group |
| ⚡ Application | Hands-on coding tasks with EVA hints and auto-validation |
| ⚔️ Competition | 1v1 battle against a simulated AI opponent |
| 🐉 Test | 5-question final assessment, no hints, solo |

### Gamification
- **XP & Level system** — XP earned per completed node, level up as you progress
- **Achievements** — 16 auto-unlocking milestones across 5 categories
- **Quests** — practice challenges assigned by EVA Advisor
- **Leaderboard** — ranked by age group with XP and level

### EVA AI Tutor
- **Socratic method** — EVA never writes code for students, only guides
- **Context-aware** — different behavior per node (guide, hint, advisor)
- **Age-appropriate** — tone and complexity adapt per age group
- **EVA Advisor** — free Python sandbox with personal AI mentor on dashboard

### Platform
- **1v1 Compete Arena** — free battle space independent from learning path
- **Mini Projects / Portfolio** — challenge-based projects
- **Certificates** — auto-generated PDF certificates per completed lesson
- **Progress tracking** — XP, skills radar, heatmap, node completion
- **Light/Dark mode** — toggle with localStorage persistence
- **Dashboards** — separate dashboards for kids and teen/adult

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 6, Python 3.14 |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Code Editor | CodeMirror 5 |
| In-browser Python | Skulpt |
| AI | OpenRouter API (Gemini 2.5 Flash Lite) |
| Database | PostgreSQL (Supabase) |
| Auth | Django session-based |
| PDF | ReportLab |
| Static files | WhiteNoise |
| Deployment | Render |

---

## Project Structure

```
EVAAcademy/
├── app/
│   └── user/
│       ├── models.py           # User, Lesson, Section, Slide, Task, Quest, etc.
│       ├── views.py            # All views — dashboard, nodes, compete, advisor
│       ├── ai.py               # AI helpers — _call_ai, generate_slides, eva_chat, etc.
│       ├── urls.py             # URL routing
│       ├── admin.py            # Django admin config
│       └── static/
│           ├── css/            # Per-page stylesheets + variables.css
│           └── js/             # Per-page JavaScript
│ 	    └── templates/
│           ├── base.html                    # Landing page base (navbar + footer)
│   		├── base-dashboard.html     	 # Dashboard base
│   		├── index.html              	 # Home page
│   		├── children.html           	 # Kids landing page
│   		├── teen.html               	 # Teen landing page
│   		├── adult.html              	 # Adult landing page
│   		├── login.html              	 # Login
│   		├── register.html           	 # Registration
│   		├── dashboard-kids.html     	 # Kids dashboard
│   		├── dashboard-teen-adult.html    # Teen/Adult dashboard
│   		└── nodes/
│				├── base-node.html      # Node base
│       		├── introduction.html   # Slide node
│       		├── application.html    # Coding task node
│       		├── competition.html    # 1v1 battle node
│       		└── test.html           # Final test node
├── eva_academy/
│   ├── settings.py             # Django settings
│   ├── urls.py                 # Root URL config
│   └── wsgi.py
├── requirements.txt
├── manage.py
└── .env                        # Local environment variables (not committed)
```

---

## Local Setup

### Prerequisites
- Python 3.14+
- Git
- A Supabase account (or use SQLite for local dev)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/DanaDandashli/EVAAcademy.git
cd EVAAcademy

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
# Create a .env file in the project root (see Environment Variables section)

# 5. Run migrations
python manage.py migrate

# 6. Seed initial lesson data
python manage.py seed_data

# 7. Create admin user
python manage.py create_admin

# 8. Run the development server
python manage.py runserver
```

Visit `http://127.0.0.1:8000`

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Django
SECRET_KEY=your-secret-django-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# AI
OPENROUTER_API_KEY=your-openrouter-api-key

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-[region].pooler.supabase.com:6543/postgres

# Admin Auth
ADMIN_USERNAME=admin_username
ADMIN_PASSWORD=YourStrongPassword@125789
ADMIN_EMAIL=your@email.com
```

> **Note:** Port `6543` uses the Transaction pooler (recommended). Port `5432` uses the Session pooler (limited to 15 connections).

> **Local SQLite fallback:** If `DATABASE_URL` is not set, the app falls back to `db.sqlite3` automatically.

---

## Database Setup

The project uses **Supabase PostgreSQL** in production and falls back to **SQLite** locally.

### Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Connect → Direct → URI** — copy the connection string
3. Use port `6543` (Transaction pooler) to avoid connection limits
4. Add the URI as `DATABASE_URL` in `.env` and on Render

### Run Migrations
```bash
python manage.py migrate
```

### Seed Data
```bash
python manage.py seed_data
```
> Safe to run multiple times — uses `get_or_create` internally, no duplicates.

---

## Deployment (Render)

### Environment Variables on Render
Set these in Render → your service → **Environment**:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | your Django secret key |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `evaacademy.onrender.com` |
| `OPENROUTER_API_KEY` | your OpenRouter key |
| `DATABASE_URL` | your Supabase connection string (port 6543) |
| `PYTHON_VERSION` | `3.12.9` |
| `ADMIN_EMAIL` | your created admin email |
| `ADMIN_PASSWORD` | your created admin password |

### Build & Start Command
```bash
pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate && python manage.py seed_data && python manage.py create_admin
```

---

## Admin & Seed Data

### Create Admin
```bash
python manage.py create_admin
```

### Access Admin Panel
Visit `/admin/` and log in with admin credentials.

### Seed Lessons
```bash
python manage.py seed_data
```
Seeds 27 lessons and quests from the built-in Python curriculum.

---

## AI Integration

EVA Academy uses **OpenRouter API** with `google/gemini-2.5-flash-lite` model.

### Core AI Functions (in `ai.py`)

| Function | Purpose |
|----------|---------|
| `_call_ai(prompt)` | Central API call helper |
| `_get_age_constraints(age_group)` | Returns complexity/style per age |
| `generate_slides(...)` | Generates introduction slides per age group |
| `generate_task(...)` | Generates application tasks |
| `generate_competition_challenge(...)` | Generates 1v1 challenges |
| `generate_next_test_question(...)` | Generates test questions |
| `eva_chat(...)` | EVA advisor chat — context-aware per node |
| `validate_task_solution(...)` | Validates student code via EVA |

### EVA Behavior Per Node
- **Application node** — guides current task only, never assigns new ones
- **Competition node** — one Socratic hint only
- **Dashboard advisor** — assigns challenges, tracks weak areas

---
