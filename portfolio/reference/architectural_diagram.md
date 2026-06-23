# RisingPunk — System Architecture

**RisingPunk** is a cross-platform mobile strategy game (iOS & Android) built with React Native. Players manage a hacker-themed empire: turf/base building, world-map PvP/NPC combat, crew coordination, bug hunts, mini-games, and in-app purchases. The backend is a Node.js/Express API backed by MongoDB, deployed to AWS Elastic Beanstalk.

---

## High-Level Overview

```mermaid
flowchart TB
    subgraph Clients["Mobile Clients"]
        iOS["iOS App\n(React Native)"]
        Android["Android App\n(React Native)"]
    end

    subgraph Shared["Shared TypeScript"]
        SharedPkg["shared/\nIAP catalog, battle replay,\nmap copy, documents"]
    end

    subgraph API["Backend API"]
        Express["Express + TypeScript\nREST /api/*"]
        Services["Domain Services\n(battles, marches, crew, bug hunt, …)"]
        Schedulers["Background Schedulers\n(march arrival, NPC respawn, retention)"]
    end

    subgraph Data["Data Layer"]
        MongoDB[("MongoDB\nRisingPunk / RisingPunkProd")]
    end

    subgraph External["External Services"]
        Apple["Apple Sign-In\n+ App Store IAP"]
        Google["Google Sign-In\n+ Play Billing"]
        Firebase["Firebase Analytics"]
        GameCenter["Game Center (iOS)"]
        Email["Email (Nodemailer)"]
    end

    subgraph Deploy["CI/CD & Hosting"]
        GH["GitHub Actions"]
        EB["AWS Elastic Beanstalk"]
    end

    iOS --> SharedPkg
    Android --> SharedPkg
    iOS --> Express
    Android --> Express
    SharedPkg -.-> Express

    Express --> Services
    Services --> MongoDB
    Schedulers --> MongoDB
    Services --> Schedulers

    iOS --> Apple
    Android --> Google
    Express --> Apple
    Express --> Google
    iOS --> Firebase
    Android --> Firebase
    iOS --> GameCenter
    Express --> Email

    GH --> EB
    EB --> Express
```

---

## Repository Structure

| Path | Role |
|------|------|
| `mobile/` | React Native app (iOS + Android), Redux Toolkit, RTK Query |
| `server/` | Express API, Mongoose models, domain services, schedulers |
| `shared/` | Cross-platform TypeScript contracts (IAP, battle replay, map copy) |
| `.github/workflows/` | Deploy (staging/prod), branch promotion, Bugbot babysit loop |

---

## Mobile Client Architecture

```mermaid
flowchart LR
    subgraph UI["Screens & Components"]
        Turf["Turf / Base"]
        HackMap["Hack Map"]
        Battle["Battle Grid"]
        Crew["Crew & Chat"]
        MiniGames["Mini-Games\n(Daily Haul, Packet Breach, …)"]
    end

    subgraph State["State Management"]
        Redux["Redux Slices\nauth, balance, bots, map, ui"]
        RTK["RTK Query APIs\n20+ endpoint modules"]
    end

    subgraph Native["Native Integrations"]
        IAP["react-native-iap"]
        Keychain["react-native-keychain"]
        AppleAuth["Apple Sign-In"]
        GoogleAuth["Google Sign-In"]
    end

    UI --> Redux
    UI --> RTK
    RTK -->|"HTTPS + JWT"| API["Backend API"]
    Native --> UI
    Redux --> RTK
```

**Key patterns**

- **Environment-aware API URL** via `react-native-config` (`dev` / `staging` / `prod`)
- **RTK Query** for server state with tag-based cache invalidation
- **Redux slices** for session, wallet, bot inventory, and map UI state
- **Screen handoff globals** for Turf ↔ Hack Map navigation (battle prep, swarm, bug hunt)
- **Polling** for async game systems (attack marches, transfer runs, swarm sessions)

---

## Backend Architecture

```mermaid
flowchart TB
    subgraph HTTP["HTTP Layer"]
        Routes["Express Routes\n/api/auth, /map, /battle, /attack, …"]
        AuthMW["JWT Auth Middleware"]
        VersionMW["Min App Version Gate"]
    end

    subgraph Domain["Domain Services (selected)"]
        BattleSvc["BattleService\nHeadlessBattleRunner"]
        MarchSvc["MarchArrivalSchedulerService\nAttackMarchLaunchService"]
        CrewSvc["SwarmService\nCrewDisbandService"]
        BugHuntSvc["BugHuntWorldService\nBugHuntTokenService"]
        EconomySvc["RentalHousingSyncService\nTransferRunService"]
        IAPSvc["IAP Verify + Ledger"]
    end

    subgraph Models["Mongoose Models"]
        User["User, Bot, Finance"]
        World["Map, MapCell, AttackMarch"]
        Social["Crew, PrivateMessage, SwarmSession"]
        Game["Battle, BattleReplay, BugInstance"]
    end

    Routes --> AuthMW
    AuthMW --> VersionMW
    VersionMW --> Domain
    Domain --> Models
```

**API surface (representative)**

| Prefix | Domain |
|--------|--------|
| `/api/auth` | Login, guest, Apple/Google OAuth, JWT sessions |
| `/api/map` | World grid, occupancy, probes, shields |
| `/api/attack` | Async marches (solo, swarm, bug hunt) |
| `/api/battle` | Live and headless PvP/NPC battles |
| `/api/crew` | Crew roster, chat, swarm prep |
| `/api/bug-hunt` | Ant world, hunters, storage, tokens |
| `/api/transfer-runs` | Player-to-player item/cash transfers |
| `/api/iap` | Store receipt verify + developer-support ledger |
| `/api/private-messages` | DMs, battle reports (`BTL\|`), system messages |

**Background work**

Server instances run scheduled sweeps (multi-instance safe via MongoDB leases/indexes):

- March arrival and stale-state recovery
- NPC respawn timers
- Crew understaff/disband watchdogs
- Battle data retention and privacy cleanup
- Ant world reseed scheduler

---

## Core Game Flow: Async Map Attack

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant API as Express API
    participant DB as MongoDB
    participant Scheduler as March Scheduler

    App->>API: POST /api/attack/launch
    API->>DB: Create AttackMarch (outbound)
    API-->>App: marchId, arriveAt

    loop Poll /api/attack/mine
        App->>API: GET active marches
        API-->>App: state, ETA, positions
    end

    Scheduler->>DB: Sweep due marches
    Scheduler->>API: Resolve arrival → battle or queue
    API->>DB: Battle record + notifications

    App->>API: GET battle / replay
    API-->>App: Battle state or BTL| DM payload
```

Battles can run **headlessly** on the server (`HeadlessBattleRunner`) while the player is offline. Results arrive via private messages and battle-report replays (`shared/battleReplay.ts`).

---

## Authentication & Payments

```mermaid
flowchart LR
    subgraph SignIn["Sign-In"]
        Guest["Guest account"]
        AppleSI["Apple Sign-In"]
        GoogleSI["Google Sign-In"]
    end

    subgraph Session["Session"]
        JWT["JWT in Authorization header"]
        KeychainStore["Secure storage\n(iOS Keychain / Android)"]
    end

    subgraph IAPFlow["In-App Purchase"]
        Store["App Store / Play Store"]
        Verify["POST /api/iap/verify"]
        Ledger["IapDeveloperSupportLedger"]
        Webhook["Apple ASSN webhook"]
    end

    SignIn --> JWT
    JWT --> KeychainStore
    Store --> Verify
    Verify --> Ledger
    Webhook --> Ledger
```

---

## Data & Environments

| Environment | Mobile build | API host | MongoDB database |
|-------------|--------------|----------|------------------|
| Development | `.env.dev` | localhost / emulator | `RisingPunk` |
| Staging | `.env.staging` | `api.risingpunk.dev` | `RisingPunk` |
| Production | `.env.prod` | `api.risingpunk.com` | `RisingPunkProd` |

---

## Deployment Pipeline

```mermaid
flowchart LR
    Feature["feature/* branches"]
    Dev["dev"]
    Main["main"]
    Staging["staging"]
    Prod["prod"]

    Feature -->|"PR + Bugbot"| Dev
    Dev --> Main
    Main --> Staging
    Staging --> Prod

    Staging -->|"push server/**"| EBStaging["AWS EB\n(staging)"]
    Prod -->|"push server/**"| EBProd["AWS EB\n(production)"]

    subgraph CI["GitHub Actions"]
        DeployStaging["deploy-staging.yml"]
        DeployProd["deploy-production.yml"]
        AutoPromote["auto-promote-branches.yml"]
        Babysit["babysit-manual.yml"]
    end
```

Mobile releases are built locally or via store pipelines (Xcode / Gradle AAB) with environment-specific schemes and `ENVFILE` configuration.

---

## Technology Stack

| Layer | Technologies |
|-------|----------------|
| Mobile | React Native 0.83, React 19, TypeScript, Redux Toolkit, RTK Query, Reanimated, Gesture Handler |
| Backend | Node.js, Express, TypeScript, Mongoose, Jest |
| Database | MongoDB |
| Auth | JWT, Apple Sign-In, Google Sign-In, bcrypt |
| IAP | react-native-iap, Apple App Store Server Library, Google Play APIs |
| Analytics | Firebase Analytics |
| Hosting | AWS Elastic Beanstalk (S3 artifact deploy) |
| CI | GitHub Actions, Cursor Bugbot integration |

---

## Design Principles (observable in codebase)

1. **Server authority** — Game economy, combat outcomes, march timing, and IAP grants are validated and persisted on the server.
2. **Shared contracts** — Critical cross-platform logic (IAP catalog, battle replay format) lives in `shared/`.
3. **Async-first map gameplay** — Marches, swarms, bug hunts, and transfer runs use scheduled server resolution rather than requiring an open socket.
4. **Fail-fast configuration** — Missing env vars (API URL, Mongo URI) throw at startup rather than silently defaulting.
5. **Multi-instance safety** — Schedulers use MongoDB indexes, leases, and idempotent settlement for horizontal scaling on Elastic Beanstalk.

---

*Generated from the RisingPunk monorepo structure. Suitable for portfolio and technical onboarding.*
