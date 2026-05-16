import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import RadialActionHub from '../components/RadialActionHub';

const StatCard = ({ title, value, color, icon, link, t }) => (
   <div className={`p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/40 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
      <div className="flex justify-between items-start mb-6">
         <div className={`w-14 h-14 bg-${color}-500/10 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform`}>
            {icon}
         </div>
         <button onClick={() => window.location.href = link} className="text-slate-400 hover:text-slate-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
         </button>
      </div>
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
         {Number(value || 0).toLocaleString()} 
         <span className="text-xs font-sans text-slate-400 mx-2">{t.common.currency}</span>
      </h3>
   </div>
);

// Shared RadialActionHub component is now used from imports.

export default function Accountant360() {
   const { language } = useLanguage();
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [data, setData] = useState(null);
   const [recentTransactions, setRecentTransactions] = useState([]);
   const [pendingApprovals, setPendingApprovals] = useState([]);
   const [auditLogs, setAuditLogs] = useState([]);
   const [selectedAuditLog, setSelectedAuditLog] = useState(null);
   const [auditLimit, setAuditLimit] = useState(20);
   const [auditUserFilter, setAuditUserFilter] = useState('');
   const [auditResourceFilter, setAuditResourceFilter] = useState('');

   const translations = {
      ar: {
         title: "مركز تحكم المحاسب 360",
         subtitle: "قمرة قيادة العمليات المالية المتكاملة",
         stats: {
            cash: "السيولة المتاحة",
            receivables: "مستحقات العملاء",
            payables: "مستحقات الموردين",
            inventory: "قيمة المخزون",
            profit: "الأداء الشهري"
         },
         hubs: {
            actions: "مركز العمليات الذكي",
            approvals: "بانتظار المراجعة",
            activity: "النشاط المالي اللحظي",
            shortcuts: "الوصول السريع للأقسام"
         },
         actions: {
            newJv: "قيد يومية 🖋️",
            newExpense: "مصروف جديد 💸",
            auditTrial: "رفع ميزان ⚖️",
            closePeriod: "إقفال فترة 🔒",
            inventory: "المخازن 📦",
            taxReport: "الضرائب 📑",
            edit: "تعديل 📝",
            delete: "حذف 🗑️"
         },
         shortcuts: [
            { name: "شجرة الحسابات", path: "/finance", tab: "coa", icon: "🌳" },
            { name: "دفتر الأستاذ", path: "/finance", tab: "ledger", icon: "📓" },
            { name: "المركز المالي", path: "/finance", tab: "balance_sheet", icon: "⚖️" },
            { name: "المخازن", path: "/inventory", icon: "📦" },
            { name: "المصروفات", path: "/expenses", icon: "💸" },
            { name: "الأصول الثابتة", path: "/fixed-assets", icon: "🏢" }
         ],
         auditViewer: {
            title: "سجل التدقيق الجنائي واللقطات الأمنية",
            subtitle: "مراقبة فورية للعمليات الحساسة، التعديلات المحاسبية، وسجلات النظام غير القابلة للتلاعب",
            time: "التوقيت",
            user: "المستخدم",
            action: "الإجراء المتخذ",
            resource: "المورد المستهدف",
            level: "المستوى",
            inspect: "فحص اللقطة 🔍",
            modalTitle: "التحليل الجنائي للقطة الأمنية (JSON Snapshot)",
            close: "إغلاق النافذة"
         },
         common: {
            loading: "جاري تجهيز قمرة التحكم الموحدة...",
            currency: "ج.م",
            viewAll: "عرض الكل",
            noData: "لا توجد حركات مؤخراً"
         }
      },
      en: {
         title: "Accountant 360 Command Center",
         subtitle: "Unified Financial Operations Cockpit",
         stats: {
            cash: "Liquidity",
            receivables: "Receivables",
            payables: "Payables",
            inventory: "Inventory Value",
            profit: "Monthly Performance"
         },
         hubs: {
            actions: "Smart Action Hub",
            approvals: "Pending Review",
            activity: "Real-time Activity",
            shortcuts: "Direct Access"
         },
         actions: {
            newJv: "New JV 🖋️",
            newExpense: "Expense 💸",
            auditTrial: "Audit ⚖️",
            closePeriod: "Close 🔒",
            inventory: "Inventory 📦",
            taxReport: "Tax 📑",
            edit: "Edit 📝",
            delete: "Delete 🗑️"
         },
         shortcuts: [
            { name: "Chart of Accounts", path: "/finance", tab: "coa", icon: "🌳" },
            { name: "General Ledger", path: "/finance", tab: "ledger", icon: "📓" },
            { name: "Inventory", path: "/inventory", icon: "📦" },
            { name: "Expenses", path: "/expenses", icon: "💸" },
            { name: "Income Statement", path: "/finance", tab: "pl", icon: "📈" },
            { name: "Fixed Assets", path: "/fixed-assets", icon: "🏢" }
         ],
         auditViewer: {
            title: "Forensic Audit Log & Security Snapshots",
            subtitle: "Real-time monitoring of sensitive operations, accounting modifications, and non-repudiable system records",
            time: "Timestamp",
            user: "User",
            action: "Action Taken",
            resource: "Target Resource",
            level: "Impact",
            inspect: "Inspect Snapshot 🔍",
            modalTitle: "Forensic Snapshot Analysis (JSON Snapshot)",
            close: "Close Window"
         },
         common: {
            loading: "Preparing Unified Control Center...",
            currency: "LCY",
            viewAll: "View All",
            noData: "No recent activity"
         }
      }
   };

   const t = translations[language] || translations['ar'];

   useEffect(() => {
      const fetchData = async () => {
         setLoading(true);
         try {
            const [dashRes, ledgerRes, approvalRes, auditRes] = await Promise.all([
               api.get('/finance/dashboard'),
               api.get('/table/ledger?limit=10'),
               api.get('/system/authorizations/pending'),
               api.get('/table/security_audit_trail?limit=20')
            ]);
            setData(dashRes.data.data);
            setRecentTransactions(ledgerRes.data.data || []);
            setPendingApprovals(approvalRes.data.data || []);
            setAuditLogs(auditRes.data.data || []);
         } catch (error) {
            console.error("360 Load Error:", error);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   useEffect(() => {
      const fetchAudit = async () => {
         try {
            const auditRes = await api.get(`/table/security_audit_trail?limit=${auditLimit}`);
            setAuditLogs(auditRes.data.data || []);
         } catch (error) {
            console.error("Audit Load Error:", error);
         }
      };
      if (!loading) fetchAudit();
   }, [auditLimit, loading]);

   const filteredAuditLogs = auditLogs.filter(log => {
      const matchesUser = !auditUserFilter || log.username?.toLowerCase().includes(auditUserFilter.toLowerCase());
      const matchesResource = !auditResourceFilter || log.resource?.toLowerCase().includes(auditResourceFilter.toLowerCase());
      return matchesUser && matchesResource;
   });

   const radialActions = [
      { icon: '🖋️', label: t.actions.newJv, onClick: () => navigate('/finance?tab=jv') },
      { icon: '💸', label: t.actions.newExpense, onClick: () => navigate('/expenses') },
      { icon: '⚖️', label: t.actions.auditTrial, onClick: () => navigate('/finance?tab=ledger') },
      { icon: '🔒', label: t.actions.closePeriod, onClick: () => navigate('/finance?tab=control') },
      { icon: '📦', label: t.actions.inventory, onClick: () => navigate('/inventory') },
      { icon: '📑', label: t.actions.taxReport, onClick: () => navigate('/reports') },
      { icon: '📝', label: t.actions.edit, onClick: () => alert('Edit Mode Active') },
      { icon: '🗑️', label: t.actions.delete, onClick: () => alert('Delete Mode Active') },
      { icon: '📝', label: language === 'ar' ? 'تعديل' : 'Edit', onClick: () => alert('Edit Mode Active') }
   ];

   if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-900 font-black text-sm uppercase tracking-[0.3em] animate-pulse">{t.common.loading}</p>
         </div>
      </div>
   );

   return (
      <div className="min-h-screen bg-[#f8fafc]/50 pb-20 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
         {/* Premium Header */}
         <div className="bg-white border-b border-slate-200">
            <div className="max-w-[1600px] mx-auto px-10 py-12">
               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                  <div className="flex items-center gap-8">
                     <RadialActionHub actions={radialActions} language={language} />
                     <div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                           {t.title}
                        </h1>
                        <p className="text-slate-400 font-bold text-lg mt-3 uppercase tracking-[0.1em]">
                           {t.subtitle}
                        </p>
                     </div>
                  </div>
                  
                  <div className="flex gap-4">
                     <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Healthy</span>
                     </div>
                     <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest">{new Date().toLocaleDateString()}</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-16">
            {/* Stats Cockpit */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
               <StatCard title={t.stats.cash} value={data?.cash_on_hand} color="emerald" icon="💵" link="/finance/cash-balances" t={t} />
               <StatCard title={t.stats.receivables} value={data?.accounts_receivable} color="blue" icon="👥" link="/finance/ar-due" t={t} />
               <StatCard title={t.stats.payables} value={data?.accounts_payable} color="rose" icon="🏢" link="/finance/ap-due" t={t} />
               <StatCard title={t.stats.inventory} value={data?.inventory_value} color="amber" icon="📦" link="/finance/inventory-valuation" t={t} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
               {/* Left: Approvals & Tasks */}
               <div className="lg:col-span-2 space-y-16">
                  {/* Pending Approvals */}
                  <div className="space-y-8">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                           <div className="w-2 h-10 bg-rose-500 rounded-full"></div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.hubs.approvals}</h3>
                        </div>
                        <span className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100">
                           {pendingApprovals.length} Urgent
                        </span>
                     </div>
                     
                     <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/20">
                        {pendingApprovals.length > 0 ? (
                           <div className="divide-y divide-slate-50">
                              {pendingApprovals.slice(0, 5).map(app => (
                                 <div key={app.id} className="p-8 hover:bg-slate-50 transition-all flex justify-between items-center group">
                                    <div className="flex items-center gap-6">
                                       <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-xl text-white">
                                          {app.module_name?.includes('PURCHASE') ? '🛒' : app.module_name?.includes('EXPENSE') ? '💸' : '📄'}
                                       </div>
                                       <div>
                                          <p className="font-black text-slate-900 text-base uppercase tracking-tight">{app.module_name?.replace('_', ' ')} <span className="text-[10px] text-slate-400">#{app.record_id}</span></p>
                                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Requested by {app.maker_username} • {new Date(app.created_at).toLocaleDateString()}</p>
                                          <p className="text-slate-900 font-mono font-black text-sm mt-1">{Number(app.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.common.currency}</p>
                                       </div>
                                    </div>
                                    <button onClick={() => navigate('/approval-inbox')} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                                       Review Now
                                    </button>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="p-20 text-center space-y-6">
                              <div className="text-6xl grayscale opacity-30">✨</div>
                              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{t.common.noData}</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Right: Activity & Shortcuts */}
               <div className="space-y-16">
                  {/* Activity Feed */}
                  <div className="space-y-8">
                     <div className="flex items-center gap-6">
                        <div className="w-2 h-10 bg-blue-500 rounded-full"></div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.hubs.activity}</h3>
                     </div>
                     <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/40 space-y-10">
                        <div className="space-y-8">
                           {recentTransactions.map(l => (
                              <div key={l.id} className="flex gap-6 relative group">
                                 <div className="w-2 bg-white/10 rounded-full absolute top-8 bottom-0 left-[23px] -mb-8"></div>
                                 <div className="w-12 h-12 bg-white/10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-lg group-hover:bg-white/20 transition-colors">
                                    {l.debit > 0 ? '+' : '-'}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                       <p className="font-black text-sm truncate uppercase tracking-tight">{l.account_name}</p>
                                       <p className={`font-mono font-black text-sm ${l.debit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {Number(l.debit || l.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                       </p>
                                    </div>
                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1 truncate">{l.description}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                        <button onClick={() => navigate('/finance?tab=ledger')} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5">
                           {t.common.viewAll} →
                        </button>
                     </div>
                  </div>

                  {/* Shortcuts */}
                  <div className="space-y-8">
                     <div className="flex items-center gap-6">
                        <div className="w-2 h-10 bg-amber-500 rounded-full"></div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.hubs.shortcuts}</h3>
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        {t.shortcuts.map((s, idx) => (
                           <button 
                              key={idx}
                              onClick={() => navigate(s.path + (s.tab ? `?tab=${s.tab}` : ''))}
                              className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl hover:border-slate-900 group transition-all"
                           >
                              <div className="flex items-center gap-5">
                                 <span className="text-2xl group-hover:scale-125 transition-transform">{s.icon}</span>
                                 <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{s.name}</span>
                              </div>
                              <span className="text-slate-300 group-hover:text-slate-900 transition-colors">→</span>
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Forensic Security Audit & Snapshot Viewer */}
            <div className="space-y-8 animate-fade-in pt-10">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-200 pb-8">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-rose-500/10">🛡️</div>
                     <div>
                        <div className="flex items-center gap-3">
                           <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.auditViewer.title}</h2>
                           <span className="bg-rose-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 animate-pulse">IMMUTABLE FORENSIC LOG</span>
                        </div>
                        <p className="text-slate-400 font-bold text-sm mt-1">{t.auditViewer.subtitle}</p>
                     </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                     <input 
                        type="text" 
                        placeholder={language === 'ar' ? "تصفية بالمستخدم..." : "Filter by user..."}
                        value={auditUserFilter} 
                        onChange={e => setAuditUserFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 shadow-sm w-full sm:w-44"
                     />
                     <input 
                        type="text" 
                        placeholder={language === 'ar' ? "تصفية بالمورد..." : "Filter by resource..."}
                        value={auditResourceFilter} 
                        onChange={e => setAuditResourceFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 shadow-sm w-full sm:w-44"
                     />
                     <select 
                        value={auditLimit} 
                        onChange={e => setAuditLimit(Number(e.target.value))}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 shadow-sm w-full sm:w-auto"
                     >
                        <option value={20}>20 {language === 'ar' ? 'سجل' : 'Records'}</option>
                        <option value={50}>50 {language === 'ar' ? 'سجل' : 'Records'}</option>
                        <option value={100}>100 {language === 'ar' ? 'سجل' : 'Records'}</option>
                        <option value={200}>200 {language === 'ar' ? 'سجل' : 'Records'}</option>
                     </select>
                     <span className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 whitespace-nowrap text-center w-full sm:w-auto">
                        {filteredAuditLogs.length} / {auditLogs.length} {language === 'ar' ? 'معروض' : 'Shown'}
                     </span>
                  </div>
               </div>

               <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/30 border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                              <th className="px-8 py-6">{t.auditViewer.time}</th>
                              <th className="px-8 py-6">{t.auditViewer.user}</th>
                              <th className="px-8 py-6">{t.auditViewer.action}</th>
                              <th className="px-8 py-6">{t.auditViewer.resource}</th>
                              <th className="px-8 py-6 text-center">{t.auditViewer.level}</th>
                              <th className="px-8 py-6 text-center">Snapshot</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {filteredAuditLogs.map(log => (
                              <tr key={log.id} className="hover:bg-slate-50/80 transition-all group">
                                 <td className="px-8 py-6 font-mono text-xs text-slate-400">
                                    {new Date(log.created_at || log.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                 </td>
                                 <td className="px-8 py-6 font-black text-slate-900 text-sm group-hover:text-rose-600 transition-colors">
                                    @{log.username}
                                 </td>
                                 <td className="px-8 py-6">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                       log.action?.includes('DENIED') || log.action?.includes('DELETE') || log.action?.includes('CANCEL')
                                       ? 'bg-rose-50 text-rose-600 border-rose-100'
                                       : 'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                       {log.action}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6 text-xs font-bold text-slate-500 font-mono">
                                    {log.resource}
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                       log.impact_level === 'High' ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}>
                                       {log.impact_level || 'Normal'}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                    {log.details ? (
                                       <button 
                                          onClick={() => setSelectedAuditLog(log)}
                                          className="px-4 py-2 bg-slate-900 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                       >
                                          {t.auditViewer.inspect}
                                       </button>
                                    ) : (
                                       <span className="text-slate-300 text-xs font-bold">—</span>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>

         {/* Forensic Snapshot Modal */}
         {selectedAuditLog && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
               <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-slate-900/20">🔍</div>
                        <div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.auditViewer.modalTitle}</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              Record ID #{selectedAuditLog.id} • Action: {selectedAuditLog.action}
                           </p>
                        </div>
                     </div>
                     <button 
                        onClick={() => setSelectedAuditLog(null)} 
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 transition-all shadow-sm font-bold"
                     >
                        ✕
                     </button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-900 text-slate-100 font-mono text-xs">
                     <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-slate-400 border-b border-slate-700 pb-4">
                           <div><span className="text-white font-bold">User:</span> @{selectedAuditLog.username}</div>
                           <div><span className="text-white font-bold">IP Address:</span> {selectedAuditLog.ip_address || 'System Internal'}</div>
                           <div><span className="text-white font-bold">Resource:</span> {selectedAuditLog.resource}</div>
                           <div><span className="text-white font-bold">Impact Level:</span> {selectedAuditLog.impact_level}</div>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <p className="text-slate-400 uppercase tracking-widest text-[10px] font-black">Raw JSON Snapshot Data</p>
                        <pre className="p-6 bg-slate-950 rounded-2xl overflow-x-auto text-emerald-400 border border-slate-800 shadow-inner">
                           {typeof selectedAuditLog.details === 'object' 
                              ? JSON.stringify(selectedAuditLog.details, null, 2) 
                              : selectedAuditLog.details
                           }
                        </pre>
                     </div>
                  </div>
                  <div className="p-8 bg-white border-t border-slate-100 flex justify-end">
                     <button 
                        onClick={() => setSelectedAuditLog(null)} 
                        className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                     >
                        {t.auditViewer.close}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
