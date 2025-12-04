import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const auditAPI = createApi({
    reducerPath: 'auditAPI',
    baseQuery: fetchBaseQuery({ baseUrl: '/' }),
    tagTypes: ['AuditEvents', 'ComplianceReports', 'EvidencePackage'],
    endpoints: (builder) => ({
        getAuditEvents: builder.query({
            query: ({ filters, pagination } = {}) => ({
                url: 'audit-compliance-service/events',
                params: { ...filters, ...pagination },
            }),
            providesTags: ['AuditEvents'],
        }),
        getAuditEvent: builder.query({
            query: (id) => `audit-compliance-service/event/${id}`,
            providesTags: (result, error, id) => [{ type: 'AuditEvents', id }],
        }),
        getEntityTimeline: builder.query({
            query: ({ entityType, entityId }) =>
                `audit-compliance-service/timeline/${entityType}/${entityId}`,
        }),
        advancedSearch: builder.mutation({
            query: (searchQuery) => ({
                url: 'audit-compliance-service/search',
                method: 'POST',
                body: searchQuery,
            }),
        }),
        getComplianceReports: builder.query({
            query: () => 'audit-compliance-service/reports',
            providesTags: ['ComplianceReports'],
        }),
        generateReport: builder.mutation({
            query: (reportConfig) => ({
                url: 'audit-compliance-service/generate-report',
                method: 'POST',
                body: reportConfig,
            }),
            invalidatesTags: ['ComplianceReports'],
        }),
        createEvidencePackage: builder.mutation({
            query: (packageData) => ({
                url: 'audit-compliance-service/evidence-package',
                method: 'POST',
                body: packageData,
            }),
            invalidatesTags: ['EvidencePackage'],
        }),
        downloadReport: builder.query({
            query: ({ reportId, format }) => ({
                url: `audit-compliance-service/report/${reportId}/download`,
                params: { format },
            }),
        }),
    }),
});

export const {
    useGetAuditEventsQuery,
    useGetAuditEventQuery,
    useGetEntityTimelineQuery,
    useAdvancedSearchMutation,
    useGetComplianceReportsQuery,
    useGenerateReportMutation,
    useCreateEvidencePackageMutation,
    useDownloadReportQuery,
} = auditAPI;
