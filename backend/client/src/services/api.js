import axios from 'axios';

const api = axios.create({
  baseURL: typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : 'http://46.224.144.166/api',
  timeout: 20000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); 
    const activeCompany = localStorage.getItem('active_company');
    
    // 🌟 حماية صارمة: لا ترسل التوكن إلا إذا كان كوداً حقيقياً وليس مجرد كلمة فارغة
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (activeCompany) {
      config.headers['X-Selected-Company'] = activeCompany;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🌟 إضافة تفاصيل الخطأ للمساعدة في التشخيص
    if (!error.response) {
      console.error("Network Error - check your internet or API server:", error.message);
    }

    if (error.response && error.response.status === 401) {
      // تنظيف الذاكرة فوراً عند رفض الباك إند للتوكن
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 🌟 منع اللوب: لا تقم بالتوجيه إلا إذا كنا خارج شاشة الدخول فعلياً
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
         window.location.replace('/login'); // استخدام replace بدلاً من href لمنع اللوب
      }
    }
    return Promise.reject(error);
  }
);

export default api;