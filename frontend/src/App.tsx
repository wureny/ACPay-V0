import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import Dashboard from './pages/Dashboard';
import WelcomePage from './components/WelcomePage';
import { useContract } from './hooks/useContract';

const { Content } = Layout;

const App: React.FC = () => {
  const { walletState } = useContract();

  return (
    <div className="app-container" style={{ minHeight: '100vh' }}>
      <Layout className="dashboard-layout" style={{ minHeight: '100vh' }}>
        <Content style={{ minHeight: '100vh' }}>
          {walletState.isConnected ? (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          ) : (
            <WelcomePage />
          )}
        </Content>
      </Layout>
    </div>
  );
};

export default App; 