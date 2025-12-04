import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Chip,
    Box,
    Button,
    Avatar,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    CheckCircle,
    Cancel,
    PersonAdd,
    AccessTime,
    TrendingUp,
} from '@mui/icons-material';
import { format } from 'date-fns';

const ApprovalTaskCard = ({ task, onApprove, onReject, onDelegate, onClick }) => {
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'success';
            default:
                return 'default';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'rejected':
                return 'error';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'reclassification':
                return <TrendingUp />;
            default:
                return <CheckCircle />;
        }
    };

    return (
        <Card
            sx={{
                mb: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                },
            }}
            onClick={onClick}
        >
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: getPriorityColor(task.priority) + '.main' }}>
                            {getTypeIcon(task.type)}
                        </Avatar>
                        <Box>
                            <Typography variant="h6">
                                {task.transaction?.description || 'Transaction'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ID: {task.transactionId} • {task.type}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label={task.priority}
                            color={getPriorityColor(task.priority)}
                            size="small"
                        />
                        <Chip
                            label={task.status}
                            color={getStatusColor(task.status)}
                            size="small"
                        />
                    </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Amount:</strong> ${task.transaction?.amount?.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Current:</strong> {task.transaction?.currentCategory} →{' '}
                        <strong>Proposed:</strong> {task.transaction?.proposedCategory}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        <strong>Reason:</strong> {task.reason}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                            {task.assignedTo?.charAt(0)}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                            {task.assignedTo}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                            Due: {format(new Date(task.dueDate), 'MMM dd')}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>

            {task.status === 'pending' && (
                <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, pb: 2 }}>
                    <Tooltip title="Delegate">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelegate && onDelegate(task);
                            }}
                        >
                            <PersonAdd />
                        </IconButton>
                    </Tooltip>
                    <Button
                        size="small"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onReject && onReject(task);
                        }}
                    >
                        Reject
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onApprove && onApprove(task);
                        }}
                    >
                        Approve
                    </Button>
                </CardActions>
            )}
        </Card>
    );
};

export default ApprovalTaskCard;
