import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function EmployeePortal() {
  const { language } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'Annual', start_date: '', end_date: '' });

  const translations = {
    ar: {
      title: "بوابة الموظف الذكية",
      activeStatus: "موظف نشط",
      salaryLabel: "الراتب الأساسي الحالي",
      currency: "ج.م",
      leave: {
        title: "طلب إجازة جديد",
        type: "نوع الإجازة",
        annual: "إجازة سنوية",
        sick: "إجازة مرضية",
        emergency: "إجازة عارضة",
        from: "من تاريخ",
        to: "إلى تاريخ",
        submit: "إرسال الطلب للاعتماد",
        history: "📅 حالة الطلبات الأخيرة",
        empty: "لا يوجد طلبات سابقة",
        status: { pending: "قيد الانتظار", approved: "تمت الموافقة", rejected: "مرفوض" }
      },
      payroll: {
        title: "💸 أرشيف الرواتب والمدفوعات",
        download: "تحميل كشف كامل",
        empty: "لا يوجد بيانات رواتب مسجلة بعد.",
        paid: "تم الصرف ✓",
        net: "صافي الراتب المنصرف"
      },
      stats: {
        leaveBalance: "رصيد الإجازات المتبقي",
        performance: "تقييم الأداء الأخير",
        excellent: "ممتاز جداً 🌟",
        days: "يوم"
      },
      noProfile: {
        title: "حسابك غير مرتبط بملف موظف",
        desc: "يرجى مراجعة قسم الموارد البشرية لربط حساب المستخدم الخاص بك برقم الوظيفي."
      }
    },
    en: {
      title: "Smart Employee Portal",
      activeStatus: "Active Employee",
      salaryLabel: "Current Basic Salary",
      currency: "EGP",
      leave: {
        title: "New Leave Request",
        type: "Leave Type",
        annual: "Annual Leave",
        sick: "Sick Leave",
        emergency: "Emergency Leave",
        from: "From Date",
        to: "To Date",
        submit: "Submit for Approval",
        history: "📅 Recent Requests",
        empty: "No previous requests found",
        status: { pending: "Pending", approved: "Approved", rejected: "Rejected" }
      },
      payroll: {
        title: "💸 Payroll & Payments Archive",
        download: "Download Statement",
        empty: "No payroll records found yet.",
        paid: "Paid ✓",
        net: "Net Salary Disbursed"
      },
      stats: {
        leaveBalance: "Remaining Leave Balance",
        performance: "Latest Performance Rating",
        excellent: "Excellent 🌟",
        days: "Days"
      },
      noProfile: {
        title: "Account Not Linked to Employee",
        desc: "Please contact HR to link your user account with an employee ID."
      }
    }
  };

  const t = translations[language] || translations['ar'];

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    try {
      const res = await api.get('/hcm/me');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/hcm/leaves', leaveForm);
      alert(language === 'ar' ? "تم إرسال طلب الإجازة للمدير المباشر." : "Leave request sent to your manager.");
      fetchMyData();
    } catch (err) { alert(language === 'ar' ? "حدث خطأ." : "An error occurred."); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 text-3xl">{language === 'ar' ? 'جاري تحميل ملفك الشخصي...' : 'Loading profile...'}</div>;

  if (!data || !data.profile) return (
    <div className="p-20 text-center space-y-8 flex flex-col items-center justify-center min-h-[60vh]">
       <div className="text-9xl animate-bounce">🚫</div>
       <h2 className="text-5xl font-black text-slate-900">{t.noProfile.title}</h2>
       <p className="text-slate-500 font-black text-xl max-w-xl">{t.noProfile.desc}</p>
    </div>
  );

  return (
    <div className={`page-container animate-fade-in pb-24 space-y-12 ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Premium Employee Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-12 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden border border-blue-800/30">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
         <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-32 -mb-32"></div>
         
         <div className="flex items-center gap-8 relative z-10">
            <div className="w-28 h-28 rounded-[2rem] bg-white/10 backdrop-blur-2xl flex items-center justify-center text-5xl border border-white/20 shadow-inner transform hover:scale-105 transition-transform duration-500">
               👤
            </div>
            <div>
               <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-3">{data.profile?.name}</h2>
               <p className="text-blue-300 font-black text-lg flex items-center gap-2 opacity-80">{data.profile?.job_title} | {data.profile?.company}</p>
               <div className="flex gap-4 mt-6">
                  <span className="bg-emerald-500/20 text-emerald-400 px-6 py-1.5 rounded-full text-xs font-black border border-emerald-500/30 shadow-lg">{t.activeStatus}</span>
                  <span className="bg-white/10 text-white px-6 py-1.5 rounded-full text-xs font-black border border-white/10 shadow-lg">ID: EMP-{data.profile?.id}</span>
               </div>
            </div>
         </div>
         <div className="text-center md:text-left relative z-10 bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            <p className="text-blue-300 text-[11px] font-black uppercase tracking-[0.2em] mb-2">{t.salaryLabel}</p>
            <p className="text-5xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-lg">{Number(data.profile?.salary).toLocaleString()} <span className="text-xl opacity-70">{t.currency}</span></p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         
         {/* Sidebar: Requests */}
          <div className="lg:col-span-1 space-y-10">
            <div className="bg-white rounded-[2.5rem] p-10 space-y-8 shadow-xl border border-slate-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 blur-3xl -mr-16 -mt-16"></div>
               <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 relative z-10"><span>📝</span> {t.leave.title}</h3>
               <form onSubmit={submitLeave} className="space-y-6 relative z-10">
                  <div>
                     <label className="block text-sm font-black text-slate-700 mb-2">{t.leave.type}</label>
                     <select value={leaveForm.leave_type} onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-500 transition-all">
                        <option value="Annual">{t.leave.annual}</option>
                        <option value="Sick">{t.leave.sick}</option>
                        <option value="Emergency">{t.leave.emergency}</option>
                     </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-black text-slate-700 mb-2">{t.leave.from}</label>
                        <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-500 transition-all" required />
                     </div>
                     <div>
                        <label className="block text-sm font-black text-slate-700 mb-2">{t.leave.to}</label>
                        <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-500 transition-all" required />
                     </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.5rem] font-black text-lg transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50">
                    {t.leave.submit}
                  </button>
               </form>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
               <h3 className="text-2xl font-black text-slate-900 mb-8">{t.leave.history}</h3>
               <div className="space-y-4">
                  {data.leaves.map(l => (
                    <div key={l.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
                       <div>
                          <p className="font-black text-slate-900 text-base">{l.leave_type === 'Annual' ? t.leave.annual : l.leave_type === 'Sick' ? t.leave.sick : t.leave.emergency}</p>
                          <p className="text-[11px] text-slate-500 font-black tracking-tight mt-1">{new Date(l.start_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')} - {new Date(l.end_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                       </div>
                       <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black shadow-sm ${l.status === 'Pending' ? 'bg-amber-100 text-amber-800' : l.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {l.status === 'Pending' ? t.leave.status.pending : l.status === 'Approved' ? t.leave.status.approved : t.leave.status.rejected}
                       </span>
                    </div>
                  ))}
                  {data.leaves.length === 0 && <p className="text-center text-slate-400 py-10 font-black text-lg">{t.leave.empty}</p>}
               </div>
            </div>
         </div>

         {/* Main Content: Payroll History */}
         <div className="lg:col-span-2 space-y-10">
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100">
               <div className="p-10 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl text-2xl shadow-inner">💸</div>
                    <h3 className="text-2xl font-black text-slate-900">{t.payroll.title}</h3>
                  </div>
                  <button className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all shadow-md">{t.payroll.download}</button>
               </div>
               <div className="p-10">
                  <div className="space-y-6">
                     {data.payroll.map(p => (
                       <div key={p.id} className="flex flex-col md:flex-row justify-between items-center p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-blue-200 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex items-center gap-8">
                             <div className="w-20 h-20 bg-slate-900 text-white rounded-[1.5rem] flex flex-col items-center justify-center font-black shadow-xl">
                                <span className="text-[11px] uppercase tracking-tighter opacity-70">Month</span>
                                <span className="text-2xl">{p.period}</span>
                             </div>
                             <div>
                                <p className="font-black text-slate-900 text-xl leading-tight">{t.payroll.net}</p>
                                <p className="text-xs text-slate-400 font-black mt-1 uppercase tracking-wider">{language === 'ar' ? 'تاريخ الترحيل' : 'Posting Date'}: {new Date(p.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                             </div>
                          </div>
                          <div className="text-right flex items-center gap-8 mt-6 md:mt-0">
                             <div className="text-right">
                                <p className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{(Number(p.amount || p.net_salary)).toLocaleString()}</p>
                                <p className="text-[11px] font-black text-emerald-600 uppercase mt-1 tracking-widest">{t.payroll.paid}</p>
                             </div>
                             <button className="w-14 h-14 bg-slate-50 text-slate-900 rounded-[1.2rem] flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-inner text-2xl group-hover:scale-110">📥</button>
                          </div>
                       </div>
                     ))}
                     {data.payroll.length === 0 && <p className="text-center text-slate-400 py-16 font-black text-xl">{t.payroll.empty}</p>}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
               <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/20 flex flex-col justify-between min-h-[250px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                  <h4 className="text-xl font-black opacity-80 uppercase tracking-[0.2em] relative z-10">{t.stats.leaveBalance}</h4>
                  <div className="flex justify-between items-end relative z-10">
                     <p className="text-7xl font-black tracking-tighter">14 <span className="text-2xl opacity-60 font-sans tracking-normal">{t.stats.days}</span></p>
                     <p className="text-[11px] font-black opacity-60 uppercase tracking-widest">Update: May 2026</p>
                  </div>
               </div>
               <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-10 rounded-[3rem] text-white shadow-2xl shadow-emerald-500/20 flex flex-col justify-between min-h-[250px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                  <h4 className="text-xl font-black opacity-80 uppercase tracking-[0.2em] relative z-10">{t.stats.performance}</h4>
                  <div className="flex justify-between items-end relative z-10">
                     <p className="text-7xl font-black tracking-tighter">4.8 <span className="text-2xl opacity-60 font-sans tracking-normal">/ 5</span></p>
                     <p className="text-[11px] font-black opacity-60 uppercase tracking-widest">{t.stats.excellent}</p>
                  </div>
               </div>
            </div>
         </div>

      </div>

    </div>
  );
}
