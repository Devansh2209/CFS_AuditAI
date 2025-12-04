import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    Chip,
} from '@mui/material';
import { Send, CheckCircle } from '@mui/icons-material';
import { format } from 'date-fns';

const CommentThread = ({ comments = [], onAddComment }) => {
    const [newComment, setNewComment] = useState('');

    const handleSubmit = () => {
        if (newComment.trim()) {
            onAddComment && onAddComment({
                text: newComment,
                user: 'Current User',
                timestamp: new Date().toISOString(),
            });
            setNewComment('');
        }
    };

    const mockComments = comments.length > 0 ? comments : [
        {
            id: 1,
            user: 'AI System',
            text: 'Classified as Financing activity based on counterparty analysis and transaction pattern.',
            timestamp: '2024-01-15T10:31:00',
            resolved: false,
        },
        {
            id: 2,
            user: 'Jane Doe',
            text: '@MikeJohnson Can you review this? The amount seems unusually high for a regular loan payment.',
            timestamp: '2024-01-15T11:45:00',
            resolved: false,
        },
        {
            id: 3,
            user: 'Mike Johnson',
            text: 'Checked with finance team - this is a one-time principal repayment. Classification looks correct.',
            timestamp: '2024-01-15T14:20:00',
            resolved: true,
        },
    ];

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Comments & Discussion
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Collaborate with team members using @mentions
            </Typography>

            <List>
                {mockComments.map((comment) => (
                    <ListItem
                        key={comment.id}
                        alignItems="flex-start"
                        sx={{
                            bgcolor: comment.resolved ? 'success.50' : 'background.paper',
                            borderRadius: 1,
                            mb: 1,
                        }}
                    >
                        <ListItemAvatar>
                            <Avatar>{comment.user.charAt(0)}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">
                                        {comment.user}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(new Date(comment.timestamp), 'MMM dd, HH:mm')}
                                    </Typography>
                                    {comment.resolved && (
                                        <Chip
                                            icon={<CheckCircle />}
                                            label="Resolved"
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                            }
                            secondary={
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {comment.text}
                                </Typography>
                            }
                        />
                    </ListItem>
                ))}
            </List>

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Add a comment... Use @username to mention"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    multiline
                    maxRows={3}
                />
                <Button
                    variant="contained"
                    endIcon={<Send />}
                    onClick={handleSubmit}
                    disabled={!newComment.trim()}
                >
                    Send
                </Button>
            </Box>
        </Paper>
    );
};

export default CommentThread;
