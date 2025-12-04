import React from 'react';
import {
    Box,
    Paper,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Avatar,
    Typography,
    Chip,
} from '@mui/material';
import { CheckCircle, Schedule, HourglassEmpty } from '@mui/icons-material';

const WorkflowDiagram = ({ workflow }) => {
    const getStepIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle color="success" />;
            case 'in_progress':
                return <HourglassEmpty color="primary" />;
            case 'pending':
                return <Schedule color="disabled" />;
            default:
                return <Schedule color="disabled" />;
        }
    };

    const mockWorkflow = workflow || {
        steps: [
            {
                id: 1,
                name: 'AI Classification',
                status: 'completed',
                assignedTo: 'AI System',
                completedAt: '2024-01-15T10:31:00',
                description: 'Automatic classification based on transaction patterns',
            },
            {
                id: 2,
                name: 'Senior Accountant Review',
                status: 'in_progress',
                assignedTo: 'Jane Doe',
                sla: '2 hours remaining',
                description: 'Review and validate AI classification',
            },
            {
                id: 3,
                name: 'Manager Approval',
                status: 'pending',
                assignedTo: 'Mike Johnson',
                description: 'Final approval for high-value transactions',
            },
            {
                id: 4,
                name: 'Audit Trail Update',
                status: 'pending',
                assignedTo: 'System',
                description: 'Automatic audit trail generation',
            },
        ],
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Approval Workflow
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Step-by-step approval chain with current progress
            </Typography>

            <Stepper orientation="vertical" activeStep={1}>
                {mockWorkflow.steps.map((step, index) => (
                    <Step key={step.id} active={step.status === 'in_progress'} completed={step.status === 'completed'}>
                        <StepLabel
                            StepIconComponent={() => getStepIcon(step.status)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1" fontWeight={step.status === 'in_progress' ? 'bold' : 'normal'}>
                                    {step.name}
                                </Typography>
                                {step.status === 'in_progress' && (
                                    <Chip label="Current" color="primary" size="small" />
                                )}
                            </Box>
                        </StepLabel>
                        <StepContent>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {step.description}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                        {step.assignedTo.charAt(0)}
                                    </Avatar>
                                    <Typography variant="caption" color="text.secondary">
                                        {step.assignedTo}
                                    </Typography>
                                    {step.sla && (
                                        <Chip
                                            label={step.sla}
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                                {step.completedAt && (
                                    <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                                        Completed: {new Date(step.completedAt).toLocaleString()}
                                    </Typography>
                                )}
                            </Box>
                        </StepContent>
                    </Step>
                ))}
            </Stepper>
        </Paper>
    );
};

export default WorkflowDiagram;
