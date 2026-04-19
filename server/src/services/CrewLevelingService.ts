import type { ClientSession } from 'mongoose';
import { Crew } from '../models/Crew';
import { CrewStatus } from '../models/CrewStatus';
import { LevelingService } from './LevelingService';

/** Crews can progress past user max level; hard cap at 999. */
export const CREW_MAX_LEVEL = 999;

/** From level 99 onward, each step costs (hypothetical user 99→100 XP) + this delta. */
const CREW_POST_99_STEP_EXTRA = 500_000;

function getRequiredExpToNextForCrew(level: number): number {
  if (level >= CREW_MAX_LEVEL) {
    return 0;
  }
  if (level >= 99) {
    return LevelingService.getRequiredExpToNextUnchecked(99) + CREW_POST_99_STEP_EXTRA;
  }
  return LevelingService.getRequiredExpToNext(level);
}

export class CrewLevelingService {
  /**
   * When a user gains XP, their crew (if any) gains the same amount for this grant only.
   * Not retroactive: only XP applied while `CrewStatus.isInCrew` is true at grant time is mirrored
   * (no backfill of historical user XP into the crew).
   */
  static async applyExperienceFromUserGain(
    userId: string,
    amount: number,
    options?: { session?: ClientSession }
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error('Crew XP amount must be positive');
    }

    const session = options?.session;
    const statusQuery = CrewStatus.findOne({ userId, isInCrew: true, crewId: { $ne: null } });
    if (session) {
      statusQuery.session(session);
    }
    const status = await statusQuery;
    if (!status?.crewId) {
      return;
    }

    await this.applyExperienceToCrew(String(status.crewId), amount, { session });
  }

  static async applyExperienceToCrew(
    crewId: string,
    amount: number,
    options?: { session?: ClientSession }
  ): Promise<void> {
    if (amount <= 0) {
      throw new Error('Crew XP amount must be positive');
    }

    const session = options?.session;
    const crewQuery = Crew.findById(crewId);
    if (session) {
      crewQuery.session(session);
    }
    const crew = await crewQuery;
    if (!crew) {
      // Bugbot: do not throw — runs inside LevelingService transaction; throwing would roll back user XP if CrewStatus.crewId is stale.
      console.warn(
        '[CrewLevelingService] Crew not found for XP mirror; skipping crew grant (stale CrewStatus.crewId?). crewId=%s',
        crewId
      );
      return;
    }

    let currentLevel = crew.level ?? 1;
    let currentExp = crew.experience?.current ?? 0;
    let totalExp = crew.experience?.total ?? 0;
    let remainingExp = amount;

    while (remainingExp > 0 && currentLevel < CREW_MAX_LEVEL) {
      const requiredForNext = getRequiredExpToNextForCrew(currentLevel);
      const expNeeded = requiredForNext - currentExp;

      if (remainingExp >= expNeeded) {
        remainingExp -= expNeeded;
        currentExp = 0;
        currentLevel++;
        totalExp += expNeeded;
      } else {
        currentExp += remainingExp;
        totalExp += remainingExp;
        remainingExp = 0;
      }
    }

    const nextLevelExp =
      currentLevel >= CREW_MAX_LEVEL ? 0 : getRequiredExpToNextForCrew(currentLevel);

    const updates: Record<string, unknown> = {
      level: currentLevel,
      'experience.current': currentExp,
      'experience.nextLevel': nextLevelExp,
      'experience.total': totalExp,
    };

    await Crew.findByIdAndUpdate(crewId, updates, session ? { session } : {});
  }
}
