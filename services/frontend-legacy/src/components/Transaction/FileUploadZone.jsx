import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Paper, Typography, LinearProgress, Alert, IconButton } from '@mui/material';
import { CloudUpload, CheckCircle, Error as ErrorIcon, Close } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useUploadFileMutation } from '../../store/api/transactionAPI';
import { setUploadStatus, resetUploadStatus } from '../../store/slices/transactionSlice';

const FileUploadZone = () => {
    const dispatch = useDispatch();
    const uploadStatus = useSelector(state => state.transactions.uploadStatus);
    const [uploadFile] = useUploadFileMutation();

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        dispatch(setUploadStatus({
            isUploading: true,
            progress: 0,
            error: null,
            fileName: file.name,
        }));

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Simulate progress (in real app, use XMLHttpRequest for actual progress)
            let currentProgress = 0;
            const progressInterval = setInterval(() => {
                currentProgress = Math.min(currentProgress + 10, 90);
                dispatch(setUploadStatus({ progress: currentProgress }));
            }, 200);

            await uploadFile(formData).unwrap();

            clearInterval(progressInterval);
            dispatch(setUploadStatus({
                isUploading: false,
                progress: 100,
                error: null,
            }));

            // Reset after 3 seconds
            setTimeout(() => {
                dispatch(resetUploadStatus());
            }, 3000);
        } catch (error) {
            dispatch(setUploadStatus({
                isUploading: false,
                progress: 0,
                error: error.data?.message || 'Upload failed. Please try again.',
            }));
        }
    }, [dispatch, uploadFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/pdf': ['.pdf'],
        },
        multiple: false,
        disabled: uploadStatus.isUploading,
    });

    const handleClearError = () => {
        dispatch(resetUploadStatus());
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Paper
                {...getRootProps()}
                sx={{
                    p: 4,
                    textAlign: 'center',
                    cursor: uploadStatus.isUploading ? 'not-allowed' : 'pointer',
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'divider',
                    bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                    transition: 'all 0.3s ease',
                    '&:hover': uploadStatus.isUploading ? {} : {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                    },
                }}
            >
                <input {...getInputProps()} />

                {!uploadStatus.isUploading && !uploadStatus.error && uploadStatus.progress !== 100 && (
                    <>
                        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            {isDragActive ? 'Drop file here' : 'Drag & drop a file here'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            or click to browse (CSV, Excel, PDF)
                        </Typography>
                    </>
                )}

                {uploadStatus.isUploading && (
                    <Box>
                        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Uploading {uploadStatus.fileName}...
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={uploadStatus.progress}
                            sx={{ mt: 2, mb: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {uploadStatus.progress}%
                        </Typography>
                    </Box>
                )}

                {uploadStatus.progress === 100 && !uploadStatus.error && (
                    <Box>
                        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                        <Typography variant="h6" color="success.main">
                            Upload successful!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {uploadStatus.fileName}
                        </Typography>
                    </Box>
                )}
            </Paper>

            {uploadStatus.error && (
                <Alert
                    severity="error"
                    sx={{ mt: 2 }}
                    action={
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={handleClearError}
                        >
                            <Close fontSize="inherit" />
                        </IconButton>
                    }
                >
                    <Typography variant="body2">
                        <strong>{uploadStatus.fileName}</strong>: {uploadStatus.error}
                    </Typography>
                </Alert>
            )}
        </Box>
    );
};

export default FileUploadZone;
