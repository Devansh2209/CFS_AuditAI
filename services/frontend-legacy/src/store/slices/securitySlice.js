import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    users: [],
    roles: [],
    sessions: [],
    securityEvents: [],
    selectedUsers: [],
    currentUser: null,
    currentRole: null,
    filters: {
        userStatus: 'all', // all, active, inactive, locked
        roleFilter: 'all',
        eventSeverity: 'all', // all, info, warning, critical
    },
    userDialogOpen: false,
    roleEditorOpen: false,
};

const securitySlice = createSlice({
    name: 'security',
    initialState,
    reducers: {
        setUsers: (state, action) => {
            state.users = action.payload;
        },
        setRoles: (state, action) => {
            state.roles = action.payload;
        },
        setSessions: (state, action) => {
            state.sessions = action.payload;
        },
        setSecurityEvents: (state, action) => {
            state.securityEvents = action.payload;
        },
        setSelectedUsers: (state, action) => {
            state.selectedUsers = action.payload;
        },
        setCurrentUser: (state, action) => {
            state.currentUser = action.payload;
        },
        setCurrentRole: (state, action) => {
            state.currentRole = action.payload;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setUserDialogOpen: (state, action) => {
            state.userDialogOpen = action.payload;
        },
        setRoleEditorOpen: (state, action) => {
            state.roleEditorOpen = action.payload;
        },
        updateUserStatus: (state, action) => {
            const { userId, status } = action.payload;
            const user = state.users.find(u => u.id === userId);
            if (user) {
                user.status = status;
            }
        },
    },
});

export const {
    setUsers,
    setRoles,
    setSessions,
    setSecurityEvents,
    setSelectedUsers,
    setCurrentUser,
    setCurrentRole,
    setFilters,
    setUserDialogOpen,
    setRoleEditorOpen,
    updateUserStatus,
} = securitySlice.actions;

export default securitySlice.reducer;
