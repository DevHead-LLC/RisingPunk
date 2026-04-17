import type { IUser } from '../models/User';
import { Crew } from '../models/Crew';
import { CrewStatus } from '../models/CrewStatus';
import {
  getResearchFeaturesForBonusSync,
  getCrewLevelIncomeBonusForUser,
  getRentalProfitBonusPerRoom,
} from '../utils/researchFeatureUtils';
import { RentalHousingIncomeService } from './RentalHousingIncomeService';
import { RentalHousingSyncService } from './RentalHousingSyncService';
import {
  getBaseIncomeRateBonusLines,
  getInsuranceReductionLines,
  getTaxReductionLines,
  getRentMortgageReductionLines,
  getUtilitiesReductionLines,
  getMiscEntertainmentReductionLines,
  getRentalProfitResearchLines,
  type IncomeRateLine,
} from '../utils/incomeRateBreakdownUtils';

export type PropertyPassiveBreakdown = {
  propertyId: number;
  isUnlocked: boolean;
  propertyLevel: number;
  /** From property level + room remodels; no rental-profit research */
  basePerSecond: number;
  /** Extra from rental-profit research applied per room */
  researchPerSecond: number;
  totalPerSecond: number;
};

/** Full $/sec breakdown; matches {@link RentalHousingSyncService.performSync} math. */
export type IncomeRateBreakdownResponse = {
  /** $1.00/sec floor before any cash-flow research */
  jobBasePerSecond: number;
  incomeResearch: { lines: IncomeRateLine[]; totalPerSecond: number };
  /** These add to cash-flow rate (same values as Financial Statements expense-modifiers API) */
  insuranceOffset: { lines: IncomeRateLine[]; totalPerSecond: number };
  taxOffset: { lines: IncomeRateLine[]; totalPerSecond: number };
  rentMortgageOffset: { lines: IncomeRateLine[]; totalPerSecond: number };
  utilitiesOffset: { lines: IncomeRateLine[]; totalPerSecond: number };
  miscEntertainmentOffset: { lines: IncomeRateLine[]; totalPerSecond: number };
  /** 1 + all job-line totals — active income rate before passive + crew */
  jobSubtotalPerSecond: number;
  passive: {
    /** Property levels + remodels only (no investments rental-profit research) */
    baseFromPropertiesPerSecond: number;
    /** Sum of per-room rental-profit unlocks (same as applied to each room) */
    rentalResearchPerRoom: number;
    rentalResearchLines: IncomeRateLine[];
    /** Investment properties total (matches GET /api/rental-housing/income) */
    passiveIncomeTotalPerSecond: number;
    /** research portion = total − base for each property */
    properties: PropertyPassiveBreakdown[];
  };
  crew: {
    crewLevel: number | null;
    crewBenefitsIncomePerSecond: number;
  };
  totalEffectiveRatePerSecond: number;
  /** Note for UI */
  notes: {
    jobRate: string;
    passive: string;
  };
};

export class IncomeRateBreakdownService {
  static async getBreakdownForUser(user: IUser): Promise<IncomeRateBreakdownResponse> {
    const userId = String(user._id);
    await RentalHousingSyncService.ensureLegacyRentalLevels(user);

    const prefetch = await getResearchFeaturesForBonusSync(userId);
    const rentalBonusPerRoom = await getRentalProfitBonusPerRoom(userId, prefetch);

    const [
      incomeRes,
      insRes,
      taxRes,
      rentRes,
      utilRes,
      miscRes,
      rentalProfitLinesRes,
    ] = await Promise.all([
      getBaseIncomeRateBonusLines(userId, prefetch),
      getInsuranceReductionLines(userId, prefetch),
      getTaxReductionLines(userId, prefetch),
      getRentMortgageReductionLines(userId, prefetch),
      getUtilitiesReductionLines(userId, prefetch),
      getMiscEntertainmentReductionLines(userId, prefetch),
      getRentalProfitResearchLines(userId, prefetch),
    ]);

    const withBonus = await RentalHousingIncomeService.calculateRentalHousingIncome(user, {
      rentalProfitBonusPerRoom: rentalBonusPerRoom,
    });
    const baseOnly = await RentalHousingIncomeService.calculateRentalHousingIncome(user, {
      rentalProfitBonusPerRoom: 0,
    });

    const crewIncome = await getCrewLevelIncomeBonusForUser(userId);
    let crewLevel: number | null = null;
    const crewStatus = await CrewStatus.findOne({ userId }).select('isInCrew crewId').lean();
    if (crewStatus?.isInCrew && crewStatus.crewId) {
      const crewDoc = await Crew.findById(crewStatus.crewId).select('level').lean();
      crewLevel = typeof crewDoc?.level === 'number' ? crewDoc.level : 1;
    }

    const jobSubtotal =
      1.0 +
      incomeRes.total +
      insRes.total +
      taxRes.total +
      rentRes.total +
      utilRes.total +
      miscRes.total;

    const totalEffective = jobSubtotal + withBonus.totalIncomePerSecond + crewIncome;

    const properties: PropertyPassiveBreakdown[] = withBonus.propertyBreakdown.map((p) => {
      const b = baseOnly.propertyBreakdown.find((x) => x.propertyId === p.propertyId);
      const basePer = b?.incomePerSecond ?? 0;
      const total = p.incomePerSecond;
      return {
        propertyId: p.propertyId,
        isUnlocked: p.isUnlocked,
        propertyLevel: p.propertyLevel ?? 0,
        basePerSecond: basePer,
        researchPerSecond: total - basePer,
        totalPerSecond: total,
      };
    });

    return {
      jobBasePerSecond: 1.0,
      incomeResearch: { lines: incomeRes.lines, totalPerSecond: incomeRes.total },
      insuranceOffset: { lines: insRes.lines, totalPerSecond: insRes.total },
      taxOffset: { lines: taxRes.lines, totalPerSecond: taxRes.total },
      rentMortgageOffset: { lines: rentRes.lines, totalPerSecond: rentRes.total },
      utilitiesOffset: { lines: utilRes.lines, totalPerSecond: utilRes.total },
      miscEntertainmentOffset: { lines: miscRes.lines, totalPerSecond: miscRes.total },
      jobSubtotalPerSecond: jobSubtotal,
      passive: {
        baseFromPropertiesPerSecond: baseOnly.totalIncomePerSecond,
        rentalResearchPerRoom: rentalProfitLinesRes.perRoomTotal,
        rentalResearchLines: rentalProfitLinesRes.lines,
        passiveIncomeTotalPerSecond: withBonus.totalIncomePerSecond,
        properties,
      },
      crew: {
        crewLevel,
        crewBenefitsIncomePerSecond: crewIncome,
      },
      totalEffectiveRatePerSecond: totalEffective,
      notes: {
        jobRate:
          'Job subtotal is $1.00/sec plus income research and expense-offset research (offsets reduce template expenses in the Income Statement but add to your cash-flow rate).',
        passive:
          'Passive income uses property level and room remodel rates from config, plus investments rental-profit research added to each room. Garage receives the bonus only when it earns a base rate.',
      },
    };
  }
}
