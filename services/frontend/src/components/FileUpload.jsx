import React, { useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';

const FileUpload = ({ onUploadComplete }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const endpoint = file.name.endsWith('.json') ? '/upload/json' : '/upload/csv';
            const response = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResult(response.data);
            setFile(null);
            if (onUploadComplete) onUploadComplete(response.data);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center gap-2 mb-4 text-primary">
                <Upload size={20} />
                <h3 className="font-semibold">Upload Transaction File</h3>
            </div>

            <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <input
                        type="file"
                        accept=".json,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <FileText size={48} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            JSON or CSV files (max 10MB)
                        </p>
                    </label>
                </div>

                {file && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <FileText size={20} className="text-primary" />
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-xs text-gray-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {uploading ? 'Uploading...' : 'Upload and Process'}
                    </button>
                )}

                {result && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                            <CheckCircle size={20} />
                            <span className="font-semibold">Upload Successful!</span>
                        </div>
                        <div className="text-sm text-green-600 space-y-1">
                            <p>Total: {result.total} transactions</p>
                            <p>Classified: {result.classified}</p>
                            {result.errors > 0 && <p>Errors: {result.errors}</p>}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                            <AlertCircle size={20} />
                            <span className="font-semibold">{error}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
