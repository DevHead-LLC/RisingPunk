import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { User } from '../models/User';
import { getRMax, getPerHelperReduction } from '../config/crewBackupConfig';

export type CrewBackupJobType = 'researchCenterBuild' | 'rentalBuild' | 'remodel';

export interface ActiveJobInfo {
  jobType: CrewBackupJobType;
  /** For rentalBuild, property key e.g. 'property1'. */
  jobKey?: string;
  startedAt: Date;
  completesAt: Date;
  totalSeconds: number;
}

/**
 * Returns the user's current active job (research center build, rental build, or room remodel) if any.
 * Only one of these can be in progress at a time per product rules.
 */
export function getActiveJobInfo(user: IUser): ActiveJobInfo | null {
  const now = new Date();

  // Research center build
  const rc = user.researchCenterBuild;
  if (rc?.startedAt && rc?.completesAt && now < new Date(rc.completesAt)) {
    const startedAt = new Date(rc.startedAt);
    const completesAt = new Date(rc.completesAt);
    const totalSeconds = Math.round((completesAt.getTime() - startedAt.getTime()) / 1000);
    return { jobType: 'researchCenterBuild', startedAt, completesAt, totalSeconds };
  }

  // Rental housing build (any property)
  const builds = (user.rentalHousingBuilds || {}) as Record<string, { startedAt: Date | null; completesAt: Date | null } | undefined>;
  for (const key of ['property1', 'property2', 'property3', 'property4'] as const) {
    const b = builds[key];
    if (b?.startedAt && b?.completesAt && now < new Date(b.completesAt)) {
      const startedAt = new Date(b.startedAt);
      const completesAt = new Date(b.completesAt);
      const totalSeconds = Math.round((completesAt.getTime() - startedAt.getTime()) / 1000);
      return { jobType: 'rentalBuild', jobKey: key, startedAt, completesAt, totalSeconds };
    }
  }

  // Room remodel
  const ar = user.activeRemodel;
  if (ar?.startedAt && ar?.completesAt && now < new Date(ar.completesAt)) {
    const startedAt = new Date(ar.startedAt);
    const completesAt = new Date(ar.completesAt);
    const totalSeconds = Math.round((completesAt.getTime() - startedAt.getTime()) / 1000);
    return { jobType: 'remodel', startedAt, completesAt, totalSeconds };
  }

  return null;
}

const ROOM_LABELS: Record<string, string> = {
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  livingRoom: 'Living Room',
  garage: 'Garage',
};

/**
 * Human-readable label for the active job (e.g. "Research Center build", "Investment property 2 upgrade", "Bathroom remodel").
 */
export function getJobLabel(user: IUser, job: ActiveJobInfo): string {
  if (job.jobType === 'researchCenterBuild') {
    const level = user.researchCenterLevel ?? 0;
    return level < 1 ? 'Research Center build' : 'Research Center upgrade';
  }
  if (job.jobType === 'rentalBuild' && job.jobKey) {
    const propNum = job.jobKey.replace('property', '');
    const levels = user.rentalHousingLevels as Record<string, number> | undefined;
    const currentLevel = levels?.[job.jobKey] ?? 0;
    return currentLevel < 1
      ? `Investment property ${propNum} build`
      : `Investment property ${propNum} upgrade`;
  }
  if (job.jobType === 'remodel' && user.activeRemodel?.room) {
    const room = user.activeRemodel.room;
    const roomLabel = ROOM_LABELS[room] ?? room;
    return `${roomLabel} remodel`;
  }
  return 'build or remodel';
}

/**
 * Apply crew backup help: reduce target user's active job completion time.
 * Validates same crew, one help per member per request, and formula caps.
 * Returns the seconds reduced and updates the user document (completesAt, crewBackupHelpApplied).
 */
export async function applyCrewBackupHelp(
  targetUser: IUser,
  helperUserId: mongoose.Types.ObjectId
): Promise<{ reduction: number; newCompletesAt: Date }> {
  const job = getActiveJobInfo(targetUser);
  if (!job) throw new Error('No active build or remodel to back up');

  if (!targetUser.crewBackupRequestedAt) throw new Error('User has not requested backup');

  const helpApplied = targetUser.crewBackupHelpApplied || { totalSeconds: 0, helperUserIds: [] };
  const helperIds = helpApplied.helperUserIds || [];
  if (helperIds.some((id: mongoose.Types.ObjectId) => id.toString() === helperUserId.toString())) {
    throw new Error('You have already backed up this crew member for this job');
  }

  const now = new Date();
  const currentCompletesAt = new Date(job.completesAt);
  const remainingMs = Math.max(0, currentCompletesAt.getTime() - now.getTime());
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  if (remainingSeconds <= 0) throw new Error('Build or remodel is already complete');

  const R_max = getRMax(job.totalSeconds);
  const d = getPerHelperReduction(job.totalSeconds);
  const alreadyUsed = helpApplied.totalSeconds || 0;
  const allowance = R_max - alreadyUsed;
  const reduction = Math.min(d, allowance, remainingSeconds);
  if (reduction <= 0) throw new Error('Maximum crew backup for this job has been reached');

  const newCompletesAt = new Date(currentCompletesAt.getTime() - reduction * 1000);

  // Update user: set new completesAt on the active job and add this helper
  const updatePayload: any = {
    crewBackupHelpApplied: {
      totalSeconds: alreadyUsed + reduction,
      helperUserIds: [...helperIds, helperUserId]
    }
  };

  if (job.jobType === 'researchCenterBuild') {
    updatePayload['researchCenterBuild.completesAt'] = newCompletesAt;
  } else if (job.jobType === 'rentalBuild' && job.jobKey) {
    updatePayload[`rentalHousingBuilds.${job.jobKey}.completesAt`] = newCompletesAt;
  } else if (job.jobType === 'remodel') {
    updatePayload['activeRemodel.completesAt'] = newCompletesAt;
  }

  await User.findByIdAndUpdate(targetUser._id, { $set: updatePayload });
  await User.findByIdAndUpdate(helperUserId, { $inc: { crewBackupHelpCount: 1 } });

  return { reduction, newCompletesAt };
}

/**
 * Clear crew backup state when the user's job completes (so a new request can be made for the next job).
 */
export function clearCrewBackupState(user: IUser): void {
  (user as any).crewBackupRequestedAt = null;
  (user as any).crewBackupHelpApplied = null;
}
