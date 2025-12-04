import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import api from '../lib/api';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('rules');
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRule, setNewRule] = useState({ keyword: '', category: 'Operating', subcategory: '' });
    const [error, setError] = useState(null);

    const categories = ['Operating', 'Investing', 'Financing'];

    useEffect(() => {
        if (activeTab === 'rules') {
            fetchRules();
        }
    }, [activeTab]);

    const fetchRules = async () => {
        try {
            const response = await api.get('/rules');
            setRules(response.data.rules || []);
        } catch (err) {
            console.error('Failed to fetch rules:', err);
            setError('Failed to load rules');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async (e) => {
        e.preventDefault();
        if (!newRule.keyword.trim()) return;

        try {
            const response = await api.post('/rules', newRule);
            setRules([...rules, response.data]);
            setNewRule({ keyword: '', category: 'Operating', subcategory: '' });
        } catch (err) {
            console.error('Failed to add rule:', err);
            setError('Failed to add rule');
        }
    };

    const handleDeleteRule = async (id) => {
        try {
            await api.delete(`/rules/${id}`);
            setRules(rules.filter(r => r.id !== id));
        } catch (err) {
            console.error('Failed to delete rule:', err);
            setError('Failed to delete rule');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-2">Settings</h2>
                <p className="text-secondary">Manage your AuditAI preferences and classification rules.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'general'
                            ? 'text-accent-blue border-b-2 border-accent-blue'
                            : 'text-secondary hover:text-primary'
                        }`}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'rules'
                            ? 'text-accent-blue border-b-2 border-accent-blue'
                            : 'text-secondary hover:text-primary'
                        }`}
                >
                    Classification Rules
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'notifications'
                            ? 'text-accent-blue border-b-2 border-accent-blue'
                            : 'text-secondary hover:text-primary'
                        }`}
                >
                    Notifications
                </button>
            </div>

            {/* General Tab */}
            {activeTab === 'general' && (
                <div className="card p-8">
                    <h3 className="text-lg font-semibold mb-6">General Settings</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Company Name</label>
                            <input type="text" className="input-field" placeholder="Your Company Inc." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Default Currency</label>
                            <select className="input-field">
                                <option>USD</option>
                                <option>EUR</option>
                                <option>GBP</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Fiscal Year Start</label>
                            <select className="input-field">
                                <option>January</option>
                                <option>April</option>
                                <option>July</option>
                                <option>October</option>
                            </select>
                        </div>
                        <button className="btn btn-primary">
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
                <div className="space-y-6">
                    {/* Add New Rule */}
                    <div className="card p-6">
                        <h3 className="text-lg font-semibold mb-4">Add Custom Rule</h3>
                        <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input
                                type="text"
                                placeholder="Keyword (e.g., 'coffee')"
                                className="input-field"
                                value={newRule.keyword}
                                onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
                            />
                            <select
                                className="input-field"
                                value={newRule.category}
                                onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Subcategory (optional)"
                                className="input-field"
                                value={newRule.subcategory}
                                onChange={(e) => setNewRule({ ...newRule, subcategory: e.target.value })}
                            />
                            <button type="submit" className="btn btn-primary">
                                <Plus size={18} /> Add Rule
                            </button>
                        </form>
                    </div>

                    {/* Rules List */}
                    <div className="card overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-semibold">Custom Classification Rules</h3>
                            <p className="text-sm text-secondary mt-1">
                                {rules.length} rule{rules.length !== 1 ? 's' : ''} defined
                            </p>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center text-secondary">Loading rules...</div>
                        ) : rules.length === 0 ? (
                            <div className="p-12 text-center text-secondary">
                                <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
                                <p>No custom rules defined yet.</p>
                                <p className="text-sm mt-2">Add your first rule above to get started.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th>Keyword</th>
                                            <th>Category</th>
                                            <th>Subcategory</th>
                                            <th className="w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rules.map((rule) => (
                                            <tr key={rule.id}>
                                                <td className="font-mono text-sm">{rule.keyword}</td>
                                                <td>
                                                    <span className={`badge ${rule.category === 'Operating' ? 'badge-blue' :
                                                            rule.category === 'Investing' ? 'badge-orange' :
                                                                'badge-green'
                                                        }`}>
                                                        {rule.category}
                                                    </span>
                                                </td>
                                                <td className="text-secondary text-sm">{rule.subcategory || '-'}</td>
                                                <td>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="p-2 text-accent-red hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete rule"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="card p-8">
                    <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                            <input type="checkbox" className="w-4 h-4 text-accent-blue" defaultChecked />
                            <div>
                                <p className="font-medium text-primary">Low Confidence Alerts</p>
                                <p className="text-sm text-secondary">Get notified when transactions have low classification confidence</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                            <input type="checkbox" className="w-4 h-4 text-accent-blue" defaultChecked />
                            <div>
                                <p className="font-medium text-primary">Upload Completion</p>
                                <p className="text-sm text-secondary">Receive notifications when file uploads finish processing</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                            <input type="checkbox" className="w-4 h-4 text-accent-blue" />
                            <div>
                                <p className="font-medium text-primary">Weekly Summary</p>
                                <p className="text-sm text-secondary">Get a weekly email summary of classified transactions</p>
                            </div>
                        </label>
                    </div>
                    <button className="btn btn-primary mt-6">
                        <Save size={18} /> Save Preferences
                    </button>
                </div>
            )}

            {error && (
                <div className="fixed bottom-6 right-6 bg-red-50 text-accent-red px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}
        </div>
    );
};

export default Settings;
