import mongoose from 'mongoose';
import { Crew } from '../models/Crew';
import { CrewStatus } from '../models/CrewStatus';
import { CrewChatMessage } from '../models/CrewChatMessage';
import { invalidateCrewLeaderboardCaches } from '../routes/leaderboardRoutes';

/**
 * Disbands a crew: clears war/alliance refs, resets member statuses, deletes crew chat, removes crew document.
 * Use from manual disband route and automated understaff sweep.
 */
export async function disbandCrewByIdInTransaction(
  crewId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  await Crew.updateMany(
    { warWithCrewId: crewId },
    {
      $set: {
        warWithCrewId: null,
        warDeclaredAt: null,
      },
    },
    { session }
  );

  await Crew.updateMany(
    { allianceWithCrewIds: crewId },
    {
      $pull: {
        allianceWithCrewIds: crewId,
      },
    },
    { session }
  );

  await Crew.updateMany(
    { allianceRequestedToCrewIds: crewId },
    {
      $pull: {
        allianceRequestedToCrewIds: crewId,
      },
    },
    { session }
  );

  await Crew.updateMany(
    { allianceRequestedFromCrewIds: crewId },
    {
      $pull: {
        allianceRequestedFromCrewIds: crewId,
      },
    },
    { session }
  );

  await CrewStatus.updateMany(
    { crewId: crewId },
    {
      $set: {
        isInCrew: false,
        crewId: null,
        crewIdentifier: null,
        role: null,
      },
    },
    { session }
  );

  await CrewStatus.updateMany(
    { appliedCrewId: crewId },
    {
      $set: {
        appliedCrewId: null,
        appliedCrewIdentifier: null,
      },
    },
    { session }
  );

  await CrewChatMessage.deleteMany({ crewId: crewId }, { session });

  await Crew.deleteOne({ _id: crewId }, { session });
}

export async function disbandCrewById(crewId: mongoose.Types.ObjectId | string): Promise<void> {
  const id =
    typeof crewId === 'string' ? new mongoose.Types.ObjectId(crewId) : new mongoose.Types.ObjectId(crewId.toString());

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await disbandCrewByIdInTransaction(id, session);
    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
  // Bugbot: after commit + endSession — if this threw inside the try, abortTransaction would run on a committed session.
  invalidateCrewLeaderboardCaches();
}
