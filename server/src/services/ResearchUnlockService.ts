import { User } from '../models/User';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import mongoose from 'mongoose';

export interface UnlockValidationResult {
  canUnlock: boolean;
  reasons: string[];
  missingRequirements: {
    level?: boolean;
    balance?: boolean;
    dependencies?: string[];
    rentalProperties?: boolean;
  };
}

export interface UnlockCosts {
  [key: string]: number;
}

export class ResearchUnlockService {
  private static readonly UNLOCK_COSTS: UnlockCosts = {
    'home-defense': 10000,
    'hack-ability': 20000,
    'financial': 20000,
    'hack-crew': 50000,
    'npc': 50000,
    'cash-flow': 50000,
    'construction': 50000,
    'battle-mechanics': 150000,
    'gear': 400000,
    'investments': 500000
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

      // Special check for Investments (requires rental properties)
      if (categoryId === 'investments') {
        const hasAllRentalProperties = this.checkRentalProperties(user);
        if (!hasAllRentalProperties) {
          reasons.push('All rental properties (1-4) must be unlocked');
          missingRequirements.rentalProperties = true;
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

  private static checkRentalProperties(user: any): boolean {
    return user.unlockedFeatures?.rentalHousing1 &&
           user.unlockedFeatures?.rentalHousing2 &&
           user.unlockedFeatures?.rentalHousing3 &&
           user.unlockedFeatures?.rentalHousing4;
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

        // Special check for Investments (requires rental properties)
        if (categoryId === 'investments') {
          const hasAllRentalProperties = this.checkRentalProperties(user);
          if (!hasAllRentalProperties) {
            return {
              success: false,
              message: 'All rental properties (1-4) must be unlocked'
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
    const userResearch = await ResearchUser.find({ userId })
      .populate('researchId')
      .sort({ 'researchId.categoryId': 1 });

    return userResearch.map(ur => ({
      categoryId: (ur.researchId as any).categoryId,
      name: (ur.researchId as any).name,
      isUnlocked: ur.isUnlocked,
      unlockedAt: ur.unlockedAt,
      unlockCost: this.getUnlockCost((ur.researchId as any).categoryId),
      levelRequirement: (ur.researchId as any).levelRequirement,
      balanceRequirement: (ur.researchId as any).balanceRequirement,
      dependencies: (ur.researchId as any).dependencies,
      image: (ur.researchId as any).image
    }));
  }
}