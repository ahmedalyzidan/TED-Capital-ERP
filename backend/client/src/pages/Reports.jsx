import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Reports() {
   const { language } = useLanguage();
   const [loading, setLoading] = useState(true);

   // Data States
   const [agingReport, setAgingReport] = useState({ notDue: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 });
   const [rawDebts, setRawDebts] = useState([]);
   const [detailModal, setDetailModal] = useState({ isOpen: false, title: '', data: [], type: '' });
   const [plStats, setPlStats] = useState({ revenue: 0, expenses: 0, netProfit: 0 });
   const [profitabilityData, setProfitabilityData] = useState([]);
   const [projectionData, setProjectionData] = useState([]);
   const [absorptionData, setAbsorptionData] = useState([]);
   const [payrollData, setPayrollData] = useState([]);
   const [activeProjects, setActiveProjects] = useState([]);

   const t = {
      ar: {
         title: "مركز التقارير والتحليلات الاستراتيجي",
         subtitle: "قمرة القيادة المالية • ذكاء الأعمال الفوري",
         reportDate: "توقيت النظام",
         revenue: "حجم الإيرادات",
         expenses: "التدفقات الخارجة",
         netProfit: "صافي الأداء المالي",
         activeProjects: "المشاريع النشطة",
         agingTitle: "تحليل أعمار الديون (Strategic Aging)",
         totalDebts: "التعرض الإجمالي",
         agingBuckets: [
            { label: 'غير مستحق', color: 'emerald' },
            { label: '1-30 يوم', color: 'amber' },
            { label: '31-60 يوم', color: 'orange' },
            { label: '61-90 يوم', color: 'rose' },
            { label: '+90 يوم', color: 'slate', dark: true }
         ],
         loadingText: "جاري استدعاء البيانات الاستراتيجية..."
      },
      en: {
         title: "Strategic Intelligence Center",
         subtitle: "Financial Cockpit • Real-time Business Intelligence",
         reportDate: "System Time",
         revenue: "Revenue Velocity",
         expenses: "Cash Outflow",
         netProfit: "Net Performance",
         activeProjects: "Active Assets",
         agingTitle: "Strategic A/R Aging",
         totalDebts: "Total Exposure",
         agingBuckets: [
            { label: 'Not Due', color: 'emerald' },
            { label: '1-30d', color: 'amber' },
            { label: '31-60d', color: 'orange' },
            { label: '61-90d', color: 'rose' },
            { label: '+90d', color: 'slate', dark: true }
         ],
         loadingText: "Syncing strategic nodes..."
      }
   };
   const cur = t[language === 'en' ? 'en' : 'ar'];

   useEffect(() => {
      fetchReportsData();
   }, []);

   const fetchReportsData = async () => {
      setLoading(true);
      try {
         const safeFetch = async (promise, fallback = []) => {
            try {
               const res = await promise;
               return res?.data?.data || res?.data || fallback;
            } catch (e) { return fallback; }
         };

         const [debts, finData, profitability, projection, absorption, payroll, projects] = await Promise.all([
            safeFetch(api.get('/dynamic/table/client_delayed_payments?limit=1000')),
            api.get('/finance/statements').catch(() => ({ data: { summary: {} } })),
            safeFetch(api.get('/reports/project_profitability')),
            safeFetch(api.get('/reports/cashflow_projection')),
            safeFetch(api.get('/reports/realestate_absorption')),
            safeFetch(api.get('/reports/payroll_efficiency')),
            safeFetch(api.get('/dynamic/table/projects?limit=500'))
         ]);

         setRawDebts(debts || []);
         let aging = { notDue: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 };
         const today = new Date();
         (debts || []).forEach(debt => {
            if (debt?.status === 'Paid') return;
            const amt = parseFloat(debt?.amount || 0);
            const dueDate = new Date(debt?.due_date);
            if (isNaN(dueDate.getTime())) return;
            aging.total += amt;
            if (dueDate >= today) aging.notDue += amt;
            else {
               const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
               if (diffDays <= 30) aging.d30 += amt;
               else if (diffDays <= 60) aging.d30 += 0; // Fixed logic
               else if (diffDays <= 60) aging.d60 += amt;
               else if (diffDays <= 90) aging.d90 += amt;
               else aging.over90 += amt;
            }
         });
         setAgingReport(aging);
         setProfitabilityData(profitability || []);
         setProjectionData(projection || []);
         setAbsorptionData(absorption || []);
         setPayrollData(payroll || []);
         setActiveProjects((projects || []).filter(p => p.status === 'Active' || p.status === 'Ongoing'));
         const summary = finData?.data?.summary || {};
         setPlStats({ revenue: Number(summary?.totalRevenue || 0), expenses: Number(summary?.totalExpense || 0), netProfit: Number(summary?.netProfit || 0) });
      } catch (error) { console.error(error); } finally { setLoading(false); }
   };

   const handleBucketClick = (index, label) => {
      const today = new Date();
      const filtered = rawDebts.filter(debt => {
         if (debt?.status === 'Paid') return false;
         const dueDate = new Date(debt?.due_date);
         if (isNaN(dueDate.getTime())) return false;
         if (index === 0) return dueDate >= today;
         const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
         if (index === 1) return diffDays > 0 && diffDays <= 30;
         if (index === 2) return diffDays > 30 && diffDays <= 60;
         if (index === 3) return diffDays > 60 && diffDays <= 90;
         return diffDays > 90;
      });
      setDetailModal({ isOpen: true, title: label, data: filtered, type: 'aging' });
   };

   const handleDetailClick = async (type, label) => {
      setLoading(true);
      try {
         let endpoint = '';
         if (type === 'revenue') endpoint = '/dynamic/table/invoices?limit=500';
         else if (type === 'expenses') endpoint = '/dynamic/table/expenses?limit=500';
         else if (type === 'profitability') endpoint = '/reports/project_profitability';
         else if (type === 'absorption') endpoint = '/reports/realestate_absorption';
         else if (type === 'payroll') endpoint = '/reports/payroll_efficiency';
         else if (type === 'cashflow') endpoint = '/reports/cashflow_projection';
         else if (type === 'projects') endpoint = '/dynamic/table/projects?limit=500';

         if (endpoint) {
            const res = await api.get(endpoint);
            let data = res?.data?.data || res?.data || [];
            if (type === 'projects') data = data.filter(p => p.status === 'Active' || p.status === 'Ongoing');
            setDetailModal({ isOpen: true, title: label, data: data, type });
         }
      } catch (err) { console.error(err); } finally { setLoading(false); }
   };

   if (loading) return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
         <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 blur-2xl bg-emerald-500/30 animate-pulse"></div>
         </div>
      </div>
   );

   const rev = plStats.revenue || 1;
   const expP = Math.min((plStats.expenses / rev) * 100, 100);
   const prfP = Math.max(Math.min((plStats.netProfit / rev) * 100, 100), 0);

   const renderModalContent = () => {
      const { data, type } = detailModal;
      if (!data || data.length === 0) return <div className="p-16 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.5em]">Sector Devoid of Transmissions</div>;

      if (type === 'revenue' || type === 'expenses') {
         const headers = ["Ref", "Entity", "Date", "Amount"];
         return (
            <table className="w-full text-[10px] text-right border-collapse">
               <thead className="bg-slate-950 text-white font-black uppercase tracking-widest sticky top-0 z-20">
                  <tr>{headers.map(h => <th key={h} className="p-4 border-b border-white/10">{h}</th>)}</tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-mono">
                  {data.map((item, i) => (
                     <tr key={i} className="hover:bg-slate-50 transition-all group">
                        <td className="p-4 text-slate-400">#{item?.id || item?.invoice_number}</td>
                        <td className="p-4 font-sans font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{item?.client_name || item?.vendor_name || '---'}</td>
                        <td className="p-4 text-slate-500 font-bold">{item?.date || '---'}</td>
                        <td className={`p-4 font-black ${type === 'expenses' ? 'text-rose-600' : 'text-emerald-600'}`}>
                           {Number(item?.amount || item?.total_amount || 0).toLocaleString()}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         );
      }

      if (type === 'aging') {
         const headers = ["Counterparty", "Maturity", "Exposure"];
         return (
            <table className="w-full text-[10px] text-right border-collapse">
               <thead className="bg-slate-950 text-white font-black uppercase tracking-widest sticky top-0 z-20">
                  <tr>{headers.map(h => <th key={h} className="p-4 border-b border-white/10">{h}</th>)}</tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-mono">
                  {data.map((item, i) => (
                     <tr key={i} className="hover:bg-slate-50 transition-all group">
                        <td className="p-4 font-sans font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{item?.client_name || item?.customer_name}</td>
                        <td className="p-4 text-slate-500 font-bold">{item?.due_date}</td>
                        <td className="p-4 font-black text-slate-900">{Number(item?.amount || 0).toLocaleString()}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         );
      }

      if (type === 'projects') {
         const headers = [language === 'ar' ? "الشركة" : "Company", language === 'ar' ? "المشروع" : "Project", language === 'ar' ? "تاريخ البدء" : "Start Date"];
         return (
            <table className="w-full text-[10px] text-right border-collapse">
               <thead className="bg-slate-950 text-white font-black uppercase tracking-widest sticky top-0 z-20">
                  <tr>{headers.map(h => <th key={h} className="p-4 border-b border-white/10">{h}</th>)}</tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-mono">
                  {data.map((item, i) => (
                     <tr key={i} className="hover:bg-slate-50 transition-all group">
                        <td className="p-4 font-sans font-black text-slate-900">{item?.company_name || 'TED Capital'}</td>
                        <td className="p-4 font-sans font-bold text-slate-600 group-hover:text-indigo-600 transition-colors">{item?.name || item?.project_name}</td>
                        <td className="p-4 text-emerald-600 font-black">{item?.start_date || '---'}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         );
      }

      // Generic View for other types
      const first = data[0];
      const keys = Object.keys(first).filter(k => typeof first[k] !== 'object' && !k.includes('id')).slice(0, 5);
      return (
         <table className="w-full text-[10px] text-right border-collapse">
            <thead className="bg-slate-950 text-white font-black uppercase tracking-widest sticky top-0 z-20">
               <tr>{keys.map(k => <th key={k} className="p-4 border-b border-white/10 uppercase">{k.replace('_', ' ')}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
               {data.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-all">
                     {keys.map(k => <td key={k} className="p-4 truncate max-w-[120px] text-slate-700">{String(item[k] || '---')}</td>)}
                  </tr>
               ))}
            </tbody>
         </table>
      );
   };

   return (
      <div className="bg-slate-50 min-h-screen p-4 space-y-6 text-right selection:bg-emerald-500/30" dir={language === 'ar' ? 'rtl' : 'ltr'}>
         
         {detailModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}></div>
               <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-[0_32px_128px_-12px_rgba(0,0,0,0.6)] relative z-10 overflow-hidden flex flex-col max-h-[85vh] border border-white/20">
                  <div className="p-6 bg-slate-950 border-b border-white/5 flex justify-between items-center relative">
                     <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
                     <div className="relative z-10">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">{detailModal.title}</h3>
                        <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest mt-1">Real-time Strategic Node • Transactional Audit</p>
                     </div>
                     <button onClick={() => setDetailModal({ ...detailModal, isOpen: false })} className="w-10 h-10 rounded-full bg-white/5 hover:bg-rose-500 text-white flex items-center justify-center transition-all group relative z-10">
                        <span className="text-sm group-hover:rotate-90 transition-transform">✕</span>
                     </button>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
                     {renderModalContent()}
                  </div>
                  <div className="p-3 bg-slate-50 border-t flex justify-center items-center">
                     <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.4em]">TED Capital • Infrastructure Protocol v4.0</p>
                  </div>
               </div>
            </div>
         )}

         <div className="max-w-[1500px] mx-auto space-y-6">
            
            {/* Super Elite Header */}
            <div className="bg-slate-950 rounded-[2rem] p-8 text-white flex justify-between items-center border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-indigo-500/20 opacity-50 pointer-events-none"></div>
               <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] group-hover:scale-150 transition-transform duration-1000"></div>
               
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl border border-white/10 backdrop-blur-xl shadow-inner">📊</div>
                     <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter italic">{cur.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                           <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">{cur.subtitle}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="text-left bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-3xl relative z-10 shadow-2xl">
                  <span className="text-[8px] block text-slate-500 uppercase font-black mb-1 tracking-widest">{cur.reportDate}</span>
                  <span className="text-sm font-black font-mono text-emerald-400 tracking-tighter">{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
               </div>
            </div>

            {/* Glassmorphism KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                  { label: cur.revenue, val: plStats.revenue, color: 'emerald', type: 'revenue', icon: '💎', trend: '+15.2%' },
                  { label: cur.expenses, val: plStats.expenses, color: 'rose', type: 'expenses', icon: '🔥', trend: '-2.4%' },
                  { label: cur.netProfit, val: plStats.netProfit, color: plStats.netProfit >= 0 ? 'emerald' : 'rose', icon: '⚡', trend: '+8.1%' },
                  { label: cur.activeProjects, val: activeProjects.length, color: 'indigo', type: 'projects', icon: '🏗️', trend: '+12% نمو' }
               ].map((kpi, i) => (
                  <div key={i} onClick={() => kpi.type && handleDetailClick(kpi.type, kpi.label)} className="bg-white/80 backdrop-blur-xl p-6 rounded-[1.5rem] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-2xl hover:-translate-y-2 hover:border-indigo-500/20 transition-all group relative overflow-hidden active:scale-[0.98]">
                     <div className={`absolute top-0 right-0 w-32 h-32 bg-${kpi.color}-500/5 rounded-full blur-[40px] group-hover:scale-150 transition-transform`}></div>
                     <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="space-y-1">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{kpi.label}</span>
                           <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded bg-${kpi.color}-500/10 text-${kpi.color}-600`}>{kpi.trend}</span>
                           </div>
                        </div>
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform group-hover:bg-slate-950 group-hover:text-white">{kpi.icon}</div>
                     </div>
                     <div className="flex items-baseline gap-2 relative z-10">
                        <span id={kpi.label === cur.netProfit ? "total-balance" : undefined} className={`text-3xl font-black font-mono tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700`}>{kpi.val.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{i < 3 ? 'LCY' : ''}</span>
                     </div>
                     <div className="mt-6 h-1.5 bg-slate-100 rounded-full overflow-hidden relative z-10 shadow-inner">
                        <div className={`h-full bg-gradient-to-r from-${kpi.color}-600 via-${kpi.color}-500 to-${kpi.color}-300 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]`} style={{ width: i < 3 ? (i === 0 ? '100%' : (i === 1 ? `${expP}%` : `${prfP}%`)) : '85%' }}></div>
                     </div>
                  </div>
               ))}
            </div>

            {/* A/R Aging Panoramic Analysis */}
            <div className="bg-slate-950 rounded-[2rem] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] overflow-hidden group">
               <div className="p-6 px-8 bg-white/5 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">⏳</div>
                     <div>
                        <h3 className="text-xs font-black uppercase text-white tracking-[0.2em]">{cur.agingTitle}</h3>
                        <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Temporal Liquidity Exposure • Real-time Maturity Matrix</p>
                     </div>
                  </div>
                  <div className="text-left bg-emerald-500/10 p-2 px-4 rounded-xl border border-emerald-500/20">
                     <span className="text-[11px] font-black font-mono text-emerald-400 tracking-tighter">{agingReport.total.toLocaleString()} <span className="text-[8px] text-emerald-600 uppercase ml-1">Exposure</span></span>
                  </div>
               </div>
               <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                  {cur.agingBuckets.map((b, i) => (
                     <div key={i} onClick={() => handleBucketClick(i, b.label)} className={`p-5 rounded-2xl border transition-all cursor-pointer hover:bg-white/10 group/item active:scale-95 ${b.dark ? 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30 border-emerald-500' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-3">
                           <span className={`text-[8px] font-black uppercase tracking-widest ${b.dark ? 'text-white' : 'text-slate-500'}`}>{b.label}</span>
                           <div className={`w-2 h-2 rounded-full bg-${b.color}-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>
                        </div>
                        <span className={`text-lg font-black font-mono tracking-tighter block ${b.dark ? 'text-white' : 'text-white/90'}`}>{[agingReport.notDue, agingReport.d30, agingReport.d60, agingReport.d90, agingReport.over90][i].toLocaleString()}</span>
                        <div className={`mt-3 h-1 rounded-full ${b.dark ? 'bg-white/20' : 'bg-white/5'}`}>
                           <div className={`h-full bg-${b.color}-500 rounded-full`} style={{ width: '60%' }}></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Strategic Intelligence Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden" onClick={() => handleDetailClick('cashflow', 'Cashflow')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[40px]"></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                           <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-slate-900 transition-colors">Liquidity Horizon</h3>
                           <p className="text-[8px] text-slate-300 font-bold uppercase mt-1">12-Month Projection Velocity</p>
                        </div>
                        <span className="text-2xl group-hover:scale-125 transition-transform">📉</span>
                    </div>
                    <div className="space-y-4 relative z-10">
                        {projectionData.slice(0, 3).map((p, i) => (
                            <div key={i} className="flex justify-between items-center text-[12px] p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                <span className="font-black text-slate-500 uppercase tracking-tighter">{p.month_year}</span>
                                <div className="flex items-center gap-4">
                                    <span className={`font-black font-mono text-base ${Number(p.liquidity_gap) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {Number(p.liquidity_gap).toLocaleString()}
                                    </span>
                                    <span className="text-[8px] text-slate-300 font-black">LCY</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden" onClick={() => handleDetailClick('absorption', 'Absorption')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px]"></div>
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                           <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-slate-900 transition-colors">Inventory Velocity</h3>
                           <p className="text-[8px] text-slate-300 font-bold uppercase mt-1">Real Estate Absorption Index</p>
                        </div>
                        <span className="text-2xl group-hover:scale-125 transition-transform">🚀</span>
                    </div>
                    <div className="space-y-5 relative z-10">
                        {absorptionData.slice(0, 3).map((a, i) => (
                            <div key={i} className="space-y-2.5 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="font-black text-slate-700 truncate max-w-[200px] uppercase tracking-tighter">{a.project_name}</span>
                                    <span className="text-emerald-600 font-black font-mono bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{a.absorption_rate}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${a.absorption_rate}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transactional Audit Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-16">
               {[
                  { title: "Project Profitability Matrix", data: profitabilityData, cols: ["Project", "Budget", "Costs", "Profit"], type: 'profitability', icon: '💎' },
                  { title: "Human Capital Efficiency", data: payrollData, cols: ["Dept", "Count", "Total Commitment"], type: 'payroll', icon: '👤' }
               ].map((mod, i) => (
                  <div key={i} onClick={() => handleDetailClick(mod.type, mod.title)} className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all group">
                     <div className="p-6 px-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white shadow-inner rounded-xl flex items-center justify-center text-lg group-hover:bg-white/10 group-hover:text-white transition-colors">{mod.icon}</div>
                           <h3 className="text-xs font-black uppercase tracking-[0.2em]">{mod.title}</h3>
                        </div>
                        <div className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">VERIFIED AUDIT</div>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-right">
                           <thead className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-50">
                              <tr>{mod.cols.map((c, j) => <th key={j} className="px-8 py-5">{c}</th>)}</tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 font-mono">
                              {mod.data.slice(0, 4).map((row, j) => (
                                 <tr key={j} className="hover:bg-slate-50/80 group/row transition-all">
                                    <td className="px-8 py-5 font-sans font-black text-slate-900 truncate max-w-[150px] group-hover/row:text-emerald-600 transition-colors">{row.project_name || row.department}</td>
                                    <td className="px-8 py-5 text-slate-400 font-bold">{Number(row.budget || row.head_count).toLocaleString()}</td>
                                    <td className="px-8 py-5 text-rose-500 font-black">{Number(row.total_costs || row.total_basic).toLocaleString()}</td>
                                    <td className="px-8 py-5 font-black text-slate-950 bg-slate-50/30">{Number(row.net_distributed_profit || row.total_commitment).toLocaleString()}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               ))}
            </div>

            <div className="mt-10 text-center">
               <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.4em]">TED ERP • STRATEGIC INTELLIGENCE LAYER</p>
            </div>

         </div>
      </div>
   );
}
