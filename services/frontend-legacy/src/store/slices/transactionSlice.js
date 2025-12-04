import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    transactions: [],
    selectedTransactions: [],
    currentTransaction: null,
    filters: {
        search: '',
        category: 'all',
        dateRange: { start: null, end: null },
        amountRange: { min: null, max: null },
        status: 'all', // 'pending', 'approved', 'flagged', 'all'
    },
    sorting: {
        field: 'date',
        order: 'desc', // 'asc' or 'desc'
    },
    pagination: {
        page: 0,
        pageSize: 25,
        total: 0,
    },
    uploadStatus: {
        isUploading: false,
        progress: 0,
        error: null,
        fileName: null,
    },
    loading: false,
    error: null,
};

const transactionSlice = createSlice({
    name: 'transactions',
    initialState,
    reducers: {
        setTransactions: (state, action) => {
            state.transactions = action.payload;
        },
        setSelectedTransactions: (state, action) => {
            state.selectedTransactions = action.payload;
        },
        setCurrentTransaction: (state, action) => {
            state.currentTransaction = action.payload;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 0; // Reset to first page on filter change
        },
        setSorting: (state, action) => {
            state.sorting = action.payload;
        },
        setPagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },
        setUploadStatus: (state, action) => {
            state.uploadStatus = { ...state.uploadStatus, ...action.payload };
        },
        resetUploadStatus: (state) => {
            state.uploadStatus = initialState.uploadStatus;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
        clearFilters: (state) => {
            state.filters = initialState.filters;
            state.pagination.page = 0;
        },
        updateTransaction: (state, action) => {
            const index = state.transactions.findIndex(t => t.id === action.payload.id);
            if (index !== -1) {
                state.transactions[index] = { ...state.transactions[index], ...action.payload };
            }
        },
        addTransaction: (state, action) => {
            state.transactions.unshift(action.payload);
            state.pagination.total += 1;
        },
    },
});

export const {
    setTransactions,
    setSelectedTransactions,
    setCurrentTransaction,
    setFilters,
    setSorting,
    setPagination,
    setUploadStatus,
    resetUploadStatus,
    setLoading,
    setError,
    clearFilters,
    updateTransaction,
    addTransaction,
} = transactionSlice.actions;

export default transactionSlice.reducer;
