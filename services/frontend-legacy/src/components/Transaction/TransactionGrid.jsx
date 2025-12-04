import React, { useState } from 'react';
import {
    Box,
    Paper,
    Toolbar,
    Typography,
    IconButton,
    Tooltip,
    Chip,
    TextField,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Checkbox,
    CircularProgress,
} from '@mui/material';
import {
    FileDownload,
    CheckCircle,
    Flag,
    Search,
    FilterList,
} from '@mui/icons-material';
import { format } from 'date-fns';

const TransactionGrid = ({
    transactions = [],
    loading = false,
    totalCount = 0,
    page = 0,
    rowsPerPage = 25,
    onPageChange,
    onRowsPerPageChange,
    onRowClick,
    onSelectionChange,
    selectedRows = [],
    onBulkApprove,
    onBulkFlag,
    onSearch,
}) => {
    const [searchText, setSearchText] = useState('');

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearchText(value);
        if (onSearch) {
            onSearch(value);
        }
    };

    const handleChangePage = (event, newPage) => {
        if (onPageChange) {
            onPageChange(newPage);
        }
    };

    const handleChangeRowsPerPage = (event) => {
        if (onRowsPerPageChange) {
            onRowsPerPageChange(parseInt(event.target.value, 10));
        }
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const newSelected = transactions.map((t) => t.id);
            onSelectionChange && onSelectionChange(newSelected);
        } else {
            onSelectionChange && onSelectionChange([]);
        }
    };

    const handleSelectRow = (id) => {
        const selectedIndex = selectedRows.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedRows, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedRows.slice(1));
        } else if (selectedIndex === selectedRows.length - 1) {
            newSelected = newSelected.concat(selectedRows.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedRows.slice(0, selectedIndex),
                selectedRows.slice(selectedIndex + 1),
            );
        }

        onSelectionChange && onSelectionChange(newSelected);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'flagged':
                return 'error';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Operating':
                return 'success';
            case 'Investing':
                return 'warning';
            case 'Financing':
                return 'error';
            default:
                return 'default';
        }
    };

    const isSelected = (id) => selectedRows.indexOf(id) !== -1;

    // Transactions are already paginated from backend
    const displayTransactions = transactions;

    return (
        <Paper sx={{ width: '100%' }}>
            <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" component="div">
                    Transactions
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Search transactions..."
                        value={searchText}
                        onChange={handleSearchChange}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: 250 }}
                    />

                    {selectedRows.length > 0 && (
                        <>
                            <Typography variant="body2" color="text.secondary">
                                {selectedRows.length} selected
                            </Typography>
                            <Tooltip title="Approve selected">
                                <IconButton
                                    color="success"
                                    onClick={onBulkApprove}
                                    size="small"
                                >
                                    <CheckCircle />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Flag selected">
                                <IconButton
                                    color="error"
                                    onClick={onBulkFlag}
                                    size="small"
                                >
                                    <Flag />
                                </IconButton>
                            </Tooltip>
                        </>
                    )}

                    <Tooltip title="Advanced Filters">
                        <IconButton size="small">
                            <FilterList />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Export">
                        <IconButton size="small">
                            <FileDownload />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>

            <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selectedRows.length > 0 && selectedRows.length < transactions.length}
                                    checked={transactions.length > 0 && selectedRows.length === transactions.length}
                                    onChange={handleSelectAll}
                                />
                            </TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Counterparty</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>AI Confidence</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : displayTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        No transactions found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayTransactions.map((row) => {
                                const isItemSelected = isSelected(row.id);
                                return (
                                    <TableRow
                                        key={row.id}
                                        hover
                                        onClick={() => onRowClick && onRowClick(row)}
                                        selected={isItemSelected}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isItemSelected}
                                                onChange={() => handleSelectRow(row.id)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {row.date ? format(new Date(row.date), 'MMM dd, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell>{row.description}</TableCell>
                                        <TableCell>{row.counterparty}</TableCell>
                                        <TableCell align="right">
                                            ${row.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.category || 'Unclassified'}
                                                color={getCategoryColor(row.category)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${((row.confidence || 0) * 100).toFixed(0)}%`}
                                                color={row.confidence >= 0.9 ? 'success' : row.confidence >= 0.7 ? 'warning' : 'error'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.status || 'Pending'}
                                                color={getStatusColor(row.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
};

export default TransactionGrid;
