/**
 * Hack Crew — Crew Bonus army stat chain (ATK / DEF / HP). Single source for:
 * - Stacking deltas when user is in a crew and feature is unlocked (`researchFeatureUtils`)
 * - Seed rows (`seedResearchFeatureDefinitionsFromImage.ts` imports display fields)
 *
 * DEF values are additive fractions on the defense stat (e.g. +0.05% display → +0.0005).
 */

export type CrewArmyBonusDeltaRow = {
  featureId: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  researchTimeHours: number;
  researchCenterLevelRequirement: number;
  /** Previous feature in chain (crew-system-unlock for first row). */
  prerequisiteFeatureId: string;
  atk: number;
  /** Additive defense fraction (percentage points / 100). */
  def: number;
  hp: number;
};

const CAT = 'hack-crew' as const;

export const CREW_ARMY_BONUS_CHAIN: CrewArmyBonusDeltaRow[] = [
  {
    featureId: 'crew-army-atk-005-i',
    name: 'Crew Bonus: Army ATK +0.05 I',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 150_000,
    levelRequirement: 7,
    researchTimeHours: 2.5,
    researchCenterLevelRequirement: 1,
    prerequisiteFeatureId: 'crew-system-unlock',
    atk: 0.05,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-005p-i',
    name: 'Crew Bonus: Army DEF +0.05% I',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 300_000,
    levelRequirement: 11,
    researchTimeHours: 5.5,
    researchCenterLevelRequirement: 2,
    prerequisiteFeatureId: 'crew-army-atk-005-i',
    atk: 0,
    def: 0.0005,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-025-i',
    name: 'Crew Bonus: Army Health +0.25 I',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 1_000_000,
    levelRequirement: 16,
    researchTimeHours: 10.5,
    researchCenterLevelRequirement: 3,
    prerequisiteFeatureId: 'crew-army-def-005p-i',
    atk: 0,
    def: 0,
    hp: 0.25,
  },
  {
    featureId: 'crew-army-atk-005-ii',
    name: 'Crew Bonus: Army ATK +0.05 II',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 2_250_000,
    levelRequirement: 21,
    researchTimeHours: 14.5,
    researchCenterLevelRequirement: 5,
    prerequisiteFeatureId: 'crew-army-hp-025-i',
    atk: 0.05,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-005p-ii',
    name: 'Crew Bonus: Army DEF +0.05% II',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 2_250_000,
    levelRequirement: 21,
    researchTimeHours: 14.5,
    researchCenterLevelRequirement: 5,
    prerequisiteFeatureId: 'crew-army-atk-005-ii',
    atk: 0,
    def: 0.0005,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-025-ii',
    name: 'Crew Bonus: Army Health +0.25 II',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 2_250_000,
    levelRequirement: 21,
    researchTimeHours: 14.5,
    researchCenterLevelRequirement: 5,
    prerequisiteFeatureId: 'crew-army-def-005p-ii',
    atk: 0,
    def: 0,
    hp: 0.25,
  },
  {
    featureId: 'crew-army-atk-005-iii',
    name: 'Crew Bonus: Army ATK +0.05 III',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 8_000_000,
    levelRequirement: 32,
    researchTimeHours: 20.5,
    researchCenterLevelRequirement: 9,
    prerequisiteFeatureId: 'crew-army-hp-025-ii',
    atk: 0.05,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-005p-iii',
    name: 'Crew Bonus: Army DEF +0.05% III',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 8_000_000,
    levelRequirement: 32,
    researchTimeHours: 20.5,
    researchCenterLevelRequirement: 9,
    prerequisiteFeatureId: 'crew-army-atk-005-iii',
    atk: 0,
    def: 0.0005,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-025-iii',
    name: 'Crew Bonus: Army Health +0.25 III',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 8_000_000,
    levelRequirement: 32,
    researchTimeHours: 20.5,
    researchCenterLevelRequirement: 9,
    prerequisiteFeatureId: 'crew-army-def-005p-iii',
    atk: 0,
    def: 0,
    hp: 0.25,
  },
  {
    featureId: 'crew-army-atk-01-i',
    name: 'Crew Bonus: Army ATK +0.1 I',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 13_000_000,
    levelRequirement: 43,
    researchTimeHours: 26.5,
    researchCenterLevelRequirement: 11,
    prerequisiteFeatureId: 'crew-army-hp-025-iii',
    atk: 0.1,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-01p-i',
    name: 'Crew Bonus: Army DEF +0.1% I',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 13_000_000,
    levelRequirement: 43,
    researchTimeHours: 26.5,
    researchCenterLevelRequirement: 11,
    prerequisiteFeatureId: 'crew-army-atk-01-i',
    atk: 0,
    def: 0.001,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-05-i',
    name: 'Crew Bonus: Army Health +0.5 I',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 13_000_000,
    levelRequirement: 43,
    researchTimeHours: 26.5,
    researchCenterLevelRequirement: 11,
    prerequisiteFeatureId: 'crew-army-def-01p-i',
    atk: 0,
    def: 0,
    hp: 0.5,
  },
  {
    featureId: 'crew-army-atk-01-ii',
    name: 'Crew Bonus: Army ATK +0.1 II',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 20_000_000,
    levelRequirement: 57,
    researchTimeHours: 33.5,
    researchCenterLevelRequirement: 13,
    prerequisiteFeatureId: 'crew-army-hp-05-i',
    atk: 0.1,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-01p-ii',
    name: 'Crew Bonus: Army DEF +0.1% II',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 20_500_000,
    levelRequirement: 58,
    researchTimeHours: 34,
    researchCenterLevelRequirement: 13,
    prerequisiteFeatureId: 'crew-army-atk-01-ii',
    atk: 0,
    def: 0.001,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-05-ii',
    name: 'Crew Bonus: Army Health +0.5 II',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 21_000_000,
    levelRequirement: 59,
    researchTimeHours: 34.5,
    researchCenterLevelRequirement: 13,
    prerequisiteFeatureId: 'crew-army-def-01p-ii',
    atk: 0,
    def: 0,
    hp: 0.5,
  },
  {
    featureId: 'crew-army-atk-01-iii',
    name: 'Crew Bonus: Army ATK +0.1 III',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 28_500_000,
    levelRequirement: 74,
    researchTimeHours: 42,
    researchCenterLevelRequirement: 15,
    prerequisiteFeatureId: 'crew-army-hp-05-ii',
    atk: 0.1,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-01p-iii',
    name: 'Crew Bonus: Army DEF +0.1% III',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 29_000_000,
    levelRequirement: 75,
    researchTimeHours: 42.5,
    researchCenterLevelRequirement: 15,
    prerequisiteFeatureId: 'crew-army-atk-01-iii',
    atk: 0,
    def: 0.001,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-05-iii',
    name: 'Crew Bonus: Army Health +0.5 III',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 29_500_000,
    levelRequirement: 76,
    researchTimeHours: 43,
    researchCenterLevelRequirement: 15,
    prerequisiteFeatureId: 'crew-army-def-01p-iii',
    atk: 0,
    def: 0,
    hp: 0.5,
  },
  {
    featureId: 'crew-army-atk-015-i',
    name: 'Crew Bonus: Army ATK +0.15 I',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 36_500_000,
    levelRequirement: 90,
    researchTimeHours: 50,
    researchCenterLevelRequirement: 17,
    prerequisiteFeatureId: 'crew-army-hp-05-iii',
    atk: 0.15,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-015p-i',
    name: 'Crew Bonus: Army DEF +0.15% I',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 37_000_000,
    levelRequirement: 91,
    researchTimeHours: 50.5,
    researchCenterLevelRequirement: 17,
    prerequisiteFeatureId: 'crew-army-atk-015-i',
    atk: 0,
    def: 0.0015,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-10-i',
    name: 'Crew Bonus: Army Health +1.0 I',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 37_500_000,
    levelRequirement: 92,
    researchTimeHours: 51,
    researchCenterLevelRequirement: 17,
    prerequisiteFeatureId: 'crew-army-def-015p-i',
    atk: 0,
    def: 0,
    hp: 1.0,
  },
  {
    featureId: 'crew-army-atk-015-ii',
    name: 'Crew Bonus: Army ATK +0.15 II',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 44_500_000,
    levelRequirement: 99,
    researchTimeHours: 58,
    researchCenterLevelRequirement: 19,
    prerequisiteFeatureId: 'crew-army-hp-10-i',
    atk: 0.15,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-015p-ii',
    name: 'Crew Bonus: Army DEF +0.15% II',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 45_000_000,
    levelRequirement: 99,
    researchTimeHours: 58.5,
    researchCenterLevelRequirement: 19,
    prerequisiteFeatureId: 'crew-army-atk-015-ii',
    atk: 0,
    def: 0.0015,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-10-ii',
    name: 'Crew Bonus: Army Health +1.0 II',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 45_500_000,
    levelRequirement: 99,
    researchTimeHours: 59,
    researchCenterLevelRequirement: 19,
    prerequisiteFeatureId: 'crew-army-def-015p-ii',
    atk: 0,
    def: 0,
    hp: 1.0,
  },
  {
    featureId: 'crew-army-atk-015-iii',
    name: 'Crew Bonus: Army ATK +0.15 III',
    description: 'While you are in a crew, increase army attack for all bot types.',
    unlockCost: 52_500_000,
    levelRequirement: 99,
    researchTimeHours: 66,
    researchCenterLevelRequirement: 20,
    prerequisiteFeatureId: 'crew-army-hp-10-ii',
    atk: 0.15,
    def: 0,
    hp: 0,
  },
  {
    featureId: 'crew-army-def-015p-iii',
    name: 'Crew Bonus: Army DEF +0.15% III',
    description: 'While you are in a crew, increase army defense for all bot types.',
    unlockCost: 53_000_000,
    levelRequirement: 99,
    researchTimeHours: 66.5,
    researchCenterLevelRequirement: 20,
    prerequisiteFeatureId: 'crew-army-atk-015-iii',
    atk: 0,
    def: 0.0015,
    hp: 0,
  },
  {
    featureId: 'crew-army-hp-10-iii',
    name: 'Crew Bonus: Army Health +1.0 III',
    description: 'While you are in a crew, increase army health for all bot types.',
    unlockCost: 53_500_000,
    levelRequirement: 99,
    researchTimeHours: 67,
    researchCenterLevelRequirement: 20,
    prerequisiteFeatureId: 'crew-army-def-015p-iii',
    atk: 0,
    def: 0,
    hp: 1.0,
  },
];

export const CREW_ARMY_BONUS_FEATURE_IDS: string[] = CREW_ARMY_BONUS_CHAIN.map((r) => r.featureId);

if (CREW_ARMY_BONUS_CHAIN.length !== 27) {
  throw new Error(`CREW_ARMY_BONUS_CHAIN: expected 27 rows, got ${CREW_ARMY_BONUS_CHAIN.length}`);
}

function effectForRow(row: CrewArmyBonusDeltaRow): { type: 'improvement'; value: number; target: string } {
  if (row.atk > 0) return { type: 'improvement', value: row.atk, target: 'crew-army-atk' };
  if (row.def > 0) return { type: 'improvement', value: row.def, target: 'crew-army-def' };
  return { type: 'improvement', value: row.hp, target: 'crew-army-hp' };
}

/** Rows ready for `research_feature_definitions` seed upsert. */
export function getCrewArmyBonusSeedRows(): Array<{
  categoryId: string;
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  researchTimeHours: number;
  requiredFeatureRefs: { categoryId: string; featureId: string }[];
  researchCenterLevelRequirement: number;
  effect: { type: 'improvement'; value: number; target: string };
}> {
  return CREW_ARMY_BONUS_CHAIN.map((row) => ({
    categoryId: CAT,
    id: row.featureId,
    name: row.name,
    description: row.description,
    unlockCost: row.unlockCost,
    levelRequirement: row.levelRequirement,
    researchTimeHours: row.researchTimeHours,
    requiredFeatureRefs: [{ categoryId: CAT, featureId: row.prerequisiteFeatureId }],
    researchCenterLevelRequirement: row.researchCenterLevelRequirement,
    effect: effectForRow(row),
  }));
}
