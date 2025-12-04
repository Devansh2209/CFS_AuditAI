import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Drawer } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import FileUploadZone from '../components/Transaction/FileUploadZone';
import TransactionGrid from '../components/Transaction/TransactionGrid';
import AIClassificationPanel from '../components/Transaction/AIClassificationPanel';
import SmartAddTransaction from '../components/Transaction/SmartAddTransaction';
import {
    useGetTransactionsQuery,
    useGetClassificationQuery,
    useUpdateClassificationMutation,
    useBulkApproveMutation,
    useBulkFlagMutation,
} from '../store/api/transactionAPI';
import {
    setSelectedTransactions,
    setCurrentTransaction,
    setFilters,
    setPagination,
} from '../store/slices/transactionSlice';

const Transactions = () => {
    const dispatch = useDispatch();
    const { filters, pagination, sorting, selectedTransactions } = useSelector(
        (state) => state.transactions
    );

    const [currentTxn, setCurrentTxn] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Fetch transactions
    const { data: transactionsData, isLoading } = useGetTransactionsQuery({
        page: pagination.page,
        pageSize: pagination.pageSize,
        filters,
        sorting,
    });

    // Fetch classification for selected transaction
    const { data: classificationData, isLoading: classificationLoading } =
        useGetClassificationQuery(currentTxn?.id, {
            skip: !currentTxn,
        });

    const [updateClassification] = useUpdateClassificationMutation();
    const [bulkApprove] = useBulkApproveMutation();
    const [bulkFlag] = useBulkFlagMutation();

    const handleRowClick = (transaction) => {
        setCurrentTxn(transaction);
        setDrawerOpen(true);
        dispatch(setCurrentTransaction(transaction));
    };

    const handleSelectionChange = (newSelection) => {
        dispatch(setSelectedTransactions(newSelection));
    };

    const handleSearch = (searchText) => {
        dispatch(setFilters({ search: searchText }));
    };

    const handleAcceptClassification = async () => {
        if (!currentTxn || !classificationData) return;

        try {
            await updateClassification({
                id: currentTxn.id,
                classification: {
                    category: classificationData.suggestedCategory,
                    approved: true,
                },
            }).unwrap();
            setDrawerOpen(false);
        } catch (error) {
            console.error('Failed to accept classification:', error);
        }
    };

    const handleOverrideClassification = () => {
        // In a real app, this would open a modal to manually select category
        console.log('Override classification for:', currentTxn);
        setDrawerOpen(false);
    };

    const handleBulkApprove = async () => {
        if (selectedTransactions.length === 0) return;

        try {
            await bulkApprove(selectedTransactions).unwrap();
            dispatch(setSelectedTransactions([]));
        } catch (error) {
            console.error('Failed to approve transactions:', error);
        }
    };

    const handleBulkFlag = async () => {
        if (selectedTransactions.length === 0) return;

        try {
            await bulkFlag(selectedTransactions).unwrap();
            dispatch(setSelectedTransactions([]));
        } catch (error) {
            console.error('Failed to flag transactions:', error);
        }
    };



    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Transaction Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Upload, review, and classify financial transactions
                </Typography>
            </Box>

            <FileUploadZone />

            {/* Smart Add Component */}
            <SmartAddTransaction />

            <TransactionGrid
                transactions={transactionsData?.transactions || []}
                loading={isLoading}
                totalCount={transactionsData?.pagination?.total || 0}
                page={pagination.page}
                rowsPerPage={pagination.pageSize}
                onPageChange={(newPage) => dispatch(setFilters({ ...filters, page: newPage }))} // Note: setFilters resets page to 0 in slice, we might need a dedicated setPage action or use setPagination
                onRowsPerPageChange={(newRowsPerPage) => dispatch(setPagination({ pageSize: newRowsPerPage, page: 0 }))}
                onRowClick={handleRowClick}
                onSelectionChange={handleSelectionChange}
                selectedRows={selectedTransactions}
                onBulkApprove={handleBulkApprove}
                onBulkFlag={handleBulkFlag}
                onSearch={handleSearch}
            />

            {/* AI Classification Panel Drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{
                    sx: { width: 400, p: 0 },
                }}
            >
                <AIClassificationPanel
                    transaction={currentTxn}
                    classification={classificationData || {
                        confidence: currentTxn?.confidence || 0,
                        suggestedCategory: currentTxn?.category || 'Operating',
                        reasoning: 'AI analysis based on transaction patterns and GAAP guidelines.',
                    }}
                    onAccept={handleAcceptClassification}
                    onOverride={handleOverrideClassification}
                    loading={classificationLoading}
                />
            </Drawer>
        </Box>
    );
};

export default Transactions;
