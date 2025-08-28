import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider, theme } from 'antd';
import { Helmet } from 'react-helmet';

import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import BuildDetails from './pages/BuildDetails/BuildDetails';
import Alerts from './pages/Alerts/Alerts';
import Settings from './pages/Settings/Settings';
import Login from './pages/Login/Login';

import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import './App.css';

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 30000, // 30 seconds
      cacheTime: 600000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <AuthProvider>
          <WebSocketProvider>
            <div className="App">
              <Helmet>
                <title>CI/CD Monitoring Dashboard</title>
                <meta name="description" content="Real-time CI/CD pipeline monitoring and alerting system" />
              </Helmet>
              
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="builds/:buildId" element={<BuildDetails />} />
                    <Route path="alerts" element={<Alerts />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
              </Router>
            </div>
          </WebSocketProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
