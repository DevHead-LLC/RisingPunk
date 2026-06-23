# Environments

RisingPunk used three mobile build targets and two hosted API environments.

## Summary

| Environment | Mobile config | API host | MongoDB database name |
|-------------|---------------|----------|------------------------|
| **Development** | `.env.dev` | `localhost:5001` (iOS sim) / `10.0.2.2:5001` (Android emu) | `RisingPunk` |
| **Staging** | `.env.staging` | `https://api.risingpunk.dev` | `RisingPunk` |
| **Production** | `.env.prod` | `https://api.risingpunk.com` | `RisingPunkProd` |

Database name selection is in `server/server.ts` (`NODE_ENV` → `getDatabaseName()`).

## Domains (while live)

| Domain | Purpose |
|--------|---------|
| `risingpunk.com` | Marketing / web app (AWS Amplify) |
| `risingpunk.dev` | Staging-related DNS (Cloudflare) |
| `api.risingpunk.com` | Production API (Cloudflare → Elastic Beanstalk `rp-api-prod`) |
| `api.risingpunk.dev` | Staging API (Cloudflare → Elastic Beanstalk `rp-api-staging`) |

## Git branches and deploys

| Branch | Typical use | Auto-deploy |
|--------|-------------|-------------|
| `feature/*` | Development | — |
| `dev` | Integration | — |
| `main` | Release candidate | — |
| `staging` | Staging API | `.github/workflows/deploy-staging.yml` → EB staging |
| `prod` | Production API | `.github/workflows/deploy-production.yml` → EB prod |

Web (Amplify) used a separate `web` branch connected to the Amplify app.

## Mobile build schemes

iOS schemes: `mobile-dev`, `mobile-staging`, `mobile-prod` (see `mobile/package.json` scripts).

Android builds use `ENVFILE=.env.*` via `react-native-config`.

## Current status

All hosted environments described here were **decommissioned**. This document is retained as an archive of how the system was configured.
