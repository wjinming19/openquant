import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Strategy from './pages/Strategy';
import StockSelect from './pages/StockSelect';
import Industry from './pages/Industry';
import Market from './pages/Market';
import Watchlist from './pages/Watchlist';
import AIAnalysis from './pages/AIAnalysis';
import StockDetail from './pages/StockDetail';
import './App.css';

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isLoggedIn = localStorage.getItem('openquant_auth') === 'true';
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Router>
        <Routes>
          {/* 登录页面（公开访问） */}
          <Route path="/login" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />
          
          {/* 受保护的路由 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/strategy" 
            element={
              <ProtectedRoute>
                <Strategy darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stock-select" 
            element={
              <ProtectedRoute>
                <StockSelect darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/industry" 
            element={
              <ProtectedRoute>
                <Industry darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/market" 
            element={
              <ProtectedRoute>
                <Market darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/watchlist" 
            element={
              <ProtectedRoute>
                <Watchlist darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-analysis" 
            element={
              <ProtectedRoute>
                <AIAnalysis darkMode={darkMode} setDarkMode={setDarkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/stock/:symbol" 
            element={
              <ProtectedRoute>
                <StockDetail />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
