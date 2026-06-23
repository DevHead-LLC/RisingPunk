# RisingPunk — Portfolio & Verification Guide

**Start here.** This folder is the employer-facing package for verifying what was built, how it was hosted, and why the live product was discontinued. The game source code lives in `mobile/`, `server/`, and `shared/` at the repo root; **this folder is documentation and proof only**.

## Quick read (2 minutes)

| If you want to… | Open |
|-----------------|------|
| See shutdown rationale | [product-validation.md](product-validation.md) |
| **Pre-shutdown backup steps** | [decommission/backup-checklist.md](decommission/backup-checklist.md) |
| User data / retention policy | [decommission/data-retention.md](decommission/data-retention.md) |
| See engineering scope (platforms, API, infra) | [engineering-summary.md](engineering-summary.md) |
| See the infrastructure diagram | [architecture/system-architecture.png](architecture/system-architecture.png) |
| Browse app & store screenshots | [product/screenshots.md](product/screenshots.md) |
| Verify cloud deployment (AWS, Atlas, Cloudflare) | [deployment/](deployment/) |
| Understand teardown decisions | [decommission/decommission-plan.md](decommission/decommission-plan.md) |

## Project status (summary)

RisingPunk was **built, deployed, and distributed** on iOS, Android, and web with separate staging and production APIs. After validating real usage against ongoing infrastructure and acquisition costs, hosting was **intentionally discontinued**. This repository is preserved as a portfolio artifact — **live endpoints and store listings may no longer be available**.

---

## File map (everything in `portfolio/`)

Paths below are relative to the **repository root** (`RisingPunk/`).

### Entry & summaries

| Repo path | What it contains |
|-----------|------------------|
| [`portfolio/README.md`](README.md) | This guide — table of contents and where to start |
| [`portfolio/product-validation.md`](product-validation.md) | Usage validation, traction context, shutdown rationale (framed for review) |
| [`portfolio/engineering-summary.md`](engineering-summary.md) | Engineering metrics: platforms, API surface, infra, auth, CI/CD |

### Architecture

| Repo path | What it contains |
|-----------|------------------|
| [`portfolio/architecture/system-overview.md`](architecture/system-overview.md) | Application layers, major game domains, design principles |
| [`portfolio/architecture/system-architecture.png`](architecture/system-architecture.png) | Infrastructure diagram (mobile, web, Cloudflare, EB, Atlas) |
| [`portfolio/architecture/system-architecture.mmd`](architecture/system-architecture.mmd) | Mermaid source for the diagram above |
| [`portfolio/architecture/environments.md`](architecture/environments.md) | Dev / staging / production hosts and branch deploy flow |
| [`portfolio/architecture/images/`](architecture/images/) | Logo assets |

### Deployment (proof while live)

| Repo path | What it contains |
|-----------|------------------|
| [`portfolio/deployment/elastic-beanstalk.md`](deployment/elastic-beanstalk.md) | API on AWS EB (`rp-api-prod`, `rp-api-staging`) + console screenshots |
| [`portfolio/deployment/aws-amplify.md`](deployment/aws-amplify.md) | Marketing web on Amplify (`risingpunk.com`) |
| [`portfolio/deployment/mongodb-atlas.md`](deployment/mongodb-atlas.md) | Atlas clusters and database scale |
| [`portfolio/deployment/cloudflare-dns.md`](deployment/cloudflare-dns.md) | DNS, SSL/TLS (Full strict), domains |
| [`portfolio/deployment/github-actions.md`](deployment/github-actions.md) | CI/CD workflows and repo layout screenshots |
| [`portfolio/deployment/images/`](deployment/images/) | AWS, Cloudflare, Atlas, GitHub, store-console screenshots |

### Product

| Repo path | What it contains |
|-----------|------------------|
| [`portfolio/product/feature-overview.md`](product/feature-overview.md) | Feature list: turf, hack map, crews, bug hunt, battles, IAP |
| [`portfolio/product/screenshots.md`](product/screenshots.md) | Indexed UI, gameplay, and web marketing screenshots |
| [`portfolio/product/app-store-play-store.md`](product/app-store-play-store.md) | App Store, TestFlight, Google Play distribution proof |
| [`portfolio/product/images/`](product/images/) | Mobile and store listing images |

### Decommission

| Repo path | What it contains |
|-----------|------------------|
| [`portfolio/decommission/backup-checklist.md`](decommission/backup-checklist.md) | **Pre-shutdown code + DB backups** (start here before teardown) |
| [`portfolio/decommission/data-retention.md`](decommission/data-retention.md) | User data, retention, and privacy policy |
| [`portfolio/decommission/decommission-plan.md`](decommission/decommission-plan.md) | Why and how hosting was wound down |
| [`portfolio/decommission/decommission-checklist.md`](decommission/decommission-checklist.md) | Infrastructure teardown checklist |
| [`portfolio/decommission/lessons-learned.md`](decommission/lessons-learned.md) | Retrospective and portfolio positioning blurb |
| [`portfolio/decommission/scripts/`](decommission/scripts/) | `create-code-backup.sh`, `export-mongodb.sh` |

### Reference (deeper technical write-ups)

| Repo path | What it contains |
|-----------|------------------|
| [`portfolio/reference/architectural_diagram.md`](reference/architectural_diagram.md) | Extended application architecture (Mermaid diagrams, API tables) |
| [`portfolio/reference/architectural_diagram.txt`](reference/architectural_diagram.txt) | Plain-text version (readable anywhere) |

---

## Suggested walkthrough for a reviewer

1. **[product-validation.md](product-validation.md)** — context and honest usage snapshot  
2. **[engineering-summary.md](engineering-summary.md)** — scope of what was engineered  
3. **[architecture/system-architecture.png](architecture/system-architecture.png)** — one-page infra picture  
4. **[product/screenshots.md](product/screenshots.md)** + **[product/app-store-play-store.md](product/app-store-play-store.md)** — product proof  
5. **[deployment/](deployment/)** — cloud verification screenshots  
6. **Source (optional):** `mobile/`, `server/`, `shared/` — implementation detail  

---

## Codebase (not in this folder)

| Repo path | Role |
|-----------|------|
| `mobile/` | React Native app (iOS + Android) |
| `server/` | Express + TypeScript API |
| `shared/` | Shared TypeScript contracts |
| `.github/workflows/` | Deploy and promotion automation (see deployment docs) |
