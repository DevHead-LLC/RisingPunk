import mongoose from 'mongoose';
import { IUser } from '../models/User';
import { User } from '../models/User';
import { UserResearchFeature } from '../models/UserResearchFeature';
import { getRMax, getPerHelperReduction } from '../config/crewBackupConfig';
import { getFeatureByIdAsync } from '../config/researchFeatures';

export type CrewBackupJobType = 'researchCenterBuild' | 'rentalBuild' | 'remodel' | 'research';

export interface ActiveJobInfo {
  jobType: CrewBackupJobType;
  /** For rentalBuild, property key e.g. 'property1'. For research, categoryId. */
  jobKey?: string;
  /** For research: featureId and display name. */
  categoryId?: string;
  featureId?: string;
  featureName?: string;
  /** Target level for builds/upgrades (rental property or research center). */
  targetLevel?: number;
  startedAt: Date;
  completesAt: Date;
  totalSeconds: number;
}

/** Options to resolve a specific job when user can have multiple (e.g. research by categoryId+featureId, rentalBuild by jobKey). */
export interface GetActiveJobOptions {
  jobKey?: string;
  categoryId?: string;
  featureId?: string;
}

export interface CrewBackupRequestEntry {
  jobType: CrewBackupJobType;
  jobKey?: string;
  categoryId?: string;
  featureId?: string;
  requestedAt: Date;
  helpApplied: { totalSeconds: number; helperUserIds: mongoose.Types.ObjectId[] };
}

/**
 * Returns the user's current active job (research center build, rental build, room remodel, or research) if any.
 * For research backup, user must have requested backup for a specific research (crewBackupResearchCategoryId/FeatureId).
 * When preferredJobType is set, only that job type is considered (so e.g. when user has both rental build and remodel,
 * we can return the one they requested backup for).
 * When options has categoryId+featureId (research) or jobKey (rentalBuild), only that specific job is considered.
 */
export async function getActiveJobInfo(
  user: IUser,
  preferredJobType?: CrewBackupJobType | null,
  options?: GetActiveJobOptions | null
): Promise<ActiveJobInfo | null> {
  const now = new Date();

  const onlyRemodel = preferredJobType === 'remodel';
  const onlyRentalBuild = preferredJobType === 'rentalBuild';
  const onlyResearchCenterBuild = preferredJobType === 'researchCenterBuild';
  const onlyResearch = preferredJobType === 'research';

  // Research: resolve by options (per-request array) or legacy user.crewBackupResearch*
  const researchCategoryId = options?.categoryId ?? (user as any).crewBackupResearchCategoryId;
  const researchFeatureId = options?.featureId ?? (user as any).crewBackupResearchFeatureId;
  const useLegacyResearch = !options && (user as any).crewBackupResearchCategoryId && (user as any).crewBackupResearchFeatureId && user.crewBackupRequestedAt;
  if ((onlyResearch || !preferredJobType) && researchCategoryId && researchFeatureId && (useLegacyResearch || options)) {
    const { ResearchFeatureService } = await import('./ResearchFeatureService');
    const researchDoc = await UserResearchFeature.findOne({
      userId: user._id,
      ...ResearchFeatureService.getFeatureIdFindFilter(researchCategoryId, researchFeatureId),
    }).lean();
    if (
      researchDoc?.isResearching &&
      researchDoc.researchCompletesAt &&
      now < new Date(researchDoc.researchCompletesAt)
    ) {
      const startedAt = researchDoc.researchStartedAt ? new Date(researchDoc.researchStartedAt) : now;
      const completesAt = new Date(researchDoc.researchCompletesAt);
      const computedTotal = Math.round((completesAt.getTime() - startedAt.getTime()) / 1000);
      const totalSeconds = (researchDoc.originalResearchTotalSeconds != null && researchDoc.originalResearchTotalSeconds > 0)
        ? researchDoc.originalResearchTotalSeconds
        : computedTotal;
      const feature = await getFeatureByIdAsync(researchCategoryId, researchFeatureId);
      const featureName = feature?.name ?? researchFeatureId;
      return {
        jobType: 'research',
        jobKey: researchCategoryId,
        categoryId: researchCategoryId,
        featureId: researchFeatureId,
        featureName,
        startedAt,
        completesAt,
        totalSeconds,
      };
    }
  }
  if (onlyResearch) return null;

  // Research center build
  if (onlyResearchCenterBuild || !preferredJobType) {
    const rc = user.researchCenterBuild;
    if (rc?.startedAt && rc?.completesAt && now < new Date(rc.completesAt)) {
      const startedAt = new Date(rc.startedAt);
      const completesAt = new Date(rc.completesAt);
      const computedTotal = Math.round((completesAt.getTime() - startedAt.getTime()) / 1000);
      const totalSeconds = (rc.originalTotalSeconds != null && rc.originalTotalSeconds > 0)
        ? rc.originalTotalSeconds
        : computedTotal;
      const rcTargetLevel = (rc as any).targetLevel ?? undefined;
      return { jobType: 'researchCenterBuild', startedAt, completesAt, totalSeconds, ...(rcTargetLevel != null && { targetLevel: rcTargetLevel }) };
    }
  }
  if (onlyResearchCenterBuild) return null;

  // Rental housing build (any property); options.jobKey restricts to one property
  if (onlyRentalBuild || !preferredJobType) {
    const builds = (user.rentalHousingBuilds || {}) as Record<string, { startedAt: Date | null; completesAt: Date | null; originalTotalSeconds?: number } | undefined>;
    const keys = options?.jobKey
      ? ([options.jobKey] as const)
      : (['property1', 'property2', 'property3', 'property4'] as const);
    for (const key of keys) {
      const b = builds[key];
      if (b?.startedAt && b?.completesAt && now < new Date(b.completesAt)) {
        const startedAt = new Date(b.startedAt);
        const completesAt = new Date(b.completesAt);
        const computedTotal = Math.round((completesAt.getTime() - startedAt.getTime()) / 1000);
        const totalSeconds = (b.originalTotalSeconds != null && b.originalTotalSeconds > 0)
          ? b.originalTotalSeconds
          : computedTotal;
        const bTargetLevel = (b as any).targetLevel ?? undefined;
        return { jobType: 'rentalBuild', jobKey: key, startedAt, completesAt, totalSeconds, ...(bTargetLevel != null && { targetLevel: bTargetLevel }) };
      }
    }
  }
  if (onlyRentalBuild) return null;

  // Room remodel
  if (onlyRemodel || !preferredJobType) {
    const ar = user.activeRemodel;
    if (ar?.startedAt && ar?.completesAt && now < new Date(ar.completesAt)) {
      const startedAt = new Date(ar.startedAt);
      const completesAt = new Date(ar.completesAt);
      const computedTotal = Math.round((completesAt.getTime() - startedAt.getTime()) / 1000);
      const totalSeconds = (ar.originalTotalSeconds != null && ar.originalTotalSeconds > 0)
        ? ar.originalTotalSeconds
        : computedTotal;
      return { jobType: 'remodel', startedAt, completesAt, totalSeconds };
    }
  }

  return null;
}

/** Unique id for a backup request (one per job). */
export function getRequestJobId(entry: CrewBackupRequestEntry): string {
  if (entry.jobType === 'research' && entry.categoryId && entry.featureId) return `research:${entry.categoryId}:${entry.featureId}`;
  if (entry.jobType === 'rentalBuild' && entry.jobKey) return `rentalBuild:${entry.jobKey}`;
  return entry.jobType;
}

function entryMatchesRequest(entry: CrewBackupRequestEntry, jobType: string, jobKey?: string, categoryId?: string, featureId?: string): boolean {
  if (entry.jobType !== jobType) return false;
  if (jobType === 'rentalBuild' && entry.jobKey !== jobKey) return false;
  if (jobType === 'research' && (entry.categoryId !== categoryId || entry.featureId !== featureId)) return false;
  return true;
}

export function findRequestEntry(user: IUser, jobType: string, jobKey?: string, categoryId?: string, featureId?: string): CrewBackupRequestEntry | undefined {
  const arr = (user as any).crewBackupRequests ?? [];
  return arr.find((e: CrewBackupRequestEntry) => entryMatchesRequest(e, jobType, jobKey, categoryId, featureId));
}

export function hasRequestForJob(user: IUser, jobType: string, jobKey?: string, categoryId?: string, featureId?: string): boolean {
  return findRequestEntry(user, jobType, jobKey, categoryId, featureId) != null;
}

/**
 * Remove the backup request entry for a specific job (when that job completes).
 * Call this instead of clearCrewBackupState when only one job completes.
 */
export async function removeCrewBackupRequestForJob(
  userId: mongoose.Types.ObjectId,
  jobType: CrewBackupJobType,
  jobKey?: string,
  categoryId?: string,
  featureId?: string
): Promise<void> {
  const pullMatch = {
    jobType,
    ...(jobKey != null && { jobKey }),
    ...(categoryId != null && { categoryId }),
    ...(featureId != null && { featureId }),
  };
  const result = await User.updateOne(
    { _id: userId },
    { $pull: { crewBackupRequests: pullMatch } }
  );
}

const ROOM_LABELS: Record<string, string> = {
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  livingRoom: 'Living Room',
  garage: 'Garage',
};

const RESEARCH_CATEGORY_LABELS: Record<string, string> = {
  'home-defense': 'Home Defense',
  'hack-ability': 'Hack Ability',
  'financial': 'Financial',
  'hack-crew': 'Hack Crew',
  'npc': 'NPC',
  'cash-flow': 'Cash Flow',
  'construction': 'Construction',
  'battle-mechanics': 'Battle Mechanics',
  'gear': 'Gear',
  'investments': 'Investments',
};

/**
 * Human-readable label for the active job (e.g. "Research Center build", "Antivirus (Home Defense)").
 */
export function getJobLabel(user: IUser, job: ActiveJobInfo): string {
  if (job.jobType === 'research') {
    const catName = job.categoryId ? RESEARCH_CATEGORY_LABELS[job.categoryId] ?? job.categoryId : '';
    const name = job.featureName ?? job.featureId ?? 'Research';
    return catName ? `${name} (${catName})` : name;
  }
  if (job.jobType === 'researchCenterBuild') {
    const level = user.researchCenterLevel ?? 0;
    if (level < 1) return 'Research Center build';
    const targetLabel = job.targetLevel ? ` to Lv. ${job.targetLevel}` : '';
    return `Research Center upgrade${targetLabel}`;
  }
  if (job.jobType === 'rentalBuild' && job.jobKey) {
    const propNum = job.jobKey.replace('property', '');
    const levels = user.rentalHousingLevels as Record<string, number> | undefined;
    const currentLevel = levels?.[job.jobKey] ?? 0;
    if (currentLevel < 1) return `Investment property ${propNum} build`;
    const targetLabel = job.targetLevel ? ` to Lv. ${job.targetLevel}` : '';
    return `Investment property ${propNum} upgrade${targetLabel}`;
  }
  if (job.jobType === 'remodel' && user.activeRemodel?.room) {
    const room = user.activeRemodel.room;
    const roomLabel = ROOM_LABELS[room] ?? room;
    return `${roomLabel} remodel`;
  }
  return 'build or remodel';
}

/**
 * Apply crew backup help for a specific request (by job type and optional key/category/feature).
 * Used when user has crewBackupRequests array; updates only the matching entry and that job's timer.
 */
export async function applyCrewBackupHelpByRequest(
  targetUser: IUser,
  helperUserId: mongoose.Types.ObjectId,
  requestId: { jobType: CrewBackupJobType; jobKey?: string; categoryId?: string; featureId?: string }
): Promise<{ reduction: number; newCompletesAt: Date }> {
  const entry = findRequestEntry(
    targetUser,
    requestId.jobType,
    requestId.jobKey,
    requestId.categoryId,
    requestId.featureId
  );
  if (!entry) throw new Error('User has not requested backup for this job');

  const options: GetActiveJobOptions | undefined =
    requestId.jobType === 'research' && requestId.categoryId && requestId.featureId
      ? { categoryId: requestId.categoryId, featureId: requestId.featureId }
      : requestId.jobType === 'rentalBuild' && requestId.jobKey
        ? { jobKey: requestId.jobKey }
        : undefined;
  const job = await getActiveJobInfo(targetUser, requestId.jobType, options);
  if (!job) throw new Error('No active build or remodel to back up');

  const helperIds = entry.helpApplied?.helperUserIds ?? [];
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
  const alreadyUsed = entry.helpApplied?.totalSeconds ?? 0;
  const allowance = R_max - alreadyUsed;
  const reduction = Math.min(d, allowance, remainingSeconds);
  if (reduction <= 0) throw new Error('Maximum crew backup for this job has been reached');

  const newCompletesAt = new Date(currentCompletesAt.getTime() - reduction * 1000);
  const reductionMs = reduction * 1000;

  const completesAtPath =
    job.jobType === 'researchCenterBuild'
      ? 'researchCenterBuild.completesAt'
      : job.jobType === 'rentalBuild' && job.jobKey
        ? `rentalHousingBuilds.${job.jobKey}.completesAt`
        : job.jobType === 'remodel'
          ? 'activeRemodel.completesAt'
          : null;

  const elemMatch: Record<string, unknown> = { jobType: requestId.jobType };
  if (requestId.jobKey != null) elemMatch.jobKey = requestId.jobKey;
  if (requestId.categoryId != null) elemMatch.categoryId = requestId.categoryId;
  if (requestId.featureId != null) elemMatch.featureId = requestId.featureId;

  if (job.jobType === 'research') {
    const { ResearchFeatureService } = await import('./ResearchFeatureService');
    const researchFilter = ResearchFeatureService.getFeatureIdFindFilter(
      job.categoryId as string,
      job.featureId as string
    );
    const researchDoc = await UserResearchFeature.findOne({ userId: targetUser._id, ...researchFilter });
    if (!researchDoc?.researchCompletesAt) throw new Error('No active build or remodel to back up');
    const newResearchCompletesAt = new Date(new Date(researchDoc.researchCompletesAt).getTime() - reductionMs);
    await UserResearchFeature.findByIdAndUpdate(researchDoc._id, { researchCompletesAt: newResearchCompletesAt });
  }

  const arrayFilters: Record<string, unknown>[] = [{ 'elem.jobType': requestId.jobType }];
  if (requestId.jobKey != null) arrayFilters[0]['elem.jobKey'] = requestId.jobKey;
  if (requestId.categoryId != null) arrayFilters[0]['elem.categoryId'] = requestId.categoryId;
  if (requestId.featureId != null) arrayFilters[0]['elem.featureId'] = requestId.featureId;

  const elemMatchNoHelper = { ...elemMatch, 'helpApplied.helperUserIds': { $ne: helperUserId } };
  const filter = {
    _id: targetUser._id,
    crewBackupRequests: { $elemMatch: elemMatchNoHelper },
  };
  const arrayUpdate: mongoose.mongo.UpdateFilter<IUser> = {
    $push: { 'crewBackupRequests.$[elem].helpApplied.helperUserIds': helperUserId },
    $inc: { 'crewBackupRequests.$[elem].helpApplied.totalSeconds': reduction },
  };
  const updated = await User.findOneAndUpdate(filter, arrayUpdate, { arrayFilters, new: true });
  if (!updated) throw new Error('You have already backed up this crew member for this job');

  if (completesAtPath != null) {
    await User.updateOne(
      { _id: targetUser._id },
      [{ $set: { [completesAtPath]: { $dateSubtract: { startDate: `$${completesAtPath}`, unit: 'millisecond', amount: reductionMs } } } }]
    );
  }
  await User.findByIdAndUpdate(helperUserId, { $inc: { crewBackupHelpCount: 1 } });
  return { reduction, newCompletesAt };
}

/**
 * Apply crew backup help: reduce target user's active job completion time.
 * Validates same crew, one help per member per request, and formula caps.
 * Returns the seconds reduced and updates the user document (and UserResearchFeature for research jobs).
 * When targetUser has crewBackupRequests array, use applyCrewBackupHelpByRequest instead.
 */
export async function applyCrewBackupHelp(
  targetUser: IUser,
  helperUserId: mongoose.Types.ObjectId
): Promise<{ reduction: number; newCompletesAt: Date }> {
  const requests = (targetUser as any).crewBackupRequests ?? [];
  if (requests.length > 0) {
    // Multiple requests: caller must specify which one (applyCrewBackupHelpByRequest)
    throw new Error('User has multiple backup requests; specify which job to back up');
  }
  const requestedJobType = (targetUser as any).crewBackupRequestedJobType ?? undefined;
  const job = await getActiveJobInfo(targetUser, requestedJobType);
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
  const reductionMs = reduction * 1000;

  // Atomic update User: $push helper, $inc totalSeconds. For non-research, also subtract reduction from job completesAt on User.
  const filter: mongoose.FilterQuery<any> = {
    _id: targetUser._id,
    'crewBackupHelpApplied.helperUserIds': { $ne: helperUserId }
  };
  const pipeline: mongoose.mongo.Document[] = [
    {
      $set: {
        'crewBackupHelpApplied.helperUserIds': {
          $concatArrays: [
            { $ifNull: ['$crewBackupHelpApplied.helperUserIds', []] },
            [helperUserId]
          ]
        }
      }
    },
    {
      $set: {
        'crewBackupHelpApplied.totalSeconds': {
          $add: [{ $ifNull: ['$crewBackupHelpApplied.totalSeconds', 0] }, reduction]
        }
      }
    }
  ];

  if (job.jobType === 'research') {
    // Research: update UserResearchFeature.researchCompletesAt first so time is reduced; then update User (helper list).
    const { ResearchFeatureService } = await import('./ResearchFeatureService');
    const researchFilter = ResearchFeatureService.getFeatureIdFindFilter(
      job.categoryId as string,
      job.featureId as string
    );
    const researchDoc = await UserResearchFeature.findOne({
      userId: targetUser._id,
      ...researchFilter,
    });
    if (!researchDoc?.researchCompletesAt) {
      throw new Error('No active build or remodel to back up');
    }
    const newResearchCompletesAt = new Date(new Date(researchDoc.researchCompletesAt).getTime() - reductionMs);
    await UserResearchFeature.findByIdAndUpdate(researchDoc._id, {
      researchCompletesAt: newResearchCompletesAt,
    });
  } else {
    const completesAtPath =
      job.jobType === 'researchCenterBuild'
        ? 'researchCenterBuild.completesAt'
        : job.jobType === 'rentalBuild' && job.jobKey
          ? `rentalHousingBuilds.${job.jobKey}.completesAt`
          : 'activeRemodel.completesAt';
    pipeline.push({
      $set: {
        [completesAtPath]: {
          $dateSubtract: {
            startDate: `$${completesAtPath}`,
            unit: 'millisecond',
            amount: reductionMs
          }
        }
      }
    });
  }

  const updated = await User.findOneAndUpdate(filter, pipeline, {
    new: true
  });
  if (!updated) {
    throw new Error('You have already backed up this crew member for this job');
  }
  await User.findByIdAndUpdate(helperUserId, { $inc: { crewBackupHelpCount: 1 } });

  let resultCompletesAt = newCompletesAt;
  if (job.jobType !== 'research') {
    const updatedCompletesAt =
      job.jobType === 'researchCenterBuild'
        ? updated.researchCenterBuild?.completesAt
        : job.jobType === 'rentalBuild' && job.jobKey
          ? (updated.rentalHousingBuilds as Record<string, { completesAt?: Date }>)?.[job.jobKey]?.completesAt
          : updated.activeRemodel?.completesAt;
    resultCompletesAt = updatedCompletesAt instanceof Date ? updatedCompletesAt : newCompletesAt;
  }

  return { reduction, newCompletesAt: resultCompletesAt };
}

/**
 * Clear crew backup state when the user's job completes (so a new request can be made for the next job).
 */
export function clearCrewBackupState(user: IUser): void {
  (user as any).crewBackupRequestedAt = null;
  (user as any).crewBackupResearchCategoryId = null;
  (user as any).crewBackupResearchFeatureId = null;
  (user as any).crewBackupRequestedJobType = null;
  (user as any).crewBackupHelpApplied = null;
}
