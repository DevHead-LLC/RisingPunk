import { User } from '../models/User';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import { UserResearchFeature } from '../models/UserResearchFeature';
import mongoose from 'mongoose';

export interface UnlockValidationResult {
  canUnlock: boolean;
  reasons: string[];
  missingRequirements: {
    level?: boolean;
    balance?: boolean;
    dependencies?: string[];
    antivirus?: boolean;
    researchCenterLevel?: boolean;
    requiredFeatures?: string[];
  };
}

export interface UnlockCosts {
  [key: string]: number;
}

export class ResearchUnlockService {
  private static readonly UNLOCK_COSTS: UnlockCosts = {
    'home-defense': 5000,
    'hack-ability': 30000,
    'financial': 20000,
    'hack-crew': 50000,
    'npc': 50000,
    'cash-flow': 15000,
    'construction': 50000,
    'battle-mechanics': 150000,
    'gear': 400000,
    'investments': 75000,
    /** Matches `research` category doc / seed when `unlockCost` is absent. */
    'swarm': 25000000,
    'hunting': 10000000,
  };

  static async ensureHuntingCategoryDefinition(): Promise<void> {
    await Research.findOneAndUpdate(
      { categoryId: 'hunting' },
      {
        $set: {
          categoryId: 'hunting',
          name: 'Hunting',
          levelRequirement: 40,
          balanceRequirement: 10000000,
          dependencies: ['investments'],
          image: 'researchCenter/hunting.png',
          description: 'Hunting progression and bug-hunt specialization research.',
          features: [],
          unlockCost: 10000000,
          requiredFeatureRefs: [],
        },
        $unset: {
          researchCenterLevelRequirement: 1,
        },
      },
      { upsert: true }
    );
  }

  static async validateUnlockRequirements(
    userId: string,
    categoryId: string
  ): Promise<UnlockValidationResult> {
    try {
      const user = await User.findById(userId);
      const research = await Research.findOne({ categoryId });
      
      if (!user || !research) {
        return {
          canUnlock: false,
          reasons: ['User or research category not found'],
          missingRequirements: {}
        };
      }

      const reasons: string[] = [];
      const missingRequirements: any = {};

      // Check level requirement
      if (user.level < research.levelRequirement) {
        reasons.push(`Level ${research.levelRequirement} required (current: ${user.level})`);
        missingRequirements.level = true;
      }

      // Check balance requirement
      if (user.balance.total < research.balanceRequirement) {
        reasons.push(`$${research.balanceRequirement.toLocaleString()} required (current: $${user.balance.total.toLocaleString()})`);
        missingRequirements.balance = true;
      }

      // Check dependencies
      const missingDependencies = await this.checkDependencies(userId, research.dependencies);
      if (missingDependencies.length > 0) {
        reasons.push(`Missing dependencies: ${missingDependencies.join(', ')}`);
        missingRequirements.dependencies = missingDependencies;
      }

      // Research Center building level requirement
      const rcLevelReq = (research as any).researchCenterLevelRequirement;
      if (rcLevelReq != null && typeof rcLevelReq === 'number') {
        const effectiveRcLevel = user.researchCenterLevel ?? (user.unlockedFeatures?.researchCenter ? 3 : 0);
        if (effectiveRcLevel < rcLevelReq) {
          reasons.push(`Research Center level ${rcLevelReq} required (current: ${effectiveRcLevel})`);
          missingRequirements.researchCenterLevel = true;
        }
      }

      // Required features (from requiredFeatureRefs; replaces hardcoded hack-crew Antivirus check)
      const refs = (research as any).requiredFeatureRefs as { categoryId: string; featureId: string }[] | undefined;
      if (refs?.length) {
        const missingRefs = await this.checkRequiredFeatureRefs(userId, refs);
        if (missingRefs.length > 0) {
          const refLabels = missingRefs.map(r => `${r.categoryId}:${r.featureId}`);
          reasons.push(`Required features not completed: ${refLabels.join(', ')}`);
          missingRequirements.requiredFeatures = refLabels;
        }
      }

      const canUnlock = reasons.length === 0;

      return {
        canUnlock,
        reasons,
        missingRequirements
      };
    } catch (error) {
      console.error('Error validating unlock requirements:', error);
      return {
        canUnlock: false,
        reasons: ['Error validating requirements'],
        missingRequirements: {}
      };
    }
  }

  private static async checkDependencies(
    userId: string,
    dependencies: string[]
  ): Promise<string[]> {
    if (dependencies.length === 0) return [];

    const userResearch = await ResearchUser.find({
      userId,
      researchId: { $in: await this.getResearchIdsByCategoryIds(dependencies) },
      isUnlocked: true
    });

    const unlockedCategories = await Promise.all(
      userResearch.map(async (ur) => {
        const research = await Research.findById(ur.researchId);
        return research?.categoryId;
      })
    );

    return dependencies.filter(dep => !unlockedCategories.includes(dep));
  }

  private static async getResearchIdsByCategoryIds(categoryIds: string[]): Promise<mongoose.Types.ObjectId[]> {
    const research = await Research.find({ categoryId: { $in: categoryIds } }, { _id: 1 });
    return research.map(r => r._id as mongoose.Types.ObjectId);
  }

  /** Returns refs that are not yet unlocked (or completed). */
  private static async checkRequiredFeatureRefs(
    userId: string,
    refs: { categoryId: string; featureId: string }[]
  ): Promise<{ categoryId: string; featureId: string }[]> {
    if (refs.length === 0) return [];
    const now = new Date();
    const missing: { categoryId: string; featureId: string }[] = [];
    for (const ref of refs) {
      const uf = await UserResearchFeature.findOne({
        userId,
        categoryId: ref.categoryId,
        featureId: ref.featureId
      });
      const satisfied = uf && (
        uf.isUnlocked ||
        (uf.isResearching && uf.researchCompletesAt && now >= uf.researchCompletesAt)
      );
      if (!satisfied) {
        missing.push(ref);
      }
    }
    return missing;
  }

  /** Prefer research.unlockCost from DB; fallback to UNLOCK_COSTS. */
  private static getUnlockCostForResearch(research: { categoryId: string; unlockCost?: number }): number {
    const cost = (research as any).unlockCost;
    if (typeof cost === 'number' && cost >= 0) {
      return cost;
    }
    return this.UNLOCK_COSTS[research.categoryId] ?? 0;
  }

  static async unlockResearch(
    userId: string,
    categoryId: string
  ): Promise<{ success: boolean; message: string; newBalance?: number }> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);
        const research = await Research.findOne({ categoryId }).session(session);
        
        if (!user || !research) {
          throw new Error('User or research category not found');
        }

        // Check level requirement
        if (user.level < research.levelRequirement) {
          return {
            success: false,
            message: `Level ${research.levelRequirement} required (current: ${user.level})`
          };
        }

        // Check balance requirement
        if (user.balance.total < research.balanceRequirement) {
          return {
            success: false,
            message: `$${research.balanceRequirement.toLocaleString()} required (current: $${user.balance.total.toLocaleString()})`
          };
        }

        // Check dependencies
        const missingDependencies = await this.checkDependencies(userId, research.dependencies);
        if (missingDependencies.length > 0) {
          return {
            success: false,
            message: `Missing dependencies: ${missingDependencies.join(', ')}`
          };
        }

        // Research Center building level requirement
        const rcLevelReq = (research as any).researchCenterLevelRequirement;
        if (rcLevelReq != null && typeof rcLevelReq === 'number') {
          const effectiveRcLevel = user.researchCenterLevel ?? (user.unlockedFeatures?.researchCenter ? 3 : 0);
          if (effectiveRcLevel < rcLevelReq) {
            return {
              success: false,
              message: `Research Center level ${rcLevelReq} required (current: ${effectiveRcLevel})`
            };
          }
        }

        // Required features (requiredFeatureRefs); same source as validateUnlockRequirements and getUserResearchStatus
        const refs = (research as any).requiredFeatureRefs as { categoryId: string; featureId: string }[] | undefined;
        if (refs?.length) {
          const missingRefs = await this.checkRequiredFeatureRefs(userId, refs);
          if (missingRefs.length > 0) {
            const refLabels = missingRefs.map(r => `${r.categoryId}:${r.featureId}`).join(', ');
            return {
              success: false,
              message: `Required features not completed: ${refLabels}`
            };
          }
        }

        const unlockCost = this.getUnlockCostForResearch(research);
        
        // Check balance again (in case it changed)
        if (user.balance.total < unlockCost) {
          return {
            success: false,
            message: 'Insufficient balance'
          };
        }

        // Deduct balance
        user.balance.total -= unlockCost;
        user.balance.lastUpdated = new Date();
        await user.save({ session });

        // Update research unlock status
        await ResearchUser.findOneAndUpdate(
          { userId, researchId: research._id },
          {
            isUnlocked: true,
            unlockedAt: new Date(),
            unlockCost,
            updatedAt: new Date()
          },
          { session, new: true }
        );

        return {
          success: true,
          message: `${research.name} unlocked successfully`,
          newBalance: user.balance.total
        };
      });
    } catch (error) {
      console.error('Error unlocking research:', error);
      return {
        success: false,
        message: 'Error unlocking research'
      };
    } finally {
      await session.endSession();
    }
  }

  static async getUserResearchStatus(userId: string): Promise<any[]> {
    const user = await User.findById(userId);
    if (!user) return [];

    const allResearch = await Research.find();
    let userResearch = await ResearchUser.find({ userId })
      .populate('researchId')
      .sort({ 'researchId.categoryId': 1 });

    const existingResearchIds = new Set(
      userResearch.map(ur => (ur.researchId as any)?._id?.toString())
    );

    const missingResearch = allResearch.filter(
      research => !existingResearchIds.has((research._id as mongoose.Types.ObjectId).toString())
    );

    if (missingResearch.length > 0) {
      const newResearchUserEntries = missingResearch.map(research => ({
        userId,
        researchId: research._id,
        isUnlocked: false,
        unlockedAt: null,
        unlockCost: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await ResearchUser.insertMany(newResearchUserEntries);

      userResearch = await ResearchUser.find({ userId })
        .populate('researchId')
        .sort({ 'researchId.categoryId': 1 });
    }

    const results = userResearch.map((ur) => {
      const research = ur.researchId as any;
      const dbUnlocked = ur.isUnlocked;

      // Once a user has unlocked a category (dbUnlocked), keep it unlocked. Do not revoke access
      // when new requirements (e.g. Research Center level, required features) are added, so
      // existing users are not locked out. New users must still meet all requirements to unlock.
      const actuallyUnlocked = dbUnlocked;

      const refs = research.requiredFeatureRefs as { categoryId: string; featureId: string }[] | undefined;

      const result: any = {
        categoryId: research.categoryId,
        name: research.name,
        isUnlocked: actuallyUnlocked,
        unlockedAt: actuallyUnlocked ? ur.unlockedAt : null,
        unlockCost: this.getUnlockCostForResearch(research),
        levelRequirement: research.levelRequirement,
        balanceRequirement: research.balanceRequirement,
        dependencies: research.dependencies,
        image: research.image
      };

      if (research.researchCenterLevelRequirement != null) {
        result.researchCenterLevelRequirement = research.researchCenterLevelRequirement;
      }
      if (refs?.length) {
        result.requiredFeatures = refs.map((r: { featureId: string }) => r.featureId);
        result.requiredFeatureRefs = refs;
      }

      return result;
    });

    return results;
  }
}