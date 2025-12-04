import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import SmartAdd from './components/SmartAdd';
import FileUpload from './components/FileUpload';
import Settings from './pages/Settings';
import Compliance from './pages/Compliance';

const TransactionsPage = () => (
  <div className="space-y-6">
    <SmartAdd />
    <FileUpload />
    <TransactionList />
  </div>
);

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="*" element={<div className="text-center py-20 text-gray-500">Page not found</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
