import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    metrics: {
        totalTransactions: 0,
        aiAccuracy: 0,
        timeSaved: 0,
        pendingReviews: 0,
    },
    cashFlow: {
        operating: 0,
        investing: 0,
        financing: 0,
    },
    serviceHealth: {},
    loading: false,
    error: null,
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setMetrics: (state, action) => {
            state.metrics = action.payload;
        },
        setCashFlow: (state, action) => {
            state.cashFlow = action.payload;
        },
        setServiceHealth: (state, action) => {
            state.serviceHealth = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { setMetrics, setCashFlow, setServiceHealth, setLoading, setError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
