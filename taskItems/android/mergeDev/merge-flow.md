# Android merge flow: dev → android_mergeDev

**Use this document every time we merge dev into the Android-specific branch.** Follow the steps in order.

---

## 1. Create the merge branch from androidStaging

- Checkout `androidStaging` and ensure it is up to date.
- Create a new branch from it: `android_mergeDev`.

```bash
git checkout androidStaging
git pull origin androidStaging
git checkout -b android_mergeDev
```

---

## 2. Push the new branch

```bash
git push -u origin android_mergeDev
```

---

## 3. Bring in dev and merge

- Fetch the latest from the remote and merge `dev` into `android_mergeDev`.

```bash
git fetch origin
git merge origin/dev
```

---

## 4. Resolve conflicts (if any)

**Priority order:**

1. **Android first.** The Android branch is set up for Android devices and must continue to deploy successfully to Google Play Console (internal testing) and Google Play Store (production). When resolving conflicts, **keep Android-specific items and changes** so the Android environment is not broken.
2. **Dev second.** The dev branch carries the updates we want. Merge everything from dev that does not break the Android setup.

### Deployment workflows — do not edit

**Do not change** `.github/workflows/deploy-production.yml` or `.github/workflows/deploy-staging.yml` during this merge flow (or resolve conflicts by **keeping `androidStaging` / HEAD** for those files only—never “improve” or align them to `dev` from here). If Git reports conflicts in those files, accept **HEAD** and move on.

The **correct** Procfile lines are fixed and must stay as:

**Production**

```yaml
      - name: Create Procfile for production
        run: |
          echo 'web: NODE_ENV=production node dist/server.js' > Procfile
```

**Staging**

```yaml
      - name: Create Procfile for staging
        run: |
          echo 'web: NODE_ENV=staging node dist/server.js' > Procfile
```

**Never** use `dist/server/server.js` in these workflow Procfile echoes—it is **not** the path used for Elastic Beanstalk deployment in this repo’s pipeline.

**Before documenting:** Clear the previous decisions from older merges in `taskItems/android/mergeDev/merge-decisions.md` so the file only contains decisions for this merge session. Then **document every conflict resolution** in that file (same format: file, conflict table HEAD vs dev, resolution, rationale, rejected content, failure-mode hints). This lets us diagnose regressions if something breaks later. **Do not log “new” resolutions for deploy YAML** except “kept HEAD per merge-flow; workflows unchanged by intent.”

---

## 5. Push after a clean merge

Once the merge is complete and there are no unresolved conflicts:

```bash
git push origin android_mergeDev
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | From `androidStaging`, create and checkout `android_mergeDev` |
| 2 | Push `android_mergeDev` to origin |
| 3 | Fetch origin; merge `origin/dev` into `android_mergeDev` |
| 4 | Resolve conflicts: prefer Android setup, then dev; clear old decisions in `merge-decisions.md`, then log this merge’s resolutions there |
| 5 | Push `android_mergeDev` after merge is clean |

**Related:** `taskItems/android/mergeDev/merge-decisions.md` — log of conflict resolutions and failure-mode hints.
