# Cadence

**AI-powered relationship operating system for BDMs, brokers, and field sales teams.**

## What's built (v0.2)

- PostgreSQL database (contacts, activities, teams, automations, opportunities)
- Login & registration with JWT auth
- Daily dashboard with live KPIs from logged activities
- Activity logging with automatic points
- AI smart plan & message drafts (OpenAI when key set, rules-based fallback)
- React web app (desktop + mobile responsive)
- React Native mobile app (Expo)

## Quick start

```bash
cd cadence
pnpm install
pnpm db:up          # starts PostgreSQL on port 5435 (Docker must be running)
pnpm db:setup       # creates tables + seeds demo data
pnpm dev            # API :3001 + web :5173
```

**Demo login:** alex@demo.com / demo1234

- Web: http://127.0.0.1:5173/login
- API: http://127.0.0.1:3001/health
- Mobile: `pnpm dev:mobile` (Expo)

## OpenAI (optional)

Add your key to `apps/api/.env`:

```
OPENAI_API_KEY=sk-...
```

Without it, the app uses smart rule-based suggestions.

## Mobile on a physical phone

Set your PC's LAN IP in `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```

## Project structure

```
cadence/
├── apps/
│   ├── api/      Express + Prisma + PostgreSQL
│   ├── web/      React + Vite
│   └── mobile/   Expo React Native
├── packages/shared/
└── docker-compose.yml
```
