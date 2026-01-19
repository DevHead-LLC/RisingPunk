import mongoose from 'mongoose';

type BotTypeLiteral = 'guardian' | 'breacher' | 'phreak';

export type NPCBattalionConfig = { type: BotTypeLiteral; quantity: number };

export type NPCDocument = {
  _id: any;
  slug: string;
  name: string;
  title?: string;
  tier: number;
  userLevelAssociation: number;
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


