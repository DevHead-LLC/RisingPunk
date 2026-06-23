# Pre-Shutdown Backup Checklist

Work through this **before** terminating Atlas, Elastic Beanstalk, or store listings.

**Backup root:** `/Users/robertthiel/RisingPunk-Backups/`

| Subfolder | Purpose |
|-----------|---------|
| `code/` | Git ZIP / tarball archives |
| `mongodb/raw/` | Full `mongodump` exports (encrypt — contains PII) |
| `mongodb/sanitized/` | Anonymized sample for portfolio / local dev |

Related: [data-retention.md](data-retention.md) · [decommission-checklist.md](decommission-checklist.md)

---

## A. Code backup

| # | Task | Status | Notes |
|---|------|--------|-------|
| A1 | Latest **mobile** code pushed to GitHub | ⬜ | Currently on `feature/iap-testing`; **portfolio/** and **README.md** are not committed yet |
| A2 | Latest **server/API** code pushed | ⬜ | `server/src/routes/iap.ts` has local changes |
| A3 | **README** updated (decommissioned status) | ✅ | `README.md` → points to `portfolio/` |
| A4 | **Portfolio package** committed & pushed | ⬜ | Entire `portfolio/` folder is untracked |
| A5 | `.env` files **not** committed | ⚠️ | `mobile/.env*` were tracked — being removed from git (see A5b) |
| A5b | Remove `mobile/.env*` from git index | ⬜ | Run after `.gitignore` update |
| A6 | Secrets removed from **git history** | ⚠️ | `server/.env.production` existed in history (deleted Sep 2025) — **rotate credentials**; history scrub optional |
| A7 | Create Git tag `v1.0-final-decommissioned` | ⬜ | After final commit on `main` (recommended) |
| A8 | Create GitHub Release **"Final Portfolio Archive"** | ⬜ | Attach notes; optional ZIP from release |
| A9 | Download / create local ZIP archive | ⬜ | Run `portfolio/decommission/scripts/create-code-backup.sh` |
| A10 | Store ZIP in `RisingPunk-Backups/code/` | ⬜ | |

### A9 — Create code archive (command)

From repo root:

```bash
./portfolio/decommission/scripts/create-code-backup.sh
```

Or manually:

```bash
cd /Users/robertthiel/DevHead_LLC/RisingPunk
git archive --format=zip --prefix=RisingPunk/ \
  -o "/Users/robertthiel/RisingPunk-Backups/code/RisingPunk-$(date +%Y%m%d)-final.zip" \
  HEAD
```

Use a tag name instead of `HEAD` once `v1.0-final-decommissioned` exists.

### A6 — Git history secrets (action required)

Historical commits contain `server/.env.production` with `MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `EMAIL_PASSWORD`. The file was deleted from the tree but **remains in history**.

**Minimum (do this):**

- [ ] Rotate MongoDB Atlas user passwords
- [ ] Rotate `JWT_SECRET` and `ENCRYPTION_KEY` (moot after shutdown but good hygiene)
- [ ] Revoke/regenerate email app password
- [ ] Rotate AWS deploy IAM keys

**Optional (scrub history):** `git filter-repo` or BFG Repo-Cleaner — only if you need secrets purged from GitHub. Force-push required; coordinate if others clone the repo.

---

## B. Database backup

Prerequisites: MongoDB Atlas connection string with read access (from Atlas console or local `server/.env.dev` — **do not commit**).

| # | Task | Status | Notes |
|---|------|--------|-------|
| B1 | Export **production** (`RisingPunkProd` on `RisingPunkProd` cluster) | ⬜ | See script below |
| B2 | Export **staging** (`RisingPunk` on `RisingPunkDB` cluster) | ⬜ | |
| B3 | Store raw dumps in `mongodb/raw/` | ⬜ | |
| B4 | Encrypt raw dumps (zip with password or `gpg`) | ⬜ | Required if PII present |
| B5 | Create **sanitized** sample dataset | ⬜ | See sanitization guide |
| B6 | Document schema without user data | ✅ | `server/src/models/`, `engineering-summary.md` |
| B7 | Delete or securely store raw backup per [data-retention.md](data-retention.md) | ⬜ | After B4 verified |

### B1/B2 — MongoDB export (commands)

Install MongoDB Database Tools if needed (`mongodump`).

**Production:**

```bash
OUT="/Users/robertthiel/RisingPunk-Backups/mongodb/raw/RisingPunkProd-$(date +%Y%m%d)"
mkdir -p "$OUT"
mongodump --uri="$MONGODB_URI_PROD" --db=RisingPunkProd --out="$OUT"
```

**Staging / dev database:**

```bash
OUT="/Users/robertthiel/RisingPunk-Backups/mongodb/raw/RisingPunk-$(date +%Y%m%d)"
mkdir -p "$OUT"
mongodump --uri="$MONGODB_URI_STAGING" --db=RisingPunk --out="$OUT"
```

Set URIs from Atlas → Connect (do not paste into git). Example cluster names from portfolio docs: `RisingPunkDB`, `RisingPunkProd`.

**Encrypt raw export:**

```bash
cd /Users/robertthiel/RisingPunk-Backups/mongodb/raw
zip -er "RisingPunkProd-$(date +%Y%m%d)-encrypted.zip" "RisingPunkProd-$(date +%Y%m%d)"
# Then delete unencrypted folder if desired
```

### B5 — Sanitized dataset (what to keep)

**Keep in sanitized copy:**

- Collection structure (empty or minimal documents)
- Fake users: `user1@example.test`, `user2@example.test`
- Sample bots/map cells with fake `userId` ObjectIds
- No real emails, messages, IPs, or device IDs

**Approach options:**

1. **Empty structure:** `mongodump` from local seed scripts only (`server` seed scripts if present).
2. **Manual subset:** Export 1–2 non-PII collections only (e.g. `researchfeaturedefinitions`, `constructionconfigs`).
3. **Anonymize script:** Run a one-off Node script against a local restore that hashes emails and clears `privatemessages`.

Do **not** put sanitized data in the public GitHub repo if it came from production without review.

---

## C. User data deletion (after backups verified)

| # | Task | Status |
|---|------|--------|
| C1 | Raw DB backup completed & encrypted | ⬜ |
| C2 | Sanitized copy created | ⬜ |
| C3 | Delete live production user data (terminate `RisingPunkProd` cluster) | ⬜ |
| C4 | Delete staging cluster `RisingPunkDB` | ⬜ |
| C5 | Delete user media from S3 (if any) | ⬜ |
| C6 | Delete logs with emails/IPs/tokens (CloudWatch, Atlas logs) | ⬜ |
| C7 | Delete Firebase analytics data (if used) | ⬜ |

---

## D. Suggested order of operations

1. Finish code: commit `portfolio/`, README, `.gitignore` fix → push `main`
2. Tag `v1.0-final-decommissioned` + GitHub Release
3. Run code backup script → `RisingPunk-Backups/code/`
4. `mongodump` prod + staging → encrypt → `RisingPunk-Backups/mongodb/raw/`
5. Create sanitized subset → `RisingPunk-Backups/mongodb/sanitized/`
6. Terminate infrastructure (EB → Amplify → Atlas → Cloudflare)
7. Rotate all credentials that ever lived in git or EB
8. Mark items complete in [decommission-checklist.md](decommission-checklist.md)

---

## Current session snapshot

*Auto-generated notes from pre-shutdown review — update as you complete items.*

- Branch: `feature/iap-testing` (portfolio work not on `main` yet)
- Untracked: `portfolio/`, `README.md`
- Modified: `.gitignore`, `iap.ts`, iOS project file
- `mobile/.env*` was tracked — fix in progress
- `server/.env.*` gitignored; historical `server/.env.production` in git history — rotate secrets
