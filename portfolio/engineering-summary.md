# Engineering Summary

High-level engineering proof for reviewers. Implementation detail is in `mobile/`, `server/`, and `shared/`.

## At a glance

| Area | Delivered |
|------|-----------|
| **Platforms shipped** | iOS, Android, web marketing site (3) |
| **Mobile screens** | 23 primary screens (+ extensive modals/components) |
| **API route modules** | 28 Express route files |
| **HTTP handlers** | ~260+ route handlers (`GET`/`POST`/etc. across `server/src/routes/`) |
| **API mount prefixes** | 25+ (`/api/auth`, `/api/map`, `/api/battle`, `/api/attack`, `/api/crew`, `/api/bug-hunt`, …) |
| **Mongoose models** | 35 data models |
| **Production DB collections** | 40+ (archive snapshot on Atlas `RisingPunk` database) |
| **Environments** | Local dev, staging (`api.risingpunk.dev`), production (`api.risingpunk.com`) |
| **Store distribution** | Apple App Store + TestFlight; Google Play (`com.devheadllc.risingpunk`) |
| **CI/CD** | GitHub Actions → AWS Elastic Beanstalk (staging + prod branches) |

## Platforms shipped

| Platform | Stack | Distribution |
|----------|-------|--------------|
| iOS | React Native 0.83, TypeScript | App Store, TestFlight (v5.3.x builds archived) |
| Android | React Native 0.83, TypeScript | Google Play (AAB release builds) |
| Web | Static/marketing site | AWS Amplify, custom domain `risingpunk.com` |

## Cloud services used (while live)

| Service | Role |
|---------|------|
| **AWS Elastic Beanstalk** | Node.js API (`risingpunk-api`, `rp-api-prod`, `rp-api-staging`) |
| **AWS Amplify** | Marketing / landing web (`web` branch → `risingpunk.com`) |
| **MongoDB Atlas** | `RisingPunkDB` + `RisingPunkProd` clusters |
| **Cloudflare** | DNS + SSL/TLS (Full strict) for `risingpunk.com`, `risingpunk.dev`, API subdomains |
| **Firebase** | Analytics (mobile) |
| **GitHub Actions** | API deploy, branch promotion, Bugbot babysit loop |

Proof screenshots: [`deployment/`](deployment/)

## Authentication & sessions

| Capability | Implementation |
|------------|----------------|
| Guest accounts | Device-linked identifiers, server-persisted |
| Apple Sign-In | Native iOS + server verification |
| Google Sign-In | Mobile + server verification |
| Sessions | JWT in `Authorization` header |
| Secure storage | `react-native-keychain` on device |
| Account recovery / deletion | Server routes + documented privacy flows |

## Mobile client architecture

| Piece | Technology |
|-------|------------|
| UI | React Native, 23 screen modules under `mobile/src/screens/` |
| State | Redux Toolkit slices + RTK Query (~20 API modules) |
| Config | `react-native-config` per environment (dev / staging / prod) |
| IAP | `react-native-iap` + server receipt verify |
| Async gameplay | Polling for marches, swarms, transfer runs |

## Backend architecture

| Piece | Technology |
|-------|------------|
| Runtime | Node.js, Express, TypeScript |
| ODM | Mongoose (35 models in `server/src/models/`) |
| Domain services | 80+ service modules (battles, marches, crews, bug hunt, economy, IAP, …) |
| Background work | Scheduled sweeps (march arrival, NPC respawn, retention, crew watchdogs) |
| Multi-instance | MongoDB leases/indexes for horizontal EB scaling |

## Major API domains

Representative mount points (see `server/server.ts`):

- `/api/auth` — login, OAuth, JWT
- `/api/users` — profile, finance, account
- `/api/map`, `/api/probe`, `/api/attack` — world map and async marches
- `/api/battle`, `/api/battle-presets` — live and headless battles
- `/api/crew`, `/api/swarm` — crews and group hacks
- `/api/bug-hunt`, `/api/transfer-runs` — bug hunt economy and peer transfers
- `/api/iap` — store verify + ledger + Apple webhook
- `/api/private-messages` — DMs and battle reports
- `/api/research`, `/api/bots` — progression and units
- Mini-games: `/api/daily-haul`, `/api/packet-breach`, `/api/race-condition-heist`, `/api/binary-bank-crack`

## Database

| Item | Detail |
|------|--------|
| Provider | MongoDB Atlas |
| Staging/dev DB name | `RisingPunk` |
| Production DB name | `RisingPunkProd` |
| Models in repo | 35 Mongoose schemas |
| Live scale (archive) | 40+ collections, 170+ indexes on primary game database |

See [`deployment/mongodb-atlas.md`](deployment/mongodb-atlas.md)

## CI/CD & deployment workflow

| Workflow | Purpose |
|----------|---------|
| `deploy-staging.yml` | Push `server/**` on `staging` → EB staging |
| `deploy-production.yml` | Push `server/**` on `prod` → EB production |
| `auto-promote-branches.yml` | Cursor Bugbot gate → branch promotion |
| `babysit-manual.yml` | PR fix loop automation |

Branch flow: `feature/*` → `dev` → `main` → `staging` → `prod`

See [`deployment/github-actions.md`](deployment/github-actions.md)

## Shared contracts

`shared/` TypeScript used by mobile and server:

- IAP catalog and app surfaces
- Battle replay wire format
- Map location display / share messages
- Legal document text contracts

## Diagrams & deeper docs

| Doc | Path |
|-----|------|
| Infrastructure PNG | [`architecture/system-architecture.png`](architecture/system-architecture.png) |
| Application deep-dive | [`reference/architectural_diagram.md`](reference/architectural_diagram.md) |
| Feature list | [`product/feature-overview.md`](product/feature-overview.md) |
