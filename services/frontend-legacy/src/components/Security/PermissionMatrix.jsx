import React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Typography,
    Box,
} from '@mui/material';

const PermissionMatrix = ({ roles, permissions, onPermissionChange }) => {
    const mockRoles = roles || [
        { id: 1, name: 'Admin', permissions: ['read', 'write', 'delete', 'admin'] },
        { id: 2, name: 'Manager', permissions: ['read', 'write', 'approve'] },
        { id: 3, name: 'Accountant', permissions: ['read', 'write'] },
        { id: 4, name: 'Viewer', permissions: ['read'] },
    ];

    const mockPermissions = permissions || [
        { id: 'read', label: 'View Transactions', category: 'Transactions' },
        { id: 'write', label: 'Edit Transactions', category: 'Transactions' },
        { id: 'delete', label: 'Delete Transactions', category: 'Transactions' },
        { id: 'approve', label: 'Approve Workflows', category: 'Workflows' },
        { id: 'admin', label: 'System Administration', category: 'System' },
    ];

    const hasPermission = (role, permissionId) => {
        return role.permissions.includes(permissionId);
    };

    const groupedPermissions = mockPermissions.reduce((acc, perm) => {
        if (!acc[perm.category]) {
            acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
    }, {});

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Permission Matrix
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure role-based access control permissions
            </Typography>

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Permission</TableCell>
                            {mockRoles.map((role) => (
                                <TableCell key={role.id} align="center" sx={{ fontWeight: 'bold' }}>
                                    {role.name}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                            <React.Fragment key={category}>
                                <TableRow>
                                    <TableCell
                                        colSpan={mockRoles.length + 1}
                                        sx={{
                                            bgcolor: 'grey.100',
                                            fontWeight: 'bold',
                                            py: 1,
                                        }}
                                    >
                                        {category}
                                    </TableCell>
                                </TableRow>
                                {perms.map((permission) => (
                                    <TableRow key={permission.id} hover>
                                        <TableCell>{permission.label}</TableCell>
                                        {mockRoles.map((role) => (
                                            <TableCell key={role.id} align="center">
                                                <Checkbox
                                                    checked={hasPermission(role, permission.id)}
                                                    onChange={() =>
                                                        onPermissionChange &&
                                                        onPermissionChange(role.id, permission.id)
                                                    }
                                                    color="primary"
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default PermissionMatrix;
