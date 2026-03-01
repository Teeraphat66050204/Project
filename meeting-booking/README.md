# Car Rental Web App

Full-stack car rental app built with Astro + React + Tailwind + Prisma (SQLite), using an MVC-style API layer.

## Stack
- Astro (pages + API routes)
- React islands
- Tailwind CSS
- Prisma ORM + SQLite
- JWT cookie session auth
- Google OAuth login

## Features
- Email/password and Google login
- Car fleet browsing and selection
- Day/week planner for rental reservations
- Time overlap prevention per car
- Role-based access (`admin`, `member`)
- MVC-based APIs for cars and rentals

## Demo Accounts
- Admin: `admin@demo.com` / `admin123`
- Member: `member@demo.com` / `member123`

## Local Setup
```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Open `http://localhost:4321`.

## Environment Variables
Create `.env` from `.env.example`:

```bash
APP_BASE_URL=http://localhost:4321
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Google redirect URI:
- `http://localhost:4321/api/auth/google/callback`

## API Endpoints
- `GET /api/cars`
- `POST /api/cars` (admin)
- `PUT /api/cars/:id` (admin)
- `DELETE /api/cars/:id` (admin)
- `GET /api/rentals`
- `POST /api/rentals`
- `PATCH /api/rentals/:id`

## Architecture
- Model: `prisma/schema.prisma`
- Controllers: `src/lib/cars/controller.ts` and `src/pages/api/*`
- Services: `src/services/rental.service.ts`, `src/lib/cars/service.ts`
- UI: `src/components/islands/*`
