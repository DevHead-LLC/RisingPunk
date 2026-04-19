import { UserTaskProgress } from '../models/UserTaskProgress';
import { NPCService } from './NPCService';

/**
 * When the user starts combat vs an NPC (sync battle start or async hack march launch), record
 * `attackedLevel*NpcAt` on {@link UserTaskProgress} so guided-task auto-complete conditions match
 * map display levels (see `map.ts` DISPLAY_LEVEL_MAPPING: DB 20 → display 5, DB 25 → display 6).
 * Failures are logged only — must not block battle/march flows.
 */
export async function recordNpcAttackProgressForGuidedTasks(
  userId: string,
  defenderNpcSlug: string | undefined
): Promise<void> {
  if (defenderNpcSlug === undefined || defenderNpcSlug === null) {
    return;
  }
  const slug = String(defenderNpcSlug).trim();
  if (slug === '') {
    return;
  }

  try {
    const npc = await NPCService.getNPCBySlug(slug);
    if (!npc) {
      return;
    }

    const uka = npc.userLevelAssociation;
    const existingProgress = await UserTaskProgress.findOne({ userId });

    if (uka === 1 && !existingProgress?.attackedLevel1NpcAt) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { attackedLevel1NpcAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true,
          },
        },
        { upsert: true, new: true }
      );
      return;
    }
    if (uka === 20 && !existingProgress?.attackedLevel5NpcAt) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { attackedLevel5NpcAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true,
          },
        },
        { upsert: true, new: true }
      );
      return;
    }
    if (uka === 25 && !existingProgress?.attackedLevel6NpcAt) {
      await UserTaskProgress.findOneAndUpdate(
        { userId },
        {
          $set: { attackedLevel6NpcAt: new Date() },
          $setOnInsert: {
            completedTasks: [],
            collectedTasks: [],
            skippedTasks: [],
            showTaskGuide: true,
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (e) {
    console.error('[GuidedTaskNpcAttackService] recordNpcAttackProgressForGuidedTasks failed:', e);
  }
}
