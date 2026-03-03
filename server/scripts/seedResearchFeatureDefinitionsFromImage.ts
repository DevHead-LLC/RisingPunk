#!/usr/bin/env ts-node
/**
 * Seed all research features from the image/spec into research_feature_definitions.
 * Idempotent: upserts by (categoryId, id) so re-running is safe.
 *
 * Run from server/: npx ts-node scripts/seedResearchFeatureDefinitionsFromImage.ts
 */

import './scriptEnv';
import mongoose from 'mongoose';
import { getDatabaseName } from './scriptEnv';
import { ResearchFeatureDefinition } from '../src/models/ResearchFeatureDefinition';

type FeatureRow = {
  categoryId: string;
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  researchTimeHours: number;
  requiredFeatureRefs: { categoryId: string; featureId: string }[];
  researchCenterLevelRequirement: number;
  effect: { type: 'unlock' | 'improvement' | 'reduction' | 'special'; value: number | string; target?: string };
};

const FEATURES: FeatureRow[] = [
  {
    categoryId: 'home-defense',
    id: 'antivirus',
    name: 'Antivirus',
    description: 'Deploy a protective shield that prevents other players from attacking you for a limited time.',
    unlockCost: 5000,
    levelRequirement: 2,
    researchTimeHours: 5 / 60,
    requiredFeatureRefs: [],
    researchCenterLevelRequirement: 1,
    effect: { type: 'unlock', value: 'antivirus', target: 'system-protection' },
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-01',
    name: 'Increase Income +$0.01',
    description: 'Increase your base income rate by $0.01 per second.',
    unlockCost: 5000,
    levelRequirement: 2,
    researchTimeHours: 10 / 60,
    requiredFeatureRefs: [{ categoryId: 'home-defense', featureId: 'antivirus' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'improvement', value: 0.01, target: 'base-income-rate' },
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-02',
    name: 'Increase Income +$0.02',
    description: 'Increase your base income rate by an additional $0.02 per second.',
    unlockCost: 25000,
    levelRequirement: 5,
    researchTimeHours: 0.5,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'increase-income-01' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'improvement', value: 0.02, target: 'base-income-rate' },
  },
  {
    categoryId: 'cash-flow',
    id: 'reduce-insurance-01',
    name: 'Reduce Insurance Expense $0.01',
    description: 'Reduce your insurance expense by $0.01 per second.',
    unlockCost: 30000,
    levelRequirement: 5,
    researchTimeHours: 0.5,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'increase-income-02' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'reduction', value: 0.01, target: 'insurance-expense' },
  },
  {
    categoryId: 'hack-ability',
    id: 'add-battalion-c',
    name: 'Add Battalion C',
    description: 'Unlock a third battalion (Battalion C) to deploy in attacking battles.',
    unlockCost: 50000,
    levelRequirement: 5,
    researchTimeHours: 0.75,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'increase-income-02' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'improvement', value: 1, target: 'battalion-capacity' },
  },
  {
    categoryId: 'hack-crew',
    id: 'crew-system-unlock',
    name: 'Crew System',
    description: 'Unlock the ability to form, join, and manage hack crews.',
    unlockCost: 75000,
    levelRequirement: 5,
    researchTimeHours: 1,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'reduce-insurance-01' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'unlock', value: 'hack-crew-system', target: 'crew-management' },
  },
  {
    categoryId: 'cash-flow',
    id: 'reduce-insurance-02',
    name: 'Reduce Insurance Expense $0.02',
    description: 'Reduce your insurance expense by an additional $0.02 per second.',
    unlockCost: 75000,
    levelRequirement: 6,
    researchTimeHours: 1.5,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'reduce-insurance-01' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'reduction', value: 0.02, target: 'insurance-expense' },
  },
  {
    categoryId: 'hack-ability',
    id: 'battalion-size-250',
    name: 'Battalion Size +250',
    description: 'Increase maximum troops per battalion from 250 to 500.',
    unlockCost: 100000,
    levelRequirement: 6,
    researchTimeHours: 2,
    requiredFeatureRefs: [{ categoryId: 'hack-ability', featureId: 'add-battalion-c' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'improvement', value: 250, target: 'battalion-size' },
  },
  {
    categoryId: 'investments',
    id: 'rental-profit-01',
    name: 'Rental Profit +$0.01/Room',
    description: 'Increase rental income by $0.01 per room per second for all rental properties.',
    unlockCost: 150000,
    levelRequirement: 7,
    researchTimeHours: 2.5,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'reduce-insurance-02' }],
    researchCenterLevelRequirement: 1,
    effect: { type: 'improvement', value: 0.01, target: 'rental-room-income' },
  },
  {
    categoryId: 'home-defense',
    id: 'probe',
    name: 'Probe',
    description: 'Unlock the Probe ability for battle reconnaissance.',
    unlockCost: 200000,
    levelRequirement: 8,
    researchTimeHours: 3,
    requiredFeatureRefs: [{ categoryId: 'home-defense', featureId: 'antivirus' }],
    researchCenterLevelRequirement: 2,
    effect: { type: 'unlock', value: 'probe', target: 'battle-strategy' },
  },
  {
    categoryId: 'hack-ability',
    id: 'battalion-size-500',
    name: 'Battalion Size +500',
    description: 'Increase maximum troops per battalion from 500 to 1,000.',
    unlockCost: 250000,
    levelRequirement: 9,
    researchTimeHours: 3.5,
    requiredFeatureRefs: [{ categoryId: 'hack-ability', featureId: 'battalion-size-250' }],
    researchCenterLevelRequirement: 2,
    effect: { type: 'improvement', value: 500, target: 'battalion-size' },
  },
  {
    categoryId: 'npc',
    id: 'energy-regen-increase',
    name: 'Energy Regeneration Increase',
    description: 'Increase the rate at which your map attack energy regenerates.',
    unlockCost: 250000,
    levelRequirement: 9,
    researchTimeHours: 3.5,
    requiredFeatureRefs: [{ categoryId: 'hack-crew', featureId: 'crew-system-unlock' }],
    researchCenterLevelRequirement: 2,
    effect: { type: 'improvement', value: 1, target: 'energy-regen-rate' },
  },
  {
    categoryId: 'hack-ability',
    id: 'add-battalion-d',
    name: 'Add Battalion D',
    description: 'Unlock a fourth battalion (Battalion D) to deploy in attacking battles.',
    unlockCost: 300000,
    levelRequirement: 10,
    researchTimeHours: 4,
    requiredFeatureRefs: [
      { categoryId: 'hack-ability', featureId: 'battalion-size-250' },
      { categoryId: 'hack-ability', featureId: 'add-battalion-c' },
    ],
    researchCenterLevelRequirement: 2,
    effect: { type: 'improvement', value: 1, target: 'battalion-capacity' },
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-025',
    name: 'Increase Income +$0.025',
    description: 'Increase your base income rate by an additional $0.025 per second.',
    unlockCost: 300000,
    levelRequirement: 11,
    researchTimeHours: 5,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'increase-income-02' }],
    researchCenterLevelRequirement: 2,
    effect: { type: 'improvement', value: 0.025, target: 'base-income-rate' },
  },
  {
    categoryId: 'npc',
    id: 'energy-max-increase',
    name: 'Energy Max Increase',
    description: 'Increase your maximum map attack energy cap.',
    unlockCost: 300000,
    levelRequirement: 11,
    researchTimeHours: 5,
    requiredFeatureRefs: [{ categoryId: 'npc', featureId: 'energy-regen-increase' }],
    researchCenterLevelRequirement: 2,
    effect: { type: 'improvement', value: 1, target: 'energy-max' },
  },
  {
    categoryId: 'cash-flow',
    id: 'reduce-tax-expense-02',
    name: 'Reduce Tax Expense $0.02',
    description: 'Reduce your tax expense by $0.02 per second.',
    unlockCost: 300000,
    levelRequirement: 12,
    researchTimeHours: 6,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'reduce-insurance-02' }],
    researchCenterLevelRequirement: 2,
    effect: { type: 'reduction', value: 0.02, target: 'tax-expense' },
  },
  {
    categoryId: 'hack-ability',
    id: 'battalion-size-1000',
    name: 'Battalion Size +1,000',
    description: 'Increase maximum troops per battalion from 1,000 to 2,000.',
    unlockCost: 500000,
    levelRequirement: 13,
    researchTimeHours: 7,
    requiredFeatureRefs: [{ categoryId: 'hack-ability', featureId: 'battalion-size-500' }],
    researchCenterLevelRequirement: 2,
    effect: { type: 'improvement', value: 1000, target: 'battalion-size' },
  },
  {
    categoryId: 'investments',
    id: 'rental-profit-015',
    name: 'Rental Profit +$0.015/Room',
    description: 'Increase rental income by an additional $0.015 per room per second.',
    unlockCost: 500000,
    levelRequirement: 14,
    researchTimeHours: 8,
    requiredFeatureRefs: [{ categoryId: 'investments', featureId: 'rental-profit-01' }],
    researchCenterLevelRequirement: 3,
    effect: { type: 'improvement', value: 0.015, target: 'rental-room-income' },
  },
  {
    categoryId: 'investments',
    id: 'rental-profit-02-i',
    name: 'Rental Profit +$0.02/Room I',
    description: 'Increase rental income by an additional $0.02 per room per second.',
    unlockCost: 2750000,
    levelRequirement: 23,
    researchTimeHours: 15.5,
    requiredFeatureRefs: [{ categoryId: 'investments', featureId: 'rental-profit-015' }],
    researchCenterLevelRequirement: 5,
    effect: { type: 'improvement', value: 0.02, target: 'rental-room-income' },
  },
  {
    categoryId: 'investments',
    id: 'rental-profit-02-ii',
    name: 'Rental Profit +$0.02/Room II',
    description: 'Increase rental income by an additional $0.02 per room per second.',
    unlockCost: 6500000,
    levelRequirement: 30,
    researchTimeHours: 19.5,
    requiredFeatureRefs: [{ categoryId: 'investments', featureId: 'rental-profit-02-i' }],
    researchCenterLevelRequirement: 8,
    effect: { type: 'improvement', value: 0.02, target: 'rental-room-income' },
  },
  {
    categoryId: 'investments',
    id: 'rental-profit-02-iii',
    name: 'Rental Profit +$0.02/Room III',
    description: 'Increase rental income by an additional $0.02 per room per second.',
    unlockCost: 12500000,
    levelRequirement: 42,
    researchTimeHours: 25.5,
    requiredFeatureRefs: [{ categoryId: 'investments', featureId: 'rental-profit-02-ii' }],
    researchCenterLevelRequirement: 11,
    effect: { type: 'improvement', value: 0.02, target: 'rental-room-income' },
  },
  {
    categoryId: 'hack-ability',
    id: 'add-battalion-e',
    name: 'Add Battalion E',
    description: 'Unlock a fifth battalion (Battalion E) to deploy in attacking battles.',
    unlockCost: 1000000,
    levelRequirement: 15,
    researchTimeHours: 9,
    requiredFeatureRefs: [{ categoryId: 'hack-ability', featureId: 'add-battalion-d' }],
    researchCenterLevelRequirement: 3,
    effect: { type: 'improvement', value: 1, target: 'battalion-capacity' },
  },
  {
    categoryId: 'hack-ability',
    id: 'add-battalion-f',
    name: 'Add Battalion F',
    description: 'Unlock a sixth battalion (Battalion F) to deploy in attacking battles.',
    unlockCost: 2000000,
    levelRequirement: 16,
    researchTimeHours: 10,
    requiredFeatureRefs: [{ categoryId: 'hack-ability', featureId: 'add-battalion-e' }],
    researchCenterLevelRequirement: 3,
    effect: { type: 'improvement', value: 1, target: 'battalion-capacity' },
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-03',
    name: 'Increase Income +$0.03 I',
    description: 'Increase your base income rate by an additional $0.03 per second.',
    unlockCost: 1000000,
    levelRequirement: 16,
    researchTimeHours: 10,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'increase-income-025' }],
    researchCenterLevelRequirement: 3,
    effect: { type: 'improvement', value: 0.03, target: 'base-income-rate' },
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-03-ii',
    name: 'Increase Income +$0.03 II',
    description: 'Increase your base income rate by an additional $0.03 per second.',
    unlockCost: 2500000,
    levelRequirement: 22,
    researchTimeHours: 15,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'reduce-insurance-02' }],
    researchCenterLevelRequirement: 5,
    effect: { type: 'improvement', value: 0.03, target: 'base-income-rate' },
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-03-iii',
    name: 'Increase Income +$0.03 III',
    description: 'Increase your base income rate by an additional $0.03 per second.',
    unlockCost: 7000000,
    levelRequirement: 31,
    researchTimeHours: 20,
    requiredFeatureRefs: [{ categoryId: 'cash-flow', featureId: 'increase-income-03-ii' }],
    researchCenterLevelRequirement: 8,
    effect: { type: 'improvement', value: 0.03, target: 'base-income-rate' },
  },
  {
    categoryId: 'hack-ability',
    id: 'mark-2-bots',
    name: 'Mark 2 Bots',
    description: 'Unlock Mark 2 bots for improved battle performance.',
    unlockCost: 1250000,
    levelRequirement: 17,
    researchTimeHours: 11,
    requiredFeatureRefs: [{ categoryId: 'hack-ability', featureId: 'add-battalion-d' }],
    researchCenterLevelRequirement: 4,
    effect: { type: 'unlock', value: 'mark-2-bots', target: 'battle-bots' },
  },
  {
    categoryId: 'hack-crew',
    id: 'crew-strength-increase',
    name: 'Crew Strength Bonus +0.5',
    description: 'Increase the strength and effectiveness of your crew in battles.',
    unlockCost: 1500000,
    levelRequirement: 18,
    researchTimeHours: 12,
    requiredFeatureRefs: [{ categoryId: 'hack-crew', featureId: 'crew-system-unlock' }],
    researchCenterLevelRequirement: 4,
    effect: { type: 'improvement', value: 0.5, target: 'crew-strength' },
  },
];

async function run(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const dbName = getDatabaseName();
  await mongoose.connect(process.env.MONGODB_URI, { dbName, appName: 'seedResearchFeatureDefinitionsFromImage' });
  console.log('Connected to', dbName);

  let upserted = 0;
  for (const row of FEATURES) {
    await ResearchFeatureDefinition.updateOne(
      { categoryId: row.categoryId, id: row.id },
      { $set: row },
      { upsert: true }
    );
    upserted++;
    console.log(`  ${row.categoryId}/${row.id}`);
  }

  console.log('\nDone. Upserted', upserted, 'research feature definitions.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
