import type mongoose from 'mongoose';

/** `mark-2-bots` under Hack Ability — required for Mark II assignments, presets, and battle payloads. */
export async function userHasMark2BotsUnlocked(userId: mongoose.Types.ObjectId | string): Promise<boolean> {
  const { UserResearchFeature } = await import('../models/UserResearchFeature');
  const doc = await UserResearchFeature.findOne({
    userId,
    categoryId: 'hack-ability',
    featureId: 'mark-2-bots',
    isUnlocked: true,
  })
    .select('_id')
    .lean();
  return !!doc;
}
