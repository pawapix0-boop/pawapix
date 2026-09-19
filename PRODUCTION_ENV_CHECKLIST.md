# Production Environment-Variable Checklist

This checklist contains variable names only. Put values in the hosting provider's secret/configuration store, never in source control or the frontend bundle.

## Required before production

- [ ] `NODE_ENV` is set to `production`.
- [ ] `CLIENT_URL` is the canonical public HTTPS origin with no development hostname.
- [ ] `ADMIN_EMAIL` is the intended administrator address.
- [ ] `ADMIN_PASSWORD` is a unique, long password that has never been used in development.
- [ ] `SPECIAL_ADMIN_EMAIL` is the intended special administrator address.
- [ ] `SPECIAL_ADMIN_PASSWORD` is a separate unique, long password.
- [ ] `ADMIN_TOKEN_SECRET` is a long, randomly generated secret. Rotating it will invalidate signed admin and user tokens.
- [ ] `PORT` is supplied by the host, or explicitly set to the port exposed by the host.

## Email delivery

Email is optional for the server to start, but required for password resets, account notifications, and reliable operational messaging.

- [ ] `EMAIL_FROM` is a verified sender address for the configured SMTP provider.
- [ ] `SMTP_HOST` points to the production SMTP provider.
- [ ] `SMTP_PORT` matches the provider's TLS mode.
- [ ] `SMTP_SECURE` is set according to the provider's connection requirements.
- [ ] `SMTP_USER` is the production SMTP account.
- [ ] `SMTP_PASS` is stored as a secret or provider-managed credential.
- [ ] `SMTP_CONNECTION_TIMEOUT` is appropriate for the hosting network.
- [ ] `SMTP_GREETING_TIMEOUT` is appropriate for the hosting network.
- [ ] `SMTP_SOCKET_TIMEOUT` is appropriate for the hosting network.
- [ ] `SMTP_MAX_CONNECTIONS` is sized for the provider's limits.
- [ ] `SMTP_MAX_MESSAGES` is sized for the provider's limits.
- [ ] Send and receive a production test email before launch.

## Payments

Configure only gateways that are fully configured and intentionally enabled in the persisted payment settings.

- [ ] `PAYSTACK_SECRET_KEY` is set to a live server-side key when Paystack is enabled.
- [ ] `STRIPE_CHECKOUT_URL` is a real production checkout/payment URL when Stripe is enabled.
- [ ] `PAYPAL_CHECKOUT_URL` is a real production checkout/payment URL when PayPal is enabled.
- [ ] `PAYSTACK_CHECKOUT_URL` is a real production checkout/payment URL when Paystack hosted checkout is used.
- [ ] `FLUTTERWAVE_CHECKOUT_URL` is a real production checkout/payment URL when Flutterwave is enabled.
- [ ] Payment callback URLs resolve to `CLIENT_URL` over HTTPS.
- [ ] Live payment keys are not placed in `client/`, Vite variables, HTML, logs, or the data archive.
- [ ] Test/demo payment configuration is removed from production data before enabling payments.

## Safe handling

- [ ] Do not commit `.env`, `server/.env`, deployment exports, or secret-manager dumps.
- [ ] Do not include secret values in this checklist, README files, screenshots, bug reports, or logs.
- [ ] Do not expose server variables through `VITE_*` variables or frontend JavaScript.
- [ ] Rotate any credential that has appeared in a local file, archive, terminal output, or shared workspace.
- [ ] Verify production logs do not print SMTP credentials, payment keys, authorization headers, or reset tokens.
- [ ] Use separate credentials for development, staging, and production.
- [ ] Restrict who can read and change production configuration.

## Launch validation

- [ ] Run `npm install` from the repository root using the committed lockfile.
- [ ] Run `npm run build` and confirm the client build succeeds.
- [ ] Run `npm test` and confirm all tests pass.
- [ ] Start the server with production configuration and verify `/api/health`.
- [ ] Confirm the frontend uses the production origin and does not call localhost.
- [ ] Test signup, login, password reset email, authenticated dashboard access, uploads, downloads, admin login, and payment callback handling.
- [ ] Confirm the host provides persistent storage or external storage for application data and uploads.
- [ ] Confirm backups and restore procedures for application data and uploaded files.

## Inventory source

The variable names above were collected from `server/index.js`, `server/email.js`, `.env.example`, and `server/.env.example`. No client-side environment variables are currently referenced by the source.
