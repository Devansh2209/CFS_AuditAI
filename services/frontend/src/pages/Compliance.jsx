import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Filter } from 'lucide-react';
import api from '../lib/api';

const Compliance = () => {
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ flagged: 0, lowConfidence: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, flagged, low-confidence

    useEffect(() => {
        fetchData();
    }, [filter]);

    const fetchData = async () => {
        try {
            // Fetch flagged and low-confidence transactions
            const params = {};
            if (filter === 'flagged') {
                params.status = 'flagged';
            } else if (filter === 'low-confidence') {
                params.maxConfidence = 0.7;
            }

            const response = await api.get('/transactions', { params });
            const txns = response.data.transactions || [];

            setTransactions(txns);

            // Calculate stats
            setStats({
                flagged: txns.filter(t => t.status === 'flagged').length,
                lowConfidence: txns.filter(t => t.confidence < 0.7).length,
                pending: txns.filter(t => t.status === 'pending').length
            });
        } catch (error) {
            console.error('Failed to fetch compliance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.patch(`/transactions/${id}`, {
                status: 'approved'
            });
            fetchData();
        } catch (error) {
            console.error('Failed to approve transaction:', error);
        }
    };

    const handleFlag = async (id) => {
        try {
            await api.patch(`/transactions/${id}`, {
                status: 'flagged'
            });
            fetchData();
        } catch (error) {
            console.error('Failed to flag transaction:', error);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, trend }) => (
        <div className="card p-6">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-${color}-50`}>
                    <Icon size={24} className={`text-accent-${color}`} />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-accent-green">
                        <TrendingUp size={12} />
                        {trend}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-secondary mb-1">{title}</p>
                <h3 className="text-3xl font-bold">{value}</h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-2">Compliance Dashboard</h2>
                <p className="text-secondary">Review flagged transactions and ensure GAAP compliance.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Flagged for Review" value={stats.flagged} icon={AlertTriangle} color="red" />
                <StatCard title="Low Confidence" value={stats.lowConfidence} icon={XCircle} color="orange" />
                <StatCard title="Pending Approval" value={stats.pending} icon={CheckCircle} color="blue" trend={-12} />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <button
                    onClick={() => setFilter('all')}
                    className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'} text-sm`}
                >
                    All Items
                </button>
                <button
                    onClick={() => setFilter('flagged')}
                    className={`btn ${filter === 'flagged' ? 'btn-primary' : 'btn-secondary'} text-sm`}
                >
                    <AlertTriangle size={16} /> Flagged Only
                </button>
                <button
                    onClick={() => setFilter('low-confidence')}
                    className={`btn ${filter === 'low-confidence' ? 'btn-primary' : 'btn-secondary'} text-sm`}
                >
                    <XCircle size={16} /> Low Confidence
                </button>
            </div>

            {/* Transactions Table */}
            <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-white/50">
                    <h3 className="text-lg font-semibold">Review Queue</h3>
                    <p className="text-sm text-secondary mt-1">{transactions.length} items requiring attention</p>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-secondary">
                        <div className="w-10 h-10 border-3 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto mb-4" />
                        <p>Loading compliance data...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="p-12 text-center text-secondary">
                        <CheckCircle size={48} className="mx-auto mb-4 text-accent-green opacity-30" />
                        <p className="font-medium">All clear!</p>
                        <p className="text-sm mt-2">No items requiring review at this time.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Category</th>
                                    <th className="text-center">Confidence</th>
                                    <th className="text-center">Status</th>
                                    <th className="w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr key={txn.id} className={`group ${txn.status === 'flagged' ? 'bg-red-50/30' :
                                            txn.confidence < 0.7 ? 'bg-orange-50/30' : ''
                                        }`}>
                                        <td className="whitespace-nowrap font-medium text-secondary text-sm">{txn.date}</td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-primary">{txn.description}</span>
                                                {txn.merchant && txn.merchant !== 'Unknown' && (
                                                    <span className="text-xs text-secondary mt-0.5">{txn.merchant}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-semibold font-mono text-primary">
                                            ${txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            <span className={`badge ${txn.category === 'Operating' ? 'badge-blue' :
                                                    txn.category === 'Investing' ? 'badge-orange' :
                                                        'badge-green'
                                                }`}>
                                                {txn.category}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full ${txn.confidence > 0.8 ? 'bg-accent-green' :
                                                        txn.confidence > 0.5 ? 'bg-accent-orange' : 'bg-accent-red'
                                                    }`} />
                                                <span className="text-xs text-secondary font-medium">{(txn.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {txn.status === 'flagged' ? (
                                                <span className="badge badge-red gap-1">
                                                    <AlertTriangle size={10} /> Flagged
                                                </span>
                                            ) : txn.status === 'approved' ? (
                                                <span className="badge badge-green gap-1">
                                                    <CheckCircle size={10} /> Approved
                                                </span>
                                            ) : (
                                                <span className="badge bg-gray-100 text-gray-500">Pending</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-2">
                                                {txn.status !== 'approved' && (
                                                    <button
                                                        onClick={() => handleApprove(txn.id)}
                                                        className="p-2 text-accent-green hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                {txn.status !== 'flagged' && (
                                                    <button
                                                        onClick={() => handleFlag(txn.id)}
                                                        className="p-2 text-accent-red hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Flag for review"
                                                    >
                                                        <AlertTriangle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Compliance;
