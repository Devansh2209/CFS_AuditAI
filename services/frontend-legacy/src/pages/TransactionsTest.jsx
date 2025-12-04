import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TransactionsTest = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Transactions Page Test
            </Typography>
            <Paper sx={{ p: 3 }}>
                <Typography>
                    If you can see this message, the basic page structure is working.
                </Typography>
            </Paper>
        </Box>
    );
};

export default TransactionsTest;
