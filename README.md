# medth

Next.js App Router project for the `medth` application.

## Development

Install dependencies with Bun:

```bash
bun install
```

Start the local dev server:

```bash
bun dev
```

The app is usually opened through the custom server on `http://localhost:3001`.

## Production Deploy

This project should use Bun for production installs and builds.

```bash
cd /var/www/medth
git pull
bun ci
bun run build
pm2 restart medth-app
```

Why Bun:

- `bun.lock` is the source of truth for installs in this repo
- Bun handles platform-specific optional packages for Linux more reliably in this project
- using `npm install` on the server can miss native packages needed by Tailwind/Lightning CSS

## Notes

- Runtime: Bun / Node.js
- Process manager on host: PM2 (`medth-app`)
- Do not deploy unless the user explicitly asks for deploy
