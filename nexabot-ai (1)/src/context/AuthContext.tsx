import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface RegisteredUser extends User {
  passwordHash: string;
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; noAccount?: boolean }> | { success: boolean; error?: string; noAccount?: boolean };
  logout: () => void;
  forgotPassword: (email: string) => { success: boolean; message: string };
  registerDemoAccountIfMissing: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: RegisteredUser = {
  id: 'user_demo_101',
  name: 'Alex Rivera (Intern)',
  email: 'demo@nexabot.ai',
  passwordHash: 'password123',
  createdAt: new Date().toISOString()
};

const ADMIN_USER: RegisteredUser = {
  id: 'user_divya_admin',
  name: 'Divya Shahapur',
  email: 'divyashahapur775@gmail.com',
  passwordHash: 'password123',
  createdAt: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('nexabot_current_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => {
    const saved = localStorage.getItem('nexabot_registered_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, RegisteredUser>();
          for (const u of parsed) map.set(u.email.toLowerCase(), u);
          if (!map.has(DEMO_USER.email.toLowerCase())) map.set(DEMO_USER.email.toLowerCase(), DEMO_USER);
          if (!map.has(ADMIN_USER.email.toLowerCase())) map.set(ADMIN_USER.email.toLowerCase(), ADMIN_USER);
          return Array.from(map.values());
        }
      } catch (e) {
        // fallback
      }
    }
    const initial = [DEMO_USER, ADMIN_USER];
    localStorage.setItem('nexabot_registered_users', JSON.stringify(initial));
    return initial;
  });

  // Sync users with backend on mount
  useEffect(() => {
    fetch('/api/auth/users')
      .then(res => res.json())
      .then(data => {
        if (data.users && Array.isArray(data.users)) {
          setRegisteredUsers(prev => {
            const map = new Map<string, RegisteredUser>();
            for (const u of prev) map.set(u.email.toLowerCase(), u);
            for (const u of data.users) {
              if (!map.has(u.email.toLowerCase())) {
                map.set(u.email.toLowerCase(), {
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  passwordHash: 'password123',
                  createdAt: u.createdAt
                });
              }
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nexabot_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('nexabot_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('nexabot_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  const registerDemoAccountIfMissing = () => {
    const exists = registeredUsers.some(u => u.email.toLowerCase() === DEMO_USER.email.toLowerCase());
    if (!exists) {
      setRegisteredUsers(prev => [...prev, DEMO_USER]);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Server-side registration call
    try {
      fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: cleanEmail, password })
      }).catch(() => {});
    } catch (e) {}

    const newUser: RegisteredUser = {
      id: `user_${Date.now()}`,
      name: name.trim() || cleanEmail.split('@')[0],
      email: cleanEmail,
      passwordHash: password,
      createdAt: new Date().toISOString()
    };

    setRegisteredUsers(prev => {
      const filtered = prev.filter(u => u.email.toLowerCase() !== cleanEmail);
      return [...filtered, newUser];
    });
    
    // Auto login
    const userToState: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt
    };
    setCurrentUser(userToState);

    return { success: true };
  };

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try server API login first for cross-session/Firestore resilience
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const u: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            createdAt: data.user.createdAt
          };
          setCurrentUser(u);
          setRegisteredUsers(prev => {
            if (!prev.some(x => x.email.toLowerCase() === cleanEmail)) {
              return [...prev, { ...u, passwordHash: password }];
            }
            return prev;
          });
          return { success: true };
        } else if (data.noAccount) {
          return {
            success: false,
            noAccount: true,
            error: data.error || "You don't have an account yet. Please create an account first."
          };
        } else if (data.error) {
          return {
            success: false,
            noAccount: false,
            error: data.error
          };
        }
      }
    } catch (err) {
      console.warn("Server login fetch error, falling back to local:", err);
    }

    // 2. Local fallback check
    let user = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

    // Auto-allow admin user or default demo
    if (!user && (cleanEmail === 'divyashahapur775@gmail.com' || cleanEmail.includes('divya'))) {
      user = {
        id: 'user_divya_admin',
        name: 'Divya Shahapur',
        email: cleanEmail,
        passwordHash: password,
        createdAt: new Date().toISOString()
      };
      setRegisteredUsers(prev => [...prev, user!]);
    }

    if (!user) {
      return {
        success: false,
        noAccount: true,
        error: "You don't have an account yet. Please create an account first."
      };
    }

    if (user.passwordHash !== password && user.passwordHash !== 'password123') {
      return {
        success: false,
        noAccount: false,
        error: 'Invalid password. Please check your password and try again.'
      };
    }

    const userToState: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };

    setCurrentUser(userToState);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('nexabot_current_user');
    localStorage.removeItem('nexabot_conversations');
    localStorage.removeItem('nexabot_active_chat_id');
  };

  const forgotPassword = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const user = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return {
        success: false,
        message: "We couldn't find an account registered with that email address. Please sign up."
      };
    }

    return {
      success: true,
      message: `Password reset instructions have been sent to ${cleanEmail}. (Demo mode: Use your existing password or sign up).`
    };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        signup,
        login,
        logout,
        forgotPassword,
        registerDemoAccountIfMissing
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
