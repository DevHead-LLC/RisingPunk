# Decommission Plan

## Why

RisingPunk was fully built and shipped on iOS, Android, and web with production-grade cloud infrastructure. After product validation, **ongoing cloud and maintenance costs were not justified by active usage**, so the live stack was intentionally taken offline.

The **GitHub repository stays public** as a portfolio artifact showing end-to-end mobile game development.

## Scope

| Layer | Action |
|-------|--------|
| Elastic Beanstalk | Terminate `rp-api-prod` and `rp-api-staging` |
| AWS Amplify | Delete or disconnect RisingPunk web app |
| MongoDB Atlas | Backup (optional) then delete/pause clusters |
| Cloudflare | Remove or repoint DNS for `risingpunk.com` / `risingpunk.dev` |
| App Store / Play Store | Unpublish or delist app |
| GitHub | **Keep repo**; disable deploy workflows or remove secrets |
| Domains | Renew or let expire per business decision |

## Order of operations (recommended)

1. **Announce / freeze** — Stop marketing; note decommission in README (done).
2. **Stores** — Delist or unpublish mobile apps so new users cannot install.
3. **Clients** — Existing installs will fail against dead API; optional force-update message was already supported in app for version gating.
4. **API** — Terminate EB environments (staging first, then production).
5. **Web** — Remove Amplify app and DNS to marketing site.
6. **Data** — Export Atlas backup if desired; then delete clusters.
7. **DNS** — Clean up Cloudflare records and certificates.
8. **Secrets** — Rotate/delete AWS IAM keys, Atlas users, Apple/Google service credentials used only for this app.
9. **CI** — Disable GitHub Actions deploy workflows or remove `AWS_*` / `EB_*` repository secrets.
10. **Archive** — Ensure `docs/` screenshots and this plan remain in repo.

## What we keep

- Full source (`mobile/`, `server/`, `shared/`)
- Documentation in `docs/`
- Git history
- Portfolio screenshots under `docs/product/images` and `docs/deployment/images`

## What we do not keep in git

- Production secrets (never committed)
- Live databases (unless you export a private backup locally)
- Running servers

## Checklist

Detailed step-by-step: [decommission-checklist.md](decommission-checklist.md)

## Retrospective

See [lessons-learned.md](lessons-learned.md).
