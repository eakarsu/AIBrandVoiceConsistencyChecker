import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(()=>{const value=localStorage.getItem('token');if(value)axios.defaults.headers.common.Authorization='Bearer '+value;return value;});

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = localStorage.getItem('user');
      if(userData){try{setUser(JSON.parse(userData));}catch(_){localStorage.removeItem('token');localStorage.removeItem('user');delete axios.defaults.headers.common.Authorization;setToken(null);setUser(null);}}
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token: t, user: u } = res.data||{};
    if(typeof t!=='string'||!t||!u||!Number.isSafeInteger(Number(u.id))||Number(u.id)<=0||typeof u.email!=='string'||u.email.toLowerCase()!==email.trim().toLowerCase())throw Error('The native sign-in response was invalid. No session was saved.');
    let claims;try{claims=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch(_){throw Error('The native sign-in token was malformed. No session was saved.');}
    if(Number(claims.id)!==Number(u.id)||claims.email!==u.email||claims.role!==u.role||claims.tenantId!==u.tenantId)throw Error('The native sign-in identity did not match its token. No session was saved.');
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
