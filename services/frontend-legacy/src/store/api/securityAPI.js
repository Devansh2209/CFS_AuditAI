import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const securityAPI = createApi({
    reducerPath: 'securityAPI',
    baseQuery: fetchBaseQuery({ baseUrl: '/' }),
    tagTypes: ['Users', 'Roles', 'Sessions', 'SecurityEvents'],
    endpoints: (builder) => ({
        getUsers: builder.query({
            query: () => 'security-auth-service/users',
            providesTags: ['Users'],
        }),
        createUser: builder.mutation({
            query: (userData) => ({
                url: 'security-auth-service/auth/register',
                method: 'POST',
                body: userData,
            }),
            invalidatesTags: ['Users'],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...userData }) => ({
                url: `security-auth-service/users/${id}`,
                method: 'PUT',
                body: userData,
            }),
            invalidatesTags: ['Users'],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({
                url: `security-auth-service/users/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Users'],
        }),
        getRoles: builder.query({
            query: () => 'security-auth-service/roles',
            providesTags: ['Roles'],
        }),
        updateRole: builder.mutation({
            query: ({ id, ...roleData }) => ({
                url: `security-auth-service/roles/${id}`,
                method: 'PUT',
                body: roleData,
            }),
            invalidatesTags: ['Roles'],
        }),
        getSessions: builder.query({
            query: () => 'security-auth-service/sessions',
            providesTags: ['Sessions'],
        }),
        terminateSession: builder.mutation({
            query: (sessionId) => ({
                url: `security-auth-service/sessions/${sessionId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Sessions'],
        }),
        getSecurityEvents: builder.query({
            query: ({ filters } = {}) => ({
                url: 'security-auth-service/security-events',
                params: filters,
            }),
            providesTags: ['SecurityEvents'],
        }),
    }),
});

export const {
    useGetUsersQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useGetRolesQuery,
    useUpdateRoleMutation,
    useGetSessionsQuery,
    useTerminateSessionMutation,
    useGetSecurityEventsQuery,
} = securityAPI;
