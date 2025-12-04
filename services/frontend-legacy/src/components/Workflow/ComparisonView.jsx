import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Table,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    Divider,
} from '@mui/material';
import { TrendingUp, TrendingDown, CompareArrows } from '@mui/icons-material';

const ComparisonView = ({ comparison }) => {
    const mockComparison = comparison || {
        original: {
            category: 'Operating',
            subcategory: 'General Expenses',
            confidence: 0.72,
            reasoning: 'Transaction description matches operating expense patterns',
        },
        proposed: {
            category: 'Financing',
            subcategory: 'Loan Repayment',
            confidence: 0.92,
            reasoning: 'Transaction pattern and counterparty analysis indicates loan repayment activity',
        },
        differences: [
            {
                field: 'Category',
                original: 'Operating',
                proposed: 'Financing',
                impact: 'high',
            },
            {
                field: 'Subcategory',
                original: 'General Expenses',
                proposed: 'Loan Repayment',
                impact: 'high',
            },
            {
                field: 'AI Confidence',
                original: '72%',
                proposed: '92%',
                impact: 'medium',
            },
        ],
        evidence: [
            'Counterparty identified as "First National Bank"',
            'Transaction amount matches scheduled loan payment',
            'Historical pattern shows monthly recurring payment',
            'GAAP ASC 230-10-45-15: Financing activities include repayment of debt',
        ],
    };

    const getImpactColor = (impact) => {
        switch (impact) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'info';
            default:
                return 'default';
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Classification Comparison
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Side-by-side comparison of original vs. proposed classification
            </Typography>

            <Grid container spacing={3}>
                {/* Original Classification */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <TrendingDown color="action" />
                            <Typography variant="subtitle1" fontWeight="bold">
                                Original Classification
                            </Typography>
                        </Box>
                        <Table size="small">
                            <TableBody>
                                <TableRow>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell>{mockComparison.original.category}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Subcategory</strong></TableCell>
                                    <TableCell>{mockComparison.original.subcategory}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Confidence</strong></TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`${(mockComparison.original.confidence * 100).toFixed(0)}%`}
                                            color={mockComparison.original.confidence >= 0.9 ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                Reasoning:
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {mockComparison.original.reasoning}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Proposed Classification */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.main' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <TrendingUp color="primary" />
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                Proposed Classification
                            </Typography>
                        </Box>
                        <Table size="small">
                            <TableBody>
                                <TableRow>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell>{mockComparison.proposed.category}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Subcategory</strong></TableCell>
                                    <TableCell>{mockComparison.proposed.subcategory}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>Confidence</strong></TableCell>
                                    <TableCell>
                                        <Chip
                                            label={`${(mockComparison.proposed.confidence * 100).toFixed(0)}%`}
                                            color={mockComparison.proposed.confidence >= 0.9 ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                Reasoning:
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {mockComparison.proposed.reasoning}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Key Differences */}
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CompareArrows color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">
                        Key Differences
                    </Typography>
                </Box>
                <Table size="small">
                    <TableBody>
                        {mockComparison.differences.map((diff, index) => (
                            <TableRow key={index}>
                                <TableCell sx={{ width: '30%' }}>
                                    <strong>{diff.field}</strong>
                                </TableCell>
                                <TableCell sx={{ bgcolor: 'grey.100' }}>
                                    {diff.original}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center', width: 50 }}>→</TableCell>
                                <TableCell sx={{ bgcolor: 'primary.50' }}>
                                    {diff.proposed}
                                </TableCell>
                                <TableCell sx={{ width: 100 }}>
                                    <Chip
                                        label={diff.impact}
                                        color={getImpactColor(diff.impact)}
                                        size="small"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* Supporting Evidence */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Supporting Evidence
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
                    {mockComparison.evidence.map((item, index) => (
                        <Typography component="li" variant="body2" key={index} sx={{ mb: 1 }}>
                            {item}
                        </Typography>
                    ))}
                </Box>
            </Paper>
        </Box>
    );
};

export default ComparisonView;
