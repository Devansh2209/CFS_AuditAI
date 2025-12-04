import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const MetricsCard = ({ title, value, subValue, icon, color, trend }) => {
    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography color="text.secondary" variant="subtitle2" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="text.primary">
                            {value}
                        </Typography>
                    </Box>
                    <Avatar
                        variant="rounded"
                        sx={{
                            bgcolor: `${color}.light`,
                            color: `${color}.main`,
                            width: 48,
                            height: 48,
                        }}
                    >
                        {icon}
                    </Avatar>
                </Box>

                {subValue && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {trend === 'up' ? (
                            <TrendingUp color="success" fontSize="small" />
                        ) : trend === 'down' ? (
                            <TrendingDown color="error" fontSize="small" />
                        ) : null}
                        <Typography
                            variant="body2"
                            color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'}
                            fontWeight="500"
                        >
                            {subValue}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            vs last month
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default MetricsCard;
