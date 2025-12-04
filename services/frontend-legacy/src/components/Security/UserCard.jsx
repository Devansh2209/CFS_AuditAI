import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Box,
    Typography,
    Chip,
    Avatar,
    IconButton,
    Tooltip,
    Button,
} from '@mui/material';
import {
    Edit,
    Lock,
    LockOpen,
    Delete,
    VpnKey,
} from '@mui/icons-material';
import { format } from 'date-fns';

const UserCard = ({ user, onEdit, onToggleStatus, onDelete, onResetPassword }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'default';
            case 'locked':
                return 'error';
            default:
                return 'default';
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'Admin':
                return 'error';
            case 'Manager':
                return 'warning';
            case 'Accountant':
                return 'info';
            case 'Viewer':
                return 'default';
            default:
                return 'primary';
        }
    };

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                        {(user.full_name || user.username || 'U').split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">{user.full_name || user.username}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {user.email}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label={user.role}
                            color={getRoleColor(user.role)}
                            size="small"
                        />
                        <Chip
                            label={user.status}
                            color={getStatusColor(user.status)}
                            size="small"
                        />
                    </Box>
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary">
                        <strong>Last Login:</strong>{' '}
                        {user.lastLogin
                            ? format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm')
                            : 'Never'}
                    </Typography>
                </Box>
            </CardContent>

            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Box>
                    <Tooltip title="Edit User">
                        <IconButton size="small" onClick={() => onEdit && onEdit(user)}>
                            <Edit />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={user.status === 'active' ? 'Lock User' : 'Unlock User'}>
                        <IconButton
                            size="small"
                            onClick={() => onToggleStatus && onToggleStatus(user)}
                        >
                            {user.status === 'active' ? <Lock /> : <LockOpen />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset Password">
                        <IconButton
                            size="small"
                            onClick={() => onResetPassword && onResetPassword(user)}
                        >
                            <VpnKey />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Tooltip title="Delete User">
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete && onDelete(user)}
                    >
                        <Delete />
                    </IconButton>
                </Tooltip>
            </CardActions>
        </Card>
    );
};

export default UserCard;
