import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

// إنشاء الـ Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // لمنع الوميض عند تحميل الصفحة
  
  const fetchSecurityMetadata = useCallback(async (tokenToUse) => {
    try {
      const res = await api.get('/iam/metadata', {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      });
      return res.data;
    } catch (err) {
      console.error("Failed to fetch security metadata", err);
      return null;
    }
  }, []);


  // عند فتح التطبيق، نتحقق مما إذا كان هناك توكن محفوظ مسبقاً
  useEffect(() => {
    const refreshUser = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedCompany = localStorage.getItem('active_company');
      
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          if (storedCompany) {
            userObj.selectedCompany = storedCompany;
          }
          setUser(userObj);
        }
        
        // Always refresh metadata from server to catch role updates
        try {
          const metadata = await fetchSecurityMetadata(storedToken);
          if (metadata) {
            setUser(prev => {
              const updated = { 
                ...prev, 
                role: metadata.roles?.[0] || prev?.role,
                permissions: metadata.flattenedPermissions || [],
                isSuperAdmin: metadata.isSuperAdmin || false,
                photo: metadata.photo || prev?.photo,
                selectedCompany: storedCompany || prev?.selectedCompany || 'كل الشركات'
              };
              localStorage.setItem('user', JSON.stringify(updated));
              return updated;
            });
          }
        } catch (err) {
          console.error("Auth Refresh Failed", err);
        }
      }
      setLoading(false);
    };

    refreshUser();
  }, [fetchSecurityMetadata]);



  // دالة تسجيل الدخول (سيتم استدعاؤها من شاشة الـ Login)
  const login = async (userData, accessToken, refreshToken, selectedCompany) => {
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    if (selectedCompany) {
      localStorage.setItem('active_company', selectedCompany);
    } else {
      localStorage.removeItem('active_company');
    }
    
    // Fetch granular permissions immediately
    const metadata = await fetchSecurityMetadata(accessToken);
    const enrichedUser = { 
      ...userData, 
      permissions: metadata?.flattenedPermissions || [],
      isSuperAdmin: metadata?.isSuperAdmin || false,
      selectedCompany: selectedCompany || 'كل الشركات'
    };
    
    setUser(enrichedUser);
    localStorage.setItem('user', JSON.stringify(enrichedUser));
  };

  // دالة تسجيل الخروج
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('active_company');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-bold">جاري تحميل النظام...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook لتسهيل استدعاء البيانات في أي مكان
export const useAuth = () => useContext(AuthContext);