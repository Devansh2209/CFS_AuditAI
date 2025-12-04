import React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Tooltip,
    Chip,
    Box,
} from '@mui/material';
import { Cancel, Computer, Smartphone, Tablet } from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

const SessionMonitor = ({ sessions, onTerminate }) => {
    const mockSessions = sessions || [
        {
            id: 1,
            userId: 1,
            userName: 'Jane Doe',
            ipAddress: '192.168.1.100',
            location: 'New York, US',
            device: 'desktop',
            startTime: '2024-01-15T09:00:00Z',
            lastActivity: '2024-01-15T14:20:00Z',
        },
        {
            id: 2,
            userId: 2,
            userName: 'John Smith',
            ipAddress: '192.168.1.101',
            location: 'London, UK',
            device: 'mobile',
            startTime: '2024-01-15T10:30:00Z',
            lastActivity: '2024-01-15T14:15:00Z',
        },
        {
            id: 3,
            userId: 3,
            userName: 'Mike Johnson',
            ipAddress: '192.168.1.102',
            location: 'Tokyo, JP',
            device: 'tablet',
            startTime: '2024-01-15T08:00:00Z',
            lastActivity: '2024-01-15T14:10:00Z',
        },
    ];

    const getDeviceIcon = (device) => {
        switch (device) {
            case 'desktop':
                return <Computer />;
            case 'mobile':
                return <Smartphone />;
            case 'tablet':
                return <Tablet />;
            default:
                return <Computer />;
        }
    };

    const getSessionDuration = (startTime) => {
        return formatDistanceToNow(new Date(startTime), { addSuffix: false });
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Active Sessions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Monitor and manage active user sessions
                </Typography>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Device</TableCell>
                            <TableCell>IP Address</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Last Activity</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mockSessions.map((session) => (
                            <TableRow key={session.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
                                        {session.userName}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {getDeviceIcon(session.device)}
                                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                            {session.device}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {session.ipAddress}
                                    </Typography>
                                </TableCell>
                                <TableCell>{session.location}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={getSessionDuration(session.startTime)}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption">
                                        {format(new Date(session.lastActivity), 'HH:mm:ss')}
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Terminate Session">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => onTerminate && onTerminate(session)}
                                        >
                                            <Cancel />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default SessionMonitor;
