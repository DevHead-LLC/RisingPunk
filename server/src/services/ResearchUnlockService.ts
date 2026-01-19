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
  };
}

export interface UnlockCosts {
  [key: string]: number;
}

export class ResearchUnlockService {
  private static readonly UNLOCK_COSTS: UnlockCosts = {
    'home-defense': 10000,
    'hack-ability': 50000,
    'financial': 20000,
    'hack-crew': 100000,
    'npc': 50000,
    'cash-flow': 50000,
    'construction': 50000,
    'battle-mechanics': 150000,
    'gear': 400000,
    'investments': 250000
  };

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

      // Special check for Hack Crew (requires Antivirus feature)
      if (categoryId === 'hack-crew') {
        const hasAntivirus = await this.checkAntivirusFeature(userId);
        if (!hasAntivirus) {
          reasons.push('Antivirus feature must be unlocked');
          missingRequirements.antivirus = true;
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

  private static async checkAntivirusFeature(userId: string): Promise<boolean> {
    const antivirusFeature = await UserResearchFeature.findOne({
      userId,
      categoryId: 'home-defense',
      featureId: 'antivirus'
    });
    
    if (!antivirusFeature) {
      return false;
    }

    if (antivirusFeature.isUnlocked) {
      return true;
    }

    if (antivirusFeature.isResearching && antivirusFeature.researchCompletesAt) {
      const now = new Date();
      const completesAt = antivirusFeature.researchCompletesAt;
      return now >= completesAt;
    }

    return false;
  }

  static getUnlockCost(categoryId: string): number {
    return this.UNLOCK_COSTS[categoryId] || 0;
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

        // Special check for Hack Crew (requires Antivirus feature)
        if (categoryId === 'hack-crew') {
          const hasAntivirus = await this.checkAntivirusFeature(userId);
          if (!hasAntivirus) {
            return {
              success: false,
              message: 'Antivirus feature must be unlocked'
            };
          }
        }

        const unlockCost = this.getUnlockCost(categoryId);
        
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

    const results = await Promise.all(userResearch.map(async (ur) => {
      const research = ur.researchId as any;
      const dbUnlocked = ur.isUnlocked;
      
      const levelMet = user.level >= research.levelRequirement;
      
      const unlockedDependencies = userResearch
        .filter(ur2 => research.dependencies.includes((ur2.researchId as any)?.categoryId))
        .map(ur2 => ur2.isUnlocked);
      const dependenciesMet = research.dependencies.length === 0 || 
        (unlockedDependencies.length === research.dependencies.length && unlockedDependencies.every(unlocked => unlocked === true));
      
      const actuallyUnlocked = dbUnlocked ? (levelMet && dependenciesMet) : false;

      if (!actuallyUnlocked && dbUnlocked) {
        ResearchUser.findOneAndUpdate(
          { userId, researchId: research._id },
          { isUnlocked: false, unlockedAt: null },
          { new: false }
        ).catch(err => console.error('Error correcting unlock status:', err));
      }

      const result: any = {
        categoryId: research.categoryId,
        name: research.name,
        isUnlocked: actuallyUnlocked,
        unlockedAt: actuallyUnlocked ? ur.unlockedAt : null,
        unlockCost: this.getUnlockCost(research.categoryId),
        levelRequirement: research.levelRequirement,
        balanceRequirement: research.balanceRequirement,
        dependencies: research.dependencies,
        image: research.image
      };

      if (research.categoryId === 'hack-crew') {
        result.requiredFeatures = ['antivirus'];
      }

      return result;
    }));

    return results;
  }
}