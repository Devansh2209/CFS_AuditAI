import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Divider,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import { Gavel, TrendingUp, CompareArrows } from '@mui/icons-material';

const ClassificationEvidencePanel = ({ classification }) => {
    if (!classification) {
        return null;
    }

    // Mock evidence data
    const evidence = {
        gaspRules: classification.gaapRules || [
            'FASB ASC 230-10-45-12: Operating activities include transactions that affect net income',
            'IAS 7.14: Operating cash flows arise from principal revenue-producing activities',
        ],
        historicalMatches: classification.historicalMatches || [
            {
                description: 'Payment to XYZ Suppliers',
                amount: 24500,
                category: 'Operating',
                similarity: 0.94,
            },
            {
                description: 'Vendor payment - ABC Inc',
                amount: 26800,
                category: 'Operating',
                similarity: 0.89,
            },
        ],
        featureImportance: classification.featureImportance || [
            { feature: 'Transaction Description', importance: 0.42 },
            { feature: 'Counterparty Type', importance: 0.28 },
            { feature: 'Amount Pattern', importance: 0.18 },
            { feature: 'Historical Category', importance: 0.12 },
        ],
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Classification Evidence
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Detailed evidence supporting AI classification decision
            </Typography>

            {/* GAAP/IFRS Rules */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Gavel sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle2">
                        Applicable Accounting Standards
                    </Typography>
                </Box>
                <List dense>
                    {evidence.gaspRules.map((rule, index) => (
                        <ListItem key={index}>
                            <ListItemText
                                primary={rule}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    color: 'text.secondary',
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Historical Matches */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CompareArrows sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle2">
                        Similar Historical Transactions
                    </Typography>
                </Box>
                {evidence.historicalMatches.map((match, index) => (
                    <Paper
                        key={index}
                        variant="outlined"
                        sx={{ p: 2, mb: 1, bgcolor: 'background.default' }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">
                                {match.description}
                            </Typography>
                            <Chip
                                label={`${(match.similarity * 100).toFixed(0)}% match`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            Amount: ${match.amount.toLocaleString()} | Category: {match.category}
                        </Typography>
                    </Paper>
                ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Feature Importance */}
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle2">
                        Feature Importance Breakdown
                    </Typography>
                </Box>
                {evidence.featureImportance.map((item, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">
                                {item.feature}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {(item.importance * 100).toFixed(0)}%
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                height: 6,
                                bgcolor: 'background.default',
                                borderRadius: 1,
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    height: '100%',
                                    bgcolor: 'primary.main',
                                    width: `${item.importance * 100}%`,
                                }}
                            />
                        </Box>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

export default ClassificationEvidencePanel;
