#!/usr/bin/env ts-node
/**
 * One-time migration: grandfather Research Center unlocks for users who had
 * old feature IDs (from dev / pre–spec-18). Creates new UserResearchFeature
 * documents for the corresponding new feature IDs so battle, bots, balance,
 * and UI all see the unlock without code changes elsewhere.
 *
 * Run from server/: npx ts-node scripts/grandfatherResearchUnlocks.ts
 * Dry run (no writes): DRY_RUN=1 npx ts-node scripts/grandfatherResearchUnlocks.ts
 * Production: NODE_ENV=production npx ts-node scripts/grandfatherResearchUnlocks.ts
 *
 * See taskItems/grandfathered.md for the old→new mapping.
 */

import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';
import { UserResearchFeature } from '../src/models/UserResearchFeature';
import { getFeatureById } from '../src/config/researchFeatures';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

/** Old (categoryId, featureId) → list of new (categoryId, featureId) to grant as unlocked. */
const LEGACY_MAPPINGS: {
  oldCategoryId: string;
  oldFeatureId: string;
  newEntries: { categoryId: string; featureId: string }[];
}[] = [
  { oldCategoryId: 'financial', oldFeatureId: 'reduce-expenses', newEntries: [{ categoryId: 'cash-flow', featureId: 'reduce-tax-expense-02' }] },
  { oldCategoryId: 'hack-ability', oldFeatureId: 'battalions-per-battle', newEntries: [{ categoryId: 'hack-ability', featureId: 'add-battalion-c' }] },
  { oldCategoryId: 'hack-ability', oldFeatureId: 'increase-battalion-size', newEntries: [{ categoryId: 'hack-ability', featureId: 'battalion-size-250' }] },
  // Bugbot: migration grants 01+02+025 ($0.055/sec) for old increase-income-rate ($0.05/sec). Extra $0.005/sec is intentional (grandfather bonus).
  { oldCategoryId: 'cash-flow', oldFeatureId: 'increase-income-rate', newEntries: [
    { categoryId: 'cash-flow', featureId: 'increase-income-01' },
    { categoryId: 'cash-flow', featureId: 'increase-income-02' },
    { categoryId: 'cash-flow', featureId: 'increase-income-025' },
  ]},
  // Grant 01+02 so prerequisite order is satisfied (02 requires 01; crew-system-unlock requires 01). Bugbot: omit 01 caused inverted state.
  // Granting both yields $0.03/sec (01+02) vs old $0.02 — extra $0.01/sec is intentional grandfather bonus, like income (Bugbot).
  { oldCategoryId: 'cash-flow', oldFeatureId: 'reduce-insurance-expense', newEntries: [
    { categoryId: 'cash-flow', featureId: 'reduce-insurance-01' },
    { categoryId: 'cash-flow', featureId: 'reduce-insurance-02' },
  ]},
  { oldCategoryId: 'investments', oldFeatureId: 'rental-profit-increase', newEntries: [{ categoryId: 'investments', featureId: 'rental-profit-01' }] },
  // home-defense/antivirus and hack-crew/crew-system-unlock: same ID on dev and spec; no mapping needed unless you have another legacy ID
];

async function run(): Promise<void> {
  try {
    console.log('Grandfather Research Unlocks — one-time migration\n');
    if (DRY_RUN) {
      console.log('DRY_RUN=1: no documents will be created.\n');
    }

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set');
      process.exit(1);
    }

    const dbName = getDatabaseName();
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName,
      appName: 'grandfatherResearchUnlocks-script',
    });
    console.log('✅ Connected to database:', dbName, '\n');

    let totalInserted = 0;

    for (const mapping of LEGACY_MAPPINGS) {
      const { oldCategoryId, oldFeatureId, newEntries } = mapping;
      const oldDocs = await UserResearchFeature.find({
        categoryId: oldCategoryId,
        featureId: oldFeatureId,
        isUnlocked: true,
      }).lean();

      if (oldDocs.length === 0) {
        console.log(`⏭️  ${oldCategoryId}/${oldFeatureId}: no unlocked docs. Skipping.`);
        continue;
      }

      console.log(`📂 ${oldCategoryId}/${oldFeatureId}: ${oldDocs.length} unlocked user(s)`);

      for (const oldDoc of oldDocs) {
        const userId = oldDoc.userId;
        const unlockedAt = oldDoc.unlockedAt || new Date();
        let createdAny = false;

        for (const entry of newEntries) {
          const exists = await UserResearchFeature.exists({
            userId,
            categoryId: entry.categoryId,
            featureId: entry.featureId,
          });
          if (exists) {
            continue; // already have new doc (e.g. user already did new research)
          }

          const feature = getFeatureById(entry.categoryId, entry.featureId);
          if (!feature) {
            console.warn(`   ⚠️  No feature config for ${entry.categoryId}/${entry.featureId}; skipping insert.`);
            continue;
          }

          const unlockCost = feature.unlockCost ?? 0;
          const researchTimeHours = (feature as { researchTimeHours?: number }).researchTimeHours ?? 4;

          if (!DRY_RUN) {
            await UserResearchFeature.create({
              userId,
              categoryId: entry.categoryId,
              featureId: entry.featureId,
              isUnlocked: true,
              unlockedAt,
              isResearching: false,
              researchStartedAt: null,
              researchCompletesAt: null,
              researchTimeHours,
              unlockCost,
            });
          }
          createdAny = true;
          totalInserted++;
          console.log(`   ${DRY_RUN ? '[dry-run] ' : ''}+ ${entry.categoryId}/${entry.featureId} for user ${userId}`);
        }

        // Remove old doc so bonus logic doesn't double-count (Bugbot: legacy + new records would yield 0.105 vs intended 0.055).
        if (!DRY_RUN && oldDoc._id) {
          if (createdAny) {
            await UserResearchFeature.deleteOne({ _id: oldDoc._id });
            console.log(`   − removed old ${oldCategoryId}/${oldFeatureId} for user ${userId}`);
          } else {
            // Already-migrated: user has all new entries but still has old doc; remove it.
            const hasAllNew = (
              await Promise.all(
                newEntries.map(entry =>
                  UserResearchFeature.exists({ userId, categoryId: entry.categoryId, featureId: entry.featureId })
                )
              )
            ).every(Boolean);
            if (hasAllNew) {
              await UserResearchFeature.deleteOne({ _id: oldDoc._id });
              console.log(`   − removed old ${oldCategoryId}/${oldFeatureId} (already had new) for user ${userId}`);
            }
          }
        }
      }
      console.log('');
    }

    console.log(DRY_RUN ? `[dry-run] Would create ${totalInserted} document(s).` : `✅ Created ${totalInserted} document(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

run();
