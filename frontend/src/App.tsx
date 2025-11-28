import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;

