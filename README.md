# Campus Management System — Phase 1

Dual-institution CMS for **Schools** and **Primal Academy**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (Vite) + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MySQL (mysql2 + SQL migrations) |
| Auth | JWT |
| PDF | pdf-lib |

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8+

### Backend

```bash
cd backend
cp .env.example .env   # edit DB credentials
npm install
npm run migrate
npm run seed
npm run dev
```

API runs at `http://localhost:5001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@cms.local | owner123 |
| Principal (Peers) | principal@peers.local | password123 |
| Admin (Peers) | admin@peers.local | password123 |
| Finance (Peers) | finance@peers.local | password123 |
| Teacher | teacher@peers.local | password123 |
| Student | student@peers.local | password123 |
| Parent | parent@peers.local | password123 |

## Architecture

- All major tables include `institution_id` for data isolation
- Owner (`institution_id = null`) can view both institutions
- All other roles are scoped to their institution
- SMS module is UI-only placeholder (no real API integration)

## Phase 1 Modules

Institution management, users, students, parents, teachers, classes/sections/subjects, attendance, finance/challans (with PDF), announcements, reports, role-based dashboards, SMS placeholder UI.
