import { User } from '../models/User';
import { Research } from '../models/Research';
import { UserResearchFeature } from '../models/UserResearchFeature';
import { getResearchFeatures, getFeatureById } from '../config/researchFeatures';
import mongoose from 'mongoose';

export interface ResearchFeatureValidation {
  canResearch: boolean;
  reasons: string[];
  missingRequirements: {
    level?: boolean;
    balance?: boolean;
    researchCenterLevel?: boolean;
    dependencies?: string[];
    requiredFeatures?: string[];
  };
}

export interface StartResearchResult {
  success: boolean;
  message: string;
  researchStartedAt?: Date;
  researchCompletesAt?: Date;
  researchTimeHours?: number;
  newBalance?: number;
}

export interface CompleteResearchResult {
  success: boolean;
  message: string;
  isUnlocked?: boolean;
  unlockedAt?: Date;
}

export class ResearchFeatureService {
  private static isValidResearchTimeHours(hours: number | null | undefined): boolean {
    if (hours == null) return false;
    return hours > 0;
  }

  static async validateFeatureRequirements(
    userId: string,
    categoryId: string,
    featureId: string
  ): Promise<ResearchFeatureValidation> {
    try {
      const user = await User.findById(userId);
      const feature = getFeatureById(categoryId, featureId);
      
      if (!user || !feature) {
        return {
          canResearch: false,
          reasons: ['User or feature not found'],
          missingRequirements: {}
        };
      }

      const reasons: string[] = [];
      const missingRequirements: any = {};

      // Check level requirement
      if (user.level < feature.levelRequirement) {
        reasons.push(`Level ${feature.levelRequirement} required (current: ${user.level})`);
        missingRequirements.level = true;
      }

      // Check balance requirement
      if (user.balance.total < feature.unlockCost) {
        reasons.push(`$${feature.unlockCost.toLocaleString()} required (current: $${user.balance.total.toLocaleString()})`);
        missingRequirements.balance = true;
      }

      // Check Research Center level requirement (per-feature)
      const rcLevelReq = (feature as any).researchCenterLevelRequirement;
      if (rcLevelReq != null) {
        const effectiveRcLevel = user.researchCenterLevel ?? (user.unlockedFeatures?.researchCenter ? 3 : 0);
        if (effectiveRcLevel < rcLevelReq) {
          reasons.push(`Research Center level ${rcLevelReq} required (current: ${effectiveRcLevel})`);
          missingRequirements.researchCenterLevel = true;
        }
      }

      // Check if already unlocked
      const existingFeature = await UserResearchFeature.findOne({
        userId,
        categoryId,
        featureId
      });

      if (existingFeature?.isUnlocked) {
        reasons.push('Feature already unlocked');
      }

      if (existingFeature?.isResearching) {
        reasons.push('Research already in progress');
      }

      // Check feature-level prerequisites (requiredFeatureRefs)
      const refs = feature.requiredFeatureRefs;
      if (refs?.length) {
        for (const ref of refs) {
          const prereq = await UserResearchFeature.findOne({
            userId,
            categoryId: ref.categoryId,
            featureId: ref.featureId
          }).select('isUnlocked').lean();
          if (!prereq?.isUnlocked) {
            const label = `${ref.categoryId}:${ref.featureId}`;
            reasons.push(`Requires research: ${label}`);
            if (!missingRequirements.requiredFeatures) missingRequirements.requiredFeatures = [];
            missingRequirements.requiredFeatures.push(label);
          }
        }
      }

      const canResearch = reasons.length === 0;

      return {
        canResearch,
        reasons,
        missingRequirements
      };
    } catch (error) {
      console.error('Error validating feature requirements:', error);
      return {
        canResearch: false,
        reasons: ['Error validating requirements'],
        missingRequirements: {}
      };
    }
  }

  static async startResearch(
    userId: string,
    categoryId: string,
    featureId: string
  ): Promise<StartResearchResult> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);
        const feature = getFeatureById(categoryId, featureId);
        
        if (!user || !feature) {
          return {
            success: false,
            message: 'User or feature not found'
          };
        }

        // Validate requirements within the transaction using the same session
        const reasons: string[] = [];
        const missingRequirements: any = {};

        // Check level requirement
        if (user.level < feature.levelRequirement) {
          reasons.push(`Level ${feature.levelRequirement} required (current: ${user.level})`);
          missingRequirements.level = true;
        }

        // Check balance requirement
        if (user.balance.total < feature.unlockCost) {
          reasons.push(`$${feature.unlockCost.toLocaleString()} required (current: $${user.balance.total.toLocaleString()})`);
          missingRequirements.balance = true;
        }

        // Check Research Center level requirement (per-feature)
        const rcLevelReq = (feature as any).researchCenterLevelRequirement;
        if (rcLevelReq != null) {
          const effectiveRcLevel = user.researchCenterLevel ?? (user.unlockedFeatures?.researchCenter ? 3 : 0);
          if (effectiveRcLevel < rcLevelReq) {
            return {
              success: false,
              message: `Research Center level ${rcLevelReq} required (current: ${effectiveRcLevel})`
            };
          }
        }

        // Check if already unlocked or researching (using transaction session)
        const existingFeature = await UserResearchFeature.findOne({
          userId,
          categoryId,
          featureId
        }).session(session);

        if (existingFeature?.isUnlocked) {
          reasons.push('Feature already unlocked');
        }

        if (existingFeature?.isResearching) {
          reasons.push('Research already in progress');
        }

        // Check feature-level prerequisites (requiredFeatureRefs)
        const refs = feature.requiredFeatureRefs;
        if (refs?.length) {
          for (const ref of refs) {
            const prereq = await UserResearchFeature.findOne({
              userId,
              categoryId: ref.categoryId,
              featureId: ref.featureId
            }).session(session).select('isUnlocked').lean();
            if (!prereq?.isUnlocked) {
              reasons.push(`Requires research: ${ref.categoryId}:${ref.featureId}`);
            }
          }
        }

        if (reasons.length > 0) {
          return {
            success: false,
            message: reasons.join(', ')
          };
        }

        const researchStartedAt = new Date();
        const researchCompletesAt = new Date(researchStartedAt.getTime() + (feature.researchTimeHours || 4) * 60 * 60 * 1000);

        // Deduct cost from user balance
        await User.findByIdAndUpdate(
          userId,
          {
            'balance.total': user.balance.total - feature.unlockCost,
            'balance.lastUpdated': new Date()
          },
          { session }
        );

        // Create or update user research feature record
        await UserResearchFeature.findOneAndUpdate(
          { userId, categoryId, featureId },
          {
            userId,
            categoryId,
            featureId,
            isUnlocked: false,
            unlockedAt: null,
            isResearching: true,
            researchStartedAt,
            researchCompletesAt,
            researchTimeHours: feature.researchTimeHours || 4,
            unlockCost: feature.unlockCost
          },
          { 
            session, 
            upsert: true,
            new: true 
          }
        );

        return {
          success: true,
          message: 'Research started successfully',
          researchStartedAt,
          researchCompletesAt,
          researchTimeHours: feature.researchTimeHours || 4,
          newBalance: user.balance.total - feature.unlockCost
        };
      });
    } catch (error) {
      console.error('Error starting research:', error);
      return {
        success: false,
        message: 'Error starting research'
      };
    } finally {
      await session.endSession();
    }
  }

  static async completeResearch(
    userId: string,
    categoryId: string,
    featureId: string
  ): Promise<CompleteResearchResult> {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const userResearchFeature = await UserResearchFeature.findOne({
          userId,
          categoryId,
          featureId
        }).session(session);

        if (!userResearchFeature) {
          return {
            success: false,
            message: 'Research feature not found'
          };
        }

        if (!userResearchFeature.isResearching) {
          return {
            success: false,
            message: 'No research in progress for this feature'
          };
        }

        if (userResearchFeature.isUnlocked) {
          return {
            success: false,
            message: 'Feature already unlocked'
          };
        }

        // Check if research time has completed
        const now = new Date();
        if (userResearchFeature.researchCompletesAt && now < userResearchFeature.researchCompletesAt) {
          return {
            success: false,
            message: 'Research time not yet completed'
          };
        }

        // Mark as unlocked
        const unlockedAt = new Date();
        await UserResearchFeature.findByIdAndUpdate(
          userResearchFeature._id,
          {
            isUnlocked: true,
            unlockedAt,
            isResearching: false,
            researchStartedAt: null,
            researchCompletesAt: null
          },
          { session }
        );

        if (categoryId === 'hack-ability' && featureId === 'add-battalion-c') {
          console.log(`[AUDIT] User ${userId} unlocked Battalion C at ${unlockedAt.toISOString()}`);
        }
        if (categoryId === 'hack-ability' && featureId === 'add-battalion-d') {
          console.log(`[AUDIT] User ${userId} unlocked Battalion D at ${unlockedAt.toISOString()}`);
        }

        if (categoryId === 'hack-ability' && featureId === 'battalion-size-250') {
          console.log(`[AUDIT] User ${userId} unlocked Battalion Size +250 at ${unlockedAt.toISOString()}`);
        }
        if (categoryId === 'hack-ability' && featureId === 'battalion-size-500') {
          console.log(`[AUDIT] User ${userId} unlocked Battalion Size +500 at ${unlockedAt.toISOString()}`);
        }
        if (categoryId === 'hack-ability' && featureId === 'battalion-size-1000') {
          console.log(`[AUDIT] User ${userId} unlocked Battalion Size +1,000 at ${unlockedAt.toISOString()}`);
        }

        if (categoryId === 'investments' && (featureId === 'rental-profit-01' || featureId === 'rental-profit-015')) {
          console.log(`[AUDIT] User ${userId} unlocked ${featureId} at ${unlockedAt.toISOString()}`);
          
          const { RentalHousingSyncService } = await import('./RentalHousingSyncService');
          const { User } = await import('../models/User');
          
          // Reload user to ensure we have latest state including unlocked research
          const updatedUser = await User.findById(userId).session(session);
          if (updatedUser) {
            // Reset sync timestamp to force immediate recalculation
            updatedUser.balance.rentalHousingIncomeLastSynced = null;
            await updatedUser.save({ session });
          }
        }

        return {
          success: true,
          message: 'Research completed successfully',
          isUnlocked: true,
          unlockedAt
        };
      });
    } catch (error) {
      console.error('Error completing research:', error);
      return {
        success: false,
        message: 'Error completing research'
      };
    } finally {
      await session.endSession();
    }
  }

  static async getUserFeatures(
    userId: string,
    categoryId: string
  ): Promise<any[]> {
    try {
      // Get base features from config
      const baseFeatures = getResearchFeatures(categoryId);

      // Get user's research progress for this category from UserResearchFeature collection
      const userFeatures = await UserResearchFeature.find({
        userId,
        categoryId
      })
      .select('featureId isUnlocked unlockedAt isResearching researchStartedAt researchCompletesAt researchTimeHours')
      .lean();

      // Merge base features with user progress from UserResearchFeature collection
      const featuresWithStatus = baseFeatures.map(feature => {
        const userFeature = userFeatures.find(uf => uf.featureId === feature.id);

        const userResearchTimeHours = userFeature?.researchTimeHours;
        const validUserResearchTime = ResearchFeatureService.isValidResearchTimeHours(userResearchTimeHours) 
          ? userResearchTimeHours 
          : null;

        return {
          ...feature,
          isUnlocked: userFeature?.isUnlocked ?? false,
          unlockedAt: userFeature?.unlockedAt ?? null,
          isResearching: userFeature?.isResearching ?? false,
          researchStartedAt: userFeature?.researchStartedAt ?? null,
          researchCompletesAt: userFeature?.researchCompletesAt ?? null,
          researchTimeHours: validUserResearchTime ?? feature.researchTimeHours ?? 4
        };
      });

      return featuresWithStatus;
    } catch (error) {
      console.error('Error getting user features:', error);
      return [];
    }
  }

  static async getUserFeatureStatus(
    userId: string,
    categoryId: string,
    featureId: string
  ): Promise<any | null> {
    try {
      const userFeature = await UserResearchFeature.findOne({
        userId,
        categoryId,
        featureId
      });

      if (!userFeature) {
        return null;
      }

      const baseFeature = getFeatureById(categoryId, featureId);
      if (!baseFeature) {
        return null;
      }

      const userResearchTimeHours = userFeature.researchTimeHours;
      const validUserResearchTime = ResearchFeatureService.isValidResearchTimeHours(userResearchTimeHours)
        ? userResearchTimeHours
        : null;

      return {
        ...baseFeature,
        isUnlocked: userFeature.isUnlocked,
        unlockedAt: userFeature.unlockedAt,
        isResearching: userFeature.isResearching,
        researchStartedAt: userFeature.researchStartedAt,
        researchCompletesAt: userFeature.researchCompletesAt,
        researchTimeHours: validUserResearchTime ?? baseFeature.researchTimeHours ?? 4
      };
    } catch (error) {
      console.error('Error getting user feature status:', error);
      return null;
    }
  }
}
