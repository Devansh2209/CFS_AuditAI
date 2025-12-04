import React, { useState } from 'react';
import { Send, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

const SmartAdd = ({ onTransactionAdded }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const parseTransaction = (text) => {
        // Simple client-side parsing to extract amount and date if possible
        // The heavy lifting is done by the backend (BERT/Complex Parser)
        const amountMatch = text.match(/\$?(\d{1,3}(,\d{3})*(\.\d{2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

        let date = new Date().toISOString().split('T')[0];
        if (text.toLowerCase().includes('yesterday')) {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            date = d.toISOString().split('T')[0];
        }

        return {
            date,
            amount,
            description: text, // Send full text as description for backend parsing
            rawInput: text,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const parsedData = parseTransaction(input);

            // Send to backend classification endpoint
            const response = await api.post('/classify', {
                description: parsedData.description,
                amount: parsedData.amount,
                date: parsedData.date,
                rawInput: parsedData.rawInput,
            });

            if (response.data && !response.data.error) {
                setSuccess(true);
                setInput('');
                if (onTransactionAdded) onTransactionAdded();

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(false), 3000);
            } else {
                throw new Error(response.data.message || 'Classification failed');
            }
        } catch (err) {
            console.error('Classification error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to classify transaction. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card p-6 mb-6 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-full text-accent-blue">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Smart Add</h3>
                    <p className="text-sm text-secondary">Describe your transaction naturally</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="e.g. 'International royalty payment of $1.25 million' or 'Starbucks $15'"
                        className="input-field pl-4 pr-14 py-4 text-lg shadow-sm"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg transition-all ${input.trim() ? 'bg-accent-blue text-white shadow-md hover:bg-accent-blue-hover' : 'bg-gray-100 text-gray-400'
                            }`}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </div>
            </form>

            {/* Status Messages */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 text-accent-red rounded-lg flex items-center gap-2 text-sm animate-fade-in">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {success && (
                <div className="mt-4 p-3 bg-green-50 text-accent-green rounded-lg flex items-center gap-2 text-sm animate-fade-in">
                    <CheckCircle2 size={16} />
                    Transaction classified and added successfully!
                </div>
            )}

            {/* Decorative background element */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>
    );
};

export default SmartAdd;
