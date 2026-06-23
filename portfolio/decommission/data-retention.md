# Data Retention & Privacy

This document describes how RisingPunk user data was handled during decommissioning.

## Summary

The live production database was exported before shutdown for archival purposes. A sanitized dataset was created for future development and portfolio use. Production infrastructure and live user data were deleted during decommissioning to eliminate hosting costs and reduce unnecessary data retention.

**Raw backups containing real user data are encrypted and stored offline.** They are not used for portfolio demos, public repos, or shared drives.

## Backup storage location

| Backup type | Location |
|-------------|----------|
| Code archives (ZIP) | `/Users/robertthiel/RisingPunk-Backups/code/` |
| MongoDB exports (raw) | `/Users/robertthiel/RisingPunk-Backups/mongodb/raw/` (encrypt at rest) |
| MongoDB exports (sanitized) | `/Users/robertthiel/RisingPunk-Backups/mongodb/sanitized/` |
| Encryption keys for raw backups | Password manager / offline only — **not in git** |

## What we keep

| Asset | Where | Notes |
|-------|-------|-------|
| Schema / model definitions | `server/src/models/` in git | No user data |
| Empty DB structure | Sanitized export or `mongodump` with empty collections | For portfolio |
| Sanitized seed data | `RisingPunk-Backups/mongodb/sanitized/` | Fake emails, no real PII |
| Sample API responses | Optional JSON in backup folder | Hand-crafted or anonymized |
| Collection relationship notes | [`../architecture/system-overview.md`](../architecture/system-overview.md), [`../engineering-summary.md`](../engineering-summary.md) | Engineering docs only |

## What we do not keep casually

Do not commit, publish, or demo with:

- Real user emails, names, or handles tied to identity
- Password hashes or auth tokens
- Device tokens / vendor IDs used for guest recovery
- IP addresses from logs
- Payment identifiers (none received, but IAP ledger rows may still exist)
- Private message content from real users
- Raw MongoDB dumps on cloud storage without encryption

## User data categories in RisingPunk

Even with no paying customers, the production database contained **user data**:

| Collection area | Examples | Treatment |
|-----------------|----------|-----------|
| `users` | email, guest device IDs, profile, `lastLoginAt` | Delete live; anonymize or omit in sanitized export |
| `privatemessages` | DM content, battle reports | Delete live; do not include in portfolio samples |
| `useractivitylogs` / summaries | IPs, activity timestamps | Delete live |
| `bots`, `finance`, game state | Gameplay tied to user IDs | Sanitize user references in sample data only |
| IAP ledger | Store transaction IDs | Omit or redact in sanitized copy |

## Deletion sequence (recommended)

1. **Export** production and staging MongoDB to encrypted raw backup.
2. **Create** sanitized copy (see [`backup-checklist.md`](backup-checklist.md)).
3. **Verify** raw backup integrity (restore to local MongoDB once if needed).
4. **Delete** live Atlas clusters (`RisingPunkProd`, `RisingPunkDB`).
5. **Delete** EB environment variables and rotate any credentials that ever lived in git or EB console.
6. **Delete** S3 user uploads if any (verify buckets).
7. **Delete** analytics (Firebase) per provider console.
8. **Retain** code + portfolio docs + encrypted raw backup per your retention policy.

## Git and secrets

- `server/.env.*` files are gitignored locally; historical commits may still contain deleted server env files — **rotate** MongoDB passwords, JWT secrets, encryption keys, and email app passwords if they ever appeared in git history.
- `mobile/.env*` files were removed from tracking before final archive (client IDs are lower risk but still rotated if desired).

See [`backup-checklist.md`](backup-checklist.md) for step-by-step status.

## Retention policy (operator decision)

| Data | Suggested retention |
|------|---------------------|
| Encrypted raw DB export | Keep until legal/accounting need expires, then secure delete |
| Sanitized sample | Keep indefinitely for portfolio / local dev |
| Public git repo | Indefinite (code only, no user data) |
| Logs on AWS / Atlas | Deleted with infrastructure |

## Contact

For questions about this archive: repository owner (DevHead LLC).
