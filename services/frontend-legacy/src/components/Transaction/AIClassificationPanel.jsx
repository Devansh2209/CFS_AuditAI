import React from 'react';
import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    Button,
    Divider,
    Chip,
    Stack,
} from '@mui/material';
import { CheckCircle, Cancel, Info } from '@mui/icons-material';

const AIClassificationPanel = ({
    transaction,
    classification,
    onAccept,
    onOverride,
    loading = false,
}) => {
    if (!transaction || !classification) {
        return (
            <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="body2" color="text.secondary">
                    Select a transaction to view AI classification
                </Typography>
            </Paper>
        );
    }

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.9) return 'success';
        if (confidence >= 0.7) return 'warning';
        return 'error';
    };

    const confidenceColor = getConfidenceColor(classification.confidence);

    return (
        <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
                AI Classification Preview
            </Typography>

            {loading ? (
                <LinearProgress />
            ) : (
                <>
                    {/* Confidence Score */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Confidence Score
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {(classification.confidence * 100).toFixed(1)}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={classification.confidence * 100}
                            color={confidenceColor}
                            sx={{ height: 8, borderRadius: 1 }}
                        />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Side-by-side Comparison */}
                    <Typography variant="subtitle2" gutterBottom>
                        Classification Comparison
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                                Original
                            </Typography>
                            <Chip
                                label={transaction.category || 'Unclassified'}
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                                AI Suggested
                            </Typography>
                            <Chip
                                label={classification.suggestedCategory}
                                color="primary"
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </Box>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    {/* AI Reasoning */}
                    <Typography variant="subtitle2" gutterBottom>
                        AI Reasoning
                    </Typography>
                    <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            {classification.reasoning ||
                                'This transaction was classified based on pattern matching with similar historical transactions and GAAP guidelines for cash flow classification.'}
                        </Typography>
                    </Box>

                    {/* Key Factors */}
                    <Typography variant="subtitle2" gutterBottom>
                        Key Factors
                    </Typography>
                    <Stack spacing={1} sx={{ mb: 3 }}>
                        {(classification.factors || [
                            'Transaction description contains keywords associated with operating activities',
                            'Amount pattern matches historical operating transactions',
                            'Counterparty classification supports operating category',
                        ]).map((factor, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <Info fontSize="small" color="primary" sx={{ mt: 0.25 }} />
                                <Typography variant="body2">
                                    {factor}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={onAccept}
                            fullWidth
                        >
                            Accept
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={onOverride}
                            fullWidth
                        >
                            Override
                        </Button>
                    </Stack>
                </>
            )}
        </Paper>
    );
};

export default AIClassificationPanel;
