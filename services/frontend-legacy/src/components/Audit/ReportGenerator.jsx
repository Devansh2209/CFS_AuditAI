import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Grid,
    Chip,
} from '@mui/material';
import { Assessment, Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const ReportGenerator = ({ onGenerate, onCancel }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [reportConfig, setReportConfig] = useState({
        type: '',
        dateRange: {
            start: null,
            end: null,
        },
        format: 'pdf',
        includeEvidence: true,
    });

    const reportTypes = [
        { value: 'sox', label: 'SOX Compliance Report' },
        { value: 'gaap', label: 'GAAP Compliance Report' },
        { value: 'ifrs', label: 'IFRS Compliance Report' },
        { value: 'sec-8k', label: 'SEC Form 8-K' },
        { value: 'sec-10q', label: 'SEC Form 10-Q' },
        { value: 'sec-10k', label: 'SEC Form 10-K' },
        { value: 'custom', label: 'Custom Report' },
    ];

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleGenerate = () => {
        onGenerate && onGenerate(reportConfig);
    };

    const steps = [
        {
            label: 'Select Report Type',
            content: (
                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Report Type</InputLabel>
                    <Select
                        value={reportConfig.type}
                        label="Report Type"
                        onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value })}
                    >
                        {reportTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                                {type.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            ),
        },
        {
            label: 'Select Date Range',
            content: (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Start Date"
                                value={reportConfig.dateRange.start}
                                onChange={(date) =>
                                    setReportConfig({
                                        ...reportConfig,
                                        dateRange: { ...reportConfig.dateRange, start: date },
                                    })
                                }
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="End Date"
                                value={reportConfig.dateRange.end}
                                onChange={(date) =>
                                    setReportConfig({
                                        ...reportConfig,
                                        dateRange: { ...reportConfig.dateRange, end: date },
                                    })
                                }
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            ),
        },
        {
            label: 'Configure Options',
            content: (
                <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Export Format</InputLabel>
                        <Select
                            value={reportConfig.format}
                            label="Export Format"
                            onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                        >
                            <MenuItem value="pdf">PDF</MenuItem>
                            <MenuItem value="excel">Excel</MenuItem>
                            <MenuItem value="json">JSON</MenuItem>
                        </Select>
                    </FormControl>
                    <Box>
                        <Typography variant="body2" gutterBottom>
                            Additional Options:
                        </Typography>
                        <Chip
                            label="Include Evidence"
                            color={reportConfig.includeEvidence ? 'primary' : 'default'}
                            onClick={() =>
                                setReportConfig({
                                    ...reportConfig,
                                    includeEvidence: !reportConfig.includeEvidence,
                                })
                            }
                            sx={{ mr: 1 }}
                        />
                    </Box>
                </Box>
            ),
        },
        {
            label: 'Review & Generate',
            content: (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                        <strong>Report Type:</strong> {reportTypes.find((t) => t.value === reportConfig.type)?.label}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        <strong>Date Range:</strong>{' '}
                        {reportConfig.dateRange.start
                            ? reportConfig.dateRange.start.toLocaleDateString()
                            : 'Not set'}{' '}
                        -{' '}
                        {reportConfig.dateRange.end
                            ? reportConfig.dateRange.end.toLocaleDateString()
                            : 'Not set'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        <strong>Format:</strong> {reportConfig.format.toUpperCase()}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Include Evidence:</strong> {reportConfig.includeEvidence ? 'Yes' : 'No'}
                    </Typography>
                </Box>
            ),
        },
    ];

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Assessment color="primary" />
                <Typography variant="h6">Generate Compliance Report</Typography>
            </Box>

            <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                    <Step key={step.label}>
                        <StepLabel>{step.label}</StepLabel>
                        <StepContent>
                            {step.content}
                            <Box sx={{ mt: 2 }}>
                                <Button
                                    variant="contained"
                                    onClick={index === steps.length - 1 ? handleGenerate : handleNext}
                                    sx={{ mr: 1 }}
                                    startIcon={index === steps.length - 1 ? <Download /> : null}
                                >
                                    {index === steps.length - 1 ? 'Generate Report' : 'Continue'}
                                </Button>
                                <Button disabled={index === 0} onClick={handleBack} sx={{ mr: 1 }}>
                                    Back
                                </Button>
                                {index === 0 && (
                                    <Button onClick={onCancel}>Cancel</Button>
                                )}
                            </Box>
                        </StepContent>
                    </Step>
                ))}
            </Stepper>
        </Paper>
    );
};

export default ReportGenerator;
