import React, { useState } from 'react';
import {
    Box,
    Grid,
    Typography,
    Tabs,
    Tab,
    Paper,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Chip,
} from '@mui/material';
import { Search, Add, Assessment } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import AuditEventCard from '../components/Audit/AuditEventCard';
import ComplianceReportCard from '../components/Audit/ComplianceReportCard';
import ReportGenerator from '../components/Audit/ReportGenerator';
import {
    useGetAuditEventsQuery,
    useGetComplianceReportsQuery,
    useGenerateReportMutation,
} from '../store/api/auditAPI';
import { setFilters, setCurrentEvent } from '../store/slices/auditSlice';

const AuditCompliance = () => {
    const dispatch = useDispatch();
    const { filters } = useSelector((state) => state.audit);

    const [activeTab, setActiveTab] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [showReportGenerator, setShowReportGenerator] = useState(false);

    // Fetch audit events and compliance reports
    const { data: eventsData, isLoading: eventsLoading } = useGetAuditEventsQuery({ filters });
    const { data: reportsData, isLoading: reportsLoading } = useGetComplianceReportsQuery();

    const [generateReport] = useGenerateReportMutation();

    // Mock data for demonstration
    const mockEvents = eventsData?.events || [
        {
            id: 1,
            timestamp: '2024-01-15T14:20:00Z',
            action: 'approve',
            user: 'Mike Johnson',
            entity: 'Transaction',
            entityId: 3,
            before: { status: 'pending', category: 'Operating' },
            after: { status: 'approved', category: 'Financing' },
            ipAddress: '192.168.1.100',
            sessionId: 'sess_abc123',
            hash: 'a1b2c3d4e5f6789012345678901234567890',
        },
        {
            id: 2,
            timestamp: '2024-01-15T11:45:00Z',
            action: 'update',
            user: 'Jane Doe',
            entity: 'Transaction',
            entityId: 4,
            before: { description: 'Service Revenue', amount: 75000 },
            after: { description: 'Service Revenue - Consulting', amount: 75000 },
            ipAddress: '192.168.1.101',
            sessionId: 'sess_def456',
            hash: 'b2c3d4e5f67890123456789012345678901a',
        },
        {
            id: 3,
            timestamp: '2024-01-15T10:31:00Z',
            action: 'create',
            user: 'AI System',
            entity: 'Classification',
            entityId: 5,
            before: null,
            after: { category: 'Financing', confidence: 0.92 },
            ipAddress: '10.0.0.1',
            sessionId: 'sess_system',
            hash: 'c3d4e5f678901234567890123456789012ab',
        },
        {
            id: 4,
            timestamp: '2024-01-14T16:00:00Z',
            action: 'delete',
            user: 'John Smith',
            entity: 'Transaction',
            entityId: 10,
            before: { status: 'draft', amount: 1000 },
            after: null,
            ipAddress: '192.168.1.102',
            sessionId: 'sess_ghi789',
            hash: 'd4e5f6789012345678901234567890123abc',
        },
    ];

    const mockReports = reportsData?.reports || [
        {
            id: 1,
            type: 'SOX Compliance',
            status: 'compliant',
            score: 98,
            generatedAt: '2024-01-15',
            period: 'Q4 2023',
            trend: 'up',
            findings: [],
        },
        {
            id: 2,
            type: 'GAAP Compliance',
            status: 'compliant',
            score: 95,
            generatedAt: '2024-01-14',
            period: 'Q4 2023',
            trend: 'up',
            findings: [],
        },
        {
            id: 3,
            type: 'SEC Form 10-Q',
            status: 'warning',
            score: 85,
            generatedAt: '2024-01-10',
            period: 'Q4 2023',
            trend: 'down',
            findings: [
                { type: 'warning', message: 'Missing documentation for 2 transactions' },
            ],
        },
    ];

    const handleEventClick = (event) => {
        dispatch(setCurrentEvent(event));
        console.log('Event clicked:', event);
    };

    const handleFilterChange = (filterName, value) => {
        dispatch(setFilters({ [filterName]: value }));
    };

    const handleGenerateReport = async (reportConfig) => {
        try {
            await generateReport(reportConfig).unwrap();
            setShowReportGenerator(false);
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    };

    const handleViewReport = (report) => {
        console.log('View report:', report);
    };

    const handleDownloadReport = (report) => {
        console.log('Download report:', report);
    };

    const filteredEvents = mockEvents.filter((event) => {
        if (searchText && !event.action.toLowerCase().includes(searchText.toLowerCase()) &&
            !event.user.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }
        return true;
    });

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Audit & Compliance Hub
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Explore audit trails and manage compliance reports
                </Typography>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="primary.main">
                            {mockEvents.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Audit Events
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="success.main">
                            96
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Average Compliance Score
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="warning.main">
                            {mockReports.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Active Reports
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label="Audit Trail" />
                <Tab label="Compliance Reports" />
            </Tabs>

            {/* Audit Trail Tab */}
            {activeTab === 0 && (
                <Box>
                    {/* Filters */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            placeholder="Search events..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 300 }}
                        />

                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Action Type</InputLabel>
                            <Select
                                value={filters.actionTypes[0] || 'all'}
                                label="Action Type"
                                onChange={(e) => handleFilterChange('actionTypes', [e.target.value])}
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="create">Create</MenuItem>
                                <MenuItem value="update">Update</MenuItem>
                                <MenuItem value="delete">Delete</MenuItem>
                                <MenuItem value="approve">Approve</MenuItem>
                                <MenuItem value="reject">Reject</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Event List */}
                    {eventsLoading ? (
                        <Typography>Loading...</Typography>
                    ) : filteredEvents.length === 0 ? (
                        <Typography color="text.secondary">No audit events found</Typography>
                    ) : (
                        filteredEvents.map((event) => (
                            <AuditEventCard
                                key={event.id}
                                event={event}
                                onClick={() => handleEventClick(event)}
                            />
                        ))
                    )}
                </Box>
            )}

            {/* Compliance Reports Tab */}
            {activeTab === 1 && (
                <Box>
                    {!showReportGenerator ? (
                        <>
                            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Compliance Reports</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => setShowReportGenerator(true)}
                                >
                                    Generate New Report
                                </Button>
                            </Box>

                            <Grid container spacing={3}>
                                {reportsLoading ? (
                                    <Grid item xs={12}>
                                        <Typography>Loading...</Typography>
                                    </Grid>
                                ) : mockReports.length === 0 ? (
                                    <Grid item xs={12}>
                                        <Typography color="text.secondary">No reports found</Typography>
                                    </Grid>
                                ) : (
                                    mockReports.map((report) => (
                                        <Grid item xs={12} sm={6} md={4} key={report.id}>
                                            <ComplianceReportCard
                                                report={report}
                                                onView={handleViewReport}
                                                onDownload={handleDownloadReport}
                                            />
                                        </Grid>
                                    ))
                                )}
                            </Grid>
                        </>
                    ) : (
                        <ReportGenerator
                            onGenerate={handleGenerateReport}
                            onCancel={() => setShowReportGenerator(false)}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
};

export default AuditCompliance;
