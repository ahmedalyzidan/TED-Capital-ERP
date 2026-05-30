import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { language, setLanguage, theme, setTheme } = useLanguage();

  const t = {
    ar: {
      integratedSystem: "نظام الإدارة المتكامل",
      twoFactor: "المصادقة الثنائية",
      confirmCompany: "تأكيد نطاق الدخول للشركة المسموحة",
      recoveryPortal: "بوابة الأمان والاستعادة",
      username: "هوية المستخدم",
      password: "كلمة المرور",
      next: "التالي (التحقق من الشركات)",
      forgotPassLink: "نسيت كلمة السر؟ (استعادة الحساب)",
      otpLabel: "كود التحقق الأمني (OTP)",
      otpHelp: "يرجى إدخال الكود المكون من 6 أرقام من تطبيق Authenticator",
      confirmIdentity: "تأكيد الهوية",
      backToLogin: "العودة لتسجيل الدخول",
      allowedCompanies: "الشركات المسموح لك بالدخول عليها:",
      enterSystem: "الدخول إلى النظام",
      cancelAndLogout: "إلغاء وتسجيل خروج",
      forgotPassTitle: "استعادة كلمة المرور",
      recoveryType: "طريقة الاستعادة",
      email: "البريد الإلكتروني",
      whatsapp: "واتساب الجوال",
      registeredEmail: "البريد الإلكتروني المسجل",
      registeredPhone: "رقم الجوال (واتساب)",
      sendRecovery: "إرسال طلب الاستعادة",
      serverConnError: "لا يمكن الاتصال بالخادم. تأكد من اتصال الإنترنت أو أن عنوان الخادم صحيح.",
      invalidCredentials: "بيانات الدخول غير صحيحة أو الحساب غير فعال.",
      invalidOtp: "الكود غير صحيح أو منتهي الصلاحية.",
      sessionSetupError: "حدث خطأ أثناء إعداد جلسة العمل.",
      recoverySent: "تم إرسال تعليمات الاستعادة بنجاح.",
      recoveryError: "حدث خطأ أثناء معالجة طلب الاستعادة.",
      allCompanies: "كل الشركات"
    },
    en: {
      integratedSystem: "Integrated Management System",
      twoFactor: "Two-Factor Authentication",
      confirmCompany: "Confirm Allowed Company Scope",
      recoveryPortal: "Security & Recovery Portal",
      username: "User Identity",
      password: "Password",
      next: "Next (Verify Companies)",
      forgotPassLink: "Forgot Password? (Recover Account)",
      otpLabel: "Security Code (OTP)",
      otpHelp: "Please enter the 6-digit code from your Authenticator app",
      confirmIdentity: "Confirm Identity",
      backToLogin: "Back to Login",
      allowedCompanies: "Allowed Companies to Access:",
      enterSystem: "Enter System",
      cancelAndLogout: "Cancel and Logout",
      forgotPassTitle: "Recover Password",
      recoveryType: "Recovery Method",
      email: "Email Address",
      whatsapp: "WhatsApp Mobile",
      registeredEmail: "Registered Email Address",
      registeredPhone: "Mobile Number (WhatsApp)",
      sendRecovery: "Send Recovery Request",
      serverConnError: "Cannot connect to server. Check internet connection or server address.",
      invalidCredentials: "Invalid credentials or inactive account.",
      invalidOtp: "Invalid or expired code.",
      sessionSetupError: "An error occurred setting up the session.",
      recoverySent: "Recovery instructions sent successfully.",
      recoveryError: "An error occurred processing the recovery request.",
      allCompanies: "All Companies"
    }
  }[language === 'en' ? 'en' : 'ar'];

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

        if (userName === 'mtayem') {
          allowed = ['TED Capital', 'PRIMEMED PHARMA'];
        } else if (userName === 'msobhi') {
          allowed = ['Design Concept'];
        } else if (userRole === 'admin' || userRole === 'super admin' || userName === 'admin' || userName === 'abzidan') {
          allowed = publicCompanies.filter(c => c !== 'ALL');
        } else if (perms?.companies && perms.companies.length > 0) {
          if (perms.companies.includes('ALL')) {
            allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          } else {
            allowed = perms.companies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          }
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
      console.error("Login Error:", err);
      if (!err.response) {
        setError(t.serverConnError);
      } else {
        setError(err.response?.data?.error || t.invalidCredentials);
      }
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

        if (userName === 'mtayem') {
          allowed = ['TED Capital', 'PRIMEMED PHARMA'];
        } else if (userName === 'msobhi') {
          allowed = ['Design Concept'];
        } else if (userRole === 'admin' || userRole === 'super admin' || userName === 'admin' || userName === 'abzidan') {
          allowed = publicCompanies.filter(c => c !== 'ALL');
        } else if (perms?.companies && perms.companies.length > 0) {
          if (perms.companies.includes('ALL')) {
            allowed = publicCompanies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          } else {
            allowed = perms.companies.filter(c => c !== 'كل الشركات' && c !== 'ALL');
          }
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
      setError(err.response?.data?.error || t.invalidOtp);
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
      setError(t.sessionSetupError);
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
        setSuccessMsg(response.data.message || t.recoverySent);
      }
    } catch (err) {
      setError(err.response?.data?.error || t.recoveryError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex justify-center items-center p-4 relative overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`} dir={language === 'ar' ? 'rtl' : 'ltr'}>

      {/* Floating Language & Theme Toggles */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-30 animate-fade-in">
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className={`px-4 py-2 rounded-2xl border text-xs font-black transition-all shadow-lg active:scale-95 flex items-center gap-2 ${theme === 'dark'
              ? 'bg-slate-900/80 border-white/10 text-white hover:bg-slate-800'
              : 'bg-white/90 border-slate-200 text-slate-850 hover:bg-slate-100 shadow-slate-200/50'
            }`}
        >
          <span>{language === 'ar' ? '🇬🇧' : '🇸🇦'}</span>
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-2.5 rounded-2xl border transition-all shadow-lg active:scale-95 flex items-center justify-center ${theme === 'dark'
              ? 'bg-slate-900/80 border-white/10 text-amber-400 hover:bg-slate-800'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-slate-200/50'
            }`}
          title={language === 'ar' ? 'تغيير الوضع' : 'Change Mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Animated Background Elements */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-pulse transition-colors duration-500 ${theme === 'dark' ? 'bg-blue-600/10' : 'bg-blue-600/5'
        }`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-pulse delay-1000 transition-colors duration-500 ${theme === 'dark' ? 'bg-emerald-600/10' : 'bg-emerald-600/5'
        }`}></div>

      <div className={`backdrop-blur-3xl p-10 rounded-[2.5rem] w-full max-w-md relative z-10 animate-fade-in border transition-all duration-300 ${theme === 'dark'
          ? 'bg-white/5 border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]'
          : 'bg-white/80 border-slate-200/80 shadow-[0_32px_64px_-12px_rgba(15,23,42,0.08)]'
        }`}>

        {/* --- HEADER DYNAMIC BRANDING --- */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className={`inline-block rounded-2xl border shadow-inner transition-all duration-300 overflow-hidden ${
            authenticatedUser?.photo ? 'p-0 w-20 h-20 mb-3' : 'p-4'
          } ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            {authenticatedUser?.photo ? (
              <img 
                src={authenticatedUser.photo.startsWith('/') && !authenticatedUser.photo.startsWith('//')
                  ? `${window.location.origin.includes('localhost') ? 'http://localhost:4000' : 'http://46.224.144.166'}${authenticatedUser.photo}`
                  : authenticatedUser.photo
                } 
                alt={authenticatedUser?.username} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <span className="text-4xl">
                {step === 1 ? '🛡️' : step === 2 ? '🔐' : step === 3 ? '🏢' : '🔑'}
              </span>
            )}
          </div>

          {/* 🌟 1. في شاشة الدخول الأولى يكون اسم البرنامج ERP ONLY. وبعد اختيار الشركة يكتب اسم المستخدم فوق اسم الشركة + ERP 🌟 */}
          {step === 3 ? (
            <>
              <h2 className="text-xl font-bold text-emerald-400 mb-1 tracking-wider animate-fade-in">
                {authenticatedUser?.full_name || authenticatedUser?.username}
              </h2>
              <h1 className={`text-3xl font-black tracking-tighter mb-2 uppercase italic animate-fade-in ${theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                {formData.company === 'كل الشركات' ? 'ERP' : `${formData.company === 'كل الشركات' ? t.allCompanies : formData.company} ERP`}
              </h1>
            </>
          ) : step === 'forgot_password' ? (
            <h1 className={`text-3xl font-black tracking-tighter mb-2 uppercase italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
              {t.forgotPassTitle}
            </h1>
          ) : (
            <h1 className={`text-4xl font-black tracking-tighter mb-2 uppercase italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
              ERP
            </h1>
          )}

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`h-px w-8 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`}></span>
            <p className={`font-bold text-[10px] uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
              {step === 1 ? t.integratedSystem : step === 2 ? t.twoFactor : step === 3 ? t.confirmCompany : t.recoveryPortal}
            </p>
            <span className={`h-px w-8 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'}`}></span>
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
              <label className={`block text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                } ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>
                {t.username}
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-mono ${theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                  } ${language === 'ar' ? 'text-right' : 'text-left'}`}
                dir="ltr"
                placeholder={language === 'ar' ? 'اسم المستخدم' : 'Username'}
              />
            </div>

            <div className="space-y-2">
              <label className={`block text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                } ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>
                {t.password}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-mono ${theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                  } ${language === 'ar' ? 'text-right' : 'text-left'}`}
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
                    {t.next}
                    <span className={`text-xl ${language === 'ar' ? 'rotate-0' : 'rotate-180'}`}>←</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setError(''); setSuccessMsg(''); setStep('forgot_password'); }}
                className={`text-xs font-bold transition-colors underline underline-offset-4 ${theme === 'dark' ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'
                  }`}
              >
                {t.forgotPassLink}
              </button>
            </div>
          </form>
        )}

        {/* --- STEP 2: OTP (2FA) --- */}
        {step === 2 && (
          <form onSubmit={handleOTPSubmit} className="flex flex-col gap-6 animate-fade-in">
            <div className="text-center space-y-4">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>{t.otpLabel}</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                required
                maxLength="6"
                placeholder="000000"
                className={`w-full p-5 rounded-2xl border outline-none text-center text-3xl font-black font-mono tracking-[0.5em] transition-all ${theme === 'dark'
                    ? 'bg-white/5 border-white/20 text-emerald-450 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10'
                    : 'bg-slate-50 border-slate-200 text-emerald-600 focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                dir="ltr"
              />
              <p className={`text-[9px] font-bold uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{t.otpHelp}</p>
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
                    {t.confirmIdentity}
                    <span className={`text-xl ${language === 'ar' ? 'rotate-0' : 'rotate-180'}`}>←</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setError(''); setStep(1); }}
                className={`text-xs font-bold transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {t.backToLogin}
              </button>
            </div>
          </form>
        )}

        {/* --- STEP 3: SELECT COMPANY --- */}
        {step === 3 && (
          <form onSubmit={handleCompanySubmit} className="flex flex-col gap-6 animate-fade-in">
            <div className="space-y-3">
              <label className={`block text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                } ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>
                {t.allowedCompanies}
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {allowedCompanies.map((comp, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${formData.company === comp
                        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500 text-blue-400 font-bold shadow-lg'
                        : theme === 'dark'
                          ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{comp === 'كل الشركات' ? '🌐' : '🏢'}</span>
                      <span className="font-bold text-sm">{comp === 'كل الشركات' ? t.allCompanies : comp}</span>
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
                    {t.enterSystem}
                    <span className={`text-xl ${language === 'ar' ? 'rotate-0' : 'rotate-180'}`}>←</span>
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
                className="text-xs font-bold text-rose-450 hover:text-rose-400 transition-colors"
              >
                {t.cancelAndLogout}
              </button>
            </div>
          </form>
        )}

        {/* --- FORGOT PASSWORD --- */}
        {step === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-6 animate-fade-in">
            <div className="space-y-2">
              <label className={`block text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                } ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t.username}</label>
              <input
                type="text"
                name="username"
                value={forgotData.username}
                onChange={handleForgotChange}
                required
                className={`w-full p-4 rounded-2xl border outline-none transition-all font-mono ${theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                  } ${language === 'ar' ? 'text-right' : 'text-left'}`}
                dir="ltr"
                placeholder={language === 'ar' ? 'اسم المستخدم' : 'Username'}
              />
            </div>

            <div className="space-y-2">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                } ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t.recoveryType}</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs transition-all ${forgotData.recoveryType === 'email'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                  <span>📧</span> {t.email}
                  <input type="radio" name="recoveryType" value="email" checked={forgotData.recoveryType === 'email'} onChange={handleForgotChange} className="sr-only" />
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer font-bold text-xs transition-all ${forgotData.recoveryType === 'whatsapp'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-450'
                    : theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}>
                  <span>💬</span> {t.whatsapp}
                  <input type="radio" name="recoveryType" value="whatsapp" checked={forgotData.recoveryType === 'whatsapp'} onChange={handleForgotChange} className="sr-only" />
                </label>
              </div>
            </div>

            {forgotData.recoveryType === 'email' ? (
              <div className="space-y-2 animate-fade-in">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  } ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t.registeredEmail}</label>
                <input
                  type="email"
                  name="email"
                  value={forgotData.email}
                  onChange={handleForgotChange}
                  required
                  className={`w-full p-4 rounded-2xl border outline-none transition-all font-mono ${theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10'
                    } ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  dir="ltr"
                  placeholder="user@example.com"
                />
              </div>
            ) : (
              <div className="space-y-2 animate-fade-in">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  } ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{t.registeredPhone}</label>
                <input
                  type="tel"
                  name="phone"
                  value={forgotData.phone}
                  onChange={handleForgotChange}
                  required
                  className={`w-full p-4 rounded-2xl border outline-none transition-all font-mono ${theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10'
                    } ${language === 'ar' ? 'text-right' : 'text-left'}`}
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
                    {t.sendRecovery}
                    <span className={`text-xl ${language === 'ar' ? 'rotate-0' : 'rotate-180'}`}>←</span>
                  </>
                )}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => { setError(''); setSuccessMsg(''); setStep(1); }}
                className={`text-xs font-bold transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {t.backToLogin}
              </button>
            </div>
          </form>
        )}

        <div className="mt-10 text-center">
          <p className={`text-[8px] font-black uppercase tracking-[0.4em] ${theme === 'dark' ? 'text-slate-650' : 'text-slate-400'
            }`}>TED Capital • Infrastructure Protocol v4.0</p>
        </div>
      </div>
    </div>
  );
}