import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store';
import theme from './theme/theme';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import TransactionsTest from './pages/TransactionsTest';
import TransactionDetail from './pages/TransactionDetail';
import Workflows from './pages/Workflows';
import AuditCompliance from './pages/AuditCompliance';
import Security from './pages/Security';
import Settings from './pages/Settings';

// Placeholder components for other routes
const Placeholder = ({ title }) => <div style={{ padding: 20 }}><h1>{title}</h1><p>Coming Soon</p></div>;

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <Router>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/transactions/:id" element={<TransactionDetail />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/audit" element={<AuditCompliance />} />
              <Route path="/security" element={<Security />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </MainLayout>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
