import React from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Box,
    Typography,
    Chip,
    Button,
    LinearProgress,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Assessment,
    Download,
    Visibility,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    Warning,
} from '@mui/icons-material';
import { format } from 'date-fns';

const ComplianceReportCard = ({ report, onView, onDownload }) => {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'compliant':
                return <CheckCircle color="success" />;
            case 'warning':
                return <Warning color="warning" />;
            case 'non-compliant':
                return <Warning color="error" />;
            default:
                return <Assessment />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'compliant':
                return 'success';
            case 'warning':
                return 'warning';
            case 'non-compliant':
                return 'error';
            default:
                return 'default';
        }
    };

    const getScoreColor = (score) => {
        if (score >= 90) return 'success.main';
        if (score >= 70) return 'warning.main';
        return 'error.main';
    };

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(report.status)}
                        <Typography variant="h6">
                            {report.type}
                        </Typography>
                    </Box>
                    <Chip
                        label={report.status}
                        color={getStatusColor(report.status)}
                        size="small"
                    />
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Period:</strong> {report.period}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Generated:</strong> {format(new Date(report.generatedAt), 'MMM dd, yyyy')}
                    </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                            Compliance Score
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="h5" sx={{ color: getScoreColor(report.score) }}>
                                {report.score}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                / 100
                            </Typography>
                            {report.trend === 'up' && <TrendingUp color="success" fontSize="small" />}
                            {report.trend === 'down' && <TrendingDown color="error" fontSize="small" />}
                        </Box>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={report.score}
                        sx={{
                            height: 8,
                            borderRadius: 1,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: getScoreColor(report.score),
                            },
                        }}
                    />
                </Box>

                {report.findings && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            <strong>Key Findings:</strong> {report.findings.length} items
                        </Typography>
                    </Box>
                )}
            </CardContent>

            <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => onView && onView(report)}
                >
                    View
                </Button>
                <Tooltip title="Download PDF">
                    <IconButton
                        size="small"
                        onClick={() => onDownload && onDownload(report)}
                    >
                        <Download />
                    </IconButton>
                </Tooltip>
            </CardActions>
        </Card>
    );
};

export default ComplianceReportCard;
