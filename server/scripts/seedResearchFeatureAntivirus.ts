#!/usr/bin/env ts-node
/**
 * Seed Antivirus into research_feature_definitions (pilot for moving research features to DB).
 * Idempotent: skips if home-defense/antivirus already exists.
 *
 * Run from server/: npx ts-node scripts/seedResearchFeatureAntivirus.ts
 */

import './scriptEnv';
import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';
import { ResearchFeatureDefinition } from '../src/models/ResearchFeatureDefinition';

const ANTIVIRUS = {
  categoryId: 'home-defense',
  id: 'antivirus',
  name: 'Antivirus',
  description: 'Deploy a protective shield that prevents other players from attacking you for a limited time.',
  unlockCost: 5000,
  levelRequirement: 2,
  researchTimeHours: 5 / 60,
  requiredFeatureRefs: [] as { categoryId: string; featureId: string }[],
  researchCenterLevelRequirement: 1,
  effect: { type: 'unlock' as const, value: 'antivirus', target: 'system-protection' },
};

async function run(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const dbName = getDatabaseName();
  await mongoose.connect(process.env.MONGODB_URI, { dbName, appName: 'seedResearchFeatureAntivirus' });
  console.log('Connected to', dbName);

  const existing = await ResearchFeatureDefinition.findOne({
    categoryId: ANTIVIRUS.categoryId,
    id: ANTIVIRUS.id,
  });
  if (existing) {
    console.log('Antivirus already in research_feature_definitions; skipping.');
    await mongoose.disconnect();
    process.exit(0);
  }

  await ResearchFeatureDefinition.create(ANTIVIRUS);
  console.log('Seeded Antivirus into research_feature_definitions.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
