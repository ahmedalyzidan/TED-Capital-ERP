import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Finance() {
   const { language } = useLanguage();
   const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, coa, ledger, balance_sheet, pl, mappings
   const [loading, setLoading] = useState(true);

   const translations = {
      ar: {
         title: "الإدارة المالية والمركز المالي",
         subtitle: "تتبع الميزانية، قائمة الدخل، ودفاتر الأستاذ بشكل لحظي",
         newJv: "🖋️ قيد يومية جديد",
         tabs: {
            dashboard: "الرئيسية",
            coa: "الشجرة",
            ledger: "اليومية",
            balance_sheet: "الميزانية",
            pl: "الأرباح/الخسائر",
            budgets: "الموازنات",
            control: "الرقابة والإقفال",
            mappings: "التوجيه"
         },
         stats: {
            cash: "النقدية المتاحة",
            ar: "مديونية العملاء (AR)",
            ap: "مستحقات الموردين (AP)",
            inventory: "قيمة المخزون"
         },
         dashboard: {
            performance: "نظرة عامة على الأداء",
            totalRevenue: "إجمالي الإيرادات (المحقق)",
            netProfit: "صافي الربح التقديري",
            quickActions: "اختصارات سريعة",
            recentTransactions: "آخر الحركات المالية",
            viewAll: "عرض الكل ←",
            currency: "ج.م"
         },
         coa: {
            title: "🌳 شجرة الحسابات والهيكل التنظيمي",
            search: "بحث عن حساب...",
            table: {
               code: "الكود",
               name: "اسم الحساب",
               type: "النوع",
               balance: "الرصيد الحالي"
            }
         },
         statements: {
            balanceSheetTitle: "قائمة المركز المالي (الميزانية العامة)",
            asOf: "كما في",
            assets: "الأصول (Assets)",
            liabilities: "الالتزامات (Liabilities)",
            equity: "حقوق الملكية (Equity)",
            totalAssets: "إجمالي الأصول",
            liabilitiesEquity: "الخصوم وحقوق الملكية",
            balanced: "الميزانية متوازنة",
            unbalanced: "⚠ ميزانية غير متزنة",
            incomeStatementTitle: "قائمة الأرباح والخسائر (Income Statement)",
            periodEnding: "نهاية الفترة",
            revenueActivity: "الإيرادات والنشاط التشغيلي",
            expensesCosts: "المصروفات والتكاليف",
            netIncomeLoss: "صافي الربح / (الخسارة)",
            netIncomeAfterOps: "صافي الدخل بعد العمليات"
         },
         budgets: {
            title: "مراقبة الموازنة التقديرية",
            addBudget: "+ تحديد موازنة",
            planned: "المخطط:",
            spent: "المنصرف:",
            consumption: "الاستهلاك:",
            remaining: "متبقي",
            overBudget: "تجاوز الميزانية ⚠",
            withinBudget: "ضمن الميزانية ✓"
         },
         control: {
            integrity: "فحص سلامة القيود",
            historicalBalance: "موازنة تاريخية",
            allBalanced: "✅ كافة القيود المزدوجة متوازنة تماماً!",
            closingTitle: "إقفال الفترات المالية",
            closePeriod: "إقفال الفترة",
            recentClosed: "الفترات المقفلة مؤخراً"
         },
         jv: {
            title: "إنشاء قيد يومية متوازن",
            subtitle: "Journal Voucher Posting",
            addRow: "+ إضافة سطر",
            postJv: "ترحيل القيد (Post JV) 🖋️",
            table: {
               account: "الحساب",
               debit: "مدين (Debit)",
               credit: "دائن (Credit)",
               desc: "البيان"
            },
            totals: "الإجماليات (Totals)",
            balanced: "✓ متوازن",
            unbalanced: "⚠ غير متوازن"
         },
         modals: {
            manualEntryTitle: "إضافة قيد محاسبي (تسوية)",
            selectAccount: "-- اختر الحساب --",
            submitEntry: "ترحيل القيد للمحاسبة العامة",
            fields: {
               account: "الحساب المدين/الدائن *",
               debit: "مدين (Debit)",
               credit: "دائن (Credit)",
               desc: "شرح القيد (البيان) *",
               descPlaceholder: "اكتب تفاصيل المعاملة هنا..."
            }
         },
         common: {
            loading: "جاري جلب البيانات المالية...",
            currency: "ج.م",
            error: "خطأ",
            success: "✅ تم ترحيل القيد بنجاح!",
            jvSuccess: "✅ تم ترحيل قيد اليومية المتوازن بنجاح!",
            jvUnbalanced: "القيد غير متوازن! الفرق:",
            jvZero: "لا يمكن ترحيل قيد بقيمة صفر."
         },
         prompts: {
            trialBalanceDesc: "ادخل وصفاً لميزان المراجعة (مثال: ميزان افتتاحي 2026):",
            trialBalanceProcessing: "جاري تجهيز واجهة رفع الملفات...",
            allocateAmount: "ادخل المبلغ المراد توزيعه من المصاريف العمومية:",
            closeConfirm: "هل أنت متأكد من رغبتك في إقفال الشهر الحالي؟ لن تتمكن من تعديل القيود بعد ذلك."
         },
         ledger: {
            title: "📓 دفتر اليومية العام (General Ledger)",
            table: {
               date: "التاريخ",
               account: "الحساب",
               entityProject: "الجهة والمشروع",
               desc: "البيان",
               debit: "مدين",
               credit: "دائن",
               ref: "المرجع"
            }
         },
         mappings: {
            title: "🔀 توجيه الحسابات التلقائي (GL Mappings)",
            table: {
               type: "نوع الحركة",
               debit: "حساب المدين",
               credit: "حساب الدائن",
               costCenter: "مركز التكلفة"
            }
         }
      },
      en: {
         title: "Financial Management & Position",
         subtitle: "Real-time tracking of Budget, Income Statement, and Ledgers",
         newJv: "🖋️ New Journal Entry",
         tabs: {
            dashboard: "Home",
            coa: "Tree",
            ledger: "Journal",
            balance_sheet: "Balance Sheet",
            pl: "Profit/Loss",
            budgets: "Budgets",
            control: "Control & Closing",
            mappings: "Mapping"
         },
         stats: {
            cash: "Cash on Hand",
            ar: "Accounts Receivable (AR)",
            ap: "Accounts Payable (AP)",
            inventory: "Inventory Value"
         },
         dashboard: {
            performance: "Performance Overview",
            totalRevenue: "Total Revenue (Realized)",
            netProfit: "Estimated Net Profit",
            quickActions: "Quick Shortcuts",
            recentTransactions: "Recent Transactions",
            viewAll: "View All ←",
            currency: "LCY"
         },
         coa: {
            title: "🌳 Chart of Accounts & Hierarchy",
            search: "Search account...",
            table: {
               code: "Code",
               name: "Account Name",
               type: "Type",
               balance: "Current Balance"
            }
         },
         statements: {
            balanceSheetTitle: "Statement of Financial Position (Balance Sheet)",
            asOf: "As of",
            assets: "Assets",
            liabilities: "Liabilities",
            equity: "Equity",
            totalAssets: "Total Assets",
            liabilitiesEquity: "Liabilities & Equity",
            balanced: "Balance Sheet Balanced",
            unbalanced: "⚠ Unbalanced Balance Sheet",
            incomeStatementTitle: "Income Statement (Profit & Loss)",
            periodEnding: "Period Ending",
            revenueActivity: "Revenue & Operational Activity",
            expensesCosts: "Expenses & Costs",
            netIncomeLoss: "Net Profit / (Loss)",
            netIncomeAfterOps: "Net Income After Operations"
         },
         budgets: {
            title: "Budgetary Control",
            addBudget: "+ Set Budget",
            planned: "Planned:",
            spent: "Spent:",
            consumption: "Consumption:",
            remaining: "Remaining",
            overBudget: "Over Budget ⚠",
            withinBudget: "Within Budget ✓"
         },
         control: {
            integrity: "Entry Integrity Check",
            historicalBalance: "Historical Balance",
            allBalanced: "✅ All double entries are perfectly balanced!",
            closingTitle: "Financial Period Closing",
            closePeriod: "Close Period",
            recentClosed: "Recently Closed Periods"
         },
         jv: {
            title: "Create Balanced Journal Entry",
            subtitle: "Journal Voucher Posting",
            addRow: "+ Add Row",
            postJv: "Post JV 🖋️",
            table: {
               account: "Account",
               debit: "Debit",
               credit: "Credit",
               desc: "Description"
            },
            totals: "Totals",
            balanced: "✓ Balanced",
            unbalanced: "⚠ Unbalanced"
         },
         modals: {
            manualEntryTitle: "Add Accounting Entry (Adjustment)",
            selectAccount: "-- Select Account --",
            submitEntry: "Post Entry to General Ledger",
            fields: {
               account: "Debit/Credit Account *",
               debit: "Debit",
               credit: "Credit",
               desc: "Description *",
               descPlaceholder: "Write transaction details here..."
            }
         },
         common: {
            loading: "Fetching financial data...",
            currency: "LCY",
            error: "Error",
            success: "✅ Entry posted successfully!",
            jvSuccess: "✅ Balanced journal entry posted successfully!",
            jvUnbalanced: "Unbalanced entry! Difference:",
            jvZero: "Cannot post a zero-value entry."
         },
         prompts: {
            trialBalanceDesc: "Enter a description for the Trial Balance (e.g., Opening Balance 2026):",
            trialBalanceProcessing: "Preparing file upload interface...",
            allocateAmount: "Enter the amount to allocate from general expenses:",
            closeConfirm: "Are you sure you want to close the current month? You will not be able to edit entries afterwards."
         },
         ledger: {
            title: "📓 General Ledger Journal",
            table: {
               date: "Date",
               account: "Account",
               entityProject: "Entity & Project",
               desc: "Description",
               debit: "Debit",
               credit: "Credit",
               ref: "Reference"
            }
         },
         mappings: {
            title: "🔀 Automatic GL Mappings",
            table: {
               type: "Transaction Type",
               debit: "Debit Account",
               credit: "Credit Account",
               costCenter: "Cost Center"
            }
         }
      }
   };

   const t = translations[language] || translations['ar'];

   // Data States
   const [accounts, setAccounts] = useState([]);
   const [ledger, setLedger] = useState([]);
   const [mappings, setMappings] = useState([]);
   const [statements, setStatements] = useState(null);
   const [summary, setSummary] = useState(null);
   const [dashData, setDashData] = useState(null);
   const [budgets, setBudgets] = useState([]);
   const [imbalances, setImbalances] = useState([]);
   const [periods, setPeriods] = useState([]);

   const [accountNames, setAccountNames] = useState([]);
   const [projects, setProjects] = useState([]);

   // Modals States
   const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
   const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);

   // Filter States
   const [selectedCompanyId, setSelectedCompanyId] = useState('all');

   // Forms
   const [entryForm, setEntryForm] = useState({
      account_name: '', debit: '', credit: '', cost_center: 'General', description: ''
   });

   const [jvRows, setJvRows] = useState([
      { account_name: '', debit: 0, credit: 0, cost_center: 'General', description: '' },
      { account_name: '', debit: 0, credit: 0, cost_center: 'General', description: '' }
   ]);

   const [mappingForm, setMappingForm] = useState({
      transaction_type: '', debit_account: '', credit_account: '', cost_center_required: false
   });

   const formatFinancial = (val) => {
      const num = Number(val || 0);
      const absNum = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return (num < 0 ? '-' : '') + absNum;
   };

   useEffect(() => {
      fetchData();
   }, [activeTab, selectedCompanyId]);

   const fetchData = async () => {
      setLoading(true);
      try {
         const compQuery = `?company_id=${selectedCompanyId}`;
         if (activeTab === 'dashboard') {
            const res = await api.get(`/finance/dashboard${compQuery}`);
            setDashData(res.data.data);
         } else if (activeTab === 'coa') {
            const res = await api.get(`/table/chart_of_accounts${compQuery}&limit=500`);
            setAccounts(res.data.data || []);
         } else if (activeTab === 'ledger') {
            const res = await api.get(`/table/ledger${compQuery}&limit=200`);
            setLedger(res.data.data || []);
         } else if (activeTab === 'mappings') {
            const res = await api.get('/table/gl_mappings?limit=100');
            setMappings(res.data.data || []);
         } else if (activeTab === 'balance_sheet' || activeTab === 'pl') {
            const res = await api.get(`/finance/statements${compQuery}`);
            setStatements(res.data.statements);
            setSummary(res.data.summary);
         } else if (activeTab === 'budgets') {
            const res = await api.get(`/finance/budget-comparison${compQuery}`);
            setBudgets(res.data.data || []);
         } else if (activeTab === 'control') {
            const integrityRes = await api.get('/finance/integrity');
            setImbalances(integrityRes.data.imbalances || []);
            const periodsRes = await api.get('/table/fiscal_periods?limit=100');
            setPeriods(periodsRes.data.data || []);
         }

         const dropdownsRes = await api.get('/dropdowns');
         setAccountNames(dropdownsRes.data.accounts_dd || []);

         const projectsRes = await api.get('/dynamic/table/projects?limit=500');
         setProjects(projectsRes.data.data || []);

      } catch (error) {
         console.error(t.common.error, error);
      } finally {
         setLoading(false);
      }
   };

   if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-white">
         <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-900 font-bold text-xs uppercase tracking-widest animate-pulse">{t.common.loading}</p>
         </div>
      </div>
   );

   const submitJv = async () => {
      const totalDebit = jvRows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
      const totalCredit = jvRows.reduce((sum, r) => sum + Number(r.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
         return alert(`${t.common.jvUnbalanced} ${Math.abs(totalDebit - totalCredit)}`);
      }

      if (totalDebit === 0) return alert(t.common.jvZero);

      setIsSubmitting(true);
      try {
         await api.post('/finance/journal-voucher', {
            rows: jvRows,
            date: new Date().toISOString()
         });
         alert(t.common.jvSuccess);
         setJvRows([{ account_name: '', debit: 0, credit: 0, cost_center: 'General', description: '' }, { account_name: '', debit: 0, credit: 0, cost_center: 'General', description: '' }]);
         fetchData();
      } catch (error) {
         alert(error.response?.data?.error || "Error posting JV");
      } finally {
         setIsSubmitting(false);
      }
   };

   const submitEntry = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         await api.post('/finance/manual-entry', entryForm);
         alert(t.common.success);
         setIsEntryModalOpen(false);
         setEntryForm({ account_name: '', debit: '', credit: '', cost_center: 'General', description: '' });
         fetchData();
      } catch (error) {
         alert(error.response?.data?.error || "Error posting entry");
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <div className="min-h-screen bg-[#f8fafc]/50 pb-20 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
         {/* Header & Tabs */}
         <div className="bg-white border-b border-slate-200">
            <div className="max-w-[1600px] mx-auto px-10 py-10">
               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                  <div className="flex items-center gap-8">
                     <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-slate-900/20 text-white transform hover:rotate-6 transition-all duration-500">
                        📊
                     </div>
                     <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                           {t.title}
                        </h1>
                        <p className="text-slate-400 font-bold text-base mt-2 uppercase tracking-[0.05em]">
                           {t.subtitle}
                        </p>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                     {/* Entity Filter */}
                     <EntityFilter selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId} language={language} />

                     <div className="flex bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex-wrap">
                        {[
                           { id: 'dashboard', label: t.tabs.dashboard, icon: '🏠' },
                           { id: 'coa', label: t.tabs.coa, icon: '🌳' },
                           { id: 'ledger', label: t.tabs.ledger, icon: '📓' },
                           { id: 'balance_sheet', label: t.tabs.balance_sheet, icon: '⚖️' },
                           { id: 'pl', label: t.tabs.pl, icon: '📈' },
                           { id: 'budgets', label: t.tabs.budgets, icon: '🎯' },
                           { id: 'control', label: t.tabs.control, icon: '🔒' },
                           { id: 'mappings', label: t.tabs.mappings, icon: '🔀' }
                        ].map(tab => (
                           <button 
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`px-6 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-[0.1em] transition-all flex items-center gap-3 ${
                                 activeTab === tab.id 
                                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                           >
                              <span className="text-base">{tab.icon}</span> {tab.label}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12">
            {/* Quick Dashboard Stats */}
            {activeTab === 'dashboard' && dashData && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                  <StatCard title={t.stats.cash} value={dashData.cash_on_hand} color="emerald" icon="💵" link="/finance/cash-balances" t={t} />
                  <StatCard title={t.stats.ar} value={dashData.accounts_receivable} color="blue" icon="👤" link="/finance/ar-due" t={t} />
                  <StatCard title={t.stats.ap} value={dashData.accounts_payable} color="rose" icon="🏭" link="/finance/ap-due" t={t} />
                  <StatCard title={t.stats.inventory} value={dashData.inventory_value} color="amber" icon="📦" link="/finance/inventory-valuation" t={t} />
               </div>
            )}

         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">

            {/* ================= DASHBOARD TAB ================= */}
            {activeTab === 'dashboard' && (
               <div className="p-12 space-y-12 animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <div className="space-y-8">
                        <div className="flex items-center gap-6">
                           <div className="w-2 h-10 bg-slate-900 rounded-full"></div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.dashboard.performance}</h3>
                        </div>
                        <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
                           <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/10 transition-colors"></div>
                           <p className="text-slate-500 font-black mb-4 text-[10px] uppercase tracking-[0.2em]">{t.dashboard.totalRevenue}</p>
                           <h4 className={`text-6xl font-black mb-10 font-mono text-white tracking-tighter ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                              {formatFinancial(dashData?.total_revenue)}
                              <span className="text-sm font-sans text-slate-600 font-black mx-4 uppercase tracking-widest">{t.dashboard.currency}</span>
                           </h4>
                           <div className="flex justify-between items-end border-t border-white/10 pt-8">
                              <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                                 <p className="text-slate-600 text-[10px] font-black mb-2 uppercase tracking-[0.2em]">{t.dashboard.netProfit}</p>
                                 <p className="text-3xl font-black font-mono text-white tracking-tighter">
                                    {formatFinancial(dashData?.net_profit)}
                                    <span className="text-xs font-sans text-slate-600 mx-3 uppercase tracking-widest">{t.dashboard.currency}</span>
                                 </p>
                              </div>
                              <div className={`px-5 py-2.5 rounded-2xl text-[11px] font-black border uppercase tracking-widest flex items-center gap-3 ${dashData?.net_profit >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                 <span className={`w-2 h-2 rounded-full ${dashData?.net_profit >= 0 ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`}></span>
                                 {dashData?.net_profit >= 0 ? '+' : ''}{(((dashData?.net_profit || 0) / (dashData?.total_revenue || 1)) * 100).toFixed(1)}% Margin
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="flex items-center gap-6">
                           <div className="w-2 h-10 bg-violet-600 rounded-full"></div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.dashboard.quickActions}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <ActionBtn icon="➕" label={language === 'ar' ? "قيد يومية جديد" : "Post Journal Entry"} onClick={() => setActiveTab('jv')} color="violet" />
                           <ActionBtn icon="📑" label={language === 'ar' ? "رفع ميزان المراجعة" : "Audit Trial Balance"} onClick={async () => {
                              const desc = prompt(t.prompts.trialBalanceDesc);
                              if (!desc) return;
                              alert(t.prompts.trialBalanceProcessing);
                              const res = await api.post('/finance/upload-trial-balance', {
                                 description: desc,
                                 rows: [
                                    { account_name: 'صندوق نقدية - تيد كابيتال', balance: 500000, type: 'Debit' },
                                    { account_name: 'رأس المال', balance: 500000, type: 'Credit' }
                                 ]
                              });
                              alert(res.data.message);
                              fetchData();
                           }} color="slate" />
                           <ActionBtn icon="🏗️" label={language === 'ar' ? "توزيع التكاليف" : "Allocate Sector Costs"} onClick={async () => {
                              const amount = prompt(t.prompts.allocateAmount);
                              if (!amount) return;
                              const res = await api.post('/finance/allocate-costs', {
                                 source_account: 'مصاريف عمومية وإدارية',
                                 amount: parseFloat(amount),
                                 distributions: projects.slice(0, 2).map(p => ({ project_name: p.name, percentage: 50 }))
                              });
                              alert(res.data.message);
                              fetchData();
                           }} color="slate" />
                           <ActionBtn icon="🔒" label={language === 'ar' ? "إقفال الفترة" : "Authorize Period Close"} onClick={async () => {
                              if (!window.confirm(t.prompts.closeConfirm)) return;
                              const now = new Date();
                              const res = await api.post('/finance/close-period', { month: now.getMonth() + 1, year: now.getFullYear() });
                              alert(res.data.message);
                              fetchData();
                           }} color="rose" />
                        </div>
                     </div>
                  </div>

                  {/* Recent Transactions Preview */}
                  <div className="space-y-8 pt-12 border-t border-slate-100">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                           <div className="w-2 h-10 bg-slate-300 rounded-full"></div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.dashboard.recentTransactions}</h3>
                        </div>
                        <button onClick={() => setActiveTab('ledger')} className="px-6 py-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all border border-slate-200">
                           {t.dashboard.viewAll}
                        </button>
                     </div>
                     <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/30">
                        <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                           <thead>
                              <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                                 <th className="px-10 py-6">{language === 'ar' ? 'التاريخ' : 'Effective Date'}</th>
                                 <th className="px-10 py-6">{language === 'ar' ? 'الحساب المتأثر' : 'Affected General Ledger Account'}</th>
                                 <th className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'القيمة' : 'Transaction Value'}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 font-mono">
                              {ledger.slice(0, 8).map(l => (
                                 <tr key={l.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-10 py-6 font-black text-slate-400 text-xs tracking-tighter">
                                       {new Date(l.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                    </td>
                                    <td className="px-10 py-6">
                                       <span className="font-black text-slate-900 text-sm font-sans tracking-tight uppercase">{l.account_name}</span>
                                    </td>
                                    <td className={`px-10 py-6 font-black text-lg ${language === 'ar' ? 'text-left' : 'text-right'} ${l.debit > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                       {l.debit > 0 
                                          ? `+${Number(l.debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}` 
                                          : `-${Number(l.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {/* ================= CHART OF ACCOUNTS ================= */}
            {activeTab === 'coa' && (
               <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 animate-fade-in">
                  <div className={`p-10 border-b border-slate-100 flex justify-between items-center bg-white ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.coa.title}</h3>
                        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2 italic">Institutional account hierarchy & structure</p>
                     </div>
                     <div className="flex gap-4">
                        <input 
                           type="text" 
                           placeholder={t.coa.search} 
                           className="px-6 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none shadow-sm min-w-[300px]" 
                        />
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                        <thead>
                           <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                              <th className="px-10 py-6">{t.coa.table.code}</th>
                              <th className="px-10 py-6">{t.coa.table.name}</th>
                              <th className="px-10 py-6 text-center">{t.coa.table.type}</th>
                              <th className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'} bg-slate-800`}>{t.coa.table.balance}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                           {accounts.map(acc => (
                              <tr key={acc.id} className={`hover:bg-slate-50 transition-all group ${acc.hierarchy_level === 1 ? 'bg-slate-50/50' : ''}`}>
                                 <td className={`px-10 py-7 font-black text-xs tracking-tighter ${acc.hierarchy_level === 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {acc.account_code}
                                 </td>
                                 <td className={`px-10 py-7 font-black ${acc.hierarchy_level === 1 ? 'text-slate-900 text-lg' : acc.hierarchy_level === 2 ? 'text-slate-700 text-base' : 'text-slate-500 text-sm'} ${language === 'ar' ? (acc.hierarchy_level === 2 ? 'pr-20' : acc.hierarchy_level === 3 ? 'pr-32' : '') : (acc.hierarchy_level === 2 ? 'pl-20' : acc.hierarchy_level === 3 ? 'pl-32' : '')}`}>
                                    <span className="font-sans tracking-tight uppercase">{acc.account_name}</span>
                                 </td>
                                 <td className="px-10 py-7 text-center">
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${acc.account_type === 'Asset' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                       acc.account_type === 'Liability' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                          'bg-slate-50 text-slate-400 border-slate-100'
                                       }`}>{acc.account_type}</span>
                                 </td>
                                 <td className={`px-10 py-7 font-black ${language === 'ar' ? 'text-left' : 'text-right'} text-slate-900 text-lg bg-slate-50/30`}>
                                    {Number(acc.balance).toLocaleString()} <span className="text-[10px] text-slate-400 font-sans mx-2 uppercase tracking-widest">{t.dashboard.currency}</span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {/* ================= GENERAL LEDGER (JOURNAL) ================= */}
            {activeTab === 'ledger' && (
               <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 animate-fade-in">
                  <div className={`p-10 border-b border-slate-100 flex justify-between items-center bg-white ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.ledger.title}</h3>
                        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2 italic">Authenticated chronological financial audit trail</p>
                     </div>
                     <div className="flex gap-4">
                        <button className="px-8 py-3.5 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all border border-slate-200 shadow-sm flex items-center gap-3">
                           <span>📄</span> EXPORT PDF
                        </button>
                        <button className="px-8 py-3.5 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all border border-slate-200 shadow-sm flex items-center gap-3">
                           <span>📊</span> EXPORT EXCEL
                        </button>
                     </div>
                  </div>
                  <div className="overflow-x-auto">
                     <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                        <thead>
                           <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                              <th className="px-10 py-6">{t.ledger.table.date}</th>
                              <th className="px-10 py-6">{t.ledger.table.account}</th>
                              <th className="px-10 py-6">{t.ledger.table.entityProject}</th>
                              <th className="px-10 py-6">{t.ledger.table.desc}</th>
                              <th className={`px-10 py-6 text-center`}>{t.ledger.table.debit}</th>
                              <th className={`px-10 py-6 text-center`}>{t.ledger.table.credit}</th>
                              <th className="px-10 py-6 text-center bg-slate-800">{t.ledger.table.ref}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                           {ledger.map(l => (
                              <tr key={l.id} className="hover:bg-slate-50 transition-all group">
                                 <td className="px-10 py-6 font-black text-slate-400 text-xs tracking-tighter">
                                    {new Date(l.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                 </td>
                                 <td className="px-10 py-6">
                                    <span className="font-black text-slate-900 text-sm font-sans tracking-tight uppercase">{l.account_name}</span>
                                 </td>
                                 <td className="px-10 py-6">
                                    <div className="flex flex-col gap-1.5 py-1 font-sans">
                                       <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest w-fit shadow-sm flex items-center gap-1.5">
                                          <span>🏢</span> {l.company || 'TED Capital'}
                                       </span>
                                       <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit shadow-sm flex items-center gap-1.5">
                                          <span>🏗️</span> {l.cost_center && l.cost_center !== 'General' ? l.cost_center : (language === 'ar' ? 'عام (General)' : 'General')}
                                       </span>
                                    </div>
                                 </td>
                                 <td className="px-10 py-6 text-slate-500 font-sans font-bold text-xs max-w-xs truncate">{l.description}</td>
                                 <td className={`px-10 py-6 font-black text-lg text-center ${l.debit > 0 ? 'text-emerald-600' : 'text-slate-200'}`}>
                                    {l.debit > 0 ? Number(l.debit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '-'}
                                 </td>
                                 <td className={`px-10 py-6 font-black text-lg text-center ${l.credit > 0 ? 'text-rose-500' : 'text-slate-200'}`}>
                                    {l.credit > 0 ? Number(l.credit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '-'}
                                 </td>
                                 <td className="px-10 py-6 font-black text-[10px] text-slate-400 text-center bg-slate-50/30 uppercase tracking-widest">
                                    {l.reference_no || `JV-${l.id}`}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}


            {/* ================= BALANCE SHEET ================= */}
            {(activeTab === 'balance_sheet') && statements && summary && (
               <div className="p-12 space-y-16 animate-fade-in max-w-[1400px] mx-auto">
                  <div className="text-center space-y-4 border-b border-slate-100 pb-12">
                     <h3 className="text-4xl font-black text-slate-900 tracking-tight">{t.statements.balanceSheetTitle}</h3>
                     <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">{t.statements.asOf} {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                     <div className="space-y-10">
                        <div className={`flex justify-between items-end border-b-4 border-slate-900 pb-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                           <h4 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t.statements.assets}</h4>
                           <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{summary.totalAssets.toLocaleString()} <span className="text-xs font-sans text-slate-400 font-black uppercase mx-2">{t.dashboard.currency}</span></p>
                        </div>
                        <div className="space-y-4">
                           {statements.balanceSheet.assets.map(a => (
                              <div key={a.id} className={`flex justify-between items-center p-6 hover:bg-slate-50 rounded-[1.5rem] transition-all border border-transparent hover:border-slate-100 group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                 <span className="font-black text-slate-700 text-base uppercase tracking-tight group-hover:text-slate-900 transition-colors">{a.account_name}</span>
                                 <span className="font-mono font-black text-slate-900 text-lg">{Number(a.balance).toLocaleString()}</span>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-16">
                        <div className="space-y-10">
                           <div className={`flex justify-between items-end border-b-4 border-slate-400 pb-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <h4 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t.statements.liabilities}</h4>
                              <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{summary.totalLiabilities.toLocaleString()} <span className="text-xs font-sans text-slate-400 font-black uppercase mx-2">{t.dashboard.currency}</span></p>
                           </div>
                           <div className="space-y-4">
                              {statements.balanceSheet.liabilities.map(a => (
                                 <div key={a.id} className={`flex justify-between items-center p-6 hover:bg-slate-50 rounded-[1.5rem] transition-all border border-transparent hover:border-slate-100 group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                    <span className="font-black text-slate-700 text-base uppercase tracking-tight group-hover:text-slate-900 transition-colors">{a.account_name}</span>
                                    <span className="font-mono font-black text-slate-900 text-lg">{Number(a.balance).toLocaleString()}</span>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-10">
                           <div className={`flex justify-between items-end border-b-4 border-slate-200 pb-6 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <h4 className="text-xl font-black text-slate-900 uppercase tracking-widest">{t.statements.equity}</h4>
                              <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{summary.totalEquity.toLocaleString()} <span className="text-xs font-sans text-slate-400 font-black uppercase mx-2">{t.dashboard.currency}</span></p>
                           </div>
                           <div className="space-y-4">
                              {statements.balanceSheet.equity.map(a => (
                                 <div key={a.id} className={`flex justify-between items-center p-6 hover:bg-slate-50 rounded-[1.5rem] transition-all border border-transparent hover:border-slate-100 group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                    <span className="font-black text-slate-700 text-base uppercase tracking-tight group-hover:text-slate-900 transition-colors">{a.account_name}</span>
                                    <span className="font-mono font-black text-slate-900 text-lg">{Number(a.balance).toLocaleString()}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className={`mt-16 p-12 bg-slate-900 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl shadow-slate-900/30 ${language === 'ar' ? 'md:flex-row-reverse' : ''}`}>
                     <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                        <p className="text-slate-500 font-black mb-2 text-[10px] uppercase tracking-[0.2em]">{t.statements.totalAssets}</p>
                        <p className="text-5xl font-black font-mono text-white tracking-tighter">{summary.totalAssets.toLocaleString()} <span className="text-sm font-sans text-slate-600 font-black uppercase mx-4">{t.dashboard.currency}</span></p>
                     </div>
                     <div className="w-px h-20 bg-white/10 hidden md:block"></div>
                     <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                        <p className="text-slate-500 font-black mb-2 text-[10px] uppercase tracking-[0.2em]">{t.statements.liabilitiesEquity}</p>
                        <p className="text-5xl font-black font-mono text-white tracking-tighter">{(summary.totalLiabilities + summary.totalEquity).toLocaleString()} <span className="text-sm font-sans text-slate-600 font-black uppercase mx-4">{t.dashboard.currency}</span></p>
                     </div>
                     {Math.abs(summary.totalAssets - (summary.totalLiabilities + summary.totalEquity)) < 1 ? (
                        <div className="bg-emerald-500/10 text-emerald-400 px-8 py-4 rounded-2xl font-black border border-emerald-500/20 text-[10px] uppercase tracking-[0.2em] flex items-center gap-4 shadow-xl">
                           <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></span>
                           {t.statements.balanced}
                        </div>
                     ) : (
                        <div className="bg-rose-500/10 text-rose-400 px-8 py-4 rounded-2xl font-black border border-rose-500/20 text-[10px] uppercase tracking-[0.2em] shadow-xl">{t.statements.unbalanced}</div>
                     )}
                  </div>
               </div>
            )}

            {/* ================= PROFIT AND LOSS ================= */}
            {activeTab === 'pl' && statements && (
               <div className="p-12 max-w-5xl mx-auto space-y-16 animate-fade-in">
                  <div className="text-center space-y-4 border-b border-slate-100 pb-12">
                     <h3 className="text-4xl font-black text-slate-900 tracking-tight">{t.statements.incomeStatementTitle}</h3>
                     <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">{t.statements.periodEnding} {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                  </div>

                  <div className="space-y-12">
                     <div className="space-y-8">
                        <div className={`flex justify-between items-center bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-900/20 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                           <h4 className={`text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <span className="w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></span>
                              {t.statements.revenueActivity}
                           </h4>
                           <p className="text-3xl font-black font-mono text-white tracking-tighter">{summary.totalRevenue.toLocaleString()} <span className="text-xs font-sans text-slate-500 font-black mx-4 uppercase tracking-widest">{t.dashboard.currency}</span></p>
                        </div>
                        <div className="px-10 space-y-6">
                           {statements.profitAndLoss.revenue.map(a => (
                              <div key={a.id} className={`flex justify-between items-center border-b border-slate-50 pb-6 last:border-0 group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                 <span className="font-black text-slate-700 text-base uppercase tracking-tight group-hover:text-slate-900 transition-colors">{a.account_name}</span>
                                 <span className="font-mono font-black text-slate-900 text-lg">{Number(a.balance).toLocaleString()}</span>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className={`flex justify-between items-center bg-slate-50 p-8 rounded-[2rem] border border-slate-200 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                           <h4 className={`text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <span className="w-2 h-2 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50"></span>
                              {t.statements.expensesCosts}
                           </h4>
                           <p className="text-3xl font-black font-mono text-slate-900 tracking-tighter">{summary.totalExpense.toLocaleString()} <span className="text-xs font-sans text-slate-400 font-black mx-4 uppercase tracking-widest">{t.dashboard.currency}</span></p>
                        </div>
                        <div className="px-10 space-y-6">
                           {statements.profitAndLoss.expense.map(a => (
                              <div key={a.id} className={`flex justify-between items-center border-b border-slate-50 pb-6 last:border-0 group ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                 <span className="font-black text-slate-700 text-base uppercase tracking-tight group-hover:text-slate-900 transition-colors">{a.account_name}</span>
                                 <span className="font-mono font-black text-slate-900 text-lg">{Number(a.balance).toLocaleString()}</span>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className={`mt-24 p-12 rounded-[3rem] flex justify-between items-center border shadow-2xl ${summary.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100 shadow-emerald-900/5' : 'bg-rose-50 border-rose-100 shadow-rose-900/5'} ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                           <h4 className="text-2xl font-black text-slate-900 uppercase tracking-[0.1em]">{t.statements.netIncomeLoss}</h4>
                           <p className="text-slate-400 font-black mt-2 text-[10px] uppercase tracking-[0.2em]">{t.statements.netIncomeAfterOps}</p>
                        </div>
                        <div className={language === 'ar' ? 'text-left' : 'text-right'}>
                           <p className={`text-6xl font-black font-mono tracking-tighter ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {summary.netProfit.toLocaleString()} <span className="text-xl font-sans font-black uppercase mx-4">{t.dashboard.currency}</span>
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* ================= BUDGETS TAB ================= */}
            {activeTab === 'budgets' && (
               <div className="p-12 space-y-12 animate-fade-in">
                  <div className={`flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                     <div className="flex items-center gap-6">
                        <div className="w-2 h-10 bg-indigo-500 rounded-full"></div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.budgets.title}</h3>
                     </div>
                     <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:scale-105 transition-all">
                        {t.budgets.addBudget}
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                     {budgets.map((b, i) => (
                        <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:-translate-y-1 group">
                           <div className={`flex justify-between items-center mb-10 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{b.project_name}</span>
                              <span className={`px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest ${b.consumption_percent > 100 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                 {b.consumption_percent > 100 ? t.budgets.overBudget : t.budgets.withinBudget}
                              </span>
                           </div>
                           <h4 className={`text-xl font-black text-slate-900 mb-8 tracking-tight group-hover:text-slate-900 transition-colors ${language === 'ar' ? 'text-right' : 'text-left'}`}>{b.account_name}</h4>

                           <div className="space-y-6">
                              <div className={`flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                 <span>{t.budgets.planned} {Number(b.budget_amount).toLocaleString()}</span>
                                 <span>{t.budgets.spent} {Number(b.actual_amount).toLocaleString()}</span>
                              </div>
                              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                 <div
                                    className={`h-full transition-all duration-1000 shadow-lg ${b.consumption_percent > 100 ? 'bg-rose-500' : b.consumption_percent > 80 ? 'bg-amber-500' : 'bg-slate-900'}`}
                                    style={{ width: `${Math.min(b.consumption_percent, 100)}%` }}
                                 ></div>
                              </div>
                              <div className={`flex justify-between items-end ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{t.budgets.consumption} {Number(b.consumption_percent).toFixed(1)}%</p>
                                 <p className={`text-2xl font-black font-mono tracking-tighter ${b.variance < 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                                    {b.variance.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 uppercase tracking-widest mx-2 font-black">{t.budgets.remaining}</span>
                                 </p>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* ================= CLOSING & CONTROL TAB ================= */}
            {activeTab === 'control' && (
               <div className="p-12 space-y-16 animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                     <div className="space-y-10">
                        <div className={`flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                           <div className="flex items-center gap-6">
                              <div className="w-2 h-10 bg-emerald-500 rounded-full"></div>
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.control.integrity}</h3>
                           </div>
                           <button onClick={async () => {
                              if (!window.confirm(language === 'ar' ? "تأكيد موازنة الفروق التاريخية؟" : "Confirm historical variance balancing?")) return;
                              await api.post('/finance/fix-history');
                              fetchData();
                           }} className="px-6 py-3 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                              {t.control.historicalBalance}
                           </button>
                        </div>

                        {imbalances.length === 0 ? (
                           <div className="p-20 bg-emerald-50/50 rounded-[3rem] text-center border border-dashed border-emerald-200 shadow-xl shadow-emerald-900/5">
                              <div className="text-6xl mb-8">💎</div>
                              <p className="font-black text-emerald-900 text-xl tracking-tight uppercase">{t.control.allBalanced}</p>
                              <p className="text-emerald-600/60 text-[11px] mt-4 uppercase tracking-[0.3em] font-black italic">Sum(Debit) ≡ Sum(Credit)</p>
                           </div>
                        ) : (
                           <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50">
                              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                 <thead>
                                    <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                                       <th className="px-10 py-6">{language === 'ar' ? 'البيان المؤسسي' : 'Institutional Description'}</th>
                                       <th className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'فرق التوازن' : 'Balance Variance'}</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 font-mono">
                                    {imbalances.map((imb, i) => (
                                       <tr key={i} className="hover:bg-rose-50 transition-all group">
                                          <td className="px-10 py-7 font-black text-slate-700 uppercase tracking-tight text-sm">{imb.description}</td>
                                          <td className={`px-10 py-7 font-black text-xl text-rose-500 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                             {Math.abs(imb.total_debit - imb.total_credit).toLocaleString()}
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </div>

                     <div className="space-y-10">
                        <div className="flex items-center gap-6">
                           <div className="w-2 h-10 bg-rose-500 rounded-full"></div>
                           <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.control.closingTitle}</h3>
                        </div>
                        <div className="bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl shadow-slate-900/30 space-y-12 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                           <div className={`flex gap-6 relative z-10 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                              <div className="flex-1 space-y-3">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mx-4">MONTH</label>
                                 <input type="number" id="close-month" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-white text-center text-xl outline-none focus:bg-white/10 focus:border-white/20 transition-all" defaultValue={new Date().getMonth() + 1} />
                              </div>
                              <div className="flex-1 space-y-3">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mx-4">YEAR</label>
                                 <input type="number" id="close-year" className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-white text-center text-xl outline-none focus:bg-white/10 focus:border-white/20 transition-all" defaultValue={new Date().getFullYear()} />
                              </div>
                           </div>
                           <button onClick={async () => {
                              const m = document.getElementById('close-month').value;
                              const y = document.getElementById('close-year').value;
                              await api.post('/finance/close-period', { month: m, year: y });
                              fetchData();
                           }} className="w-full bg-white text-slate-900 p-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10">
                              {t.control.closePeriod}
                           </button>

                           <div className="space-y-6 pt-10 border-t border-white/5 relative z-10">
                              <p className={`text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.control.recentClosed}</p>
                              {periods.map(p => (
                                 <div key={p.id} className={`flex justify-between items-center p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                                    <span className="font-black text-white text-lg tracking-tighter">{p.month.toString().padStart(2, '0')} / {p.year}</span>
                                    <span className="bg-rose-500/20 text-rose-400 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-500/20">LOCKED 🔒</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* ================= GL MAPPINGS TAB ================= */}
            {activeTab === 'mappings' && (
               <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 animate-fade-in">
                  <div className={`p-10 bg-white border-b border-slate-100 flex justify-between items-center ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.mappings.title}</h3>
                        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2 italic">Institutional transaction-to-ledger configuration</p>
                     </div>
                     <button onClick={() => setIsMappingModalOpen(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:scale-105 transition-all">+ NEW MAPPING</button>
                  </div>
                  <div className="overflow-x-auto">
                     <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                        <thead>
                           <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                              <th className="px-10 py-6">{t.mappings.table.type}</th>
                              <th className="px-10 py-6">{t.mappings.table.debit}</th>
                              <th className="px-10 py-6">{t.mappings.table.credit}</th>
                              <th className="px-10 py-6 text-center">{t.mappings.table.costCenter}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                           {mappings.map(m => (
                              <tr key={m.id} className="hover:bg-slate-50 transition-all group">
                                 <td className="px-10 py-7 font-black text-slate-900 text-sm tracking-tight uppercase">{m.transaction_type}</td>
                                 <td className="px-10 py-7 font-black text-emerald-600 text-xs tracking-tighter">{m.debit_account}</td>
                                 <td className="px-10 py-7 font-black text-rose-500 text-xs tracking-tighter">{m.credit_account}</td>
                                 <td className="px-10 py-7 text-center">
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest ${m.cost_center_required ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                       {m.cost_center_required ? 'REQUIRED' : 'OPTIONAL'}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}


            {/* ================= JOURNAL VOUCHER (JV) TAB ================= */}
            {activeTab === 'jv' && (
               <div className="p-12 space-y-12 animate-fade-in max-w-[1400px] mx-auto">
                  <div className={`flex justify-between items-end border-b border-slate-200 pb-10 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                     <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                        <div className="flex items-center gap-6">
                           <div className="w-2 h-10 bg-slate-900 rounded-full"></div>
                           <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t.jv.title}</h3>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 italic">{t.jv.subtitle}</p>
                     </div>
                     <div className="flex gap-4">
                        <button onClick={() => setJvRows([...jvRows, { account_name: '', debit: 0, credit: 0, cost_center: 'General', description: '' }])} className="px-8 py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-slate-200 hover:bg-slate-100 transition-all shadow-sm">{t.jv.addRow}</button>
                        <button onClick={submitJv} disabled={isSubmitting} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">{t.jv.postJv}</button>
                     </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                     <table className={`w-full border-collapse text-xs min-w-[900px] ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                        <thead className="bg-slate-900 text-white border-b border-slate-900">
                           <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                              <th className="px-10 py-6">{t.jv.table.account}</th>
                              <th className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{t.jv.table.debit}</th>
                              <th className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{t.jv.table.credit}</th>
                              <th className="px-10 py-6">{t.jv.table.desc}</th>
                              <th className="px-10 py-6 w-16"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                           {jvRows.map((row, index) => (
                              <tr key={index} className="hover:bg-slate-50 transition-all group">
                                 <td className="p-4">
                                    <select
                                       value={row.account_name}
                                       onChange={(e) => {
                                          const newRows = [...jvRows];
                                          newRows[index].account_name = e.target.value;
                                          setJvRows(newRows);
                                       }}
                                       className="w-full bg-slate-50 border border-slate-200 p-5 font-black text-slate-900 outline-none rounded-2xl focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all uppercase text-[11px] tracking-tight"
                                    >
                                       <option value="">{t.modals.selectAccount}</option>
                                       {accountNames.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                    </select>
                                 </td>
                                 <td className="p-4">
                                    <input
                                       type="number"
                                       value={row.debit || ''}
                                       onChange={(e) => {
                                          const newRows = [...jvRows];
                                          newRows[index].debit = Number(e.target.value);
                                          newRows[index].credit = 0;
                                          setJvRows(newRows);
                                       }}
                                       placeholder="0.00"
                                       className={`w-full bg-slate-50 border border-slate-200 p-5 font-black text-emerald-600 rounded-2xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-lg tracking-tighter ${language === 'ar' ? 'text-left' : 'text-right'}`}
                                    />
                                 </td>
                                 <td className="p-4">
                                    <input
                                       type="number"
                                       value={row.credit || ''}
                                       onChange={(e) => {
                                          const newRows = [...jvRows];
                                          newRows[index].credit = Number(e.target.value);
                                          newRows[index].debit = 0;
                                          setJvRows(newRows);
                                       }}
                                       placeholder="0.00"
                                       className={`w-full bg-slate-50 border border-slate-200 p-5 font-black text-rose-500 rounded-2xl outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 transition-all text-lg tracking-tighter ${language === 'ar' ? 'text-left' : 'text-right'}`}
                                    />
                                 </td>
                                 <td className="p-4">
                                    <input
                                       type="text"
                                       value={row.description}
                                       onChange={(e) => {
                                          const newRows = [...jvRows];
                                          newRows[index].description = e.target.value;
                                          setJvRows(newRows);
                                       }}
                                       placeholder={language === 'ar' ? 'البيان المحاسبي المؤسسي...' : 'Corporate accounting description...'}
                                       className="w-full bg-slate-50 border border-slate-200 p-5 font-bold text-slate-700 outline-none rounded-2xl focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all font-sans text-xs"
                                    />
                                 </td>
                                 <td className="p-4 text-center">
                                    <button
                                       onClick={() => {
                                          if (jvRows.length > 2) {
                                             setJvRows(jvRows.filter((_, i) => i !== index));
                                          }
                                       }}
                                       className="w-10 h-10 rounded-xl bg-rose-50 text-rose-300 hover:bg-rose-500 hover:text-white font-black transition-all border border-rose-100 flex items-center justify-center text-sm"
                                    >✕</button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white border-t-2 border-slate-800">
                           <tr className="font-black text-[11px] uppercase tracking-[0.2em]">
                              <td className="px-10 py-10">{t.jv.totals}</td>
                              <td className={`px-10 py-10 text-2xl tracking-tighter ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                 {jvRows.reduce((sum, r) => sum + Number(r.debit || 0), 0).toLocaleString()}
                              </td>
                              <td className={`px-10 py-10 text-2xl tracking-tighter ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                 {jvRows.reduce((sum, r) => sum + Number(r.credit || 0), 0).toLocaleString()}
                              </td>
                              <td colSpan="2" className={`px-10 py-10 font-black text-[10px] uppercase tracking-[0.3em] ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                 {Math.abs(jvRows.reduce((sum, r) => sum + Number(r.debit || 0), 0) - jvRows.reduce((sum, r) => sum + Number(r.credit || 0), 0)) < 0.01
                                    ? <span className="bg-emerald-500/10 text-emerald-400 px-6 py-3 rounded-xl border border-emerald-500/20 shadow-xl shadow-emerald-500/10 flex items-center gap-4 justify-center inline-flex">
                                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> {t.jv.balanced}
                                    </span>
                                    : <span className="bg-rose-500/10 text-rose-400 px-6 py-3 rounded-xl border border-rose-500/20 shadow-xl shadow-rose-500/10 inline-flex">
                                       {t.jv.unbalanced} ({Math.abs(jvRows.reduce((sum, r) => sum + Number(r.debit || 0), 0) - jvRows.reduce((sum, r) => sum + Number(r.credit || 0), 0)).toLocaleString()})
                                    </span>
                                 }
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>
            )}

         </div>

         {/* Manual Entry Modal */}
         {isEntryModalOpen && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-10 animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in duration-500">
                  <div className={`p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                     <div>
                        <h3 className="text-3xl font-black text-white tracking-tight">{t.modals.manualEntryTitle}</h3>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mt-2 italic">Institutional financial ledger entry</p>
                     </div>
                     <button onClick={() => setIsEntryModalOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 text-2xl font-black transition-all flex items-center justify-center">✕</button>
                  </div>
                  <form onSubmit={submitEntry} className="p-12 space-y-10">
                     <div className="space-y-4">
                        <label className={`text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mx-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.modals.fields.account}</label>
                        <select name="account_name" value={entryForm.account_name} onChange={(e) => setEntryForm({ ...entryForm, account_name: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[1.5rem] font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-8 focus:ring-slate-900/5 transition-all text-sm uppercase tracking-tight">
                           <option value="">{t.modals.selectAccount}</option>
                           {[...new Set(accountNames)].map(acc => <option key={acc} value={acc}>{acc}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-4">
                           <label className={`text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] block mx-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.modals.fields.debit}</label>
                           <input type="number" name="debit" value={entryForm.debit} onChange={(e) => setEntryForm({ ...entryForm, debit: e.target.value })} className={`w-full bg-slate-50 border border-slate-200 p-6 rounded-[1.5rem] font-black text-emerald-600 outline-none focus:bg-white focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 transition-all text-2xl tracking-tighter ${language === 'ar' ? 'text-left' : 'text-right'}`} placeholder="0.00" />
                        </div>
                        <div className="space-y-4">
                           <label className={`text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] block mx-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.modals.fields.credit}</label>
                           <input type="number" name="credit" value={entryForm.credit} onChange={(e) => setEntryForm({ ...entryForm, credit: e.target.value })} className={`w-full bg-slate-50 border border-slate-200 p-6 rounded-[1.5rem] font-black text-rose-500 outline-none focus:bg-white focus:border-rose-500 focus:ring-8 focus:ring-rose-500/5 transition-all text-2xl tracking-tighter ${language === 'ar' ? 'text-left' : 'text-right'}`} placeholder="0.00" />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <label className={`text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mx-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.modals.fields.desc}</label>
                        <textarea name="description" value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} required className={`w-full bg-slate-50 border border-slate-200 p-6 rounded-[1.5rem] font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-8 focus:ring-slate-900/5 transition-all h-40 text-sm font-sans ${language === 'ar' ? 'text-right' : 'text-left'}`} placeholder={t.modals.fields.descPlaceholder}></textarea>
                     </div>
                     <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-8 rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">{t.modals.submitEntry}</button>
                  </form>
               </div>
            </div>
         )}

      </div>
   </div>
);
}

function StatCard({ title, value, color, icon, link, t }) {
   const colors = {
      emerald: 'border-emerald-100 hover:border-emerald-300',
      blue: 'border-blue-100 hover:border-blue-300',
      rose: 'border-rose-100 hover:border-rose-300',
      amber: 'border-amber-100 hover:border-amber-300'
   };
   const iconColors = {
      emerald: 'bg-emerald-500 text-white shadow-emerald-500/20',
      blue: 'bg-blue-500 text-white shadow-blue-500/20',
      rose: 'bg-rose-500 text-white shadow-rose-500/20',
      amber: 'bg-amber-500 text-white shadow-amber-500/20'
   };

   return (
      <div 
         onClick={() => link && (window.location.href = link)}
         className={`bg-white p-10 rounded-[2.5rem] border shadow-2xl shadow-slate-200/30 transition-all hover:-translate-y-2 ${colors[color]} ${link ? 'cursor-pointer group' : ''}`}
      >
         <div className="flex justify-between items-start mb-10">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl transform group-hover:rotate-12 transition-all duration-500 ${iconColors[color]}`}>{icon}</div>
            <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] mt-2">Institutional KPI</span>
         </div>
         <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{title}</p>
         <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
            {(() => {
               const num = Number(value || 0);
               const absNum = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
               return (num < 0 ? '-' : '') + absNum;
            })()} 
            <span className="text-xs font-sans text-slate-300 font-black mx-3 uppercase tracking-widest">{t.common.currency}</span>
         </h4>
         {link && (
            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
               <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">{t.dashboard.viewAll}</span>
               <span className="text-blue-500 text-lg">→</span>
            </div>
         )}
      </div>
   );
}

function ActionBtn({ icon, label, onClick, color }) {
   const colors = {
      violet: 'bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white border-violet-100 shadow-violet-600/5',
      slate: 'bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white border-slate-100 shadow-slate-900/5',
      rose: 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100 shadow-rose-600/5'
   };
   return (
      <button onClick={onClick} className={`p-8 rounded-[2.5rem] border text-[10px] font-black flex flex-col items-center gap-6 transition-all duration-500 group shadow-2xl hover:-translate-y-1 ${colors[color]}`}>
         <span className="text-4xl transform group-hover:scale-125 transition-all duration-500">{icon}</span>
         <span className="uppercase tracking-[0.2em] text-center">{label}</span>
      </button>
   );
}

function EntityFilter({ selectedCompanyId, setSelectedCompanyId, language }) {
   const entities = [
      { id: 'all', labelAr: 'كافة الشركات (المجموعة)', labelEn: 'All Entities (Consolidated)', icon: '🏢' },
      { id: '1', labelAr: 'تيد كابيتال (TED Capital)', labelEn: 'TED Capital', icon: '🏛️' },
      { id: '2', labelAr: 'ديزاين كونسبت (Design Concept)', labelEn: 'Design Concept', icon: '🎨' },
      { id: '3', labelAr: 'ماستر بيلدر (Master Builder)', labelEn: 'Master Builder', icon: '🏗️' }
   ];

   return (
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-[2rem] p-1.5 shadow-inner">
         {entities.map(ent => (
            <button
               key={ent.id}
               onClick={() => setSelectedCompanyId(ent.id)}
               className={`px-5 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${
                  selectedCompanyId === ent.id
                     ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-100'
                     : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/50'
               }`}
            >
               <span className="text-lg">{ent.icon}</span>
               <span>{language === 'ar' ? ent.labelAr : ent.labelEn}</span>
            </button>
         ))}
      </div>
   );
}