import React, { useEffect, useState } from 'react';
import { Grid, Box, Typography, Alert } from '@mui/material';
import { ReceiptLong, AutoGraph, AccessTime, Assignment } from '@mui/icons-material';
import axios from 'axios';
import MetricsCard from '../components/Dashboard/MetricsCard';
import CashFlowChart from '../components/Dashboard/CashFlowChart';
import ServiceHealthWidget from '../components/Dashboard/ServiceHealthWidget';

const services = [
    { name: 'Accounting Standards', url: '/accounting-standards-service/' },
    { name: 'Business Logic', url: '/business-logic-service/' },
    { name: 'Data Ingestion', url: '/data-ingestion-service/' },
    { name: 'Fluctuation Analysis', url: '/fluctuation-analysis-service/' },
    { name: 'Classification AI', url: '/classification-ai-service/' },
    { name: 'NLP Processing', url: '/nlp-processing-service/' },
    { name: 'Reclassification', url: '/reclassification-service/' },
    { name: 'Workflow Orchestration', url: '/workflow-orchestration-service/' },
    { name: 'Audit Compliance', url: '/audit-compliance-service/' },
    { name: 'Security Auth', url: '/security-auth-service/' },
    { name: 'Client Configuration', url: '/client-configuration-service/' }
];

const Dashboard = () => {
    const [statuses, setStatuses] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatuses = async () => {
            const newStatuses = {};
            await Promise.all(services.map(async (service) => {
                try {
                    const response = await axios.get(`${service.url}health?t=${Date.now()}`);
                    newStatuses[service.name] = response.data.status === 'healthy' ? 'Online' : 'Offline';
                } catch (error) {
                    newStatuses[service.name] = 'Offline';
                }
            }));
            setStatuses(newStatuses);
            setLoading(false);
        };

        checkStatuses();
        const interval = setInterval(checkStatuses, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Executive Overview
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Real-time financial operations and system status
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Metrics Row */}
                <Grid item xs={12} sm={6} md={3}>
                    <MetricsCard
                        title="Total Transactions"
                        value="1,248"
                        subValue="12%"
                        trend="up"
                        icon={<ReceiptLong />}
                        color="primary"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricsCard
                        title="AI Accuracy Rate"
                        value="98.5%"
                        subValue="2.1%"
                        trend="up"
                        icon={<AutoGraph />}
                        color="success"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricsCard
                        title="Time Saved (Hrs)"
                        value="342"
                        subValue="18%"
                        trend="up"
                        icon={<AccessTime />}
                        color="warning"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricsCard
                        title="Pending Reviews"
                        value="14"
                        subValue="3"
                        trend="down"
                        icon={<Assignment />}
                        color="error"
                    />
                </Grid>

                {/* Charts & Health Row */}
                <Grid item xs={12} md={8}>
                    <CashFlowChart />
                </Grid>
                <Grid item xs={12} md={4}>
                    <ServiceHealthWidget services={statuses} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
