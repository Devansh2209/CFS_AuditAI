import React, { useState } from 'react';
import {
    Paper,
    InputBase,
    IconButton,
    Divider,
    Box,
    Typography,
    Chip,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import {
    AutoAwesome,
    Send,
    HelpOutline,
} from '@mui/icons-material';
import { useClassifyTransactionMutation } from '../../store/api/transactionAPI';

const SmartAddTransaction = () => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(null);
    const [classifyTransaction, { isLoading: loading }] = useClassifyTransactionMutation();

    const parseTransaction = (text) => {
        // Simple rule-based parsing to extract basic info
        // The AI will do the heavy lifting for classification

        const amountMatch = text.match(/\$?(\d+(\.\d{2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

        const dateMatch = text.match(/\b(today|yesterday)\b/i);
        let date = new Date().toISOString().split('T')[0]; // Default to today

        if (dateMatch) {
            if (dateMatch[0].toLowerCase() === 'yesterday') {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                date = d.toISOString().split('T')[0];
            }
        }

        // Description is the text with amount removed
        let description = text.replace(/\$?(\d+(\.\d{2})?)/, '').trim();
        description = description.replace(/\b(today|yesterday)\b/i, '').trim();
        description = description.replace(/^(paid|spent|for|on)\s+/i, '');
        description = description.charAt(0).toUpperCase() + description.slice(1);

        return {
            date,
            amount,
            description: description || text,
            rawInput: text,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setError(null);

        try {
            // Parse basic info from input
            const parsedData = parseTransaction(input);

            // Send to backend AI for classification using RTK Query mutation
            // This will automatically invalidate 'Transaction' tag and refresh the list
            await classifyTransaction({
                description: parsedData.description,
                amount: parsedData.amount,
                date: parsedData.date,
                rawInput: parsedData.rawInput,
            }).unwrap();

            setInput('');
            setError(null);

        } catch (err) {
            console.error('Classification error:', err);
            setError(err.data?.message || err.message || 'Failed to classify transaction');
        }
    };

    return (
        <>
            {error && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography color="error.dark">{error}</Typography>
                </Box>
            )}
            <Paper
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    p: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    mb: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
            >
                <Box sx={{ p: 1, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                    <AutoAwesome />
                </Box>
                <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                <InputBase
                    sx={{ ml: 1, flex: 1 }}
                    placeholder="Smart Add: 'Paid $50 for lunch today' or 'AWS cloud services $5400'"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <Tooltip title="Try: 'Spent $25 on Uber yesterday' or 'Slack subscription $120'">
                    <IconButton sx={{ p: '10px' }} aria-label="help">
                        <HelpOutline />
                    </IconButton>
                </Tooltip>
                <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                <IconButton
                    color="primary"
                    sx={{ p: '10px' }}
                    aria-label="add"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : <Send />}
                </IconButton>
            </Paper>
        </>
    );
};

export default SmartAddTransaction;
