import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // Step 1: Credentials, Step 2: OTP
  const [formData, setFormData] = useState({ username: '', password: '', otp: '' });
  const [partialToken, setPartialToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (step === 1) {
        const response = await api.post('/login', {
          username: formData.username,
          password: formData.password
        });

        if (response.data.requires2FA) {
          setPartialToken(response.data.token);
          setStep(2);
        } else {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          login(response.data.user, response.data.token, response.data.refreshToken);
          window.location.href = '/'; 
        }
      } else {
        const response = await api.post('/2fa/validate', {
          token: partialToken,
          otp: formData.otp
        });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        login(response.data.user, response.data.token, response.data.refreshToken);
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4 relative overflow-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      
      <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/10 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-white/5 rounded-2xl border border-white/10 mb-6 shadow-inner">
            <span className="text-4xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase italic">TED Capital <span className="text-blue-500">ERP</span></h1>
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-white/10"></span>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
              {step === 1 ? 'نظام الإدارة المتكامل' : 'المصادقة الثنائية'}
            </p>
            <span className="h-px w-8 bg-white/10"></span>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl text-xs font-black mb-8 text-center border border-rose-500/20 backdrop-blur-md animate-bounce">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">هوية المستخدم</label>
                <div className="relative group">
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
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">كلمة المرور الاستراتيجية</label>
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
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">كود التحقق الأمني</label>
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
                <p className="text-[9px] text-slate-500 mt-4 font-bold uppercase">يرجى إدخال الكود المكون من 6 أرقام من تطبيق Authenticator</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl p-4 transition-all active:scale-95 disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative font-black text-white uppercase tracking-widest text-sm flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {step === 1 ? 'تفعيل الدخول' : 'تأكيد الهوية'}
                  <span className="text-xl">→</span>
                </>
              )}
            </span>
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.4em]">TED Capital • Infrastructure Protocol v4.0</p>
        </div>
      </div>
    </div>
  );
}