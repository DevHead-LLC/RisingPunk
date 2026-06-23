# Decommission Checklist

Use this when tearing down live infrastructure. **Complete [backup-checklist.md](backup-checklist.md) first.**

## Documentation & repo

- [x] Add `README.md` with decommissioned status
- [x] Add `portfolio/` architecture, deployment, product, decommission sections
- [x] Archive screenshots in `portfolio/product/images` and `portfolio/deployment/images`
- [ ] Commit and push final `portfolio/` package to `main`
- [ ] Tag `v1.0-final-decommissioned` and GitHub Release "Final Portfolio Archive"
- [ ] Code ZIP in `/Users/robertthiel/RisingPunk-Backups/code/`
- [ ] Remove `mobile/.env*` from git tracking (see backup-checklist A5)
- [ ] Rotate credentials exposed in historical git commits
- [ ] Disable or delete GitHub Actions deploy workflows (optional if secrets removed)
- [ ] Remove deploy secrets from GitHub (`AWS_*`, `EB_*`, etc.)

## Backups (before deleting infra)

- [ ] Export production MongoDB → encrypt → `RisingPunk-Backups/mongodb/raw/`
- [ ] Export staging MongoDB → encrypt → `RisingPunk-Backups/mongodb/raw/`
- [ ] Create sanitized sample → `RisingPunk-Backups/mongodb/sanitized/`
- [ ] Document retention in [data-retention.md](data-retention.md)

## Mobile stores

- [ ] Remove or unpublish **iOS** App Store listing
- [ ] Remove or unpublish **Android** Play Store listing
- [ ] Disable TestFlight external testing (if still active)
- [ ] Revoke unused App Store Connect API keys
- [ ] Revoke unused Google Play service account keys
- [ ] Remove IAP webhook URLs in App Store Connect / Play Console

## API (Elastic Beanstalk)

- [ ] Terminate environment `rp-api-staging`
- [ ] Terminate environment `rp-api-prod`
- [ ] Delete application `risingpunk-api` (optional)
- [ ] Clean old versions in EB S3 deployment bucket
- [ ] Remove IAM user/policy used only for EB deploy

## Web (Amplify)

- [ ] Delete Amplify app or disconnect `web` branch
- [ ] Remove custom domain `risingpunk.com` from Amplify

## Database (MongoDB Atlas)

- [ ] Raw backup verified and encrypted (see backup-checklist)
- [ ] Delete database users for EB IPs / credentials
- [ ] Terminate or pause `RisingPunkDB` cluster
- [ ] Terminate or pause `RisingPunkProd` cluster
- [ ] Close Atlas project if empty

## DNS (Cloudflare)

- [ ] Remove API CNAMEs (`api.risingpunk.com`, `api.risingpunk.dev`)
- [ ] Remove web records for `risingpunk.com` / `risingpunk.dev`
- [ ] Decide domain renewal vs expiration

## Third-party services

- [ ] Firebase project (analytics) — disable or delete if unused
- [ ] Email (Nodemailer credentials) — revoke app passwords
- [ ] Apple Sign-In / Google OAuth — revoke client secrets if rotating globally

## User data deletion

- [ ] Sanitized copy created for portfolio/dev
- [ ] Live production user data deleted (cluster terminated)
- [ ] S3 user media deleted (if any)
- [ ] Logs with PII deleted (CloudWatch, Atlas)
- [ ] Firebase analytics data deleted

## Verification

- [ ] `https://api.risingpunk.com` does not resolve or returns expected offline behavior
- [ ] `https://risingpunk.com` does not serve old Amplify site
- [ ] No unexpected AWS/Atlas billing after 30 days
- [ ] README and `portfolio/decommission/decommission-plan.md` reflect final state

## Date completed

| Milestone | Date |
|-----------|------|
| Decision to decommission | |
| Code backup + tag | |
| DB export + encrypt | |
| Stores delisted | |
| API terminated | |
| Web terminated | |
| Database terminated | |
| DNS cleaned up | |
