import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const workflowAPI = createApi({
    reducerPath: 'workflowAPI',
    baseQuery: fetchBaseQuery({ baseUrl: '/' }),
    tagTypes: ['ApprovalQueue', 'Workflow', 'Comments'],
    endpoints: (builder) => ({
        getApprovalQueue: builder.query({
            query: ({ filters, sorting } = {}) => ({
                url: 'workflow-orchestration-service/approvals',
                params: { ...filters, ...sorting },
            }),
            providesTags: ['ApprovalQueue'],
        }),
        getWorkflowDetails: builder.query({
            query: (id) => `workflow-orchestration-service/workflow/${id}`,
            providesTags: (result, error, id) => [{ type: 'Workflow', id }],
        }),
        approveTask: builder.mutation({
            query: ({ id, comment }) => ({
                url: `workflow-orchestration-service/approvals/${id}/approve`,
                method: 'POST',
                body: { comments: comment },
            }),
            invalidatesTags: ['ApprovalQueue'],
        }),
        rejectTask: builder.mutation({
            query: ({ id, reason }) => ({
                url: `workflow-orchestration-service/approvals/${id}/reject`,
                method: 'POST',
                body: { comments: reason },
            }),
            invalidatesTags: ['ApprovalQueue'],
        }),
        delegateTask: builder.mutation({
            query: ({ id, assignTo, comment }) => ({
                url: `workflow-orchestration-service/delegate/${id}`,
                method: 'PUT',
                body: { assignTo, comment },
            }),
            invalidatesTags: ['ApprovalQueue'],
        }),
        getComparison: builder.query({
            query: (id) => `reclassification-service/comparison/${id}`,
        }),
        addComment: builder.mutation({
            query: ({ taskId, comment }) => ({
                url: `workflow-orchestration-service/comment/${taskId}`,
                method: 'POST',
                body: comment,
            }),
            invalidatesTags: (result, error, { taskId }) => [
                { type: 'Workflow', id: taskId },
                'Comments',
            ],
        }),
        bulkApprove: builder.mutation({
            query: (taskIds) => ({
                url: 'workflow-orchestration-service/bulk-approve',
                method: 'POST',
                body: { taskIds },
            }),
            invalidatesTags: ['ApprovalQueue'],
        }),
        bulkReject: builder.mutation({
            query: ({ taskIds, reason }) => ({
                url: 'workflow-orchestration-service/bulk-reject',
                method: 'POST',
                body: { taskIds, reason },
            }),
            invalidatesTags: ['ApprovalQueue'],
        }),
    }),
});

export const {
    useGetApprovalQueueQuery,
    useGetWorkflowDetailsQuery,
    useApproveTaskMutation,
    useRejectTaskMutation,
    useDelegateTaskMutation,
    useGetComparisonQuery,
    useAddCommentMutation,
    useBulkApproveMutation,
    useBulkRejectMutation,
} = workflowAPI;
