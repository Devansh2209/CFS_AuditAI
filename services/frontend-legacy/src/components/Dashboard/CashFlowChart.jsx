import React from 'react';
import { Card, CardHeader, CardContent, Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
    { name: 'Operating', value: 450000, color: '#2e7d32' }, // Green
    { name: 'Investing', value: 120000, color: '#ed6c02' }, // Orange
    { name: 'Financing', value: 80000, color: '#d32f2f' },  // Red
];

const CashFlowChart = () => {
    return (
        <Card sx={{ height: '100%' }}>
            <CardHeader
                title="Cash Flow Composition"
                subheader="Current Month"
                titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
            />
            <CardContent>
                <Box sx={{ height: 300, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => `$${value.toLocaleString()}`}
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="h4" fontWeight="bold">
                        $650,000
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Total Net Cash Flow
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default CashFlowChart;
