# Medth - Medical/Health Booking System

A comprehensive booking management system built with Next.js, featuring a custom server for real-time updates via Socket.IO and integration with the LINE Messaging API.

## Project Overview

- **Core Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** MariaDB / MySQL (managed via `mysql2`)
- **Real-time:** [Socket.IO](https://socket.io/) (runs on a separate port for live refresh)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/) (Credentials provider)
- **Integration:** [LINE Bot SDK](https://github.com/line/line-bot-sdk-nodejs)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons & UI:** [Lucide React](https://lucide.dev/), [SweetAlert2](https://sweetalert2.github.io/)

## Architecture

- **Custom Server (`server.mjs`):** Orchestrates both the Next.js request handler (default port 3001) and the Socket.IO server (default port 3002).
- **Database Layer (`src/lib/db.ts`):** Uses a connection pool to manage MySQL/MariaDB queries.
- **Authentication (`src/auth.ts`):** Implements a JWT strategy with a custom authorize function that validates against the `users` table.
- **Admin Section (`src/app/admin`):** Restricted routes for managing branches, staff, time slots, and monitoring bookings.
- **Booking Flow (`src/app/booking`):** User-facing multi-step process for scheduling appointments.
- **LINE Webhook (`src/app/api/line/webhook`):** Handles incoming messages from LINE users, providing Flex Messages for booking and history search.

## Key Directories

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: Reusable UI components (grids, modals, uploaders).
- `src/lib`: Shared utilities (database, date formatting, audit logging).
- `public/images`: Dynamic asset storage for branch and staff photos.
- `docker/mariadb`: Database container configuration.

## Building and Running

### Development
```bash
npm run dev
```
*Note: This runs `server.mjs`, starting both the web app and Socket.IO.*

### Production
```bash
npm run build
npm start
```

### Environment Variables
Ensure the following are configured in `.env`:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`
- `PORT` (Web App), `SOCKET_PORT` (Socket.IO)

## Development Conventions

- **Database Queries:** Use the `query` helper from `@/lib/db`.
- **Date Formatting:** Use `formatThaiDateShort` from `@/lib/thai-date` for localized Thai display.
- **Real-time Updates:** Emit `bookingUpdate` via Socket.IO to trigger `refreshBookings` on connected clients.
- **Authentication:** Admin routes are protected; check `src/proxy.ts` for session validation logic.
- **Styling:** Adhere to Tailwind CSS 4 utility classes.

## Testing

### Web Application Testing
- **Tool:** [Playwright](https://playwright.dev/) via `playwright-cli`.
- **Scope:** All user-facing booking flows and admin management features.
- **Example:** Run the automated booking test using `node tests/test_booking.js`.

### Database Manipulation
- **Tool:** `db-cli` skill.
- **Usage:** Use the `db-cli` skill to execute SQL directly against the MariaDB container for setup, teardown, or state verification during tests.
- **Connection:** Configured to target the MariaDB instance as defined in `docker/mariadb`.
