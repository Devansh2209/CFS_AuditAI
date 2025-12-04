import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, CheckCircle, AlertTriangle, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import api from '../lib/api';

// Debounce hook to prevent excessive API calls
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const TransactionList = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const debouncedSearch = useDebounce(search, 500);

    const fetchTransactions = useCallback(async () => {
        try {
            // In a real app, we'd pass sort params to the API
            // For now, we'll fetch and sort client-side if needed, or rely on default API sort
            const response = await api.get('/transactions', {
                params: {
                    page,
                    pageSize: 10,
                    search: debouncedSearch
                }
            });

            let data = response.data.transactions;

            // Client-side sorting for smoother experience if API doesn't support it fully yet
            if (data.length > 0) {
                data.sort((a, b) => {
                    let aVal = a[sortField];
                    let bVal = b[sortField];

                    if (sortField === 'amount') {
                        aVal = parseFloat(aVal);
                        bVal = parseFloat(bVal);
                    }

                    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            setTransactions(data);
            setTotalPages(Math.ceil(response.data.pagination.total / 10));
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, sortField, sortOrder]);

    useEffect(() => {
        fetchTransactions();
        // Poll less frequently to avoid jitter, or use WebSocket in production
        const interval = setInterval(fetchTransactions, 10000);
        return () => clearInterval(interval);
    }, [fetchTransactions]);

    const handleApprove = async (id) => {
        try {
            await api.patch(`/transactions/${id}`, {
                classification: { approved: true }
            });
            fetchTransactions();
        } catch (error) {
            console.error('Failed to approve transaction:', error);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }) => (
        sortField === field ? (
            <ArrowUpDown size={14} className={`ml-1 inline transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
        ) : null
    );

    return (
        <div className="card overflow-hidden flex flex-col h-[calc(100vh-200px)]">
            {/* Header Toolbar */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/50 backdrop-blur-sm">
                <h3 className="text-xl font-semibold text-primary">Transactions</h3>
                <div className="flex gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by description or merchant..."
                            className="input-field pl-10 py-2.5 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-secondary px-4 py-2.5">
                        <Filter size={18} />
                        <span>Filter</span>
                    </button>
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto relative">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('date')} className="cursor-pointer hover:bg-gray-50 transition-colors w-32">
                                Date <SortIcon field="date" />
                            </th>
                            <th onClick={() => handleSort('description')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                Description <SortIcon field="description" />
                            </th>
                            <th onClick={() => handleSort('category')} className="cursor-pointer hover:bg-gray-50 transition-colors w-40">
                                Category <SortIcon field="category" />
                            </th>
                            <th onClick={() => handleSort('amount')} className="cursor-pointer hover:bg-gray-50 transition-colors text-right w-32">
                                Amount <SortIcon field="amount" />
                            </th>
                            <th className="text-center w-24">Confidence</th>
                            <th className="text-center w-32">Status</th>
                            <th className="w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-secondary">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
                                        <p>Loading transactions...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-secondary">
                                    No transactions found matching your criteria
                                </td>
                            </tr>
                        ) : (
                            transactions.map((txn) => (
                                <tr key={txn.id} className="group transition-colors hover:bg-blue-50/30">
                                    <td className="whitespace-nowrap font-medium text-secondary text-sm">{txn.date}</td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-primary">{txn.description}</span>
                                            {txn.merchant && txn.merchant !== 'Unknown' && (
                                                <span className="text-xs text-secondary mt-0.5">{txn.merchant}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${txn.category === 'Operating' ? 'badge-blue' :
                                                txn.category === 'Investing' ? 'badge-orange' :
                                                    'badge-green'
                                            }`}>
                                            {txn.category}
                                        </span>
                                    </td>
                                    <td className="text-right font-semibold font-mono text-primary">
                                        ${txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1.5" title={`Confidence: ${(txn.confidence * 100).toFixed(1)}%`}>
                                            <div className={`w-2 h-2 rounded-full ${txn.confidence > 0.8 ? 'bg-accent-green' :
                                                    txn.confidence > 0.5 ? 'bg-accent-orange' : 'bg-accent-red'
                                                }`} />
                                            <span className="text-xs text-secondary font-medium">{(txn.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        {txn.status === 'approved' ? (
                                            <span className="badge badge-green gap-1">
                                                <CheckCircle size={10} /> Approved
                                            </span>
                                        ) : txn.status === 'flagged' ? (
                                            <span className="badge badge-red gap-1">
                                                <AlertTriangle size={10} /> Flagged
                                            </span>
                                        ) : (
                                            <span className="badge bg-gray-100 text-gray-500">Pending</span>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {txn.status !== 'approved' && (
                                                <button
                                                    onClick={() => handleApprove(txn.id)}
                                                    className="p-2 text-secondary hover:text-accent-green hover:bg-green-50 rounded-full transition-colors"
                                                    title="Approve"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
                                            <button className="p-2 text-secondary hover:text-primary hover:bg-gray-100 rounded-full transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                <p className="text-sm text-secondary">
                    Showing page <span className="font-medium text-primary">{page}</span> of <span className="font-medium text-primary">{totalPages}</span>
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-30"
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="btn btn-secondary px-3 py-1.5 text-sm disabled:opacity-30"
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionList;
