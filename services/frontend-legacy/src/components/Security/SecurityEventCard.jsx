import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    Avatar,
} from '@mui/material';
import {
    Warning,
    Info,
    Error,
    Login,
    Logout,
    VpnKey,
    Security,
} from '@mui/icons-material';
import { format } from 'date-fns';

const SecurityEventCard = ({ event }) => {
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'default';
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'login':
                return <Login />;
            case 'logout':
                return <Logout />;
            case 'failed_login':
                return <Error />;
            case 'password_reset':
                return <VpnKey />;
            case 'permission_change':
                return <Security />;
            default:
                return <Info />;
        }
    };

    const getEventLabel = (type) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: `${getSeverityColor(event.severity)}.main` }}>
                            {getEventIcon(event.type)}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">
                                {getEventLabel(event.type)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        label={event.severity}
                        color={getSeverityColor(event.severity)}
                        size="small"
                    />
                </Box>

                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>User:</strong> {event.user}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>IP Address:</strong> {event.ipAddress}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {event.details}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default SecurityEventCard;
