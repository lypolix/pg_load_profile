import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Тестовый аккаунт
const TEST_CREDENTIALS = {
  email: 'admin@vtb.ru',
  password: 'admin123'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    localStorage.getItem('isAuthenticated') === 'true'
  );
  const [user, setUser] = useState<string | null>(
    localStorage.getItem('user')
  );

  const login = (email: string, password: string): boolean => {
    if (email === TEST_CREDENTIALS.email && password === TEST_CREDENTIALS.password) {
      setIsAuthenticated(true);
      setUser(email);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', email);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

