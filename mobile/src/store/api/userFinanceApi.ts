import { baseApi } from './baseApi';

export type TierKey = 'barista' | 'graphic_designer' | 'corporate_lawyer';

/** Matches GET /api/users/finance/income-rate-breakdown (server IncomeRateBreakdownResponse). */
export interface IncomeRateLineDto {
  categoryId: string;
  featureId: string;
  label: string;
  perSecond: number;
}

export interface IncomeRateBreakdownDto {
  jobBasePerSecond: number;
  incomeResearch: { lines: IncomeRateLineDto[]; totalPerSecond: number };
  insuranceOffset: { lines: IncomeRateLineDto[]; totalPerSecond: number };
  taxOffset: { lines: IncomeRateLineDto[]; totalPerSecond: number };
  rentMortgageOffset: { lines: IncomeRateLineDto[]; totalPerSecond: number };
  utilitiesOffset: { lines: IncomeRateLineDto[]; totalPerSecond: number };
  miscEntertainmentOffset: { lines: IncomeRateLineDto[]; totalPerSecond: number };
  jobSubtotalPerSecond: number;
  passive: {
    baseFromPropertiesPerSecond: number;
    rentalResearchPerRoom: number;
    rentalResearchLines: IncomeRateLineDto[];
    passiveIncomeTotalPerSecond: number;
    properties: {
      propertyId: number;
      isUnlocked: boolean;
      propertyLevel: number;
      basePerSecond: number;
      researchPerSecond: number;
      totalPerSecond: number;
    }[];
  };
  crew: {
    crewLevel: number | null;
    crewBenefitsIncomePerSecond: number;
  };
  totalEffectiveRatePerSecond: number;
  notes: { jobRate: string; passive: string };
}

export interface FinanceTemplateDoc {
  tierKey: TierKey;
  tierName: string;
  story: string;
  incomeStatement: Record<string, number>;
  balanceSheet: {
    assets: Record<string, number>;
    liabilities: Record<string, number>;
    netWorthChange: number;
  };
  cashFlows: {
    operating: Record<string, number>;
    investing: number;
    financing: number;
  };
}

export const userFinanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchFinanceTemplates: builder.query<{ templates: FinanceTemplateDoc[] }, void>({
      query: () => ({ url: '/api/users/finance/templates', method: 'GET' }),
    }),
    fetchUserFinanceTiers: builder.query<{ tiers: any[] }, void>({
      query: () => ({ url: '/api/users/finance/tiers', method: 'GET' }),
    }),
    fetchIncomeRateBreakdown: builder.query<IncomeRateBreakdownDto, void>({
      query: () => ({ url: '/api/users/finance/income-rate-breakdown', method: 'GET' }),
    }),
  }),
});

export const {
  useFetchFinanceTemplatesQuery,
  useFetchUserFinanceTiersQuery,
  useFetchIncomeRateBreakdownQuery,
} = userFinanceApi;



