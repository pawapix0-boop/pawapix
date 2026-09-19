# Pawapix

A creative freelance marketplace starter project inspired by platforms like Fiverr and Workup.

## Structure

- `server/` — Express API with sample gigs and creatives.
- `client/` — Vite + React frontend with marketplace UI.

## Setup

1. Open a terminal in `c:\Users\Administrator\Desktop\Pawapix`
2. Run `npm install`
3. Run `npm run dev`

The client app will start in development mode and proxy API requests to the backend.

## Production deployment

1. Copy `.env.example` to `.env` on the hosting server.
2. Set `NODE_ENV=production` and `CLIENT_URL` to the public HTTPS URL of the website.
3. Replace `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`, and `SPECIAL_ADMIN_PASSWORD` with long, unique secrets.
4. Set the SMTP credentials, identity-verification credentials, and real hosted payment checkout URLs for every enabled gateway. Do not use a provider home page URL.
5. Install dependencies and build the frontend:

```bash
npm install
npm run build
npm start
```

For hosts that run a separate build step, use `npm run build` as the build command and `npm start` as the start command. The server listens on the host-provided `PORT` value, falling back to `4000` locally.

The production server serves the compiled `client/dist` files and the API from the same origin. Configure the host to forward HTTPS traffic to the Node process and persist the `server/data-store.json`, `server/users-backup.json`, and `server/uploads/` paths. Do not upload `.env`, `node_modules/`, or development-only files.

The health check is available at `/api/health`.

Paystack payments use `PAYSTACK_SECRET_KEY` to initialize and verify transactions. Set a live `sk_live_...` key in production; the local stored test key is only a development fallback. Configure the payment provider callback/return URL to the public `CLIENT_URL` and ensure the host allows outbound HTTPS requests to the provider and SMTP service.

## Special admin login

Open the admin dashboard at `http://localhost:5173/pawa-admin-2026`, or choose the admin view from the application.

Default special admin credentials for local development:

- Email: `special-admin@pawapix.com`
- Password: `pawapix-admin-2026`

Set `SPECIAL_ADMIN_EMAIL` and `SPECIAL_ADMIN_PASSWORD` in a local `.env` file to replace these defaults. The regular admin credentials can be changed with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Never commit `.env` or production credentials.
"# testmode" 
"# testmode" 
