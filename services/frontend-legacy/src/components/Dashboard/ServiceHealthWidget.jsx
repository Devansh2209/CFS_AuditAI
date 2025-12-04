import React from 'react';
import { Card, CardHeader, CardContent, Grid, Box, Typography, Chip, Tooltip } from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';

const ServiceHealthWidget = ({ services }) => {
    const getStatusColor = (status) => {
        if (status === 'Online') return 'success';
        if (status === 'Checking...') return 'warning';
        return 'error';
    };

    const getStatusIcon = (status) => {
        if (status === 'Online') return <CheckCircle fontSize="small" />;
        if (status === 'Checking...') return <Warning fontSize="small" />;
        return <Error fontSize="small" />;
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardHeader
                title="System Health"
                subheader="Real-time microservice status"
                titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
            />
            <CardContent>
                <Grid container spacing={2}>
                    {Object.entries(services).map(([name, status]) => (
                        <Grid item xs={12} sm={6} md={4} key={name}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    bgcolor: status === 'Online' ? 'success.lighter' : 'background.paper'
                                }}
                            >
                                <Typography variant="body2" fontWeight="500" noWrap sx={{ maxWidth: '70%' }}>
                                    {name}
                                </Typography>
                                <Tooltip title={status}>
                                    <Chip
                                        icon={getStatusIcon(status)}
                                        label={status}
                                        size="small"
                                        color={getStatusColor(status)}
                                        variant="outlined"
                                        sx={{ height: 24 }}
                                    />
                                </Tooltip>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default ServiceHealthWidget;
