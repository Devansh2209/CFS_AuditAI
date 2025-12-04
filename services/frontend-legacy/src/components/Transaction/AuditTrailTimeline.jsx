import React from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    Avatar,
    Divider,
} from '@mui/material';
import {
    Upload,
    Category,
    CheckCircle,
    Edit,
    Flag,
} from '@mui/icons-material';
import { format } from 'date-fns';

const getActionIcon = (actionType) => {
    switch (actionType) {
        case 'upload':
            return <Upload />;
        case 'classify':
            return <Category />;
        case 'approve':
            return <CheckCircle />;
        case 'edit':
            return <Edit />;
        case 'flag':
            return <Flag />;
        default:
            return <Category />;
    }
};

const getActionColor = (actionType) => {
    switch (actionType) {
        case 'upload':
            return 'info.main';
        case 'classify':
            return 'primary.main';
        case 'approve':
            return 'success.main';
        case 'edit':
            return 'warning.main';
        case 'flag':
            return 'error.main';
        default:
            return 'grey.500';
    }
};

const AuditTrailTimeline = ({ auditTrail = [] }) => {
    // Mock data if no audit trail provided
    const mockAuditTrail = auditTrail.length > 0 ? auditTrail : [
        {
            id: 1,
            timestamp: new Date('2024-01-15T10:30:00'),
            action: 'upload',
            user: 'John Smith',
            description: 'Transaction uploaded via CSV import',
        },
        {
            id: 2,
            timestamp: new Date('2024-01-15T10:31:15'),
            action: 'classify',
            user: 'AI System',
            description: 'Classified as Operating activity with 95% confidence',
        },
        {
            id: 3,
            timestamp: new Date('2024-01-15T11:45:22'),
            action: 'edit',
            user: 'Jane Doe',
            description: 'Updated transaction description for clarity',
        },
        {
            id: 4,
            timestamp: new Date('2024-01-15T14:20:00'),
            action: 'approve',
            user: 'Mike Johnson',
            description: 'Classification approved by senior accountant',
        },
    ];

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Audit Trail
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Complete history of all actions performed on this transaction
            </Typography>

            <List>
                {mockAuditTrail.map((item, index) => (
                    <React.Fragment key={item.id}>
                        <ListItem
                            sx={{
                                alignItems: 'flex-start',
                                gap: 2,
                                px: 0,
                            }}
                        >
                            <Avatar
                                sx={{
                                    bgcolor: getActionColor(item.action),
                                    mt: 0.5,
                                }}
                            >
                                {getActionIcon(item.action)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" fontWeight="bold">
                                        {item.user}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(new Date(item.timestamp), 'MMM dd, HH:mm')}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {item.description}
                                </Typography>
                            </Box>
                        </ListItem>
                        {index < mockAuditTrail.length - 1 && <Divider sx={{ my: 1.5 }} />}
                    </React.Fragment>
                ))}
            </List>
        </Paper>
    );
};

export default AuditTrailTimeline;
