import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    approvalQueue: [],
    selectedTasks: [],
    currentTask: null,
    filters: {
        status: 'all', // all, pending, approved, rejected
        priority: 'all', // all, high, medium, low
        assignedTo: 'all',
        search: '',
    },
    sorting: {
        field: 'priority',
        order: 'desc',
    },
    detailDrawerOpen: false,
};

const workflowSlice = createSlice({
    name: 'workflow',
    initialState,
    reducers: {
        setApprovalQueue: (state, action) => {
            state.approvalQueue = action.payload;
        },
        setSelectedTasks: (state, action) => {
            state.selectedTasks = action.payload;
        },
        setCurrentTask: (state, action) => {
            state.currentTask = action.payload;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setSorting: (state, action) => {
            state.sorting = action.payload;
        },
        setDetailDrawerOpen: (state, action) => {
            state.detailDrawerOpen = action.payload;
        },
        addComment: (state, action) => {
            if (state.currentTask) {
                if (!state.currentTask.comments) {
                    state.currentTask.comments = [];
                }
                state.currentTask.comments.push(action.payload);
            }
        },
        updateTaskStatus: (state, action) => {
            const { taskId, status } = action.payload;
            const task = state.approvalQueue.find(t => t.id === taskId);
            if (task) {
                task.status = status;
            }
            if (state.currentTask?.id === taskId) {
                state.currentTask.status = status;
            }
        },
    },
});

export const {
    setApprovalQueue,
    setSelectedTasks,
    setCurrentTask,
    setFilters,
    setSorting,
    setDetailDrawerOpen,
    addComment,
    updateTaskStatus,
} = workflowSlice.actions;

export default workflowSlice.reducer;
