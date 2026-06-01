import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Reports() {
   const { language, theme } = useLanguage();
   const isDark = theme === 'dark';
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
   const activeCompany = localStorage.getItem('active_company') || '';
   const companyOptions = [
      { id: 'all', nameAr: 'كل الشركات', nameEn: 'All Companies', idVal: 'all', nameVal: 'all' },
      { id: '1', nameAr: 'تيد كابيتال للتطوير العقاري', nameEn: 'TED Capital', idVal: '1', nameVal: 'TED Capital' },
      { id: '2', nameAr: 'ديزاين كونسبت للتصميم', nameEn: 'Design Concept', idVal: '2', nameVal: 'Design Concept' },
      { id: '3', nameAr: 'ماستر بيلدر للمقاولات', nameEn: 'Master Builder', idVal: '3', nameVal: 'Master Builder' },
      { id: '4', nameAr: 'برايم ميد فارما للأدوية', nameEn: 'PRIMEMED PHARMA', idVal: '4', nameVal: 'PRIMEMED PHARMA' },
   ];
   const matchingOption = activeCompany ? companyOptions.find(o => 
      o.nameVal.toLowerCase() === activeCompany.toLowerCase() || 
      o.nameEn.toLowerCase() === activeCompany.toLowerCase() || 
      o.nameAr === activeCompany
   ) : null;
   const initialCompany = matchingOption ? matchingOption.id : 'all';
   const [selectedCompany, setSelectedCompany] = useState(initialCompany);
   const [reStats, setReStats] = useState({ totalSales: 0, collected: 0, pending: 0 });
   const [liquidityGapMonths, setLiquidityGapMonths] = useState([]);

   const filterByCompany = (item) => {
      if (selectedCompany === 'all') return true;
      const compObj = companyOptions.find(o => o.id === selectedCompany);
      if (!compObj) return true;
      const nameVal = compObj.nameVal;
      const itemComp = (item.company || item.company_name || item.company_entity || item.project_company || '').toLowerCase();
      const targetComp = nameVal.toLowerCase();
      return itemComp.includes(targetComp) || targetComp.includes(itemComp);
   };

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
   }, [selectedCompany]);

   const fetchReportsData = async () => {
      setLoading(true);
      try {
         const safeFetch = async (promise, fallback = []) => {
            try {
               const res = await promise;
               return res?.data?.data || res?.data || fallback;
            } catch (e) { return fallback; }
         };

         const [debts, finData, profitability, projection, absorption, payroll, projects, reContracts, reInstallments] = await Promise.all([
            safeFetch(api.get('/dynamic/table/client_delayed_payments?limit=1000')),
            api.get(`/finance/statements?company_id=${selectedCompany}`).catch(() => ({ data: { summary: {} } })),
            safeFetch(api.get('/reports/project_profitability')),
            safeFetch(api.get('/reports/cashflow_projection')),
            safeFetch(api.get('/reports/realestate_absorption')),
            safeFetch(api.get('/reports/payroll_efficiency')),
            safeFetch(api.get('/dynamic/table/projects?limit=500')),
            safeFetch(api.get('/table/real_estate_contracts?limit=5000')),
            safeFetch(api.get('/table/real_estate_installments?limit=5000'))
         ]);

         // Filter debts and calculate aging report
         const filteredDebts = (debts || []).filter(filterByCompany);
         setRawDebts(filteredDebts);

         let aging = { notDue: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 };
         const today = new Date();
         filteredDebts.forEach(debt => {
            if (debt?.status === 'Paid') return;
            const amt = parseFloat(debt?.amount || 0);
            const dueDate = new Date(debt?.due_date);
            if (isNaN(dueDate.getTime())) return;
            aging.total += amt;
            if (dueDate >= today) aging.notDue += amt;
            else {
               const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
               if (diffDays <= 30) aging.d30 += amt;
               else if (diffDays <= 60) aging.d60 += amt;
               else if (diffDays <= 90) aging.d90 += amt;
               else aging.over90 += amt;
            }
         });
         setAgingReport(aging);

         // Calculate Real Estate Stats
         const filteredContracts = (reContracts || []).filter(filterByCompany);
         const filteredInstallments = (reInstallments || []).filter(filterByCompany);
         const reTotalSales = filteredContracts.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
         const reCollected = filteredInstallments.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);
         const rePending = filteredInstallments.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);
         setReStats({ totalSales: reTotalSales, collected: reCollected, pending: rePending });

         // Filter other states
         setProfitabilityData((profitability || []).filter(filterByCompany));
         setProjectionData((projection || []).filter(filterByCompany));
         setAbsorptionData((absorption || []).filter(filterByCompany));
         setPayrollData((payroll || []).filter(filterByCompany));
         setActiveProjects(((projects || []).filter(filterByCompany)).filter(p => p.status === 'Active' || p.status === 'Ongoing'));
         
         // Calculate Liquidity Gaps (Months where cashflow projection is negative)
         const gaps = (projection || []).filter(filterByCompany).filter(p => Number(p.liquidity_gap) < 0);
         setLiquidityGapMonths(gaps);

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
      if (!data || data.length === 0) return <div className={`p-16 text-center font-black uppercase text-[10px] tracking-[0.5em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Sector Devoid of Transmissions</div>;

      if (type === 'revenue' || type === 'expenses') {
         const headers = ["Ref", "Entity", "Date", "Amount"];
         return (
            <table className="w-full text-[10px] text-right border-collapse">
               <thead className={`font-black uppercase tracking-widest sticky top-0 z-20 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  <tr>{headers.map(h => <th key={h} className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{h}</th>)}</tr>
               </thead>
               <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                  {data.map((item, i) => (
                     <tr key={i} className={`transition-all group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                        <td className={`p-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>#{item?.id || item?.invoice_number}</td>
                        <td className={`p-4 font-sans font-black transition-colors ${isDark ? 'text-slate-200 group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-emerald-600'}`}>{item?.client_name || item?.vendor_name || '---'}</td>
                        <td className={`p-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item?.date || '---'}</td>
                        <td className={`p-4 font-black ${type === 'expenses' ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`}>
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
               <thead className={`font-black uppercase tracking-widest sticky top-0 z-20 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  <tr>{headers.map(h => <th key={h} className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{h}</th>)}</tr>
               </thead>
               <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                  {data.map((item, i) => (
                     <tr key={i} className={`transition-all group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                        <td className={`p-4 font-sans font-black transition-colors ${isDark ? 'text-slate-200 group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'}`}>{item?.client_name || item?.customer_name}</td>
                        <td className={`p-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item?.due_date}</td>
                        <td className={`p-4 font-black ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{Number(item?.amount || 0).toLocaleString()}</td>
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
               <thead className={`font-black uppercase tracking-widest sticky top-0 z-20 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  <tr>{headers.map(h => <th key={h} className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{h}</th>)}</tr>
               </thead>
               <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                  {data.map((item, i) => (
                     <tr key={i} className={`transition-all group ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                        <td className={`p-4 font-sans font-black ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item?.company_name || 'TED Capital'}</td>
                        <td className={`p-4 font-sans font-bold transition-colors ${isDark ? 'text-slate-300 group-hover:text-indigo-400' : 'text-slate-600 group-hover:text-indigo-600'}`}>{item?.name || item?.project_name}</td>
                        <td className={`p-4 font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{item?.start_date || '---'}</td>
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
            <thead className={`font-black uppercase tracking-widest sticky top-0 z-20 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
               <tr>{keys.map(k => <th key={k} className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} uppercase`}>{k.replace('_', ' ')}</th>)}</tr>
            </thead>
            <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
               {data.map((item, i) => (
                  <tr key={i} className={`transition-all ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                     {keys.map(k => <td key={k} className={`p-4 truncate max-w-[120px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{String(item[k] || '---')}</td>)}
                  </tr>
               ))}
            </tbody>
         </table>
      );
   };

   return (
      <div className={`min-h-screen p-4 space-y-6 text-right selection:bg-emerald-500/30`}
        style={{ backgroundColor: isDark ? '#1d2026' : '#f8fafc', color: isDark ? '#f1f5f9' : '#0f172a' }}
        dir={language === 'ar' ? 'rtl' : 'ltr'}>
         
         <style>{`
            @media print {
               body {
                  background-color: white !important;
                  color: black !important;
               }
               .print\\:hidden {
                  display: none !important;
               }
               .grid {
                  display: grid !important;
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  gap: 1.5rem !important;
               }
               .bg-slate-950, .bg-slate-900 {
                  background-color: #0f172a !important;
                  color: white !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
               }
               .shadow-2xl, .shadow-xl, .shadow-lg, .shadow-sm {
                  box-shadow: none !important;
               }
            }
         `}</style>

         {detailModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}></div>
               <div className={`w-full max-w-5xl rounded-[2.5rem] shadow-[0_32px_128px_-12px_rgba(0,0,0,0.6)] relative z-10 overflow-hidden flex flex-col max-h-[85vh] border border-white/20 ${
                  isDark ? 'bg-[#272a33]' : 'bg-white'
               }`}>
                  <div className={`p-6 border-b flex justify-between items-center relative ${
                     isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                     <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
                     <div className="relative z-10">
                        <h3 className={`text-sm font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-slate-900'}`}>{detailModal.title}</h3>
                        <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Real-time Strategic Node • Transactional Audit</p>
                     </div>
                     <button onClick={() => setDetailModal({ ...detailModal, isOpen: false })} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all group relative z-10 ${
                        isDark ? 'bg-white/5 text-white hover:bg-rose-500' : 'bg-slate-100 text-slate-900 hover:bg-rose-500 hover:text-white'
                     }`}>
                        <span className="text-sm group-hover:rotate-90 transition-transform">✕</span>
                     </button>
                  </div>
                  <div className={`overflow-y-auto custom-scrollbar flex-1 ${isDark ? 'bg-[#272a33]' : 'bg-white'}`}>
                     {renderModalContent()}
                  </div>
                  <div className={`p-3 border-t flex justify-center items-center ${
                     isDark ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                     <p className={`text-[8px] font-black uppercase tracking-[0.4em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TED Capital • Infrastructure Protocol v4.0</p>
                  </div>
               </div>
            </div>
         )}

         <div className="max-w-[1500px] mx-auto space-y-6">
            
            {/* Super Elite Header */}
            <div className="bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group gap-6">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-indigo-500/20 opacity-50 pointer-events-none"></div>
               <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] group-hover:scale-150 transition-transform duration-1000"></div>
               
               <div className="relative z-10 w-full md:w-auto">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl border border-white/10 backdrop-blur-xl shadow-inner shrink-0">📊</div>
                     <div>
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">{cur.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                           <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">{cur.subtitle}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex flex-wrap items-center gap-4 relative z-10 print:hidden w-full md:w-auto">
                  {/* Global Company Selector */}
                  <div className="flex flex-col text-right w-full sm:w-auto">
                     <span className="text-[8px] text-slate-400 uppercase font-black mb-1 tracking-widest">
                        {language === 'ar' ? 'تصفية حسب الشركة' : 'Company Filter'}
                     </span>
                     <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        disabled={activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies'}
                        className={`bg-slate-900 border border-white/15 text-white text-xs font-bold rounded-xl p-2.5 px-4 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer w-full ${
                          activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies' ? 'pointer-events-none opacity-85' : ''
                        }`}
                     >
                        {companyOptions.map(opt => (
                           <option key={opt.id} value={opt.id} className="bg-slate-950">
                              {language === 'ar' ? opt.nameAr : opt.nameEn}
                           </option>
                        ))}
                     </select>
                  </div>

                  {/* Print Button */}
                  <button 
                     onClick={() => window.print()}
                     className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black p-3 px-5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                     <span>🖨️</span>
                     <span>{language === 'ar' ? 'تصدير PDF / طباعة' : 'Export PDF / Print'}</span>
                  </button>
               </div>

               <div className="text-left bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-3xl relative z-10 shadow-2xl w-full md:w-auto flex justify-between md:block">
                  <span className="text-[8px] block text-slate-500 uppercase font-black mb-1 tracking-widest md:text-left">{cur.reportDate}</span>
                  <span className="text-sm font-black font-mono text-emerald-400 tracking-tighter">{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
               </div>
            </div>
 
            {/* Glassmorphism KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
               {[
                  { label: cur.revenue, val: plStats.revenue, color: 'emerald', type: 'revenue', icon: '💎', trend: '+15.2%' },
                  { label: cur.expenses, val: plStats.expenses, color: 'rose', type: 'expenses', icon: '🔥', trend: '-2.4%' },
                  { label: cur.netProfit, val: plStats.netProfit, color: plStats.netProfit >= 0 ? 'emerald' : 'rose', icon: '⚡', trend: '+8.1%' },
                  { label: cur.activeProjects, val: activeProjects.length, color: 'indigo', type: 'projects', icon: '🏗️', trend: '+12% نمو' }
               ].map((kpi, i) => (
               <div key={i} onClick={() => kpi.type && handleDetailClick(kpi.type, kpi.label)}
                 className="backdrop-blur-xl p-5 md:p-6 rounded-[1.5rem] border cursor-pointer hover:-translate-y-2 transition-all group relative overflow-hidden active:scale-[0.98]"
                 style={isDark ? {
                   backgroundColor: '#272a33',
                   borderColor: 'rgba(217,167,112,0.2)',
                   boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
                 } : {
                   backgroundColor: 'rgba(255,255,255,0.8)',
                   borderColor: 'white',
                   boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
                 }}>
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
                         <span id={kpi.label === cur.netProfit ? "total-balance" : undefined}
                           className={`text-2xl md:text-3xl font-black font-mono tracking-tighter`}
                           style={{ color: isDark ? '#f1f5f9' : undefined, backgroundImage: isDark ? 'none' : 'linear-gradient(to right, #0f172a, #334155)', WebkitBackgroundClip: isDark ? 'unset' : 'text', WebkitTextFillColor: isDark ? 'unset' : 'transparent' }}>
                           {kpi.val.toLocaleString()}
                         </span>
                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{i < 3 ? 'LCY' : ''}</span>
                     </div>
                      <div className="mt-6 h-1.5 rounded-full overflow-hidden relative z-10 shadow-inner"
                        style={{ backgroundColor: isDark ? '#22252e' : '#f1f5f9' }}>
                        <div className={`h-full bg-gradient-to-r from-${kpi.color}-600 via-${kpi.color}-500 to-${kpi.color}-300 transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]`} style={{ width: i < 3 ? (i === 0 ? '100%' : (i === 1 ? `${expP}%` : `${prfP}%`)) : '85%' }}></div>
                     </div>
                  </div>
               ))}
            </div>

            {/* A/R Aging Panoramic Analysis */}
            <div className="bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] overflow-hidden group">
               <div className="p-5 md:p-6 px-6 md:px-8 bg-white/5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center backdrop-blur-md gap-4">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl shrink-0">⏳</div>
                     <div>
                        <h3 className="text-xs font-black uppercase text-white tracking-[0.2em]">{cur.agingTitle}</h3>
                        <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Temporal Liquidity Exposure • Real-time Maturity Matrix</p>
                     </div>
                  </div>
                  <div className="text-left bg-emerald-500/10 p-2 px-4 rounded-xl border border-emerald-500/20 w-full sm:w-auto flex justify-between sm:block">
                     <span className="text-[8px] text-emerald-600 uppercase font-black block sm:inline sm:mr-1">{language === 'ar' ? 'التعرض الإجمالي' : 'Exposure'}</span>
                     <span className="text-[11px] font-black font-mono text-emerald-400 tracking-tighter">{agingReport.total.toLocaleString()} LCY</span>
                  </div>
               </div>
               <div className="p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  {cur.agingBuckets.map((b, i) => (
                     <div key={i} onClick={() => handleBucketClick(i, b.label)} className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer hover:bg-white/10 group/item active:scale-95 ${b.dark ? 'bg-emerald-650 text-white shadow-2xl shadow-emerald-600/30 border-emerald-500' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-3">
                           <span className={`text-[8px] font-black uppercase tracking-widest ${b.dark ? 'text-white' : 'text-slate-500'}`}>{b.label}</span>
                           <div className={`w-2 h-2 rounded-full bg-${b.color}-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>
                        </div>
                        <span className={`text-base md:text-lg font-black font-mono tracking-tighter block ${b.dark ? 'text-white' : 'text-white/90'}`}>{[agingReport.notDue, agingReport.d30, agingReport.d60, agingReport.d90, agingReport.over90][i].toLocaleString()}</span>
                        <div className={`mt-3 h-1 rounded-full ${b.dark ? 'bg-white/20' : 'bg-white/5'}`}>
                           <div className={`h-full bg-${b.color}-500 rounded-full`} style={{ width: '60%' }}></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Real Estate Insights Section */}
            {(selectedCompany === 'all' || selectedCompany === '1') && (
               <div className="rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 border shadow-xl space-y-6 relative overflow-hidden group"
                 style={isDark ? { backgroundColor: '#272a33', borderColor: '#3e4452' } : { backgroundColor: 'white', borderColor: '#f1f5f9' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px]"></div>
                  <div className="flex justify-between items-center border-b pb-4"
                    style={{ borderColor: isDark ? '#3e4452' : '#f1f5f9' }}>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-2xl shrink-0">🏢</div>
                        <div>
                           <h2 className="text-base md:text-lg font-black text-slate-900" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                              {language === 'ar' ? 'تحليلات الاستثمار العقاري' : 'Real Estate Investment Insights'}
                           </h2>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              {language === 'ar' ? 'متابعة أداء المبيعات والمحصلات النقدية' : 'Sales performance & cash collections velocity'}
                           </p>
                        </div>
                     </div>
                     <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 shrink-0">
                        {language === 'ar' ? 'تيد كابيتال' : 'TED CAPITAL'}
                     </span>
                  </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      <div className="p-5 md:p-6 rounded-2xl border flex flex-col justify-between"
                        style={isDark ? { backgroundColor: '#22252e', borderColor: '#3e4452' } : { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
                         <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? '#94a3b8' : '#94a3b8' }}>
                           {language === 'ar' ? 'إجمالي قيمة التعاقدات' : 'Total Contract Value'}
                        </span>
                        <div className="mt-4 flex items-baseline gap-2">
                           <span className="text-xl md:text-2xl font-black font-mono" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{reStats.totalSales.toLocaleString()}</span>
                           <span className="text-[8px] text-slate-400 font-black">LCY</span>
                        </div>
                     </div>
                     <div className="bg-emerald-50/50 p-5 md:p-6 rounded-2xl border border-emerald-100/50 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                           {language === 'ar' ? 'المحصل النقدي' : 'Collected Down-payments & Installments'}
                        </span>
                        <div className="mt-4 flex items-baseline gap-2">
                           <span className="text-xl md:text-2xl font-black font-mono text-emerald-700">{reStats.collected.toLocaleString()}</span>
                           <span className="text-[8px] text-emerald-600 font-black">LCY</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-emerald-600" 
                              style={{ width: `${reStats.totalSales > 0 ? (reStats.collected / reStats.totalSales) * 100 : 0}%` }}
                           ></div>
                        </div>
                     </div>
                     <div className="bg-amber-50/50 p-5 md:p-6 rounded-2xl border border-amber-100/50 flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                           {language === 'ar' ? 'المستحقات المعلقة' : 'Pending Collections'}
                        </span>
                        <div className="mt-4 flex items-baseline gap-2">
                           <span className="text-xl md:text-2xl font-black font-mono text-amber-700">{reStats.pending.toLocaleString()}</span>
                           <span className="text-[8px] text-amber-600 font-black">LCY</span>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Sector Margins Contribution Card */}
            <div className="rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 border shadow-xl space-y-6 relative overflow-hidden group"
              style={isDark ? { backgroundColor: '#272a33', borderColor: '#3e4452' } : { backgroundColor: 'white', borderColor: '#f1f5f9' }}>
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[60px]"></div>
               <div className="flex justify-between items-center border-b pb-4"
                 style={{ borderColor: isDark ? '#3e4452' : '#f1f5f9' }}>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl shrink-0">📈</div>
                     <div>
                        <h2 className="text-base md:text-lg font-black text-slate-900">
                           {language === 'ar' ? 'مساهمة هوامش القطاعات' : 'Sector Margins Contribution'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                           {language === 'ar' ? 'تحليل مساهمة الربحية عبر القطاعات الرئيسية' : 'Profit margin analysis across primary sectors'}
                        </p>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  {[
                     { nameAr: 'قطاع التطوير العقاري', nameEn: 'Real Estate (TED Capital)', val: (plStats.revenue > 0 || plStats.expenses > 0) ? 42 : 0, color: 'hsl(142, 70%, 45%)' },
                     { nameAr: 'قطاع المقاولات', nameEn: 'Contracting (Master Builder)', val: (plStats.revenue > 0 || plStats.expenses > 0) ? 28 : 0, color: 'hsl(217, 91%, 60%)' },
                     { nameAr: 'قطاع الأدوية', nameEn: 'Pharma (PRIMEMED PHARMA)', val: (plStats.revenue > 0 || plStats.expenses > 0) ? 18 : 0, color: 'hsl(38, 92%, 50%)' },
                     { nameAr: 'قطاع التصميم والديكور', nameEn: 'Decor & Design (Design Concept)', val: (plStats.revenue > 0 || plStats.expenses > 0) ? 12 : 0, color: 'hsl(325, 90%, 60%)' }
                  ].map((sec, idx) => (
                     <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                           <span className="font-bold text-slate-700">{language === 'ar' ? sec.nameAr : sec.nameEn}</span>
                           <span className="font-black text-slate-900">{sec.val}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                           <div 
                              className="h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${sec.val}%`, backgroundColor: sec.color }}
                           ></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Liquidity Gap Warning Matrix */}
            <div className="rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 border shadow-xl space-y-6 relative overflow-hidden group"
              style={isDark ? { backgroundColor: '#272a33', borderColor: '#3e4452' } : { backgroundColor: 'white', borderColor: '#f1f5f9' }}>
               <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[60px]"></div>
               <div className="flex justify-between items-center border-b pb-4"
                 style={{ borderColor: isDark ? '#3e4452' : '#f1f5f9' }}>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-2xl shrink-0">⚠️</div>
                     <div>
                        <h2 className="text-base md:text-lg font-black text-slate-900">
                           {language === 'ar' ? 'مصفوفة فجوة السيولة نقدية' : 'Liquidity Gap Warning Matrix'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                           {language === 'ar' ? 'التنبؤ بالعجز النقدي المستقبلي ومخاطر السيولة' : 'Forward-looking cash deficits and liquidity alerts'}
                        </p>
                     </div>
                  </div>
               </div>

               {liquidityGapMonths.length > 0 ? (
                  <div className="space-y-4">
                     <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs font-bold leading-relaxed">
                        ⚠️ {language === 'ar' 
                           ? 'تنبيه: تم رصد فجوات سيولة سلبية في الأشهر التالية. يرجى مراجعة جدولة تحصيل الأقساط أو دفعات الموردين لتفادي العجز.' 
                           : 'Alert: Negative liquidity gaps identified. Review installment collections scheduling or vendor payouts to prevent cash shortfalls.'}
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {liquidityGapMonths.map((gap, i) => (
                           <div key={i} className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 flex justify-between items-center">
                              <span className="font-black text-slate-700">{gap.month_year}</span>
                              <div className="text-right">
                                 <span className="text-xs font-black text-rose-600 block">{Number(gap.liquidity_gap).toLocaleString()} LCY</span>
                                 <span className="text-[8px] text-rose-450 font-black uppercase tracking-widest">{language === 'ar' ? 'عجز متوقع' : 'Projected Deficit'}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ) : (
                  <div className="p-6 bg-emerald-550/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-800 text-xs font-bold">
                     <span>✅</span>
                     <span>
                        {language === 'ar' 
                           ? 'السيولة مستقرة: لا توجد فجوات سلبية متوقعة في الأشهر الـ 12 القادمة.' 
                           : 'Liquidity Stable: No negative cashflow gaps projected over the next 12 months.'}
                     </span>
                  </div>
               )}
            </div>

            {/* Strategic Intelligence Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="rounded-[1.5rem] md:rounded-[2rem] border shadow-xl p-5 md:p-8 cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden"
                  style={isDark ? { backgroundColor: '#272a33', borderColor: '#3e4452' } : { backgroundColor: 'white', borderColor: '#f1f5f9' }}
                  onClick={() => handleDetailClick('cashflow', 'Cashflow')}>
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
                
                <div className="rounded-[1.5rem] md:rounded-[2rem] border shadow-xl p-5 md:p-8 cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden"
                  style={isDark ? { backgroundColor: '#272a33', borderColor: '#3e4452' } : { backgroundColor: 'white', borderColor: '#f1f5f9' }}
                  onClick={() => handleDetailClick('absorption', 'Absorption')}>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pb-16">
               {[
                  { title: "Project Profitability Matrix", data: profitabilityData, cols: ["Project", "Budget", "Costs", "Profit"], type: 'profitability', icon: '💎' },
                  { title: "Human Capital Efficiency", data: payrollData, cols: ["Dept", "Count", "Total Commitment"], type: 'payroll', icon: '👤' }
               ].map((mod, i) => (
                  <div key={i} onClick={() => handleDetailClick(mod.type, mod.title)} className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden cursor-pointer hover:border-emerald-500/30 transition-all group">
                     <div className="p-5 md:p-6 px-6 md:px-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center group-hover:bg-slate-950 group-hover:text-white transition-all duration-500">
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
