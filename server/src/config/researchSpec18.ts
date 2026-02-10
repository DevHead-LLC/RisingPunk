/**
 * Single source of truth for the 18 Research Center features per spec.
 * Spec: bug-fixes-and-updates.md § Research Center feature specs.
 * Research time: stored as fractional hours (e.g. 5/60 = 5 min, 0.5 = 30 min).
 */

import { IResearchFeature, IResearchFeatureRef } from '../models/Research';

export interface SpecFeatureInput {
  categoryId: string;
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  researchTimeHours: number;
  requiredFeatureRefs?: IResearchFeatureRef[];
  effect: IResearchFeature['effect'];
}

function m(ref: { categoryId: string; featureId: string }): IResearchFeatureRef {
  return { categoryId: ref.categoryId, featureId: ref.featureId };
}

/** 18 features in spec order. Build RESEARCH_FEATURES for home-defense, hack-ability, hack-crew, investments, cash-flow from this. */
export const RESEARCH_SPEC_18: SpecFeatureInput[] = [
  {
    categoryId: 'home-defense',
    id: 'antivirus',
    name: 'Antivirus',
    description: 'Deploy a protective shield that prevents other players from attacking you for a limited time.',
    unlockCost: 5000,
    levelRequirement: 2,
    researchTimeHours: 5 / 60,
    requiredFeatureRefs: [],
    effect: { type: 'unlock', value: 'antivirus', target: 'system-protection' }
  },
  {
    categoryId: 'home-defense',
    id: 'probe',
    name: 'Probe',
    description: 'Unlock the Probe ability for battle reconnaissance.',
    unlockCost: 200000,
    levelRequirement: 8,
    researchTimeHours: 3,
    requiredFeatureRefs: [m({ categoryId: 'investments', featureId: 'rental-profit-01' })],
    effect: { type: 'unlock', value: 'probe', target: 'battle-strategy' }
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-01',
    name: 'Increase Income +$0.01',
    description: 'Increase your base income rate by $0.01 per second.',
    unlockCost: 5000,
    levelRequirement: 2,
    researchTimeHours: 10 / 60,
    requiredFeatureRefs: [m({ categoryId: 'home-defense', featureId: 'antivirus' })],
    effect: { type: 'improvement', value: 0.01, target: 'base-income-rate' }
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-02',
    name: 'Increase Income +$0.02',
    description: 'Increase your base income rate by an additional $0.02 per second.',
    unlockCost: 25000,
    levelRequirement: 5,
    researchTimeHours: 0.5,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'increase-income-01' })],
    effect: { type: 'improvement', value: 0.02, target: 'base-income-rate' }
  },
  {
    categoryId: 'cash-flow',
    id: 'reduce-insurance-01',
    name: 'Reduce Insurance Expense $0.01',
    description: 'Reduce your insurance expense by $0.01 per second.',
    unlockCost: 30000,
    levelRequirement: 5,
    researchTimeHours: 0.5,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'increase-income-02' })],
    effect: { type: 'reduction', value: 0.01, target: 'insurance-expense' }
  },
  {
    categoryId: 'hack-ability',
    id: 'add-battalion-c',
    name: 'Add Battalion C',
    description: 'Unlock a third battalion (Battalion C) to deploy in attacking battles.',
    unlockCost: 50000,
    levelRequirement: 5,
    researchTimeHours: 0.75,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'increase-income-02' })],
    effect: { type: 'improvement', value: 1, target: 'battalion-capacity' }
  },
  {
    categoryId: 'hack-crew',
    id: 'crew-system-unlock',
    name: 'Crew System',
    description: 'Unlock the ability to form, join, and manage hack crews.',
    unlockCost: 75000,
    levelRequirement: 5,
    researchTimeHours: 1,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'reduce-insurance-01' })],
    effect: { type: 'unlock', value: 'hack-crew-system', target: 'crew-management' }
  },
  {
    categoryId: 'cash-flow',
    id: 'reduce-insurance-02',
    name: 'Reduce Insurance Expense $0.02',
    description: 'Reduce your insurance expense by an additional $0.02 per second.',
    unlockCost: 75000,
    levelRequirement: 6,
    researchTimeHours: 1.5,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'reduce-insurance-01' })],
    effect: { type: 'reduction', value: 0.02, target: 'insurance-expense' }
  },
  {
    categoryId: 'hack-ability',
    id: 'battalion-size-250',
    name: 'Battalion Size +250',
    description: 'Increase maximum troops per battalion from 250 to 500.',
    unlockCost: 100000,
    levelRequirement: 6,
    researchTimeHours: 2,
    requiredFeatureRefs: [m({ categoryId: 'hack-ability', featureId: 'add-battalion-c' })],
    effect: { type: 'improvement', value: 250, target: 'battalion-size' }
  },
  {
    categoryId: 'investments',
    id: 'rental-profit-01',
    name: 'Rental Profit +$0.01/Room',
    description: 'Increase rental income by $0.01 per room per second for all rental properties.',
    unlockCost: 150000,
    levelRequirement: 7,
    researchTimeHours: 2.5,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'reduce-insurance-02' })],
    effect: { type: 'improvement', value: 0.01, target: 'rental-room-income' }
  },
  {
    categoryId: 'hack-ability',
    id: 'battalion-size-500',
    name: 'Battalion Size +500',
    description: 'Increase maximum troops per battalion from 500 to 1,000.',
    unlockCost: 250000,
    levelRequirement: 10,
    researchTimeHours: 3.5,
    requiredFeatureRefs: [m({ categoryId: 'hack-ability', featureId: 'battalion-size-250' })],
    effect: { type: 'improvement', value: 500, target: 'battalion-size' }
  },
  {
    categoryId: 'hack-ability',
    id: 'add-battalion-d',
    name: 'Add Battalion D',
    description: 'Unlock a fourth battalion (Battalion D) to deploy in attacking battles.',
    unlockCost: 300000,
    levelRequirement: 15,
    researchTimeHours: 4,
    requiredFeatureRefs: [
      m({ categoryId: 'hack-ability', featureId: 'battalion-size-250' }),
      m({ categoryId: 'hack-ability', featureId: 'add-battalion-c' })
    ],
    effect: { type: 'improvement', value: 1, target: 'battalion-capacity' }
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-025',
    name: 'Increase Income +$0.025',
    description: 'Increase your base income rate by an additional $0.025 per second.',
    unlockCost: 300000,
    levelRequirement: 15,
    researchTimeHours: 5,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'increase-income-02' })],
    effect: { type: 'improvement', value: 0.025, target: 'base-income-rate' }
  },
  {
    categoryId: 'cash-flow',
    id: 'reduce-expenses',
    name: 'Reduce Expenses',
    description: 'Lower your daily operational costs.',
    unlockCost: 300000,
    levelRequirement: 15,
    researchTimeHours: 5,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'reduce-insurance-02' })],
    effect: { type: 'reduction', value: 0.02, target: 'operational-costs' }
  },
  {
    categoryId: 'hack-ability',
    id: 'battalion-size-1000',
    name: 'Battalion Size +1,000',
    description: 'Increase maximum troops per battalion from 1,000 to 2,000.',
    unlockCost: 500000,
    levelRequirement: 20,
    researchTimeHours: 6,
    requiredFeatureRefs: [m({ categoryId: 'hack-ability', featureId: 'battalion-size-500' })],
    effect: { type: 'improvement', value: 1000, target: 'battalion-size' }
  },
  {
    categoryId: 'investments',
    id: 'rental-profit-015',
    name: 'Rental Profit +$0.015/Room',
    description: 'Increase rental income by an additional $0.015 per room per second.',
    unlockCost: 500000,
    levelRequirement: 20,
    researchTimeHours: 6,
    requiredFeatureRefs: [m({ categoryId: 'investments', featureId: 'rental-profit-01' })],
    effect: { type: 'improvement', value: 0.015, target: 'rental-room-income' }
  },
  {
    categoryId: 'hack-ability',
    id: 'add-battalion-e',
    name: 'Add Battalion E',
    description: 'Unlock a fifth battalion (Battalion E) to deploy in attacking battles.',
    unlockCost: 1000000,
    levelRequirement: 25,
    researchTimeHours: 8,
    requiredFeatureRefs: [m({ categoryId: 'hack-ability', featureId: 'add-battalion-d' })],
    effect: { type: 'improvement', value: 1, target: 'battalion-capacity' }
  },
  {
    categoryId: 'cash-flow',
    id: 'increase-income-03',
    name: 'Increase Income +$0.03',
    description: 'Increase your base income rate by an additional $0.03 per second.',
    unlockCost: 1000000,
    levelRequirement: 25,
    researchTimeHours: 8,
    requiredFeatureRefs: [m({ categoryId: 'cash-flow', featureId: 'increase-income-025' })],
    effect: { type: 'improvement', value: 0.03, target: 'base-income-rate' }
  }
];

function toResearchFeature(input: SpecFeatureInput): IResearchFeature {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    unlockCost: input.unlockCost,
    levelRequirement: input.levelRequirement,
    isUnlocked: false,
    researchTimeHours: input.researchTimeHours,
    requiredFeatureRefs: input.requiredFeatureRefs ?? [],
    effect: input.effect
  };
}

/** Build feature arrays for the five spec categories from RESEARCH_SPEC_18. */
export function getSpecFeaturesByCategory(): Record<string, IResearchFeature[]> {
  const byCategory: Record<string, IResearchFeature[]> = {};
  for (const spec of RESEARCH_SPEC_18) {
    if (!byCategory[spec.categoryId]) byCategory[spec.categoryId] = [];
    byCategory[spec.categoryId].push(toResearchFeature(spec));
  }
  return byCategory;
}
