import mongoose from 'mongoose';

type BotTypeLiteral = 'guardian' | 'breacher' | 'phreak';

/** `markLevel` optional for legacy NPC docs; omitted means Mark I (same as 1). */
export type NPCBattalionConfig = { type: BotTypeLiteral; quantity: number; markLevel?: number };

export type NPCDocument = {
  _id: any;
  slug: string;
  name: string;
  title?: string;
  tier: number;
  /** Stat scaling (often 1–99). Do not use as the 1–21 mark-mix table index. */
  userLevelAssociation: number;
  /**
   * Which row (1–21) of the mark-mix curve this NPC uses. Optional; if omitted, `applyNpcMarkMixBattalions`
   * derives tier from `userLevelAssociation` (1–99 → 1–21 spread). Set explicitly when a slug must follow a
   * specific mix row regardless of ULA.
   */
  npcMarkMixTier?: number;
  battalions: NPCBattalionConfig[];
  battleExperienceReward: number;
  victoryReward: number;
  mapRecoverySeconds: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export class NPCService {
  static async getNPCBySlug(slug: string): Promise<NPCDocument | null> {
    const doc = await mongoose.connection.collection('npcs').findOne({ slug });
    return doc as NPCDocument | null;
  }

  static async getAllNPCs(): Promise<NPCDocument[]> {
    const docs = await mongoose.connection.collection('npcs').find({}).toArray();
    return docs as NPCDocument[];
  }

  static async getNPCsByLevel(userLevelAssociation: number): Promise<NPCDocument[]> {
    const docs = await mongoose.connection.collection('npcs').find({ userLevelAssociation }).toArray();
    return docs as NPCDocument[];
  }
}


