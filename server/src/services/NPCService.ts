import mongoose from 'mongoose';

type BotTypeLiteral = 'guardian' | 'breacher' | 'phreak';

export type NPCBattalionConfig = { type: BotTypeLiteral; quantity: number };

export type NPCDocument = {
  _id: any;
  slug: string;
  name: string;
  title?: string;
  tier: 1 | 2 | 3;
  battalions: NPCBattalionConfig[];
  statMultipliers: {
    health: number;
    speed: number;
    offense: number;
    defense: number;
    range: number;
  };
  mapRecoverySeconds: number;
};

export class NPCService {
  static async getNPCBySlug(slug: string): Promise<NPCDocument | null> {
    const doc = await mongoose.connection.collection('npcs').findOne({ slug });
    return doc as NPCDocument | null;
  }
}


