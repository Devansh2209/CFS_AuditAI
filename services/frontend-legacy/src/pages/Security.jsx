import React, { useState } from 'react';
import {
    Box,
    Grid,
    Typography,
    Tabs,
    Tab,
    Paper,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Add, Security as SecurityIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import UserCard from '../components/Security/UserCard';
import PermissionMatrix from '../components/Security/PermissionMatrix';
import SessionMonitor from '../components/Security/SessionMonitor';
import SecurityEventCard from '../components/Security/SecurityEventCard';
import {
    useGetUsersQuery,
    useGetRolesQuery,
    useGetSessionsQuery,
    useGetSecurityEventsQuery,
    useTerminateSessionMutation,
} from '../store/api/securityAPI';
import { setFilters } from '../store/slices/securitySlice';

const Security = () => {
    const dispatch = useDispatch();
    const { filters } = useSelector((state) => state.security);

    const [activeTab, setActiveTab] = useState(0);

    // Fetch data
    const { data: usersData, isLoading: usersLoading } = useGetUsersQuery();
    const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();
    const { data: sessionsData, isLoading: sessionsLoading } = useGetSessionsQuery();
    const { data: eventsData, isLoading: eventsLoading } = useGetSecurityEventsQuery({ filters });

    const [terminateSession] = useTerminateSessionMutation();

    // Mock data for demonstration
    const mockUsers = usersData?.users || [
        {
            id: 1,
            name: 'Jane Doe',
            email: 'jane.doe@company.com',
            role: 'Admin',
            status: 'active',
            lastLogin: '2024-01-15T14:20:00Z',
        },
        {
            id: 2,
            name: 'John Smith',
            email: 'john.smith@company.com',
            role: 'Manager',
            status: 'active',
            lastLogin: '2024-01-15T13:45:00Z',
        },
        {
            id: 3,
            name: 'Mike Johnson',
            email: 'mike.johnson@company.com',
            role: 'Accountant',
            status: 'active',
            lastLogin: '2024-01-15T12:30:00Z',
        },
        {
            id: 4,
            name: 'Sarah Williams',
            email: 'sarah.williams@company.com',
            role: 'Viewer',
            status: 'inactive',
            lastLogin: '2024-01-10T09:00:00Z',
        },
    ];

    const mockSecurityEvents = eventsData?.events || [
        {
            id: 1,
            type: 'failed_login',
            severity: 'warning',
            user: 'unknown',
            ipAddress: '192.168.1.200',
            timestamp: '2024-01-15T14:15:00Z',
            details: 'Multiple failed login attempts from suspicious IP',
        },
        {
            id: 2,
            type: 'permission_change',
            severity: 'info',
            user: 'Jane Doe',
            ipAddress: '192.168.1.100',
            timestamp: '2024-01-15T11:00:00Z',
            details: 'Updated permissions for Manager role',
        },
        {
            id: 3,
            type: 'password_reset',
            severity: 'info',
            user: 'John Smith',
            ipAddress: '192.168.1.101',
            timestamp: '2024-01-15T10:30:00Z',
            details: 'Password reset requested and completed',
        },
    ];

    const handleEditUser = (user) => {
        console.log('Edit user:', user);
    };

    const handleToggleUserStatus = (user) => {
        console.log('Toggle user status:', user);
    };

    const handleDeleteUser = (user) => {
        console.log('Delete user:', user);
    };

    const handleResetPassword = (user) => {
        console.log('Reset password for:', user);
    };

    const handleTerminateSession = async (session) => {
        try {
            await terminateSession(session.id).unwrap();
        } catch (error) {
            console.error('Failed to terminate session:', error);
        }
    };

    const handlePermissionChange = (roleId, permissionId) => {
        console.log('Permission change:', roleId, permissionId);
    };

    const handleFilterChange = (filterName, value) => {
        dispatch(setFilters({ [filterName]: value }));
    };

    const filteredUsers = mockUsers.filter((user) => {
        if (filters.userStatus !== 'all' && user.status !== filters.userStatus) return false;
        if (filters.roleFilter !== 'all' && user.role !== filters.roleFilter) return false;
        return true;
    });

    const filteredEvents = mockSecurityEvents.filter((event) => {
        if (filters.eventSeverity !== 'all' && event.severity !== filters.eventSeverity) return false;
        return true;
    });

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Security & Access Control
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage users, roles, permissions, and monitor security events
                </Typography>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="primary.main">
                            {mockUsers.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Users
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="success.main">
                            {mockUsers.filter(u => u.status === 'active').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Active Sessions
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h3" color="warning.main">
                            {mockSecurityEvents.filter(e => e.severity === 'warning').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Security Alerts
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label="Users & Roles" />
                <Tab label="Sessions" />
                <Tab label="Security Events" />
            </Tabs>

            {/* Users & Roles Tab */}
            {activeTab === 0 && (
                <Box>
                    {/* Filters */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={filters.userStatus}
                                    label="Status"
                                    onChange={(e) => handleFilterChange('userStatus', e.target.value)}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                    <MenuItem value="locked">Locked</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={filters.roleFilter}
                                    label="Role"
                                    onChange={(e) => handleFilterChange('roleFilter', e.target.value)}
                                >
                                    <MenuItem value="all">All</MenuItem>
                                    <MenuItem value="Admin">Admin</MenuItem>
                                    <MenuItem value="Manager">Manager</MenuItem>
                                    <MenuItem value="Accountant">Accountant</MenuItem>
                                    <MenuItem value="Viewer">Viewer</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Button variant="contained" startIcon={<Add />}>
                            Add User
                        </Button>
                    </Box>

                    {/* User List */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {usersLoading ? (
                            <Grid item xs={12}>
                                <Typography>Loading...</Typography>
                            </Grid>
                        ) : filteredUsers.length === 0 ? (
                            <Grid item xs={12}>
                                <Typography color="text.secondary">No users found</Typography>
                            </Grid>
                        ) : (
                            filteredUsers.map((user) => (
                                <Grid item xs={12} sm={6} md={4} key={user.id}>
                                    <UserCard
                                        user={user}
                                        onEdit={handleEditUser}
                                        onToggleStatus={handleToggleUserStatus}
                                        onDelete={handleDeleteUser}
                                        onResetPassword={handleResetPassword}
                                    />
                                </Grid>
                            ))
                        )}
                    </Grid>

                    {/* Permission Matrix */}
                    <PermissionMatrix onPermissionChange={handlePermissionChange} />
                </Box>
            )}

            {/* Sessions Tab */}
            {activeTab === 1 && (
                <Box>
                    {sessionsLoading ? (
                        <Typography>Loading...</Typography>
                    ) : (
                        <SessionMonitor onTerminate={handleTerminateSession} />
                    )}
                </Box>
            )}

            {/* Security Events Tab */}
            {activeTab === 2 && (
                <Box>
                    {/* Filters */}
                    <Box sx={{ mb: 3 }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Severity</InputLabel>
                            <Select
                                value={filters.eventSeverity}
                                label="Severity"
                                onChange={(e) => handleFilterChange('eventSeverity', e.target.value)}
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="info">Info</MenuItem>
                                <MenuItem value="warning">Warning</MenuItem>
                                <MenuItem value="critical">Critical</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Event List */}
                    {eventsLoading ? (
                        <Typography>Loading...</Typography>
                    ) : filteredEvents.length === 0 ? (
                        <Typography color="text.secondary">No security events found</Typography>
                    ) : (
                        filteredEvents.map((event) => (
                            <SecurityEventCard key={event.id} event={event} />
                        ))
                    )}
                </Box>
            )}
        </Box>
    );
};

export default Security;
