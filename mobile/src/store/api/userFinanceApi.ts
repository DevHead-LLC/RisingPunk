import { baseApi } from './baseApi';

export type TierKey = 'barista' | 'graphic_designer' | 'corporate_lawyer';

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
  }),
});

export const { useFetchFinanceTemplatesQuery, useFetchUserFinanceTiersQuery } = userFinanceApi;


