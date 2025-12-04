import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    auditEvents: [],
    selectedEvents: [],
    currentEvent: null,
    filters: {
        dateRange: {
            start: null,
            end: null,
        },
        users: [],
        actionTypes: [],
        entityTypes: [],
        search: '',
    },
    viewMode: 'list', // list, timeline
    complianceReports: [],
    evidencePackage: {
        events: [],
        documents: [],
        metadata: {},
    },
    reportGenerationStatus: {
        isGenerating: false,
        progress: 0,
        error: null,
    },
};

const auditSlice = createSlice({
    name: 'audit',
    initialState,
    reducers: {
        setAuditEvents: (state, action) => {
            state.auditEvents = action.payload;
        },
        setSelectedEvents: (state, action) => {
            state.selectedEvents = action.payload;
        },
        setCurrentEvent: (state, action) => {
            state.currentEvent = action.payload;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setViewMode: (state, action) => {
            state.viewMode = action.payload;
        },
        setComplianceReports: (state, action) => {
            state.complianceReports = action.payload;
        },
        addToEvidencePackage: (state, action) => {
            state.evidencePackage.events.push(action.payload);
        },
        removeFromEvidencePackage: (state, action) => {
            state.evidencePackage.events = state.evidencePackage.events.filter(
                (e) => e.id !== action.payload
            );
        },
        setEvidencePackageMetadata: (state, action) => {
            state.evidencePackage.metadata = action.payload;
        },
        clearEvidencePackage: (state) => {
            state.evidencePackage = {
                events: [],
                documents: [],
                metadata: {},
            };
        },
        setReportGenerationStatus: (state, action) => {
            state.reportGenerationStatus = { ...state.reportGenerationStatus, ...action.payload };
        },
    },
});

export const {
    setAuditEvents,
    setSelectedEvents,
    setCurrentEvent,
    setFilters,
    setViewMode,
    setComplianceReports,
    addToEvidencePackage,
    removeFromEvidencePackage,
    setEvidencePackageMetadata,
    clearEvidencePackage,
    setReportGenerationStatus,
} = auditSlice.actions;

export default auditSlice.reducer;
