# Lessons Learned

Notes from building and retiring RisingPunk — useful for portfolio conversations and future projects.

## What went well

- **Monorepo with `shared/`** — IAP catalog, battle replay wire format, and map copy stayed in sync between mobile and server.
- **Server-authoritative async gameplay** — Marches, headless battles, and scheduled sweeps let players progress without persistent WebSockets; scaled horizontally on Elastic Beanstalk.
- **Environment discipline** — Separate staging (`api.risingpunk.dev`) and production (`api.risingpunk.com`) with branch-based deploys reduced release risk.
- **Full platform coverage** — Same React Native codebase for iOS and Android; marketing web on Amplify; store distribution on both platforms.
- **Automation** — GitHub Actions for EB deploys and branch promotion (with Bugbot checks) kept release flow repeatable.

## What was costly / complex

- **Always-on cloud stack** — EB + Atlas + Cloudflare + Amplify has baseline cost even at low MAU.
- **Multi-instance correctness** — March schedulers, swarm settlement, and bug-hunt queues needed careful MongoDB indexing and idempotency.
- **Store + IAP compliance** — Apple/Google billing, ASSN webhooks, and sandbox testing added ongoing operational surface.
- **Large mobile surface area** — Many game modes (map, turf, crews, bug hunt, mini-games) meant wide regression scope for each release.

## Product validation takeaway

The app **proved technical and distribution capability** (shipped stores, live API, 1,874 accounts created, 600+ peak MAU). **Retention and unit economics** did not justify **fixed infrastructure spend** at observed engagement (~50 peak DAU) — a rational reason to decommission while preserving the repo as proof of work.

## If starting again

1. **Measure unit economics early** — Tie infra tier to MAU/revenue thresholds.
2. **Feature scope vs team size** — Async MMO + economy + crews + IAP is multiple products in one.
3. **Archive-first shutdown** — Capture architecture diagrams, console screenshots, and README status *before* deleting AWS/Atlas (this `docs/` folder).
4. **Keep one deploy path** — EB + Actions was enough; avoid duplicate deploy mechanisms.

## Portfolio positioning (short)

> Designed and shipped a cloud-hosted mobile and web game with separate staging and production APIs, MongoDB Atlas, Cloudflare DNS/SSL, AWS Elastic Beanstalk, and AWS Amplify — then intentionally decommissioned after validating that ongoing costs exceeded active usage, preserving the codebase as a public portfolio artifact.
