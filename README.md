# 🏏 IPL Bet — Fantasy Betting Game

> Free IPL 2026 fantasy betting platform.
> Game coins only — no real money.

## Tech Stack
* **Frontend**: React 18, Vite, TailwindCSS, Framer Motion, Zustand, Chart.js
* **Backend**: Node.js, Express, Socket.io
* **Database**: Supabase (PostgreSQL)
* **Hosting**: Vercel (frontend) + Render (backend)
* **Live Data**: ESPN Cricinfo Unofficial API
* **Fallback**: Cricbuzz (Puppeteer)

## Local Setup

### Prerequisites
Node.js 18+, npm, Supabase account

### Backend Setup
```bash
cd server
npm install
cp .env.example .env

# Fill in your Supabase credentials in .env
node server.js
```

### Frontend Setup
```bash
cd client
npm install
cp .env.example .env

# Set VITE_BACKEND_URL to your backend URL (e.g. http://localhost:3001)
npm run dev
```

## Environment Variables

### Backend (`server/.env`)
* `SUPABASE_URL`: Your Supabase database API URL
* `SUPABASE_ANON_KEY`: Your Supabase public Anon key
* `PORT`: Server port (default 3001)
* `CLIENT_URL`: Your frontend URL for CORS (e.g. `http://localhost:5173`)
* `POLL_INTERVAL_MS`: Ms delay between score poller checks (default 10000)
* `HOUSE_MARGIN`: Percentage of odds house takes (default 0.05)

### Frontend (`client/.env`)
* `VITE_BACKEND_URL`: The URL pointing to your backend server

## UptimeRobot Setup
1. Create free account at uptimerobot.com
2. Add new HTTP monitor
3. URL: `https://your-backend.onrender.com/health`
4. Interval: every 5 minutes
*(This keeps the Render free tier from sleeping.)*

## Deployment
* **Backend** → Render.com (see `DEPLOY.md`)
* **Frontend** → Vercel (see `DEPLOY.md`)

## Responsible Gaming
This app uses game coins only.
**No real money is involved at any point.**
