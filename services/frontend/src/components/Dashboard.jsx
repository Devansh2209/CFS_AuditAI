import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Activity, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import api from '../lib/api';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/stats');
                setStats(response.data);
                setError(null);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
                    <p className="text-secondary font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-64 text-red-500">
                <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8" />
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const COLORS = ['#0066CC', '#FF9500', '#FF3B30']; // Blue, Orange, Red

    const categoryData = [
        { name: 'Operating', value: stats.categories.operating },
        { name: 'Investing', value: stats.categories.investing },
        { name: 'Financing', value: stats.categories.financing },
    ];

    // Mock trend data for the area chart (since backend doesn't provide it yet)
    const trendData = [
        { name: 'Mon', amount: 4000 },
        { name: 'Tue', amount: 3000 },
        { name: 'Wed', amount: 2000 },
        { name: 'Thu', amount: 2780 },
        { name: 'Fri', amount: 1890 },
        { name: 'Sat', amount: 2390 },
        { name: 'Sun', amount: 3490 },
    ];

    const StatCard = ({ title, value, icon: Icon, color, trend }) => (
        <div className="card p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600 transition-transform group-hover:scale-110`}>
                    <Icon size={24} className={`text-accent-${color}`} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-50 text-accent-green' : 'bg-red-50 text-accent-red'}`}>
                        {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-secondary mb-1">{title}</p>
                <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Overview</h2>
                    <p className="text-secondary">Here's what's happening with your finances today.</p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-secondary text-sm">Last 7 Days</button>
                    <button className="btn btn-primary text-sm">
                        <ArrowDownRight size={16} /> Export Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Volume" value={`$${stats.amounts.total.toLocaleString()}`} icon={DollarSign} color="blue" trend={12.5} />
                <StatCard title="Total Transactions" value={stats.overview.total} icon={Activity} color="orange" trend={-2.4} />
                <StatCard title="Classified" value={stats.overview.classified} icon={CheckCircle} color="green" trend={8.1} />
                <StatCard title="Pending Review" value={stats.overview.pending} icon={AlertCircle} color="red" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Trend Chart */}
                <div className="card p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">Cash Flow Trend</h3>
                        <button className="p-2 hover:bg-gray-50 rounded-lg text-secondary transition-colors">
                            <TrendingUp size={20} />
                        </button>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0066CC" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#86868B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#86868B', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: '#1D1D1F' }}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#0066CC" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-6">Distribution</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-xs text-secondary font-medium">Total</p>
                            <p className="text-xl font-bold text-primary">{stats.overview.total}</p>
                        </div>
                    </div>
                    <div className="space-y-3 mt-6">
                        {categoryData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                    <span className="text-sm text-secondary">{entry.name}</span>
                                </div>
                                <span className="text-sm font-semibold">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Recent Activity</h3>
                    <button className="text-sm text-accent-blue font-medium hover:underline">View All</button>
                </div>
                <div className="space-y-1">
                    {stats.recentActivity.map((txn) => (
                        <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${txn.category === 'Operating' ? 'bg-blue-50 text-accent-blue group-hover:bg-blue-100' :
                                    txn.category === 'Investing' ? 'bg-orange-50 text-accent-orange group-hover:bg-orange-100' :
                                        'bg-green-50 text-accent-green group-hover:bg-green-100'
                                    }`}>
                                    {txn.category === 'Operating' ? <Activity size={18} /> :
                                        txn.category === 'Investing' ? <TrendingUp size={18} /> :
                                            <DollarSign size={18} />}
                                </div>
                                <div>
                                    <p className="font-medium text-primary">{txn.description}</p>
                                    <p className="text-xs text-secondary">{txn.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-primary font-mono">${txn.amount.toLocaleString()}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${txn.confidence > 0.8 ? 'bg-accent-green' : 'bg-accent-orange'}`} />
                                    <span className="text-xs text-secondary">{(txn.confidence * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {stats.recentActivity.length === 0 && (
                        <p className="text-center text-secondary py-8">No recent activity</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
