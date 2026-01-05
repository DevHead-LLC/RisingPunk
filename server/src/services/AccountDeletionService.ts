import mongoose from 'mongoose';
import { User } from '../models/User';
const Bot = require('../models/Bot');
import { CrewStatus } from '../models/CrewStatus';
import { ResearchUser } from '../models/ResearchUser';
import { UserResearchFeature } from '../models/UserResearchFeature';
import { UserTaskProgress } from '../models/UserTaskProgress';
import { FinanceTier } from '../models/Finance';
import { UserActivityLog } from '../models/UserActivityLog';
import { UserActivitySummary } from '../models/UserActivitySummary';
import { Battle } from '../models/Battle';
import { Map } from '../models/Map';
import { Crew, ICrew } from '../models/Crew';
import { CrewChatMessage } from '../models/CrewChatMessage';

export interface DeletionResult {
  success: boolean;
  message: string;
  deletedRecords: {
    bot: number;
    crewStatus: number;
    researchUser: number;
    userResearchFeature: number;
    userTaskProgress: number;
    financeTier: number;
    userActivityLog: number;
    userActivitySummary: number;
    battles: number;
    mapCells: number;
    crewChatMessages: number;
    crewsUpdated: number;
    crewsDisbanded: number;
    user: number;
  };
  errors: string[];
}

export class AccountDeletionService {
  static async deleteAccount(userId: string): Promise<DeletionResult> {
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const userIdString = userId.toString();
    const result: DeletionResult = {
      success: true,
      message: 'Account deleted successfully',
      deletedRecords: {
        bot: 0,
        crewStatus: 0,
        researchUser: 0,
        userResearchFeature: 0,
        userTaskProgress: 0,
        financeTier: 0,
        userActivityLog: 0,
        userActivitySummary: 0,
        battles: 0,
        mapCells: 0,
        crewChatMessages: 0,
        crewsUpdated: 0,
        crewsDisbanded: 0,
        user: 0
      },
      errors: []
    };

    try {
      const user = await User.findById(userIdObjectId).lean();
      if (!user) {
        result.message = 'User already deleted or not found';
        return result;
      }

      await this.deleteDirectUserReferences(userIdObjectId, result);
      await this.deleteStringBasedReferences(userIdString, result);
      await this.removeUserFromHackMap(userIdObjectId, result);
      await this.handleCrewMemberships(userIdObjectId, result);
      await this.deleteCrewChatMessages(userIdObjectId, result);
      await this.deleteUserDocument(userIdObjectId, result);
    } catch (error: any) {
      result.success = false;
      result.message = 'Account deletion completed with errors';
      result.errors.push(error.message || String(error));
    }

    return result;
  }

  private static async deleteDirectUserReferences(
    userIdObjectId: mongoose.Types.ObjectId,
    result: DeletionResult
  ): Promise<void> {
    try {
      const [botResult, crewStatusResult, taskProgressResult, researchUserResult, userResearchFeatureResult, financeTierResult] = await Promise.all([
        Bot.findOneAndDelete({ userId: userIdObjectId }).lean(),
        CrewStatus.findOneAndDelete({ userId: userIdObjectId }).lean(),
        UserTaskProgress.findOneAndDelete({ userId: userIdObjectId }).lean(),
        ResearchUser.deleteMany({ userId: userIdObjectId }),
        UserResearchFeature.deleteMany({ userId: userIdObjectId }),
        FinanceTier.deleteMany({ userId: userIdObjectId })
      ]);

      if (botResult) result.deletedRecords.bot = 1;
      if (crewStatusResult) result.deletedRecords.crewStatus = 1;
      if (taskProgressResult) result.deletedRecords.userTaskProgress = 1;
      result.deletedRecords.researchUser = researchUserResult.deletedCount;
      result.deletedRecords.userResearchFeature = userResearchFeatureResult.deletedCount;
      result.deletedRecords.financeTier = financeTierResult.deletedCount;
    } catch (error: any) {
      result.errors.push(`Direct references deletion error: ${error.message || String(error)}`);
      console.error('Error deleting direct user references:', error);
    }
  }

  private static async deleteStringBasedReferences(
    userIdString: string,
    result: DeletionResult
  ): Promise<void> {
    try {
      const [activityLogResult, activitySummaryResult, battleResult] = await Promise.all([
        UserActivityLog.deleteMany({ userId: userIdString }),
        UserActivitySummary.deleteMany({ userId: userIdString }),
        Battle.deleteMany({
          $or: [
            { attackerId: userIdString },
            { defenderId: userIdString }
          ]
        })
      ]);

      result.deletedRecords.userActivityLog = activityLogResult.deletedCount;
      result.deletedRecords.userActivitySummary = activitySummaryResult.deletedCount;
      result.deletedRecords.battles = battleResult.deletedCount;
    } catch (error: any) {
      result.errors.push(`String-based references deletion error: ${error.message || String(error)}`);
      console.error('Error deleting string-based references:', error);
    }
  }

  private static async removeUserFromHackMap(
    userIdObjectId: mongoose.Types.ObjectId,
    result: DeletionResult
  ): Promise<void> {
    try {
      const maps = await Map.find({ 'cells.userId': userIdObjectId });
      let totalCellsUpdated = 0;

      for (const map of maps) {
        const cells: any[] = (map as any).cells || [];
        let changed = false;

        for (const cell of cells) {
          if (cell.userId && cell.userId.toString() === userIdObjectId.toString()) {
            cell.isOccupied = false;
            cell.occupiedBy = 'none';
            cell.entityName = '';
            cell.userId = null;
            changed = true;
            totalCellsUpdated++;
          }
        }

        if (changed) {
          (map as any).markModified('cells');
          await (map as any).save();
        }
      }

      result.deletedRecords.mapCells = totalCellsUpdated;
    } catch (error: any) {
      result.errors.push(`HackMap removal error: ${error.message || String(error)}`);
      console.error('Error removing user from HackMap:', error);
    }
  }

  private static async handleCrewMemberships(
    userIdObjectId: mongoose.Types.ObjectId,
    result: DeletionResult
  ): Promise<void> {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        const crewsWhereUserIsMember = await Crew.find({ members: userIdObjectId }).session(session);
        const crewsWhereUserIsExecutive = await Crew.find({ executives: userIdObjectId }).session(session);
        const crewsWhereUserIsApplicant = await Crew.find({ 'applicants.userId': userIdObjectId }).session(session);
        const crewsWhereUserIsPresident = await Crew.find({ presidentId: userIdObjectId }).session(session);

        const allCrewIds = new Set<string>();
        crewsWhereUserIsMember.forEach((c: ICrew) => allCrewIds.add((c._id as mongoose.Types.ObjectId).toString()));
        crewsWhereUserIsExecutive.forEach((c: ICrew) => allCrewIds.add((c._id as mongoose.Types.ObjectId).toString()));
        crewsWhereUserIsApplicant.forEach((c: ICrew) => allCrewIds.add((c._id as mongoose.Types.ObjectId).toString()));
        crewsWhereUserIsPresident.forEach((c: ICrew) => allCrewIds.add((c._id as mongoose.Types.ObjectId).toString()));

        for (const crewId of allCrewIds) {
          const crew = await Crew.findById(crewId).session(session);
          if (!crew) continue;

          const isPresident = crew.presidentId.toString() === userIdObjectId.toString();
          const isMember = crew.members.some((m: any) => m.toString() === userIdObjectId.toString());
          const isExecutive = crew.executives.some((e: any) => e.toString() === userIdObjectId.toString());
          const isApplicant = crew.applicants.some((a: any) => a.userId.toString() === userIdObjectId.toString());

          if (isPresident) {
            await this.handlePresidencyTransfer(crew, userIdObjectId, result, session);
          } else {
            const updateOps: any = {};
            if (isMember) {
              updateOps.$pull = { members: userIdObjectId };
            }
            if (isExecutive) {
              if (updateOps.$pull) {
                updateOps.$pull.executives = userIdObjectId;
              } else {
                updateOps.$pull = { executives: userIdObjectId };
              }
            }
            if (isApplicant) {
              if (!updateOps.$pull) {
                updateOps.$pull = {};
              }
              updateOps.$pull.applicants = { userId: userIdObjectId };
            }

            if (Object.keys(updateOps).length > 0) {
              await Crew.findByIdAndUpdate(crewId, updateOps, { session });
              result.deletedRecords.crewsUpdated++;
            }
          }
        }
      });
    } catch (error: any) {
      result.errors.push(`Crew membership handling error: ${error.message || String(error)}`);
      console.error('Error handling crew memberships:', error);
    } finally {
      await session.endSession();
    }
  }

  private static async handlePresidencyTransfer(
    crew: any,
    userIdObjectId: mongoose.Types.ObjectId,
    result: DeletionResult,
    session: mongoose.ClientSession
  ): Promise<void> {
    const executives = (crew.executives || []).filter((e: any) => e.toString() !== userIdObjectId.toString());
    const members = (crew.members || []).filter((m: any) => m.toString() !== userIdObjectId.toString());

    if (executives.length === 0 && members.length === 0) {
      await this.disbandCrew(crew._id, result, session);
      return;
    }

    const executiveIds = executives.map((e: any) => new mongoose.Types.ObjectId(e.toString()));
    const memberIds = members.map((m: any) => new mongoose.Types.ObjectId(m.toString()));

    const [executiveUsers, memberUsers] = await Promise.all([
      executiveIds.length > 0 ? User.find({ _id: { $in: executiveIds } }).select('_id level').lean().session(session) : [],
      memberIds.length > 0 ? User.find({ _id: { $in: memberIds } }).select('_id level').lean().session(session) : []
    ]);

    const eligibleExecutives = executiveUsers
      .map((user: any) => ({
        _id: user._id,
        level: user.level || 1
      }))
      .sort((a: any, b: any) => b.level - a.level);

    const eligibleMembers = memberUsers
      .map((user: any) => ({
        _id: user._id,
        level: user.level || 1
      }))
      .sort((a: any, b: any) => b.level - a.level);

    let newPresidentId: mongoose.Types.ObjectId | null = null;
    let isSuccessorExecutive = false;

    if (eligibleExecutives.length > 0) {
      newPresidentId = eligibleExecutives[0]._id;
      isSuccessorExecutive = true;
    } else if (eligibleMembers.length > 0) {
      newPresidentId = eligibleMembers[0]._id;
      isSuccessorExecutive = false;
    }

    if (!newPresidentId) {
      await this.disbandCrew(crew._id, result, session);
      return;
    }

    const executivesToPull: mongoose.Types.ObjectId[] = [];
    const membersToPull: mongoose.Types.ObjectId[] = [userIdObjectId];

    // Check if the deleted president was also in the executives array
    const wasPresidentAlsoExecutive = crew.executives.some((e: any) => e.toString() === userIdObjectId.toString());
    if (wasPresidentAlsoExecutive) {
      executivesToPull.push(userIdObjectId);
    }

    if (isSuccessorExecutive) {
      executivesToPull.push(newPresidentId);
      const isSuccessorAlsoMember = eligibleMembers.some((m: any) => m._id.toString() === newPresidentId.toString());
      if (isSuccessorAlsoMember) {
        membersToPull.push(newPresidentId);
      }
    } else {
      membersToPull.push(newPresidentId);
    }

    const updateOps: any = {
      $set: { presidentId: newPresidentId }
    };

    if (executivesToPull.length > 0) {
      updateOps.$pull = { executives: { $in: executivesToPull } };
    }
    if (membersToPull.length > 0) {
      if (updateOps.$pull) {
        updateOps.$pull.members = { $in: membersToPull };
      } else {
        updateOps.$pull = { members: { $in: membersToPull } };
      }
    }

    await Crew.findByIdAndUpdate(crew._id, updateOps, { session });

    const newPresidentStatus = await CrewStatus.findOne({ userId: newPresidentId }).session(session);
    if (newPresidentStatus) {
      newPresidentStatus.role = 'president';
      await newPresidentStatus.save({ session });
    }

    result.deletedRecords.crewsUpdated++;
  }

  private static async disbandCrew(
    crewId: mongoose.Types.ObjectId,
    result: DeletionResult,
    session: mongoose.ClientSession
  ): Promise<void> {
    // Clear war references from other crews
    await Crew.updateMany(
      { warWithCrewId: crewId },
      {
        $set: {
          warWithCrewId: null,
          warDeclaredAt: null
        }
      },
      { session }
    );

    // Clear alliance references from other crews
    await Crew.updateMany(
      { allianceWithCrewIds: crewId },
      { $pull: { allianceWithCrewIds: crewId } },
      { session }
    );

    await Crew.updateMany(
      { allianceRequestedToCrewIds: crewId },
      { $pull: { allianceRequestedToCrewIds: crewId } },
      { session }
    );

    await Crew.updateMany(
      { allianceRequestedFromCrewIds: crewId },
      { $pull: { allianceRequestedFromCrewIds: crewId } },
      { session }
    );

    // Update all crew members' status
    await CrewStatus.updateMany(
      { crewId: crewId },
      {
        $set: {
          isInCrew: false,
          crewId: null,
          crewIdentifier: null,
          role: null
        }
      },
      { session }
    );

    // Clear application references
    await CrewStatus.updateMany(
      { appliedCrewId: crewId },
      {
        $set: {
          appliedCrewId: null,
          appliedCrewIdentifier: null
        }
      },
      { session }
    );

    // Delete all chat messages for this crew
    await CrewChatMessage.deleteMany({ crewId: crewId }, { session });

    // Delete the crew document (must be last to maintain referential integrity)
    await Crew.deleteOne({ _id: crewId }, { session });
    result.deletedRecords.crewsDisbanded++;
    
    // Note: Errors are not caught here - they propagate to abort the transaction
    // The outer catch in handleCrewMemberships will handle logging and error tracking
  }

  private static async deleteCrewChatMessages(
    userIdObjectId: mongoose.Types.ObjectId,
    result: DeletionResult
  ): Promise<void> {
    try {
      const chatMessageResult = await CrewChatMessage.deleteMany({ userId: userIdObjectId });
      result.deletedRecords.crewChatMessages = chatMessageResult.deletedCount;
    } catch (error: any) {
      result.errors.push(`Crew chat messages deletion error: ${error.message || String(error)}`);
      console.error('Error deleting crew chat messages:', error);
    }
  }

  private static async deleteUserDocument(
    userIdObjectId: mongoose.Types.ObjectId,
    result: DeletionResult
  ): Promise<void> {
    try {
      const userResult = await User.findByIdAndDelete(userIdObjectId);
      if (userResult) {
        result.deletedRecords.user = 1;
      }
    } catch (error: any) {
      result.errors.push(`User document deletion error: ${error.message || String(error)}`);
      console.error('Error deleting user document:', error);
    }
  }
}

