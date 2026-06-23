# Product Validation & Shutdown Rationale

## What was validated

RisingPunk was released on **iOS**, **Android**, and **web**, with a live API, real accounts, and measurable usage — not a prototype or local-only build.

The product combined:

- Financial / tycoon progression (income, research, property, bots)
- Async world-map PvP and NPC combat
- Crews, chat, swarms, and peer transfers
- Bug hunt, mini-games, and in-app purchases

## Usage snapshot (honest, in context)

These numbers reflect **real production usage** before decommission:

| Metric | Value |
|--------|--------|
| Accounts created | **1,874** |
| Peak daily active users (DAU) | **~50** |
| Peak monthly active users (MAU) | **600+** |

Engagement showed that people would try the product, but **retention did not sustain** at a level that justified the fixed cost of cloud hosting, store operations, and ongoing development against a solo/small-team runway.

## Why hosting was discontinued

After validating product usage and ongoing infrastructure costs, the decision was made to **discontinue hosting** rather than continue burning runway on a path where acquisition and retention costs stayed above sustainable revenue.

In practical terms: continuing to operate at prior scale would have meant **going materially underwater** long before reaching a usage or revenue tipping point. Shutting down live infrastructure was a deliberate business decision — not a failure to ship.

**Framing for reviewers:** This repo demonstrates **full delivery and operations capability**. The shutdown reflects **unit economics and retention**, not inability to build or deploy.

## What remains in this repository

- Complete source (`mobile/`, `server/`, `shared/`)
- Architecture and deployment documentation with console screenshots
- App and store screenshots from the live product
- Decommission plan and lessons learned

Live API hosts, web URLs, and store listings may be unavailable or removed.

## Where to verify engineering scope

See **[engineering-summary.md](engineering-summary.md)** for platforms shipped, API scale, cloud services, auth, database models, and CI/CD — the stronger story for a technical review.
