import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const transactionAPI = createApi({
    reducerPath: 'transactionAPI',
    baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:3000/api/v1' }),
    tagTypes: ['Transaction', 'AuditTrail'],
    endpoints: (builder) => ({
        // Fetch transactions list
        getTransactions: builder.query({
            query: ({ page = 1, pageSize = 25, filters = {}, sorting = {} }) => ({
                url: '/transactions',
                params: {
                    page,
                    pageSize,
                    ...filters,
                    sortBy: sorting.field,
                    sortOrder: sorting.order,
                },
            }),
            providesTags: ['Transaction'],
        }),

        // Get single transaction details
        getTransaction: builder.query({
            query: (id) => `/transactions/${id}`,
            providesTags: (result, error, id) => [{ type: 'Transaction', id }],
        }),

        // Get AI classification for a transaction
        getClassification: builder.query({
            query: (id) => `/transactions/${id}`,
        }),

        // Classify and Add Transaction
        classifyTransaction: builder.mutation({
            query: (transactionData) => ({
                url: '/classify',
                method: 'POST',
                body: transactionData,
            }),
            invalidatesTags: ['Transaction'],
        }),

        // Upload file
        uploadFile: builder.mutation({
            query: (formData) => ({
                url: '/classify/upload',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['Transaction'],
        }),

        // Update transaction classification
        updateClassification: builder.mutation({
            query: ({ id, classification }) => ({
                url: `/transactions/${id}`,
                method: 'PATCH',
                body: classification,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'Transaction', id },
                'Transaction',
            ],
        }),

        // Bulk approve transactions
        bulkApprove: builder.mutation({
            query: (transactionIds) => ({
                url: '/transactions/bulk-approve',
                method: 'POST',
                body: { ids: transactionIds },
            }),
            invalidatesTags: ['Transaction'],
        }),

        // Bulk flag transactions
        bulkFlag: builder.mutation({
            query: (transactionIds) => ({
                url: '/transactions/bulk-flag',
                method: 'POST',
                body: { ids: transactionIds },
            }),
            invalidatesTags: ['Transaction'],
        }),

        // Get audit trail for a transaction (placeholder)
        getAuditTrail: builder.query({
            query: (transactionId) => `/compliance/audit-trail/${transactionId}`,
            providesTags: (result, error, transactionId) => [
                { type: 'AuditTrail', id: transactionId },
            ],
        }),
    }),
});

export const {
    useGetTransactionsQuery,
    useGetTransactionQuery,
    useGetClassificationQuery,
    useClassifyTransactionMutation,
    useUploadFileMutation,
    useUpdateClassificationMutation,
    useBulkApproveMutation,
    useBulkFlagMutation,
    useGetAuditTrailQuery,
} = transactionAPI;
