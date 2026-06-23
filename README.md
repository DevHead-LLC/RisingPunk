# RisingPunk

**RisingPunk** is a cross-platform strategy MMO where players build a financial empire, wage hacker warfare on a shared world map, join crews, and compete in async PvP battles. The product shipped on **iOS**, **Android**, and **web**.

## Project Status

This application was successfully built, deployed, and distributed across iOS, Android, and web. It is **no longer actively hosted** — the cloud infrastructure was intentionally decommissioned after product validation showed that ongoing hosting costs were not justified by sustainable usage and retention.

The repository remains public as a **portfolio project** demonstrating full-stack mobile game development.

**Do not expect live endpoints.** API hosts, web URLs, and store listings may be unavailable or removed.

## For employers & reviewers

**→ Start here: [`portfolio/README.md`](portfolio/README.md)**

That folder is a self-contained verification package:

- Product validation and shutdown rationale
- Engineering summary (platforms, API, cloud, CI/CD)
- Architecture diagrams and environment docs
- Deployment proof (AWS, Atlas, Cloudflare screenshots)
- App / store screenshots and feature overview
- Decommission plan and lessons learned

Suggested first reads: [`portfolio/product-validation.md`](portfolio/product-validation.md) → [`portfolio/engineering-summary.md`](portfolio/engineering-summary.md) → [`portfolio/architecture/system-architecture.png`](portfolio/architecture/system-architecture.png)

## Repository layout

| Path | Description |
|------|-------------|
| [`portfolio/`](portfolio/) | **Portfolio & verification docs** (start here for non-code review) |
| [`mobile/`](mobile/) | React Native app (iOS + Android) |
| [`server/`](server/) | Express + TypeScript API |
| [`shared/`](shared/) | Cross-platform contracts (IAP, battle replay, etc.) |

## Tech stack (summary)

- **Mobile:** React Native, Redux Toolkit, RTK Query, TypeScript
- **Backend:** Node.js, Express, Mongoose, Jest
- **Data:** MongoDB Atlas
- **Hosting:** AWS Elastic Beanstalk (API), AWS Amplify (web), Cloudflare (DNS/SSL)
- **CI/CD:** GitHub Actions (`staging` / `prod` branch deploys)
- **Auth & stores:** Apple Sign-In, Google Sign-In, App Store IAP, Google Play Billing

## License / use

Source is preserved for portfolio and learning purposes. All rights reserved unless otherwise stated by the author.
