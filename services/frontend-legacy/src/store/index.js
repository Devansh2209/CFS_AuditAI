import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import transactionReducer from './slices/transactionSlice';
import workflowReducer from './slices/workflowSlice';
import auditReducer from './slices/auditSlice';
import securityReducer from './slices/securitySlice';
import { transactionAPI } from './api/transactionAPI';
import { workflowAPI } from './api/workflowAPI';
import { auditAPI } from './api/auditAPI';
import { securityAPI } from './api/securityAPI';

export const store = configureStore({
    reducer: {
        dashboard: dashboardReducer,
        transactions: transactionReducer,
        workflow: workflowReducer,
        audit: auditReducer,
        security: securityReducer,
        [transactionAPI.reducerPath]: transactionAPI.reducer,
        [workflowAPI.reducerPath]: workflowAPI.reducer,
        [auditAPI.reducerPath]: auditAPI.reducer,
        [securityAPI.reducerPath]: securityAPI.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(transactionAPI.middleware)
            .concat(workflowAPI.middleware)
            .concat(auditAPI.middleware)
            .concat(securityAPI.middleware),
});
