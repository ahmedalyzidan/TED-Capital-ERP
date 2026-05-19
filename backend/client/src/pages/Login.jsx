import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // step: 1 = Credentials, 2 = OTP (2FA), 3 = Select Company, 'forgot_password' = Forgot Password
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ username: '', password: '', otp: '', company: 'كل الشركات' });
  const [forgotData, setForgotData] = useState({ username: '', recoveryType: 'email', email: '', phone: '' });
  
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [tempToken, setTempToken] = useState(null);
  const [tempRefresh, setTempRefresh] = useState(null);
  const [partialToken, setPartialToken] = useState(null);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [publicCompanies, setPublicCompanies] = useState(['كل الشركات', 'TED Capital', 'Design Concept', 'Master Builder', 'PRIMEMED PHARMA']);
  const [allowedCompanies, setAllowedCompanies] = useState(['كل الشركات']);

  useEffect(() => {
    const fetchComps = async () => {
      try {
        const res = await api.get('/public/companies');
        if (res.data?.companies) {
          setPublicCompanies(['كل الشركات', ...res.data.companies]);
        }
      } catch (err) {
        console.error("Failed to load public companies", err);
      }
    };
    fetchComps();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleForgotChange = (e) => {
    setForgotData({ ...forgotData, [e.target.name]: e.target.value });
  };

  // 🌟 معالجة الخطوة الأولى: التحقق من اسم المستخدم وكلمة المرور
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', {
        username: formData.username,
        password: formData.password
      });

      if (response.data?.requires2FA) {
        setPartialToken(response.data.token);
        setStep(2);
      } else if (response.data?.success) {
        const userObj = response.data.user;
        const tokenObj = response.data.token;
        const refreshObj = response.data.refreshToken;

        setAuthenticatedUser(userObj);
        setTempToken(tokenObj);
        setTempRefresh(refreshObj);

        // 🌟 تحديد الشركات المسموحة للمستخدم بناءً على مصفوفة الصلاحيات
        let allowed = ['TED Capital', 'Design Concept', 'Master Builder', 'PRIMEMED PHARMA'];
        const perms = typeof userObj?.permissions === 'string' ? JSON.parse(userObj.permissions || '{}') : (userObj?.permissions || {});
        
        const userRole = (userObj?.role || '').toLowerCase().trim();
        const userName = (userObj?.username || '').toLowerCase().trim();

        if (perms?.companies && perms.companies.length > 0) {
          if (perms.companies.includes('ALL')) {
            allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          } else {
            allowed = perms.companies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          }
        } else if (userRole === 'admin' || userRole === 'super admin' || userName === 'admin') {
          allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
        } else if (userObj?.linked_company) {
          allowed = [userObj.linked_company].filter(c => c !== 'كل الشركات' && c !== 'ALL');
        } else {
          allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
        }

        if (allowed.length === 0) {
          allowed = ['TED Capital'];
        }

        setAllowedCompanies(allowed);
        setFormData(prev => ({ ...prev, company: allowed[0] }));
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'بيانات الدخول غير صحيحة أو الحساب غير فعال.');
    } finally {
      setLoading(false);
    }
  };

  // 🌟 معالجة الخطوة الثانية: كود المصادقة الثنائية (OTP)
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/2fa/validate', {
        token: partialToken,
        otp: formData.otp
      });

      if (response.data?.success) {
        const userObj = response.data.user;
        const tokenObj = response.data.token;
        const refreshObj = response.data.refreshToken;

        setAuthenticatedUser(userObj);
        setTempToken(tokenObj);
        setTempRefresh(refreshObj);

        // 🌟 تحديد الشركات المسموحة للمستخدم
        let allowed = ['TED Capital', 'Design Concept', 'Master Builder', 'PRIMEMED PHARMA'];
        const perms = typeof userObj?.permissions === 'string' ? JSON.parse(userObj.permissions || '{}') : (userObj?.permissions || {});
        
        const userRole = (userObj?.role || '').toLowerCase().trim();
        const userName = (userObj?.username || '').toLowerCase().trim();

        if (perms?.companies && perms.companies.length > 0) {
          if (perms.companies.includes('ALL')) {
            allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          } else {
            allowed = perms.companies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          }
        } else if (userRole === 'admin' || userRole === 'super admin' || userName === 'admin') {
          allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
        } else if (userObj?.linked_company) {
          allowed = [userObj.linked_company].filter(c => c !== 'كل الشركات' && c !== 'ALL');
        } else {
          allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
        }

        if (allowed.length === 0) {
          allowed = ['TED Capital'];
        }

        setAllowedCompanies(allowed);
        setFormData(prev => ({ ...prev, company: allowed[0] }));
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'الكود غير صحيح أو منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  };

  // 🌟 معالجة الخطوة الثالثة: اختيار الشركة واعتماد الدخول النهائي
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      localStorage.setItem('token', tempToken);
      if (tempRefresh) localStorage.setItem('refresh_token', tempRefresh);
      
      const enrichedUser = { 
        ...authenticatedUser, 
        selectedCompany: formData.company 
      };
      
      localStorage.setItem('user', JSON.stringify(enrichedUser));
      login(enrichedUser, tempToken, tempRefresh, formData.company);
      
      // التوجيه للصفحة الرئيسية
      window.location.href = '/';
    } catch (err) {
      setError('حدث خطأ أثناء إعداد جلسة العمل.');
      setLoading(false);
    }
  };

  // 🌟 معالجة استعادة كلمة المرور
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await api.post('/public/forgot-password', {
        username: forgotData.username,
        recoveryType: forgotData.recoveryType,
        email: forgotData.email,
        phone: forgotData.phone
      });

      if (response.data?.success) {
        setSuccessMsg(response.data.message || 'تم إرسال تعليمات الاستعادة بنجاح.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء معالجة طلب الاستعادة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4 relative overflow-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      
      <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/10 relative z-10 animate-fade-in">
        
        {/* --- HEADER DYNAMIC BRANDING --- */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white/5 rounded-2xl border border-white/10 mb-6 shadow-inner">
            <span className="text-4xl">
              {step === 1 ? '🛡️' : step === 2 ? '🔐' : step === 3 ? '🏢' : '🔑'}
            </span>
          </div>

          {/* 🌟 1. في شاشة الدخول الأولى يكون اسم البرنامج ERP ONLY. وبعد اختيار الشركة يكتب اسم المستخدم فوق اسم الشركة + ERP 🌟 */}
          {step === 3 ? (
            <>
              <h2 className="text-xl font-bold text-emerald-400 mb-1 tracking-wider animate-fade-in">
                {authenticatedUser?.full_name || authenticatedUser?.username}
              </h2>
              <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase italic animate-fade-in">
                {formData.company === 'كل الشركات' ? 'ERP' : `${formData.company} ERP`}
              </h1>
            </>
          ) : step === 'forgot_password' ? (
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase italic">
              استعادة كلمة المرور
            </h1>
          ) : (
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase italic">
              ERP
            </h1>
          )}

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="h-px w-8 bg-white/10"></span>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
              {step === 1 ? 'نظام الإدارة المتكامل' : step === 2 ? 'المصادقة الثنائية' : step === 3 ? 'تأكيد نطاق الدخول للشركة المسموحة' : 'بوابة الأمان والاستعادة'}
            </p>
            <span className="h-px w-8 bg-white/10"></span>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl text-xs font-black mb-8 text-center border border-rose-500/20 backdrop-blur-md animate-bounce">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-2xl text-xs font-black mb-8 text-center border border-emerald-500/20 backdrop-blur-md animate-fade-in">
            ✅ {successMsg}
          </div>
        )}

        {/* --- STEP 1: USERNAME & PASSWORD --- */}
        {step === 1 && (
          <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-6 animate-fade-in">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">هوية المستخدم</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none text-white transition-all text-left font-mono"
                dir="ltr"
                placeholder="Username"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">كلمة المرور</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none text-white transition-all text-left font-mono"
                dir="ltr"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl p-4 transition-all active:scale-95 disabled:opacity-50 mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative font-black text-white uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    التالي (التحقق من الشركات)
                    <span className="text-xl">←</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setError(''); setSuccessMsg(''); setStep('forgot_password'); }}
                className="text-xs font-bold text-slate-400 hover:text-blue-400 transition-colors underline underline-offset-4"
              >
                نسيت كلمة السر؟ (استعادة الحساب)
              </button>
            </div>
          </form>
        )}

        {/* --- STEP 2: OTP (2FA) --- */}
        {step === 2 && (
          <form onSubmit={handleOTPSubmit} className="flex flex-col gap-6 animate-fade-in">
            <div className="text-center space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">كود التحقق الأمني (OTP)</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                required
                maxLength="6"
                placeholder="000000"
                className="w-full p-5 rounded-2xl bg-white/5 border border-white/20 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-400 text-center text-3xl font-black font-mono tracking-[0.5em] transition-all"
                dir="ltr"
              />
              <p className="text-[9px] text-slate-500 font-bold uppercase">يرجى إدخال الكود المكون من 6 أرقام من تطبيق Authenticator</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl p-4 transition-all active:scale-95 disabled:opacity-50 mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-700"></div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative font-black text-white uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    تأكيد الهوية
                    <span className="text-xl">←</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setError(''); setStep(1); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-400 transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

        {/* --- STEP 3: SELECT COMPANY --- */}
        {step === 3 && (
          <form onSubmit={handleCompanySubmit} className="flex flex-col gap-6 animate-fade-in">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                الشركات المسموح لك بالدخول عليها:
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {allowedCompanies.map((comp, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      formData.company === comp
                        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{comp === 'كل الشركات' ? '🌐' : '🏢'}</span>
                      <span className="font-bold text-sm">{comp}</span>
                    </div>
                    <input
                      type="radio"
                      name="company"
                      value={comp}
                      checked={formData.company === comp}
                      onChange={handleChange}
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl p-4 transition-all active:scale-95 disabled:opacity-50 mt-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-blue-600"></div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative font-black text-white uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    الدخول إلى النظام
                    <span className="text-xl">←</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep(1);
                  setAuthenticatedUser(null);
                  setTempToken(null);
                  setTempRefresh(null);
                }}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
              >
                إلغاء وتسجيل خروج
              </button>
            </div>
          </form>
        )}

        {/* --- FORGOT PASSWORD --- */}
        {step === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-6 animate-fade-in">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">اسم المستخدم</label>
              <input
                type="text"
                name="username"
                value={forgotData.username}
                onChange={handleForgotChange}
                required
                className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none text-white transition-all text-left font-mono"
                dir="ltr"
                placeholder="Username"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">طريقة الاستعادة</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs transition-all ${forgotData.recoveryType === 'email' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                  <span>📧</span> البريد الإلكتروني
                  <input type="radio" name="recoveryType" value="email" checked={forgotData.recoveryType === 'email'} onChange={handleForgotChange} className="sr-only" />
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs transition-all ${forgotData.recoveryType === 'whatsapp' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                  <span>💬</span> واتساب الجوال
                  <input type="radio" name="recoveryType" value="whatsapp" checked={forgotData.recoveryType === 'whatsapp'} onChange={handleForgotChange} className="sr-only" />
                </label>
              </div>
            </div>

            {forgotData.recoveryType === 'email' ? (
              <div className="space-y-2 animate-fade-in">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">البريد الإلكتروني المسجل</label>
                <input
                  type="email"
                  name="email"
                  value={forgotData.email}
                  onChange={handleForgotChange}
                  required
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none text-white transition-all text-left font-mono"
                  dir="ltr"
                  placeholder="user@example.com"
                />
              </div>
            ) : (
              <div className="space-y-2 animate-fade-in">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">رقم الجوال (واتساب)</label>
                <input
                  type="tel"
                  name="phone"
                  value={forgotData.phone}
                  onChange={handleForgotChange}
                  required
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 outline-none text-white transition-all text-left font-mono"
                  dir="ltr"
                  placeholder="+970590000000"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl p-4 transition-all active:scale-95 disabled:opacity-50 mt-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative font-black text-white uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    إرسال طلب الاستعادة
                    <span className="text-xl">←</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setError(''); setSuccessMsg(''); setStep(1); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-400 transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </form>
        )}

        <div className="mt-10 text-center">
          <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.4em]">TED Capital • Infrastructure Protocol v4.0</p>
        </div>
      </div>
    </div>
  );
}