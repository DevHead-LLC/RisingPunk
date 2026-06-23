# TaskItems Documentation

**Last Updated**: April 2026  
**Purpose**: Central documentation hub for all development tasks, investigations, and planning

### Plan → execute (agent and collaborators)

Work follows **plan first, then implementation after explicit agreement**. The AI assistant must **not** change application code until you have **confirmed the plan** or given a **direct directive** to implement. That matches `.cursor/rules/watch-these-rules.mdc` (rule 8) and [`next-action-flow.md`](./next-action-flow.md) Step 5. **`mobile/src/current-task.md`** remains optional agent context for tracking; it does not replace approval before coding.

---

## 📁 Directory Structure

The `taskItems/` directory is organized by platform, feature area, and topic. **All files are listed below:**

```
taskItems/
├── README.md (this file)
├── next-actions.md
├── in-progress.md                 # Optional scratchpad — (re)created by next-action-flow Step 4a when a task starts; may be absent between tasks
├── historical-actions.md          # Completed / archived task summaries (incl. Android guest black screen notes Apr 2026)
├── next-action-flow.md            # Flow for starting a task from the priority list
├── next-actions-cleanup-flow.md   # Post-task cleanup flow (when a task is complete)
├── problemSolvingMethodology.md   # Root-cause problem solving: create temp file, use logs to prove theories; source usually in-progress.md or in-progress-N.md
├── problemSolvingTempFile.md      # Current problem only: efforts + logs added (for later removal); deleted by problemSolvingCleanup
├── problemSolvingCleanup.md       # Transfer solution + logs-to-remove to in-progress or README destination; then delete temp file
├── github/
│   └── babysit-loop-start.md      # GitHub promotion babysit loop authority (Phase 2 complete Apr 2026)
├── featuresAndBugs/
│   ├── add-bug-or-update-flow.md    # Flow for adding a new bug or update to bug-fixes and next-actions
│   ├── add-planned-feature-flow.md # Flow for adding a new planned feature to planned and next-actions
│   ├── bug-fixes-and-updates.md
│   ├── iap-integration-plan.md      # In-app purchase integration plan (Apple/Google, server verification; planning)
│   └── planned.md
├── deployment-tracking.md
├── mini-games/                         # Program Your Bots / Programming Facility mini games
│   ├── packet-breach-levels.md        # Packet Breach level design (~100 levels, Infantry tier rewards)
│   ├── race-condition-heist.md        # Race Condition Heist design: rules, packet/exploit/security, 21 tiers / 105 levels
│   ├── race-condition-heist-development.md  # Race Condition Heist implementation guide: config, engine, UI, Guardian rewards
│   ├── binary-bank-crack.md            # Binary Bank Crack design: 4-bit registers, vault codes, Tier 1 (1.1–1.5), Range/Phreak (✅ Complete March 2026)
│   └── logic-gate-hijack.md           # Logic Gate Hijack design spec: gameplay, tiers, Cavalry/Guardian rewards
│
├── android/                            # Android-specific documentation
│   ├── README.md
│   ├── edge-to-edge-display-migration.md
│   ├── production-code-analysis.md
│   ├── device-storage-fix.md
│   ├── build-scripts-reference.md
│   ├── handle-selection-screen-freeze-fix.md
│   │
│   ├── deployment/                     # Android deployment guides
│   │   ├── environment-configuration.md
│   │   ├── play-console-deployment.md
│   │   ├── direct-device-deployment-guide.md
│   │   ├── 16kb-native-library-alignment-verification.md
│   │   ├── 16kb-page-size-fix.md
│   │   └── fix-android-env-file-build-config.md
│   │
│   ├── turf/                           # TurfScreen Android-specific issues
│   │   ├── turf-tap-fix.md
│   │   ├── android-scrolling-fix.md
│   │   ├── profile-screen-scroll-android.md  # ProfileScreen scroll / safe-area padding — complete Mar 2026
│   │   ├── investment-property-remodel-modal-android.md
│   │   └── home/
│   │       └── hackMap/                 # HackMap Android-specific issues
│   │           ├── README.md
│   │           ├── hackmap-android-investigation.md
│   │           ├── hackmap-android-diagnostic-code.md
│   │           ├── hackmap-improvements-needed.md
│   │           ├── quick-test-script.md
│   │           └── visiting-profile-modal-android-scroll.md
│   │
│   ├── appWide/                        # App-wide Android configuration
│   │   ├── modals.md
│   │   ├── network-security-config.md
│   │   ├── guest-login-play-as-guest.md
│   │   └── android-google-sign-in.md
│   │
│   └── onboarding/                     # Onboarding flow fixes
│       ├── email-verification-modal-fix.md
│       ├── handle-selection-modal-fix.md
│       └── modal-production-build-fix.md
│
├── ios/                                # iOS-specific documentation
│   ├── iosDeployments/
│   │   └── ios-deployment.md
│   │
│   ├── appWide/                        # App-wide iOS patterns and config
│   │   ├── input-keyboard-pattern.md
│   │   ├── guest-login-play-as-guest.md
│   │   ├── world-chat-hackmap.md      # World Chat (HackMap) — completed Feb 2026
│   │   └── private-messaging-thread-limits-and-admin-send-all.md  # PM inbox, send-all, FIFO 10/20 caps + purge (complete Apr 2026)
│   │
│   ├── turf/                           # Game features (TurfScreen)
│   │   ├── researchCenter/
│   │   │   ├── research-center-levels-1-3.md
│   │   │   ├── research-center-category-unlock-requirements.md   # Category unlock matrix; includes April 2026 Hunting category extension note
│   │   │   ├── categories/
│   │   │   │   ├── unlock-cash-flow.md
│   │   │   │   ├── unlock-investments.md
│   │   │   │   └── unlock-hack-ability.md
│   │   │   └── researchItems/
│   │   │       ├── increase-income-rate.md            # + Cash Flow tier expansion Mar 2026 (see file § Cash Flow research expansion)
│   │   │       ├── rental-profit-increase.md
│   │   │       ├── increase-battalion-size.md         # + late tiers Mar 2026 (see file § Late tiers)
│   │   │       ├── crew-system-unlock.md
│   │   │       ├── add-battalion-c.md
│   │   │       └── reduce-insurance-expense.md
│   │   │
│   │   ├── financialStatement/
│   │   │   └── income-statement-structure.md
│   │   │
│   │   ├── rental-property-level-remodel-system.md
│   │   ├── daily-haul-7-day-claim.md       # Daily Haul 7-day claim — complete Mar 2026
│   │   ├── packet-breach-daily-mini-game.md # Packet Breach — complete Mar 2026
│   │   ├── crew-backup-request.md          # Crew back-up request (banner, modal, time reduction) — complete Mar 2026
│   │   ├── pvp-battle-money-reward-total-victory.md # PvP wallet theft on attacker win + Battle Report cash — complete Mar 2026
│   │   ├── programming-facility-terminology-sprint-brute-remote.md # Sprint/Brute/Remote copy (Programming Facility, mini-games, Profile, Barracks) — complete Mar 2026
│   │   ├── battle-notifications-private-messages.md # PvP Battle Report DMs (BTL|), inbox preview — complete Mar 2026
│   │   ├── peer-transfer-runs.md            # Peer transfer runs — P2P item/wallet transfers (complete Apr 2026)
│   │   ├── underground-exchange-in-game-shop.md  # Underground Exchange in-game shop (complete Apr 2026)
│   │   │
│   │   ├── userGuide/
│   │   │   ├── user-guide-task-system.md
│   │   │   ├── guided-task-fixes.md
│   │   │   ├── expand-guided-task-system-beyond-20.md
│   │   │   ├── guided-task-modal-npc-level-async-march.md  # Guided Task L5/L6 on async hack marches (complete Apr 2026)
│   │   │   ├── use-shield.md
│   │   │   ├── build-investment-property-2.md
│   │   │   ├── view-financial-statement.md
│   │   │   ├── reach-level-3.md
│   │   │   ├── view-username-change-setting.md
│   │   │   ├── unlock-antivirus.md
│   │   │   ├── unlock-home-defense.md
│   │   │   ├── build-investment-property.md
│   │   │   ├── view-member-profile.md
│   │   │   ├── reach-level-2.md
│   │   │   ├── disable-task-guide-enable-location-click.md
│   │   │   ├── build-research-center.md
│   │   │   ├── hack-level-1-npc.md
│   │   │   ├── view-wallet.md
│   │   │   ├── visit-digital-barracks.md
│   │   │   ├── visit-hackmap.md
│   │   │   ├── free-hack-rig.md
│   │   │   ├── build-100-guardians.md
│   │   │   ├── visit-home-location.md
│   │   │   ├── visit-home.md
│   │   │   ├── hide-task-list.md
│   │   │   ├── avatar-changing.md
│   │   │   ├── theme-switching.md
│   │   │   └── view-profile.md
│   │   │
│   │   ├── profile/
│   │   │   └── account/
│   │   │       └── thorough-account-deletion.md
│   │   │
│   │   └── onboarding/
│   │       └── onboarding-slideshow-update.md
│   │
│   ├── hackMap/                        # HackMap feature docs
│   │   ├── probe-research-ability-completed.md   # Probe (5.4) — completed Mar 2026
│   │   ├── swarm-group-hack.md                # Swarm (group hack) — complete Apr 2026; task home + research seed (see historical-actions)
│   │   ├── tappable-location-links-swarms-hacks-reports-chat.md  # Tappable map links from Swarms/Hacks/reports/crew chat (complete Apr 2026)
│   │   ├── performance/
│   │   │   ├── hackmap-improvements-needed.md
│   │   │   ├── hackmap-render-optimization-completed.md
│   │   │   ├── map-loading-strategy-completed-phases.md
│   │   │   └── hackmap-optimization-complete.md
│   │   │
│   │   ├── mapPerformance/             # HackMapScreen performance (viewport, panning, tap, user position)
│   │   │   ├── viewport-only-initial-load.md
│   │   │   ├── panning-load.md
│   │   │   ├── tile-tap-reliability.md
│   │   │   ├── user-position-and-locator.md
│   │   │   └── tile-image-blink.md
│   │   │
│   │   ├── battles/
│   │   │   ├── map-hack-travel-async-battles.md  # Travel, async battles, Battle Report DMs, defender queue, replay (complete Apr 2026)
│   │   │   ├── pvp/
│   │   │   │   ├── pvp-battle-loss-tracking.md
│   │   │   │   └── pvp-battle-experience.md
│   │   │   └── battle-prep/
│   │   │       ├── max-troops-button.md
│   │   │       └── battle-preparation-presets.md  # 3 battalion presets + Profile Battles (complete Apr 2026)
│   │   │
│   │   ├── mapDesign/
│   │   │   ├── map/
│   │   │   │   └── replace-plain-tiles.md
│   │   │   ├── hackmap-expand-499-terrain-npc.md
│   │   │   └── user/
│   │   │       └── user-vs-user-battle-stats.md
│   │   │
│   │   ├── npc/
│   │   │   └── npc-expansion-level-mapping.md
│   │   │
│   │   └── hackCrew/
│   │       ├── crew-strength-bonus.md   # Hack Crew army bonus chain (27× ATK/DEF/HP; complete Mar 2026)
│   │       ├── reporting-bugs.md
│   │       ├── leaderboard.md
│   │       └── crew-chat-auto-scroll.md
│   │
│   ├── bot/                            # Bot-related features
│   │   ├── mark-ii-bots.md             # Mark II bots — task home (complete; see historical-actions, bots/mark-ii-roadmap-future-marks.md)
│   │   ├── bot-respawn-safety-after-server-reset.md
│   │   └── bot-rps-balance.md
│   │
│   ├── investigations/                 # Technical investigations
│   │   └── map-logs.md
│   │
│   ├── support/                        # Support and production issues
│   │   └── email-validation.md
│   │
│   └── compliance/                     # Compliance and reporting
│       └── user-reporting-ios-crash.md
│
├── web/                                # Web-related tasks
│   ├── homepage.md
│   ├── offers-page-redesign-plan.md
│   ├── conversion-analysis-and-recommendations.md
│   └── plan-review-analysis.md
│
├── marketing/                          # Marketing and promotion
│   ├── marketing-checklist.md
│   ├── mvp-marketing-plan-30-days.md
│   ├── what-weve-accomplished.md
│   ├── smart-redirect-endpoint-plan.md
│   │
│   ├── formingAPicture/                # Marketing strategy and analytics
│   │   ├── big-picture.md
│   │   ├── customer-funnel.md
│   │   ├── youtube-promotion.md
│   │   ├── apple-ads.md
│   │   ├── firebase-overview.md
│   │   ├── google-analytics.md
│   │   ├── google-search-console.md
│   │   ├── google-ads.md
│   │   ├── make-installs-primary-action.md
│   │   └── fix-website-to-install-conversion.md
│   │
│   ├── funnel/                         # Marketing funnel and channel-specific docs
│   │   ├── customer-funnel.md
│   │   ├── youtube.md
│   │   ├── google-ads.md
│   │   ├── apple-ads.md
│   │   ├── microsoft-clarity.md
│   │   ├── linkedin.md
│   │   ├── facebook.md
│   │   ├── google-play-console.md
│   │   ├── app-store-connect.md
│   │   │
│   │   ├── assets/                     # Platform and asset-specific actions
│   │   │   ├── website.md
│   │   │   ├── app-store.md
│   │   │   ├── google-play-store.md
│   │   │   └── design-assets.md
│   │   │
│   │   └── metrics/                    # Analytics and metrics tracking
│   │       ├── ga4-events.md
│   │       ├── google-analytics.md
│   │       ├── google-search-console.md
│   │       ├── firebase.md
│   │       └── microsoft-clarity.md
│   │
│   └── gameCenter/                     # Game Center features
│       ├── leaderboards.md
│       ├── leaderboard-recommendations.md
│       ├── deployment-plan.md
│       └── implementation-summary.md
│
├── applicationUpkeep/                  # Application maintenance and bug tracking
│   ├── force-app-update.md             # Force/notify app update (min version, 426, UpdateRequiredScreen) ✅ Complete
│   └── bugs/                           # Known bugs and bug fixes
│       ├── knownBugs.md
│       ├── user-profiles-and-orphan-cleanup-completed.md
│       ├── disallowed-handle-list-completed.md
│       └── account-recovery-ui-guest-only-completed.md
│
├── business/                            # Business health and owner metrics
│   └── important-numbers.md
│
├── historical-actions.md               # Completed tasks archive
│
└── aboutRisingPunk/                    # Game information and story
    ├── our-story.md
    └── game-overview.md
```

---

## 📑 Table of Contents

### 🎯 Planning & Tracking
- [**next-actions.md**](./next-actions.md) - Upcoming tasks roadmap by platform (single priority list with links to planned, bugs, and platform sections)
- **in-progress.md** (optional) — Lowest-numbered scratchpad from [next-action-flow.md](./next-action-flow.md) Step 4a (`in-progress.md`, `in-progress-2.md`, …); not always present. When removed after cleanup, durable notes live in [historical-actions.md](./historical-actions.md) (e.g. § Bugbot scratchpad — April 2026).
- [**next-action-flow.md**](./next-action-flow.md) - Flow for starting a task from the priority list (gather details, branch, clarify, featureFlow if new feature)
- [**next-actions-cleanup-flow.md**](./next-actions-cleanup-flow.md) - Post-task cleanup flow (update in-progress, historical, README, remove from next-actions, clear in-progress)
- [**problemSolvingMethodology.md**](./problemSolvingMethodology.md) - Root-cause problem solving: run to create temp file; use logs to prove theories; source usually in-progress or in-progress-N
- [**problemSolvingTempFile.md**](./problemSolvingTempFile.md) - Current problem only: all efforts and logs added (for removal later); deleted when cleanup runs
- [**problemSolvingCleanup.md**](./problemSolvingCleanup.md) - Transfer solution and logs-to-remove to in-progress (or README destination); then delete temp file
- [**github/babysit-loop-start.md**](./github/babysit-loop-start.md) - GitHub PR babysit loop authority for promotion-chain operations
- [**deployment-tracking.md**](./deployment-tracking.md) - Deployment workflow and branch promotion tracking
#### Features & Bugs (featuresAndBugs/)
- [**planned.md**](./featuresAndBugs/planned.md) - Planned features roadmap (new features by priority; use add-planned-feature-flow to add)
- [**iap-integration-plan.md**](./featuresAndBugs/iap-integration-plan.md) - In-app purchase integration plan (Apple/Google, server verification; planning)
- [**bug-fixes-and-updates.md**](./featuresAndBugs/bug-fixes-and-updates.md) - Bug fixes and small updates (use add-bug-or-update-flow to add)
- [**add-planned-feature-flow.md**](./featuresAndBugs/add-planned-feature-flow.md) - Flow for adding a new planned feature to planned and next-actions (priority order, no renumbering)
- [**add-bug-or-update-flow.md**](./featuresAndBugs/add-bug-or-update-flow.md) - Flow for adding a new bug or update to bug-fixes-and-updates and next-actions (priority order, no renumbering)

### 🎮 Mini-games (Programming Facility)
- [**mini-games/packet-breach-levels.md**](./mini-games/packet-breach-levels.md) - Packet Breach level design: ~100 levels, node types/slots/attempts/cost and tier rewards (Infantry)
- [**mini-games/race-condition-heist.md**](./mini-games/race-condition-heist.md) - Race Condition Heist design: rules, packet/exploit/security, 21 tiers / 105 levels (✅ Complete March 2026)
- [**mini-games/race-condition-heist-development.md**](./mini-games/race-condition-heist-development.md) - Race Condition Heist implementation guide: config, engine, UI, Guardian rewards (✅ Complete March 2026)
- [**mini-games/binary-bank-crack.md**](./mini-games/binary-bank-crack.md) - Binary Bank Crack design: 4-bit registers, vault codes, Tier 1 (1.1–1.5), Range/Phreak rewards (✅ Complete March 2026)
- [**mini-games/logic-gate-hijack.md**](./mini-games/logic-gate-hijack.md) - Logic Gate Hijack design spec: gameplay, gates, tiered levels (X.Y), Cavalry/Guardian rewards

### 🤖 Android
- [**android/README.md**](./android/README.md) - Android documentation index
- [**android/edge-to-edge-display-migration.md**](./android/edge-to-edge-display-migration.md) - Android 15 edge-to-edge display migration
- [**android/production-code-analysis.md**](./android/production-code-analysis.md) - Production build analysis and differences
- [**android/device-storage-fix.md**](./android/device-storage-fix.md) - Device storage issue fixes
- [**android/build-scripts-reference.md**](./android/build-scripts-reference.md) - Build script documentation
- [**android/handle-selection-screen-freeze-fix.md**](./android/handle-selection-screen-freeze-fix.md) - Handle selection screen freeze fix

#### Android - Deployment
- [**android/deployment/environment-configuration.md**](./android/deployment/environment-configuration.md) - Environment setup for dev/staging/prod
- [**android/deployment/play-console-deployment.md**](./android/deployment/play-console-deployment.md) - Google Play Console deployment guide
- [**android/deployment/direct-device-deployment-guide.md**](./android/deployment/direct-device-deployment-guide.md) - Direct device deployment via USB
- [**android/deployment/16kb-native-library-alignment-verification.md**](./android/deployment/16kb-native-library-alignment-verification.md) - 16 KB native library alignment verification (✅ Complete)
- [**android/deployment/16kb-page-size-fix.md**](./android/deployment/16kb-page-size-fix.md) - Complete fix guide for 16 KB page size errors
- [**android/deployment/fix-android-env-file-build-config.md**](./android/deployment/fix-android-env-file-build-config.md) - Android env file build configuration fixes

#### Android - TurfScreen
- [**android/turf/turf-tap-fix.md**](./android/turf/turf-tap-fix.md) - Tap gesture fix for TurfScreen
- [**android/turf/android-scrolling-fix.md**](./android/turf/android-scrolling-fix.md) - Scrolling/panning crash fix
- [**android/turf/profile-screen-scroll-android.md**](./android/turf/profile-screen-scroll-android.md) - ProfileScreen Android scroll / bottom padding; complete Mar 2026
- [**android/turf/investment-property-remodel-modal-android.md**](./android/turf/investment-property-remodel-modal-android.md) - Remodel modal centering and button handling on Android (overlay dimensions, border, onPressOut)

#### Android - HackMap
- [**android/turf/home/hackMap/README.md**](./android/turf/home/hackMap/README.md) - HackMap documentation index
- [**android/turf/home/hackMap/hackmap-android-investigation.md**](./android/turf/home/hackMap/hackmap-android-investigation.md) - HackMap loading issue investigation
- [**android/turf/home/hackMap/hackmap-android-diagnostic-code.md**](./android/turf/home/hackMap/hackmap-android-diagnostic-code.md) - Diagnostic code snippets for debugging
- [**android/turf/home/hackMap/hackmap-improvements-needed.md**](./android/turf/home/hackMap/hackmap-improvements-needed.md) - Performance improvements and fixes
- [**android/turf/home/hackMap/quick-test-script.md**](./android/turf/home/hackMap/quick-test-script.md) - Quick diagnostic test procedure
- [**android/turf/home/hackMap/visiting-profile-modal-android-scroll.md**](./android/turf/home/hackMap/visiting-profile-modal-android-scroll.md) - Visiting profile modal: Android scroll on first drag (✅ Complete Mar 2026)

#### Android - App-Wide
- [**android/appWide/modals.md**](./android/appWide/modals.md) - Universal Android modal configuration guide and best practices
- [**android/appWide/network-security-config.md**](./android/appWide/network-security-config.md) - Network security config (system CAs only, manifest reference) (✅ Complete)
- [**android/appWide/guest-login-play-as-guest.md**](./android/appWide/guest-login-play-as-guest.md) - Guest Login (Play as Guest) Android: staging build auto-login bug, constraints aligned with iOS
- [**android/appWide/android-google-sign-in.md**](./android/appWide/android-google-sign-in.md) - Android Google Sign In: fix Web Client ID in env (staging/prod), config reference (✅ Complete)

#### Android - Onboarding
- [**android/onboarding/email-verification-modal-fix.md**](./android/onboarding/email-verification-modal-fix.md) - Email verification modal centering and interaction fixes
- [**android/onboarding/handle-selection-modal-fix.md**](./android/onboarding/handle-selection-modal-fix.md) - Handle selection modal fixes
- [**android/onboarding/modal-production-build-fix.md**](./android/onboarding/modal-production-build-fix.md) - Modal production build fixes

### 🍎 iOS

#### iOS - Deployment
- [**ios/iosDeployments/ios-deployment.md**](./ios/iosDeployments/ios-deployment.md) - iOS deployment documentation

#### iOS - App-wide
- [**ios/appWide/input-keyboard-pattern.md**](./ios/appWide/input-keyboard-pattern.md) - App-wide pattern: input + software keyboard (fixed bar above keyboard, hide header/tabs when typing)
- [**ios/appWide/guest-login-play-as-guest.md**](./ios/appWide/guest-login-play-as-guest.md) - Guest Login (Play as Guest) feature: zero-friction entry, handle/onboarding, link email/password later, reusable password UI
- [**ios/appWide/world-chat-hackmap.md**](./ios/appWide/world-chat-hackmap.md) - World Chat (HackMap) — completed Feb 2026: map-wide chat, icon top center on TurfScreen and HackMapScreen, full-viewport modal
- [**ios/appWide/private-messaging-thread-limits-and-admin-send-all.md**](./ios/appWide/private-messaging-thread-limits-and-admin-send-all.md) - Private messaging: inbox ordering, send-all, FIFO 10-thread / 20-message caps + purge (complete Apr 2026)

#### iOS - Turf (Game Features)

##### Research Center
- [**featuresAndBugs/bug-fixes-and-updates.md § Research Center feature specs**](./featuresAndBugs/bug-fixes-and-updates.md#-research-center-feature-specs-update-existing-add-new) - 18-feature spec (completed Feb 2026): level, cost, prereqs, research time; single source of truth researchSpec18.ts; see historical-actions.md iOS #14
- [**ios/turf/researchCenter/research-center-levels-1-3.md**](./ios/turf/researchCenter/research-center-levels-1-3.md) - Research Center levels 1–3: build/upgrade costs and times, level badge on turf, up arrow when upgradable, existing users get level 3
- [**ios/turf/researchCenter/research-center-category-unlock-requirements.md**](./ios/turf/researchCenter/research-center-category-unlock-requirements.md) - Category unlock matrix: level, cost, dependencies, feature req's, Research Center level; includes April 2026 Hunting category extension reference
- [**ios/turf/researchCenter/categories/unlock-cash-flow.md**](./ios/turf/researchCenter/categories/unlock-cash-flow.md) - Cash flow unlock category
- [**ios/turf/researchCenter/categories/unlock-investments.md**](./ios/turf/researchCenter/categories/unlock-investments.md) - Investments unlock category
- [**ios/turf/researchCenter/categories/unlock-hack-ability.md**](./ios/turf/researchCenter/categories/unlock-hack-ability.md) - Hack ability unlock category
- [**ios/turf/researchCenter/researchItems/increase-income-rate.md**](./ios/turf/researchCenter/researchItems/increase-income-rate.md) - Income rate research item
- [**ios/turf/researchCenter/researchItems/rental-profit-increase.md**](./ios/turf/researchCenter/researchItems/rental-profit-increase.md) - Rental profit increase research (includes best practices)
- [**ios/turf/researchCenter/researchItems/increase-battalion-size.md**](./ios/turf/researchCenter/researchItems/increase-battalion-size.md) - Battalion size increase research
- [**ios/turf/researchCenter/researchItems/crew-system-unlock.md**](./ios/turf/researchCenter/researchItems/crew-system-unlock.md) - Crew system unlock
- [**ios/turf/researchCenter/researchItems/add-battalion-c.md**](./ios/turf/researchCenter/researchItems/add-battalion-c.md) - Add Battalion C research
- [**ios/turf/researchCenter/researchItems/reduce-insurance-expense.md**](./ios/turf/researchCenter/researchItems/reduce-insurance-expense.md) - Reduce insurance expense research (Cash Flow)

##### Financial Statement
- [**ios/turf/financialStatement/income-statement-structure.md**](./ios/turf/financialStatement/income-statement-structure.md) - Income statement structure

##### Investment Properties (Turf)
- [**ios/turf/rental-property-level-remodel-system.md**](./ios/turf/rental-property-level-remodel-system.md) - Rental property build levels (1–5) and room remodels (1–4); passive income and balance integration
- [**ios/turf/daily-haul-7-day-claim.md**](./ios/turf/daily-haul-7-day-claim.md) - Daily Haul 7-day claim (TurfScreen top right); complete Mar 2026
- [**ios/turf/packet-breach-daily-mini-game.md**](./ios/turf/packet-breach-daily-mini-game.md) - Packet Breach (Programming Facility); complete Mar 2026
- [**ios/turf/crew-backup-request.md**](./ios/turf/crew-backup-request.md) - Crew back-up request (banner, modal, server time reduction); complete Mar 2026
- [**ios/turf/pvp-battle-money-reward-total-victory.md**](./ios/turf/pvp-battle-money-reward-total-victory.md) - PvP battle wallet transfer on attacker victory + Battle Report amounts; complete Mar 2026
- [**ios/turf/programming-facility-terminology-sprint-brute-remote.md**](./ios/turf/programming-facility-terminology-sprint-brute-remote.md) - Sprint/Brute/Remote terminology (Programming Facility modal, mini-games, Profile stats, Digital Barracks); complete Mar 2026
- [**ios/turf/battle-notifications-private-messages.md**](./ios/turf/battle-notifications-private-messages.md) - PvP Battle Report private messages (`BTL|`), MessagesModal + BaseChatModal; complete Mar 2026
- [**ios/turf/peer-transfer-runs.md**](./ios/turf/peer-transfer-runs.md) - Peer transfer runs — player-to-player item and wallet transfers (complete Apr 2026)
- [**ios/turf/underground-exchange-in-game-shop.md**](./ios/turf/underground-exchange-in-game-shop.md) - Underground Exchange in-game shop (complete Apr 2026)

##### User Guide
- [**ios/turf/userGuide/user-guide-task-system.md**](./ios/turf/userGuide/user-guide-task-system.md) - User guide task system overview
- [**ios/turf/userGuide/guided-task-fixes.md**](./ios/turf/userGuide/guided-task-fixes.md) - Guided task system fixes
- [**ios/turf/userGuide/expand-guided-task-system-beyond-20.md**](./ios/turf/userGuide/expand-guided-task-system-beyond-20.md) - Expand guided task system to 40 tasks (next 20 + account-switch fix)
- [**ios/turf/userGuide/guided-task-modal-npc-level-async-march.md**](./ios/turf/userGuide/guided-task-modal-npc-level-async-march.md) - Guided Task modal: NPC L5/L6 milestones on async hack marches (complete Apr 2026); history in [historical-actions.md](./historical-actions.md)
- [**ios/turf/userGuide/use-shield.md**](./ios/turf/userGuide/use-shield.md) - Use a shield guided task (order 21, $35)
- [**ios/turf/userGuide/build-investment-property-2.md**](./ios/turf/userGuide/build-investment-property-2.md) - Build Investment Property 2 guided task (order 22, $40)
- [**ios/turf/userGuide/view-financial-statement.md**](./ios/turf/userGuide/view-financial-statement.md) - View financial statement guided task (order 23, $45)
- [**ios/turf/userGuide/reach-level-3.md**](./ios/turf/userGuide/reach-level-3.md) - Achieve level 3 guided task (order 24, $50)
- [**ios/turf/userGuide/view-username-change-setting.md**](./ios/turf/userGuide/view-username-change-setting.md) - View "Username Change" setting guided task (order 25, $55)
- [**ios/turf/userGuide/unlock-antivirus.md**](./ios/turf/userGuide/unlock-antivirus.md) - Unlock antivirus guide
- [**ios/turf/userGuide/unlock-home-defense.md**](./ios/turf/userGuide/unlock-home-defense.md) - Unlock home defense guide
- [**ios/turf/userGuide/build-investment-property.md**](./ios/turf/userGuide/build-investment-property.md) - Build investment property guide
- [**ios/turf/userGuide/view-member-profile.md**](./ios/turf/userGuide/view-member-profile.md) - View member profile guide
- [**ios/turf/userGuide/reach-level-2.md**](./ios/turf/userGuide/reach-level-2.md) - Reach level 2 guide
- [**ios/turf/userGuide/disable-task-guide-enable-location-click.md**](./ios/turf/userGuide/disable-task-guide-enable-location-click.md) - Disable task guide feature
- [**ios/turf/userGuide/build-research-center.md**](./ios/turf/userGuide/build-research-center.md) - Build research center guide
- [**ios/turf/userGuide/hack-level-1-npc.md**](./ios/turf/userGuide/hack-level-1-npc.md) - Hack level 1 NPC guide
- [**ios/turf/userGuide/view-wallet.md**](./ios/turf/userGuide/view-wallet.md) - View wallet guide
- [**ios/turf/userGuide/visit-digital-barracks.md**](./ios/turf/userGuide/visit-digital-barracks.md) - Visit digital barracks guide
- [**ios/turf/userGuide/visit-hackmap.md**](./ios/turf/userGuide/visit-hackmap.md) - Visit hackmap guide
- [**ios/turf/userGuide/free-hack-rig.md**](./ios/turf/userGuide/free-hack-rig.md) - Free hack rig guide
- [**ios/turf/userGuide/build-100-guardians.md**](./ios/turf/userGuide/build-100-guardians.md) - Build 100 guardians guide
- [**ios/turf/userGuide/visit-home-location.md**](./ios/turf/userGuide/visit-home-location.md) - Visit home location guide
- [**ios/turf/userGuide/visit-home.md**](./ios/turf/userGuide/visit-home.md) - Visit home guide
- [**ios/turf/userGuide/hide-task-list.md**](./ios/turf/userGuide/hide-task-list.md) - Hide task list feature
- [**ios/turf/userGuide/avatar-changing.md**](./ios/turf/userGuide/avatar-changing.md) - Avatar changing feature
- [**ios/turf/userGuide/theme-switching.md**](./ios/turf/userGuide/theme-switching.md) - Theme switching feature
- [**ios/turf/userGuide/view-profile.md**](./ios/turf/userGuide/view-profile.md) - View profile guide

##### Profile & Account
- [**ios/turf/profile/account/thorough-account-deletion.md**](./ios/turf/profile/account/thorough-account-deletion.md) - Account deletion implementation

##### Onboarding
- [**ios/turf/onboarding/onboarding-slideshow-update.md**](./ios/turf/onboarding/onboarding-slideshow-update.md) - Onboarding slideshow updates

#### iOS - HackMap
- [**ios/hackMap/probe-research-ability-completed.md**](./ios/hackMap/probe-research-ability-completed.md) - Probe research ability (5.4): unlock, launch, follow, cancel, Probe Report DM (✅ Complete Mar 2026)
- [**ios/hackMap/swarm-group-hack.md**](./ios/hackMap/swarm-group-hack.md) - Swarm (group hack): task home + research/timer notes; **complete Apr 2026** (summary in [historical-actions.md](./historical-actions.md#-swarm-group-hack))
- [**ios/hackMap/tappable-location-links-swarms-hacks-reports-chat.md**](./ios/hackMap/tappable-location-links-swarms-hacks-reports-chat.md) - Tappable map links from Swarms/Hacks/reports/crew chat shares (complete Apr 2026)

##### Map performance (HackMapScreen — completed Feb 2026)
- [**ios/hackMap/mapPerformance/viewport-only-initial-load.md**](./ios/hackMap/mapPerformance/viewport-only-initial-load.md) - Viewport-only first paint; phased work (no full-map fetch on load)
- [**ios/hackMap/mapPerformance/panning-load.md**](./ios/hackMap/mapPerformance/panning-load.md) - Map fill-in as user scrolls; fill-on-stop, viewport fetch
- [**ios/hackMap/mapPerformance/tile-tap-reliability.md**](./ios/hackMap/mapPerformance/tile-tap-reliability.md) - Tap handled at gesture layer; tile-tap reliability
- [**ios/hackMap/mapPerformance/user-position-and-locator.md**](./ios/hackMap/mapPerformance/user-position-and-locator.md) - my-position API; user locator and center-on-home
- [**ios/hackMap/mapPerformance/tile-image-blink.md**](./ios/hackMap/mapPerformance/tile-image-blink.md) - Tile image blink (deferred for follow-up)

##### Performance
- [**ios/hackMap/performance/hackmap-improvements-needed.md**](./ios/hackMap/performance/hackmap-improvements-needed.md) - Performance improvements needed
- [**ios/hackMap/performance/hackmap-render-optimization-completed.md**](./ios/hackMap/performance/hackmap-render-optimization-completed.md) - Render optimization completed
- [**ios/hackMap/performance/map-loading-strategy-completed-phases.md**](./ios/hackMap/performance/map-loading-strategy-completed-phases.md) - Map loading strategy phases
- [**ios/hackMap/performance/hackmap-optimization-complete.md**](./ios/hackMap/performance/hackmap-optimization-complete.md) - Optimization completion summary

##### Battles
- [**ios/hackMap/battles/map-hack-travel-async-battles.md**](./ios/hackMap/battles/map-hack-travel-async-battles.md) - Map hack: travel, async battles, Battle Report DMs, defender queue, replay (complete Apr 2026)
- [**ios/hackMap/battles/pvp/pvp-battle-loss-tracking.md**](./ios/hackMap/battles/pvp/pvp-battle-loss-tracking.md) - PvP battle loss tracking
- [**ios/hackMap/battles/pvp/pvp-battle-experience.md**](./ios/hackMap/battles/pvp/pvp-battle-experience.md) - PvP battle experience system
- [**ios/hackMap/battles/battle-prep/max-troops-button.md**](./ios/hackMap/battles/battle-prep/max-troops-button.md) - Max troops button feature
- [**ios/hackMap/battles/battle-prep/battle-preparation-presets.md**](./ios/hackMap/battles/battle-prep/battle-preparation-presets.md) - Battle Preparation presets (3 one-time unlocks, Profile Battles, best-effort apply; complete Apr 2026)

##### Map Design
- [**ios/hackMap/mapDesign/map/replace-plain-tiles.md**](./ios/hackMap/mapDesign/map/replace-plain-tiles.md) - Replace plain tiles with graphics
- [**ios/hackMap/mapDesign/hackmap-expand-499-terrain-npc.md**](./ios/hackMap/mapDesign/hackmap-expand-499-terrain-npc.md) - HackMap expand to 499×499 with terrain and NPC distribution
- [**ios/hackMap/mapDesign/user/user-vs-user-battle-stats.md**](./ios/hackMap/mapDesign/user/user-vs-user-battle-stats.md) - User vs user battle stats
- [**ios/hackMap/npc/npc-expansion-level-mapping.md**](./ios/hackMap/npc/npc-expansion-level-mapping.md) - NPC expansion level mapping

##### Hack Crew
- [**ios/hackMap/hackCrew/crew-strength-bonus.md**](./ios/hackMap/hackCrew/crew-strength-bonus.md) - Hack Crew army bonus chain (27× ATK/DEF/HP; complete Mar 2026); supersedes single +0.5 roadmap item
- [**ios/hackMap/hackCrew/reporting-bugs.md**](./ios/hackMap/hackCrew/reporting-bugs.md) - Bug reporting system
- [**ios/hackMap/hackCrew/leaderboard.md**](./ios/hackMap/hackCrew/leaderboard.md) - Hack crew leaderboard
- [**ios/hackMap/hackCrew/crew-chat-auto-scroll.md**](./ios/hackMap/hackCrew/crew-chat-auto-scroll.md) - Crew chat auto-scroll behavior (✅ Complete)

#### iOS - Support & Compliance
- [**ios/support/email-validation.md**](./ios/support/email-validation.md) - Email validation implementation
- [**ios/compliance/user-reporting-ios-crash.md**](./ios/compliance/user-reporting-ios-crash.md) - User reporting iOS crash handling

#### iOS - Investigations
- [**ios/investigations/map-logs.md**](./ios/investigations/map-logs.md) - Map logging investigation

#### iOS - Bot
- [**ios/bot/mark-ii-bots.md**](./ios/bot/mark-ii-bots.md) - Mark II bots — task home and shipping checklist (complete; see [historical-actions.md](./historical-actions.md#-mark-ii-bots), [bots/mark-ii-roadmap-future-marks.md](./bots/mark-ii-roadmap-future-marks.md))
- [**ios/bot/bot-respawn-safety-after-server-reset.md**](./ios/bot/bot-respawn-safety-after-server-reset.md) - Bot respawn safety after server reset (persist timers, catch-up on startup)
- [**ios/bot/bot-rps-balance.md**](./ios/bot/bot-rps-balance.md) - Bot RPS (resources per second) balance

### 🌐 Web
- [**web/homepage.md**](./web/homepage.md) - Homepage design and updates
- [**web/offers-page-redesign-plan.md**](./web/offers-page-redesign-plan.md) - Offers page redesign planning
- [**web/conversion-analysis-and-recommendations.md**](./web/conversion-analysis-and-recommendations.md) - Conversion optimization analysis
- [**web/plan-review-analysis.md**](./web/plan-review-analysis.md) - Plan review page analysis

### 📢 Marketing
- [**marketing/marketing-checklist.md**](./marketing/marketing-checklist.md) - Marketing task checklist
- [**marketing/mvp-marketing-plan-30-days.md**](./marketing/mvp-marketing-plan-30-days.md) - 30-day MVP marketing plan
- [**marketing/what-weve-accomplished.md**](./marketing/what-weve-accomplished.md) - Accomplishments summary
- [**marketing/smart-redirect-endpoint-plan.md**](./marketing/smart-redirect-endpoint-plan.md) - Smart redirect endpoint planning

#### Marketing - Forming a Picture
- [**marketing/formingAPicture/big-picture.md**](./marketing/formingAPicture/big-picture.md) - Big picture marketing strategy
- [**marketing/formingAPicture/customer-funnel.md**](./marketing/formingAPicture/customer-funnel.md) - Customer funnel analysis
- [**marketing/formingAPicture/youtube-promotion.md**](./marketing/formingAPicture/youtube-promotion.md) - YouTube promotion strategy
- [**marketing/formingAPicture/apple-ads.md**](./marketing/formingAPicture/apple-ads.md) - Apple Ads configuration
- [**marketing/formingAPicture/firebase-overview.md**](./marketing/formingAPicture/firebase-overview.md) - Firebase overview
- [**marketing/formingAPicture/google-analytics.md**](./marketing/formingAPicture/google-analytics.md) - Google Analytics setup
- [**marketing/formingAPicture/google-search-console.md**](./marketing/formingAPicture/google-search-console.md) - Google Search Console setup
- [**marketing/formingAPicture/google-ads.md**](./marketing/formingAPicture/google-ads.md) - Google Ads configuration
- [**marketing/formingAPicture/make-installs-primary-action.md**](./marketing/formingAPicture/make-installs-primary-action.md) - Make installs PRIMARY action optimization (✅ Complete)
- [**marketing/formingAPicture/fix-website-to-install-conversion.md**](./marketing/formingAPicture/fix-website-to-install-conversion.md) - Fix website-to-install conversion (97% drop-off)

#### Marketing - Funnel
- [**marketing/funnel/customer-funnel.md**](./marketing/funnel/customer-funnel.md) - Customer funnel analysis and tracking
- [**marketing/funnel/youtube.md**](./marketing/funnel/youtube.md) - YouTube marketing strategy and actions
- [**marketing/funnel/google-ads.md**](./marketing/funnel/google-ads.md) - Google Ads campaign optimization and actions
- [**marketing/funnel/apple-ads.md**](./marketing/funnel/apple-ads.md) - Apple Ads campaign optimization and actions
- [**marketing/funnel/microsoft-clarity.md**](./marketing/funnel/microsoft-clarity.md) - Microsoft Clarity website analytics
- [**marketing/funnel/linkedin.md**](./marketing/funnel/linkedin.md) - LinkedIn marketing
- [**marketing/funnel/facebook.md**](./marketing/funnel/facebook.md) - Facebook marketing
- [**marketing/funnel/mailchimp.md**](./marketing/funnel/mailchimp.md) - Mailchimp and newsletter signup (assess, fix, or remove)
- [**marketing/funnel/google-play-console.md**](./marketing/funnel/google-play-console.md) - Google Play Console documentation
- [**marketing/funnel/app-store-connect.md**](./marketing/funnel/app-store-connect.md) - App Store Connect documentation

##### Marketing - Funnel Assets
- [**marketing/funnel/assets/website.md**](./marketing/funnel/assets/website.md) - Website optimization and conversion actions
- [**marketing/funnel/assets/app-store.md**](./marketing/funnel/assets/app-store.md) - iOS App Store actions and game features
- [**marketing/funnel/assets/google-play-store.md**](./marketing/funnel/assets/google-play-store.md) - Android Google Play Store actions
- [**marketing/funnel/assets/design-assets.md**](./marketing/funnel/assets/design-assets.md) - Design and UI actions

##### Marketing - Funnel Metrics
- [**marketing/funnel/metrics/ga4-events.md**](./marketing/funnel/metrics/ga4-events.md) - GA4 events tracking list
- [**marketing/funnel/metrics/google-analytics.md**](./marketing/funnel/metrics/google-analytics.md) - Google Analytics setup and optimization actions
- [**marketing/funnel/metrics/google-search-console.md**](./marketing/funnel/metrics/google-search-console.md) - Google Search Console SEO actions
- [**marketing/funnel/metrics/firebase.md**](./marketing/funnel/metrics/firebase.md) - Firebase Analytics setup and optimization actions
- [**marketing/funnel/metrics/microsoft-clarity.md**](./marketing/funnel/metrics/microsoft-clarity.md) - Microsoft Clarity metrics

#### Marketing - Game Center
- [**marketing/gameCenter/leaderboards.md**](./marketing/gameCenter/leaderboards.md) - Leaderboard feature docs
- [**marketing/gameCenter/leaderboard-recommendations.md**](./marketing/gameCenter/leaderboard-recommendations.md) - Leaderboard recommendations
- [**marketing/gameCenter/deployment-plan.md**](./marketing/gameCenter/deployment-plan.md) - Game Center deployment plan
- [**marketing/gameCenter/implementation-summary.md**](./marketing/gameCenter/implementation-summary.md) - Implementation summary


### 🐛 Application Upkeep
- [**applicationUpkeep/force-app-update.md**](./applicationUpkeep/force-app-update.md) - Force/notify app update (min version, 426, UpdateRequiredScreen) (✅ Complete)
- [**applicationUpkeep/bugs/knownBugs.md**](./applicationUpkeep/bugs/knownBugs.md) - Known bugs and prioritized bug fixes
- [**applicationUpkeep/bugs/user-profiles-and-orphan-cleanup-completed.md**](./applicationUpkeep/bugs/user-profiles-and-orphan-cleanup-completed.md) - User profiles not loading & orphan cleanup (✅ Complete)
- [**applicationUpkeep/bugs/disallowed-handle-list-completed.md**](./applicationUpkeep/bugs/disallowed-handle-list-completed.md) - Disallowed username/handle list — system/official terms (✅ Complete)
- [**applicationUpkeep/bugs/account-recovery-ui-guest-only-completed.md**](./applicationUpkeep/bugs/account-recovery-ui-guest-only-completed.md) - Account Recovery UI and security (guest-only) (✅ Complete)

### 💼 Business
- [**business/important-numbers.md**](./business/important-numbers.md) - Business health metrics (sales, profitability, cash, customer, operational)

### 📖 About Rising Punk
- [**aboutRisingPunk/our-story.md**](./aboutRisingPunk/our-story.md) - Game story and narrative
- [**aboutRisingPunk/game-overview.md**](./aboutRisingPunk/game-overview.md) - Game overview and description

### 📚 Historical & Tracking
- [**historical-actions.md**](./historical-actions.md) - Completed tasks archive

---

## 🎯 How to Use This Documentation

### Finding Information
1. **By Platform**: Check platform-specific directories (Android, iOS, Web)
2. **By Feature**: Look in feature directories within platform folders (e.g., `ios/turf/`, `ios/hackMap/`)
3. **By Type**: Planning and flows in root (`next-actions.md`, flow docs); planned features, IAP plan, and bug list in `featuresAndBugs/`; platform-specific content in `android/` or `ios/` (many **completed** iOS feature task homes live under `ios/turf/`, `ios/hackMap/`, `ios/appWide/`, `ios/bot/` by area—see directory tree and TOC); upkeep in `applicationUpkeep/`

### Adding New Documentation
1. **Reference This Structure**: When creating a new .md file for a task, reference this README.md to understand the directory organization and file structure standards
2. **Determine Category**: Place in appropriate directory or create new one
3. **Planned features or bugs**: To add a **planned feature**, use [add-planned-feature-flow.md](./featuresAndBugs/add-planned-feature-flow.md) (adds to `featuresAndBugs/planned.md` and `next-actions.md`). To add a **bug or update**, use [add-bug-or-update-flow.md](./featuresAndBugs/add-bug-or-update-flow.md) (adds to `featuresAndBugs/bug-fixes-and-updates.md` and `next-actions.md`). Both flows use the same priority framework and sub-numbering (no renumbering of existing items)
4. **Follow Naming**: Use kebab-case for file names (e.g., `feature-name.md`)
5. **Update This README**: Add new files and directories to the table of contents above, and link them as done for existing items
6. **Link from Related Docs**: Cross-reference related documentation

### Documentation Standards
- **Clear Titles**: Use descriptive file and section names
- **Status Indicators**: Mark status (✅ Complete, 🟡 In Progress, 🔴 Blocked)
- **Cross-References**: Link to related documentation
- **Update Dates**: Keep "Last Updated" dates current

---

## 📝 Quick Reference

### Most Frequently Accessed
- [**next-actions.md**](./next-actions.md) - What to work on next (single priority list)
- [**next-action-flow.md**](./next-action-flow.md) - Start a task from the priority list (gather, branch, clarify, featureFlow if new feature)
- [**next-actions-cleanup-flow.md**](./next-actions-cleanup-flow.md) - Close out a completed task (in-progress → historical → README → next-actions → clear in-progress)
- [**featuresAndBugs/planned.md**](./featuresAndBugs/planned.md) - Planned features backlog
- [**featuresAndBugs/bug-fixes-and-updates.md**](./featuresAndBugs/bug-fixes-and-updates.md) - Bug fixes and updates backlog
- [**add-planned-feature-flow.md**](./featuresAndBugs/add-planned-feature-flow.md) - Add a planned feature (planned + next-actions)
- [**add-bug-or-update-flow.md**](./featuresAndBugs/add-bug-or-update-flow.md) - Add a bug or update (bug-fixes-and-updates + next-actions)
- [**deployment-tracking.md**](./deployment-tracking.md) - Deployment workflow
- [**android/README.md**](./android/README.md) - Android development guide
- [**android/deployment/environment-configuration.md**](./android/deployment/environment-configuration.md) - Environment setup

### Platform-Specific Entry Points
- **Android**: Start with [`android/README.md`](./android/README.md)
- **iOS**: See [`ios/iosDeployments/ios-deployment.md`](./ios/iosDeployments/ios-deployment.md)
- **Web**: Check [`web/`](./web/) directory
- **Marketing**: See [`marketing/marketing-checklist.md`](./marketing/marketing-checklist.md)
- **Planned features / bugs**: See [`featuresAndBugs/`](./featuresAndBugs/) (planned.md, bug-fixes-and-updates.md, and the add-feature / add-bug flows)

---

**Last Updated**: April 2026  
**Maintained By**: Development Team
