import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    Chip,
    Divider,
    Table,
    TableBody,
    TableRow,
    TableCell,
} from '@mui/material';
import { ArrowBack, Edit, CheckCircle, Flag } from '@mui/icons-material';
import { format } from 'date-fns';
import AuditTrailTimeline from '../components/Transaction/AuditTrailTimeline';
import ClassificationEvidencePanel from '../components/Transaction/ClassificationEvidencePanel';
import { useGetTransactionQuery, useGetAuditTrailQuery } from '../store/api/transactionAPI';

const TransactionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: transaction, isLoading } = useGetTransactionQuery(id);
    const { data: auditTrail } = useGetAuditTrailQuery(id);

    // Mock data for demonstration
    const mockTransaction = transaction || {
        id: 1,
        date: '2024-01-15',
        description: 'Payment to ABC Suppliers for raw materials and inventory',
        counterparty: 'ABC Suppliers Inc.',
        amount: 25000.00,
        category: 'Operating',
        confidence: 0.95,
        status: 'pending',
        accountNumber: '1000-5432',
        reference: 'INV-2024-0115',
        paymentMethod: 'Wire Transfer',
        currency: 'USD',
        notes: 'Regular monthly payment for supplies',
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'flagged':
                return 'error';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Operating':
                return 'success';
            case 'Investing':
                return 'warning';
            case 'Financing':
                return 'error';
            default:
                return 'default';
        }
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/transactions')}
                    sx={{ mb: 2 }}
                >
                    Back to Transactions
                </Button>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                            Transaction Details
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Reference: {mockTransaction.reference}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label={mockTransaction.status}
                            color={getStatusColor(mockTransaction.status)}
                        />
                        <Chip
                            label={mockTransaction.category}
                            color={getCategoryColor(mockTransaction.category)}
                        />
                    </Box>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Transaction Overview */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Transaction Overview
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell component="th" sx={{ fontWeight: 'bold', width: '30%' }}>
                                        Date
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(mockTransaction.date), 'MMMM dd, yyyy')}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                        Description
                                    </TableCell>
                                    <TableCell>{mockTransaction.description}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                        Counterparty
                                    </TableCell>
                                    <TableCell>{mockTransaction.counterparty}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                        Amount
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body1" fontWeight="bold" color="primary">
                                            ${mockTransaction.amount.toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })} {mockTransaction.currency}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                        Account Number
                                    </TableCell>
                                    <TableCell>{mockTransaction.accountNumber}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                        Payment Method
                                    </TableCell>
                                    <TableCell>{mockTransaction.paymentMethod}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                        AI Confidence
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`${(mockTransaction.confidence * 100).toFixed(0)}%`}
                                            color={mockTransaction.confidence >= 0.9 ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                </TableRow>
                                {mockTransaction.notes && (
                                    <TableRow>
                                        <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                                            Notes
                                        </TableCell>
                                        <TableCell>{mockTransaction.notes}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={<Edit />}
                                fullWidth
                            >
                                Edit Transaction
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                fullWidth
                            >
                                Approve
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<Flag />}
                                fullWidth
                            >
                                Flag for Review
                            </Button>
                        </Box>
                    </Paper>

                    {/* Classification Evidence */}
                    <ClassificationEvidencePanel
                        classification={{
                            confidence: mockTransaction.confidence,
                            category: mockTransaction.category,
                        }}
                    />
                </Grid>

                {/* Audit Trail */}
                <Grid item xs={12} md={4}>
                    <AuditTrailTimeline auditTrail={auditTrail} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default TransactionDetail;
