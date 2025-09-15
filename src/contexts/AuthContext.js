import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      console.log('Fetching user profile with token:', token);
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('User profile fetched successfully:', response.data);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      console.error('Error details:', error.response?.data);
      // Don't logout immediately, just set user to null
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Login attempt for email:', email);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });
      
      console.log('Login response:', response.data);
      const { token: newToken, user: userData } = response.data;
      
      console.log('Setting token and user data:', { newToken, userData });
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      console.log('Login successful, user set to:', userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const signup = async (userData) => {
    try {
      console.log('AuthContext signup called with:', userData);
      console.log('Making API call to /api/auth/signup');
      
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, userData);
      console.log('API response received:', response.data);
      
      const { token: newToken, user: newUser } = response.data;
      
      console.log('Signup successful, setting user data:', { newToken, newUser });
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      console.log('User set after signup:', newUser);
      return { success: true };
    } catch (error) {
      console.error('AuthContext signup error:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || 'Signup failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Profile update failed'
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
