import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    Avatar,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Create,
    Update,
    Delete,
    CheckCircle,
    Cancel,
    Visibility,
    VerifiedUser,
} from '@mui/icons-material';
import { format } from 'date-fns';

const AuditEventCard = ({ event, onClick }) => {
    const getActionIcon = (action) => {
        switch (action) {
            case 'create':
                return <Create />;
            case 'update':
                return <Update />;
            case 'delete':
                return <Delete />;
            case 'approve':
                return <CheckCircle />;
            case 'reject':
                return <Cancel />;
            default:
                return <Visibility />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'create':
                return 'success.main';
            case 'update':
                return 'info.main';
            case 'delete':
                return 'error.main';
            case 'approve':
                return 'success.main';
            case 'reject':
                return 'error.main';
            default:
                return 'grey.500';
        }
    };

    return (
        <Card
            sx={{
                mb: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                    boxShadow: 3,
                },
            }}
            onClick={onClick}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: getActionColor(event.action) }}>
                            {getActionIcon(event.action)}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                {event.action} {event.entity}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="Cryptographically verified">
                            <VerifiedUser color="success" fontSize="small" />
                        </Tooltip>
                        <Chip
                            label={event.entity}
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>User:</strong> {event.user}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Entity ID:</strong> {event.entityId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <strong>IP Address:</strong> {event.ipAddress} • <strong>Session:</strong> {event.sessionId?.substring(0, 12)}...
                    </Typography>
                </Box>

                {event.before && event.after && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{ flex: 1, bgcolor: 'grey.100', p: 1.5, borderRadius: 1 }}>
                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                    BEFORE
                                </Typography>
                                {Object.entries(event.before).map(([key, value]) => (
                                    <Typography key={key} variant="body2" sx={{ mt: 0.5 }}>
                                        <strong>{key}:</strong> {String(value)}
                                    </Typography>
                                ))}
                            </Box>
                            <Box sx={{ flex: 1, bgcolor: 'primary.50', p: 1.5, borderRadius: 1 }}>
                                <Typography variant="caption" fontWeight="bold" color="primary">
                                    AFTER
                                </Typography>
                                {Object.entries(event.after).map(([key, value]) => (
                                    <Typography key={key} variant="body2" sx={{ mt: 0.5 }}>
                                        <strong>{key}:</strong> {String(value)}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>
                    </>
                )}

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        Hash: {event.hash?.substring(0, 16)}...
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default AuditEventCard;
