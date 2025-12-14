import { baseApi } from './baseApi';
import { ReportContext, ReportReason } from '../../components/modals/UserReportModal';

export interface SubmitReportRequest {
  reportedUserId: string;
  reportedUsername: string;
  reportingUserId: string;
  reportingUsername: string;
  reason: ReportReason;
  description: string;
  context: ReportContext;
  contextData?: any;
}

export interface SubmitReportResponse {
  success: boolean;
  message?: string;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    submitReport: builder.mutation<SubmitReportResponse, SubmitReportRequest>({
      query: (body) => ({
        url: '/api/reports/submit',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useSubmitReportMutation } = reportsApi;
