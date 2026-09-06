import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';

import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { Chatbot } from './pages/Chatbot';
import { MultilingualChat } from './pages/MultilingualChat';

function AppContent() {
  const { isAuthenticated } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    if (['/', '/login', '/signup', '/forgot-password', '/chatbot', '/multilingual'].includes(hash)) {
      return hash;
    }
    return '/';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['/', '/login', '/signup', '/forgot-password', '/chatbot', '/multilingual'].includes(hash)) {
        setCurrentPath(hash);
      } else {
        setCurrentPath('/');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = path;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Protected route check for /chatbot and /multilingual
  if ((currentPath === '/chatbot' || currentPath === '/multilingual') && !isAuthenticated) {
    return <Login onNavigate={navigate} />;
  }

  switch (currentPath) {
    case '/login':
      return <Login onNavigate={navigate} />;
    case '/signup':
      return <Signup onNavigate={navigate} />;
    case '/forgot-password':
      return <ForgotPassword onNavigate={navigate} />;
    case '/chatbot':
      return <Chatbot onNavigate={navigate} />;
    case '/multilingual':
      return <MultilingualChat onNavigate={navigate} />;
    case '/':
    default:
      return <LandingPage onNavigate={navigate} />;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
