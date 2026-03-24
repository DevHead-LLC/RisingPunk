import { BotType } from '../types/bots';
import { formatNumber } from './formatUtils';

/** Brute → Sprint → Remote (matches stats: offense-heavy, speed-heavy, range-heavy). */
export const BOT_FAMILY_ORDER: BotType[] = ['breacher', 'guardian', 'phreak'];

/** Abstract RPS labels (Battle Prep, Barracks copy). */
export const RPS_TYPE_LABELS: Record<BotType, string> = {
  breacher: 'Brute',
  guardian: 'Sprint',
  phreak: 'Remote',
};

/** Mark I unit display names (internal family names). */
export const M1_UNIT_DISPLAY_NAMES: Record<BotType, string> = {
  breacher: 'Breacher',
  guardian: 'Guardian',
  phreak: 'Phreak',
};

/** Server `GET /api/bots` bots object: Mark I keys + breacherM2 / guardianM2 / phreakM2. */
export function splitBotsFromApi(raw: Record<string, number>): {
  m1: Record<BotType, number>;
  m2: Record<BotType, number>;
} {
  return {
    m1: {
      breacher: raw.breacher ?? 0,
      guardian: raw.guardian ?? 0,
      phreak: raw.phreak ?? 0,
    },
    m2: {
      breacher: raw.breacherM2 ?? 0,
      guardian: raw.guardianM2 ?? 0,
      phreak: raw.phreakM2 ?? 0,
    },
  };
}

/** Player-facing Mark II unit names (family: Breacher/Guardian/Phreak → Brute/Sprint/Remote types). */
export const MARK2_DISPLAY_NAMES: Record<BotType, string> = {
  breacher: 'Exploit',
  guardian: 'Worm',
  phreak: 'Sniffer',
};

/** 2-letter labels on battle grid chips: Mark I = RPS (Brute / Sprint / Remote). */
export const RPS_BATTLE_ABBREV_M1: Record<BotType, string> = {
  breacher: 'Br',
  guardian: 'Sp',
  phreak: 'Re',
};

/** 2-letter labels for Mark II (Exploit / Worm / Sniffer) on battle grid. */
export const MARK2_BATTLE_ABBREV: Record<BotType, string> = {
  breacher: 'Ex',
  guardian: 'Wo',
  phreak: 'Sn',
};

export function effectiveMarkFromBattalionMark(mark: number): 1 | 2 {
  return mark >= 2 ? 2 : 1;
}

export function battleGridAbbrevFor(botType: BotType, mark: number): string {
  return effectiveMarkFromBattalionMark(mark) === 2
    ? MARK2_BATTLE_ABBREV[botType]
    : RPS_BATTLE_ABBREV_M1[botType];
}

/** Post-battle loss row: Mark I unit names (Breacher / Guardian / Phreak) or Mark II display names + Mk I / Mk II. */
export function battleLossTitleFor(botType: BotType, mark: number): string {
  if (effectiveMarkFromBattalionMark(mark) === 2) {
    return `${MARK2_DISPLAY_NAMES[botType]} Mk II`;
  }
  return `${M1_UNIT_DISPLAY_NAMES[botType]} Mk I`;
}

/** Highest mark implemented for battalion assign modal (extend when M3/M4 exist). */
export const BATTALION_MODAL_MAX_MARK_LEVEL = 2 as const;

/** One line for picker option: unit name + Mark I/II (add Mark III/IV when implemented). */
export function battalionModalOptionLine(family: BotType, markLevel: 1 | 2): string {
  const unit = markLevel === 2 ? MARK2_DISPLAY_NAMES[family] : M1_UNIT_DISPLAY_NAMES[family];
  const roman = markLevel === 2 ? 'II' : 'I';
  return `${unit} · Mark ${roman}`;
}

/** Closed dropdown summary: option line + available count. */
export function battalionModalDropdownSummary(
  family: BotType,
  markLevel: 1 | 2,
  available: number
): string {
  return `${battalionModalOptionLine(family, markLevel)} · ${formatNumber(available)}`;
}

/** Battle Prep battalion slot: unit name + MK (Mark II uses Exploit/Worm/Sniffer, not family key). */
export function formatBattalionAssignmentLine(botType: string, markLevel: number): string {
  if (botType !== 'breacher' && botType !== 'guardian' && botType !== 'phreak') {
    const mk = markLevel >= 2 ? 'II' : 'I';
    return `${String(botType).toUpperCase()} MK ${mk}`;
  }
  const bt = botType as BotType;
  const ml = markLevel >= 2 ? 2 : 1;
  const unit = ml === 2 ? MARK2_DISPLAY_NAMES[bt] : M1_UNIT_DISPLAY_NAMES[bt];
  const mk = ml === 2 ? 'II' : 'I';
  return `${unit.toUpperCase()} MK ${mk}`;
}

export function costPerBotForMark(markLevel: 1 | 2): number {
  return markLevel === 2 ? 4 : 1;
}

export function msPerBotForMark(markLevel: 1 | 2): number {
  return markLevel === 2 ? 4000 : 1000;
}

/** Inventory key on `Bot.bots` / `GET /api/bots` for a family + mark (M1 = family key, M2 = family + `M2`). */
export function inventoryKeyForFamilyAndMark(botType: BotType, markLevel: number): string {
  if (markLevel >= 2) {
    if (botType === 'breacher') return 'breacherM2';
    if (botType === 'guardian') return 'guardianM2';
    return 'phreakM2';
  }
  return botType;
}
