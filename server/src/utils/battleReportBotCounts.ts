/**
 * Battle report DM payloads: per-side bot totals split Mark I vs Mark II (matches `IBattalion.mark` / inventory keys).
 */
import { NodeOwner, type IBattalion } from '../types/battle';

export type BattleReportBotCounts = {
  guardian: number;
  breacher: number;
  phreak: number;
  guardianM2: number;
  breacherM2: number;
  phreakM2: number;
};

export function emptyBattleReportBotCounts(): BattleReportBotCounts {
  return {
    guardian: 0,
    breacher: 0,
    phreak: 0,
    guardianM2: 0,
    breacherM2: 0,
    phreakM2: 0,
  };
}

function isMark2(b: IBattalion): boolean {
  return (b.mark ?? 1) >= 2;
}

/**
 * Sum battalion quantities for one node owner, splitting Mark I vs Mark II per family.
 */
export function sumBattalionBotsByOwnerForReport(
  battalions: IBattalion[],
  owner: NodeOwner
): BattleReportBotCounts {
  const out = emptyBattleReportBotCounts();
  for (const b of battalions) {
    if (b.owner !== owner) continue;
    const t = b.type;
    if (t !== 'guardian' && t !== 'breacher' && t !== 'phreak') continue;
    const qty = b.quantity ?? 0;
    const m2 = isMark2(b);
    if (t === 'guardian') {
      if (m2) out.guardianM2 += qty;
      else out.guardian += qty;
    } else if (t === 'breacher') {
      if (m2) out.breacherM2 += qty;
      else out.breacher += qty;
    } else {
      if (m2) out.phreakM2 += qty;
      else out.phreak += qty;
    }
  }
  return out;
}

export function battleReportBotsLost(a: BattleReportBotCounts, b: BattleReportBotCounts): BattleReportBotCounts {
  return {
    guardian: Math.max(0, a.guardian - b.guardian),
    breacher: Math.max(0, a.breacher - b.breacher),
    phreak: Math.max(0, a.phreak - b.phreak),
    guardianM2: Math.max(0, a.guardianM2 - b.guardianM2),
    breacherM2: Math.max(0, a.breacherM2 - b.breacherM2),
    phreakM2: Math.max(0, a.phreakM2 - b.phreakM2),
  };
}
