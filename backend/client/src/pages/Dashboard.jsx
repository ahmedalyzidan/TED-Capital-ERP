import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

import {
   Chart as ChartJS,
   CategoryScale,
   LinearScale,
   BarElement,
   Title,
   Tooltip,
   Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
   CategoryScale,
   LinearScale,
   BarElement,
   Title,
   Tooltip,
   Legend
);

export default function Dashboard() {
   const { user } = useAuth();
   const context = useLanguage();
   const language = context?.language || 'ar';

   const [loading, setLoading] = useState(true);
   const [stats, setStats] = useState({ totalProjects: 0, totalBudget: 0, totalExpenses: 0, availableCash: 0 });
   const [performanceData, setPerformanceData] = useState({ labels: [], datasets: [] });
   const [recentProjects, setRecentProjects] = useState([]);
   const [pendingApprovals, setPendingApprovals] = useState([]);

   const t = {
      ar: {
         welcome: "مرحباً،",
         subtitle: "إليك نظرة عامة على أداء الشركة والمؤشرات المالية اليوم.",
         reports: "التقارير التحليلية",
         newProject: "إضافة مشروع",
         loading: "جاري مزامنة المؤشرات...",
         chartTitle: "منحنى التدفق المالي (إيرادات vs مصروفات)",
         kpis: {
            activeProjects: "المشاريع النشطة",
            totalBudgets: "إجمالي الميزانيات",
            totalExpenses: "إجمالي المصروفات",
            availableCash: "السيولة المتاحة",
            currency: "ج.م",
            growth: "+12% نمو",
            expenseAlert: "صرف جاري"
         },
         projects: {
            title: "أحدث المشاريع القائمة",
            viewAll: "عرض كافة المشاريع",
            code: "الكود",
            name: "اسم المشروع",
            budget: "الميزانية",
            action: "الإجراء",
            workspace: "مساحة العمل",
            empty: "لا توجد مشاريع مسجلة بعد."
         },
         approvals: {
            title: "بانتظار الاعتماد المالي",
            reviewNeeded: "قيد المراجعة",
            viewAll: "عرض كافة الطلبات"
         }
      },
      en: {
         welcome: "Welcome back,",
         subtitle: "Here's your live operational overview and financial health indicators.",
         reports: "Analytics Hub",
         newProject: "New Project",
         loading: "Syncing Live KPIs...",
         chartTitle: "Cash Flow Trend (Revenue vs Expenses)",
         kpis: {
            activeProjects: "Active Projects",
            totalBudgets: "Total Budgets",
            totalExpenses: "Total Expenses",
            availableCash: "Liquidity Status",
            currency: "LCY",
            growth: "+12% Growth",
            expenseAlert: "Active Spend"
         },
         projects: {
            title: "Recent Active Projects",
            viewAll: "View Project Registry",
            code: "Code",
            name: "Project Name",
            budget: "Budget",
            action: "Action",
            workspace: "Workspace",
            empty: "No projects registered yet."
         },
         approvals: {
            title: "Pending Fiscal Approvals",
            reviewNeeded: "In Review",
            viewAll: "View All Pending Requests"
         }
      }
   }[language === 'en' ? 'en' : 'ar'];

   const [detailModal, setDetailModal] = useState({ isOpen: false, type: '', title: '', data: [], fullSet: [], history: [] });

   const fetchDetailData = async (type) => {
      setLoading(true);
      try {
         let res;
         let title = '';
         let list = [];
         let fullSet = [];

         if (type === 'cash') {
            res = await api.get('/finance/cash-balances');
            title = language === 'ar' ? 'تفاصيل السيولة النقدية' : 'Cash Liquidity Details';
            list = res.data.data;
         } else if (type === 'expenses') {
            res = await api.get('/finance/statements');
            title = language === 'ar' ? 'تفاصيل المصروفات الجارية' : 'Current Expense Breakdown';
            list = res.data.statements.profitAndLoss.expense;
            fullSet = res.data.statements.trialBalance;
         } else if (type === 'projects') {
            res = await api.get('/dynamic/table/projects?status=Active&limit=100');
            title = language === 'ar' ? 'قائمة المشاريع النشطة' : 'Active Project Registry';
            list = res.data.data;
         } else if (type === 'budgets') {
            res = await api.get('/dynamic/table/projects?limit=100');
            title = language === 'ar' ? 'توزيع الميزانيات المعتمدة' : 'Approved Budget Allocation';
            list = res.data.data;
         }
         
         setDetailModal({ 
            isOpen: true, 
            type, 
            title, 
            data: list || [], 
            fullSet: fullSet || [],
            history: []
         });
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
   };

   const handleSubDetail = (parent) => {
      if (!parent.account_code || detailModal.type !== 'expenses') return;
      
      const prefix = String(parent.account_code).replace(/0+$/, '');
      const children = detailModal.fullSet.filter(a => 
         String(a.account_code).startsWith(prefix) && 
         a.account_code !== parent.account_code &&
         (a.hierarchy_level === parent.hierarchy_level + 1 || (parent.hierarchy_level === 1 && a.hierarchy_level === 2))
      );

      if (children.length > 0) {
         setDetailModal(prev => ({
            ...prev,
            history: [...prev.history, { title: prev.title, data: prev.data }],
            title: parent.account_name,
            data: children
         }));
      }
   };

   const goBack = () => {
      if (detailModal.history.length === 0) return;
      const last = detailModal.history[detailModal.history.length - 1];
      setDetailModal(prev => ({
         ...prev,
         history: prev.history.slice(0, -1),
         title: last.title,
         data: last.data
      }));
   };

   useEffect(() => {
      const fetchDashboardData = async () => {
         try {
            const [projRes, finRes, authRes, perfRes] = await Promise.all([
               api.get('/dynamic/table/projects?limit=100').catch(() => ({ data: { data: [] } })),
               api.get('/finance/dashboard').catch(() => ({ data: { data: {} } })),
               api.get('/system/authorizations/pending').catch(() => ({ data: { data: [] } })),
               api.get('/finance/performance').catch(() => ({ data: { data: [] } }))
            ]);

            const allProjects = projRes.data?.data || [];
            const fin = finRes.data?.data || {};
            const approvals = authRes.data?.data || [];
            const performance = perfRes.data?.data || [];

            setStats({ 
               totalProjects: allProjects.filter(p => p.status === 'Active').length, 
               totalBudget: allProjects.filter(p => p.status === 'Active').reduce((sum, p) => sum + Number(p.budget || 0), 0), 
               totalExpenses: Number(fin.total_expenses || 0), 
               availableCash: Number(fin.cash_on_hand || 0) 
            });

            // Prepare Chart Data
            setPerformanceData({
               labels: performance.map(p => p.month_year),
               datasets: [
                  {
                     label: language === 'ar' ? 'الإيرادات' : 'Revenue',
                     data: performance.map(p => Number(p.revenue)),
                     backgroundColor: '#10b981',
                     borderRadius: 8,
                     barThickness: 40
                  },
                  {
                     label: language === 'ar' ? 'المصروفات' : 'Expenses',
                     data: performance.map(p => Number(p.expenses)),
                     backgroundColor: '#f43f5e',
                     borderRadius: 8,
                     barThickness: 40
                  }
               ]
            });
            
            setRecentProjects([...allProjects].sort((a, b) => b.id - a.id).slice(0, 6));
            setPendingApprovals(approvals.slice(0, 5));
         } catch (error) { console.error(error); } finally { setLoading(false); }
      };
      fetchDashboardData();
   }, []);

   if (loading && !detailModal.isOpen) return (
      <div className="h-[600px] flex items-center justify-center bg-white rounded-3xl p-20">
         <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs animate-pulse">{t.loading}</p>
         </div>
      </div>
   );

   return (
      <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10 relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
         
         {/* --- DETAIL MODAL (ELITE UI) --- */}
         {detailModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setDetailModal({ ...detailModal, isOpen: false })}></div>
               <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white/20 animate-in slide-in-from-bottom-10 duration-500">
                  <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <div className="flex items-center gap-4">
                        {detailModal.history.length > 0 && (
                           <button onClick={goBack} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm hover:bg-slate-100 transition-all">←</button>
                        )}
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{detailModal.title}</h3>
                     </div>
                     <button onClick={() => setDetailModal({ ...detailModal, isOpen: false })} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm">✕</button>
                  </div>
                  <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                     <div className="space-y-4">
                        {detailModal.data.length === 0 ? (
                           <div className="p-20 text-center text-slate-300 font-black text-xs uppercase tracking-[0.2em]">No details available.</div>
                        ) : (
                           detailModal.data.map((item, idx) => (
                              <div 
                                 key={idx} 
                                 onClick={() => handleSubDetail(item)}
                                 className={`flex justify-between items-center p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100 transition-all group ${detailModal.type === 'expenses' && item.hierarchy_level < 3 ? 'cursor-pointer hover:border-indigo-200 hover:bg-white hover:shadow-xl' : ''}`}
                              >
                                 <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                       {detailModal.type === 'cash' ? '🏦' : detailModal.type === 'expenses' ? '📉' : '🏗️'}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="font-black text-slate-900 text-sm tracking-tight">{item.account_name || item.name || item.item_name}</span>
                                       {item.account_code && <span className="text-[10px] text-slate-400 font-mono">#{item.account_code}</span>}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-6">
                                    <div className="flex items-baseline gap-2">
                                       <span className="font-black font-mono text-slate-900 text-lg">
                                          {Number(item.balance || item.budget || item.valuation || 0).toLocaleString()}
                                       </span>
                                       <span className="text-[10px] font-black text-slate-300 uppercase">{t.kpis.currency}</span>
                                    </div>
                                    {detailModal.type === 'expenses' && item.hierarchy_level < 3 && (
                                       <span className="text-slate-300 group-hover:text-indigo-500 transition-colors">→</span>
                                    )}
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
                  <div className="p-10 bg-slate-900 flex justify-center">
                     <p className="text-white/40 font-black text-[9px] uppercase tracking-[0.4em]">TED ERP • STRATEGIC INTELLIGENCE LAYER</p>
                  </div>
               </div>
            </div>
         )}

         <div className="max-w-[1600px] mx-auto space-y-10">

            {/* --- WELCOME HEADER --- */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 rounded-full -translate-y-40 translate-x-40 blur-3xl opacity-60"></div>

               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-2">
                     <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t.welcome} {user?.username?.split('.')[0] || 'Admin'}</h1>
                     <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">PRO-VERSION</span>
                  </div>
                  <p className="text-slate-400 font-bold text-base">{t.subtitle}</p>
               </div>

               <div className="flex gap-4 relative z-10">
                  <Link to="/reports" className="px-8 py-4 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-2xl font-black text-xs transition-all shadow-sm flex items-center gap-3 active:scale-95">
                     📊 {t.reports}
                  </Link>
                  <Link to="/projects" className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 active:scale-95">
                     ➕ {t.newProject}
                  </Link>
               </div>
            </div>

            {/* --- KPI GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
               {/* Active Projects */}
               <div 
                  onClick={() => fetchDetailData('projects')}
                  className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 group hover:shadow-xl transition-all cursor-pointer active:scale-95"
               >
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-14 h-14 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">🏗️</div>
                     <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-tighter">{t.kpis.growth}</span>
                  </div>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{t.kpis.activeProjects}</p>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalProjects}</h3>
               </div>

               {/* Total Budgets */}
               <div 
                  onClick={() => fetchDetailData('budgets')}
                  className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 group hover:shadow-xl transition-all cursor-pointer active:scale-95"
               >
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-14 h-14 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">💰</div>
                  </div>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{t.kpis.totalBudgets}</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{stats.totalBudget.toLocaleString()}</h3>
                     <span className="text-[10px] font-black text-slate-300 uppercase">{t.kpis.currency}</span>
                  </div>
               </div>

               {/* Total Expenses */}
               <div 
                  onClick={() => fetchDetailData('expenses')}
                  className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 group hover:shadow-xl transition-all cursor-pointer active:scale-95"
               >
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-14 h-14 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">📉</div>
                     <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-3 py-1 rounded-full border border-amber-100 uppercase tracking-tighter">{t.kpis.expenseAlert}</span>
                  </div>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">{t.kpis.totalExpenses}</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{stats.totalExpenses.toLocaleString()}</h3>
                     <span className="text-[10px] font-black text-slate-300 uppercase">{t.kpis.currency}</span>
                  </div>
               </div>

               {/* Available Cash (The Solid One) */}
               <div 
                  onClick={() => fetchDetailData('cash')}
                  className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group cursor-pointer active:scale-95"
               >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                     <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center text-2xl border border-white/10 backdrop-blur-md group-hover:scale-110 transition-transform">🏦</div>
                  </div>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1 relative z-10">{t.kpis.availableCash}</p>
                  <div className="flex items-baseline gap-2 relative z-10">
                     <h3 className="text-3xl font-black text-white font-mono tracking-tighter">{stats.availableCash.toLocaleString()}</h3>
                     <span className="text-[10px] font-black text-slate-500 uppercase">{t.kpis.currency}</span>
                  </div>
               </div>
            </div>

            {/* --- CASHFLOW CHART SECTION --- */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 relative overflow-hidden">
               <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                     <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">📈</span>
                     {t.chartTitle}
                  </h3>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'إيرادات' : 'Revenue'}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مصروفات' : 'Expenses'}</span>
                     </div>
                  </div>
               </div>
               
               <div className="h-[350px] w-full">
                  <Bar 
                     data={performanceData} 
                     options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                           legend: { display: false },
                           tooltip: {
                              backgroundColor: '#0f172a',
                              titleFont: { size: 12, weight: 'bold' },
                              bodyFont: { size: 12 },
                              padding: 12,
                              cornerRadius: 12,
                              displayColors: false
                           }
                        },
                        scales: {
                           y: {
                              beginAtZero: true,
                              grid: { display: true, color: '#f1f5f9' },
                              ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' }
                           },
                           x: {
                              grid: { display: false },
                              ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' }
                           }
                        }
                     }} 
                  />
               </div>
            </div>

            {/* --- MAIN DASHBOARD CONTENT --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

               {/* Recent Projects Table */}
               <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                     <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">🏗️</span>
                        {t.projects.title}
                     </h3>
                     <Link to="/projects" className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">{t.projects.viewAll}</Link>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-right whitespace-nowrap">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                           <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                              <th className="px-8 py-5">{t.projects.code}</th>
                              <th className="px-8 py-5">{t.projects.name}</th>
                              <th className="px-8 py-5">{t.projects.budget}</th>
                              <th className="px-8 py-5 text-center">{t.projects.action}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {recentProjects.length === 0 ? (
                              <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-bold italic">{t.projects.empty}</td></tr>
                           ) : (
                              recentProjects.map(proj => (
                                 <tr key={proj.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-8 py-6">
                                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black border border-slate-200 font-mono">{proj.project_serial || proj.code}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                       <span className="font-black text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors">{proj.name}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                       <span className="font-black font-mono text-slate-900 text-sm">{Number(proj.budget).toLocaleString()}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                       <Link to={`/projects/${proj.id}`} className="px-6 py-2.5 bg-white text-slate-600 rounded-xl font-black text-[10px] border border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                          {t.projects.workspace} 👁️
                                       </Link>
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Pending Approvals Sidebar */}
               <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-10 space-y-10">
                  <div className="flex justify-between items-center">
                     <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">🔔</span>
                        {t.approvals.title}
                     </h3>
                     <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-rose-100">{pendingApprovals.length < 10 ? `0${pendingApprovals.length}` : pendingApprovals.length} New</span>
                  </div>

                  <div className="space-y-6">
                     {pendingApprovals.length === 0 ? (
                        <div className="p-10 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                           <p className="text-slate-400 font-bold italic text-xs">No pending requests.</p>
                        </div>
                     ) : (
                        pendingApprovals.map((item, idx) => (
                           <Link to="/approval-inbox" key={idx} className="p-6 rounded-[2rem] border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xl transition-all cursor-pointer group block">
                              <div className="flex justify-between items-start mb-4">
                                 <div className="flex flex-col">
                                    <span className="font-black text-sm text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{item.module_name?.replace('_', ' ').toUpperCase()} #{item.record_id}</span>
                                    <span className="text-[10px] text-slate-400 font-bold mt-1">Requested by {item.created_by || 'System'}</span>
                                 </div>
                                 <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{t.approvals.reviewNeeded}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="text-[11px] font-black text-slate-900 font-mono tracking-tighter">Workflow Step: {item.step_name || 'Verification'}</span>
                              </div>
                           </Link>
                        ))
                     )}

                     <Link to="/approval-inbox" className="w-full py-5 rounded-[2rem] bg-slate-50 text-slate-400 font-black hover:bg-slate-900 hover:text-white transition-all text-[10px] uppercase tracking-[0.2em] shadow-inner border border-transparent hover:border-slate-900 block text-center">
                        {t.approvals.viewAll}
                     </Link>
                  </div>

                  <div className="pt-8 border-t border-slate-50">
                     <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 flex items-center gap-6">
                        <div className="text-3xl">🛡️</div>
                        <div>
                           <p className="text-indigo-900 font-black text-xs leading-tight">مركز التدقيق الأمني</p>
                           <p className="text-[10px] text-indigo-400 font-bold mt-1">تحديث سجلات الوصول بنجاح</p>
                        </div>
                     </div>
                  </div>
               </div>

            </div>

         </div>
      </div>
   );
}