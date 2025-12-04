import React, { useState } from 'react';
import {
    Box,
    Grid,
    Typography,
    Drawer,
    Tabs,
    Tab,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Button,
    Toolbar,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Search, FilterList, CheckCircle, Cancel } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import ApprovalTaskCard from '../components/Workflow/ApprovalTaskCard';
import WorkflowDiagram from '../components/Workflow/WorkflowDiagram';
import ComparisonView from '../components/Workflow/ComparisonView';
import CommentThread from '../components/Workflow/CommentThread';
import {
    useGetApprovalQueueQuery,
    useApproveTaskMutation,
    useRejectTaskMutation,
    useDelegateTaskMutation,
    useAddCommentMutation,
} from '../store/api/workflowAPI';
import {
    setCurrentTask,
    setDetailDrawerOpen,
    setFilters,
    setSelectedTasks,
    addComment,
} from '../store/slices/workflowSlice';

const Workflows = () => {
    const dispatch = useDispatch();
    const { filters, currentTask, detailDrawerOpen, selectedTasks } = useSelector(
        (state) => state.workflow
    );

    const [activeTab, setActiveTab] = useState(0);
    const [searchText, setSearchText] = useState('');

    // Fetch approval queue
    const { data: queueData, isLoading } = useGetApprovalQueueQuery({ filters });

    const [approveTask] = useApproveTaskMutation();
    const [rejectTask] = useRejectTaskMutation();
    const [delegateTask] = useDelegateTaskMutation();
    const [addCommentMutation] = useAddCommentMutation();

    // Mock data for demonstration
    const mockTasks = queueData?.tasks || [
        {
            id: 1,
            transactionId: 3,
            type: 'reclassification',
            priority: 'high',
            status: 'pending',
            assignedTo: 'Jane Doe',
            dueDate: '2024-01-16',
            transaction: {
                description: 'Loan Repayment',
                amount: 50000,
                currentCategory: 'Operating',
                proposedCategory: 'Financing',
            },
            requester: 'AI System',
            reason: 'Transaction pattern matches financing activities',
            createdAt: '2024-01-15T10:00:00',
        },
        {
            id: 2,
            transactionId: 4,
            type: 'reclassification',
            priority: 'medium',
            status: 'pending',
            assignedTo: 'Jane Doe',
            dueDate: '2024-01-17',
            transaction: {
                description: 'Service Revenue',
                amount: 75000,
                currentCategory: 'Operating',
                proposedCategory: 'Operating',
            },
            requester: 'John Smith',
            reason: 'Manual review requested for high-value transaction',
            createdAt: '2024-01-15T12:00:00',
        },
        {
            id: 3,
            transactionId: 2,
            type: 'reclassification',
            priority: 'low',
            status: 'pending',
            assignedTo: 'Mike Johnson',
            dueDate: '2024-01-18',
            transaction: {
                description: 'Purchase of Equipment',
                amount: 150000,
                currentCategory: 'Operating',
                proposedCategory: 'Investing',
            },
            requester: 'AI System',
            reason: 'Capital expenditure classification recommended',
            createdAt: '2024-01-15T09:00:00',
        },
    ];

    const handleTaskClick = (task) => {
        dispatch(setCurrentTask(task));
        dispatch(setDetailDrawerOpen(true));
    };

    const handleApprove = async (task) => {
        try {
            await approveTask({ id: task.id, comment: 'Approved' }).unwrap();
        } catch (error) {
            console.error('Failed to approve task:', error);
        }
    };

    const handleReject = async (task) => {
        try {
            await rejectTask({ id: task.id, reason: 'Rejected' }).unwrap();
        } catch (error) {
            console.error('Failed to reject task:', error);
        }
    };

    const handleDelegate = async (task) => {
        console.log('Delegate task:', task);
        // In real app, open dialog to select user
    };

    const handleAddComment = async (comment) => {
        if (currentTask) {
            try {
                await addCommentMutation({ taskId: currentTask.id, comment }).unwrap();
                dispatch(addComment(comment));
            } catch (error) {
                console.error('Failed to add comment:', error);
            }
        }
    };

    const handleFilterChange = (filterName, value) => {
        dispatch(setFilters({ [filterName]: value }));
    };

    const filteredTasks = mockTasks.filter((task) => {
        if (filters.status !== 'all' && task.status !== filters.status) return false;
        if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
        if (searchText && !task.transaction.description.toLowerCase().includes(searchText.toLowerCase())) {
            return false;
        }
        return true;
    });

    const taskCounts = {
        all: mockTasks.length,
        pending: mockTasks.filter((t) => t.status === 'pending').length,
        approved: mockTasks.filter((t) => t.status === 'approved').length,
        rejected: mockTasks.filter((t) => t.status === 'rejected').length,
    };

    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Workflow & Approvals
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage approval queue and review pending tasks
                </Typography>
            </Box>

            {/* Filters and Search */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size="small"
                    placeholder="Search tasks..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ minWidth: 300 }}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={filters.status}
                        label="Status"
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <MenuItem value="all">All ({taskCounts.all})</MenuItem>
                        <MenuItem value="pending">Pending ({taskCounts.pending})</MenuItem>
                        <MenuItem value="approved">Approved ({taskCounts.approved})</MenuItem>
                        <MenuItem value="rejected">Rejected ({taskCounts.rejected})</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Priority</InputLabel>
                    <Select
                        value={filters.priority}
                        label="Priority"
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                    >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                    </Select>
                </FormControl>

                {selectedTasks.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 'auto' }}>
                        <Chip label={`${selectedTasks.length} selected`} />
                        <Tooltip title="Bulk Approve">
                            <IconButton color="success" size="small">
                                <CheckCircle />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Bulk Reject">
                            <IconButton color="error" size="small">
                                <Cancel />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            {/* Task List */}
            <Box>
                {isLoading ? (
                    <Typography>Loading...</Typography>
                ) : filteredTasks.length === 0 ? (
                    <Typography color="text.secondary">No tasks found</Typography>
                ) : (
                    filteredTasks.map((task) => (
                        <ApprovalTaskCard
                            key={task.id}
                            task={task}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onDelegate={handleDelegate}
                            onClick={() => handleTaskClick(task)}
                        />
                    ))
                )}
            </Box>

            {/* Task Detail Drawer */}
            <Drawer
                anchor="right"
                open={detailDrawerOpen}
                onClose={() => dispatch(setDetailDrawerOpen(false))}
                PaperProps={{
                    sx: { width: { xs: '100%', md: 600 }, p: 3 },
                }}
            >
                {currentTask && (
                    <Box>
                        <Typography variant="h5" gutterBottom>
                            Task Details
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            {currentTask.transaction?.description}
                        </Typography>

                        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                            <Tab label="Comparison" />
                            <Tab label="Workflow" />
                            <Tab label="Comments" />
                        </Tabs>

                        {activeTab === 0 && <ComparisonView />}
                        {activeTab === 1 && <WorkflowDiagram />}
                        {activeTab === 2 && <CommentThread onAddComment={handleAddComment} />}

                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<Cancel />}
                                onClick={() => handleReject(currentTask)}
                            >
                                Reject
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={() => handleApprove(currentTask)}
                            >
                                Approve
                            </Button>
                        </Box>
                    </Box>
                )}
            </Drawer>
        </Box>
    );
};

export default Workflows;
