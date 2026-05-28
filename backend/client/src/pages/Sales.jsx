import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

// ─── FORMATTERS ──────────────────────────────────────────────────────────────
const fmt = (n) => (parseFloat(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG') : '—';

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
const Badge = ({ color = 'slate', children }) => {
  const m = {
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${m[color] || m.slate}`}>{children}</span>;
};

const Modal = ({ open, onClose, title, children, maxW = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[92vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors text-xl font-light">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>}
    <input {...props} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white placeholder:text-slate-400" />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    {label && <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>}
    <select {...props} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white appearance-none">{children}</select>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>}
    <textarea {...props} rows={3} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none bg-white" />
  </div>
);

const Btn = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const v = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200',
    dark: 'bg-slate-900 text-white hover:bg-slate-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    amber: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
    ghost: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
    outline: 'bg-transparent text-indigo-600 border border-indigo-300 hover:bg-indigo-50',
  };
  const s = { xs: 'px-2.5 py-1 text-xs', sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return <button {...props} className={`font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${v[variant]} ${s[size]} ${className}`}>{children}</button>;
};

const StatCard = ({ icon, label, value, sub, color = 'indigo', trend, darkMode }) => {
  const bg = { indigo: 'from-indigo-500 to-indigo-600', emerald: 'from-emerald-500 to-emerald-600', amber: 'from-amber-500 to-amber-600', rose: 'from-rose-500 to-rose-600', blue: 'from-blue-500 to-blue-600', purple: 'from-purple-500 to-purple-600' };
  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 ${darkMode ? 'bg-[#1e2530]/80 border-[#2e3748] text-white shadow-xl shadow-black/10' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg[color] || bg.indigo} flex items-center justify-center text-white text-lg shadow-sm`}>{icon}</div>
        {trend !== undefined && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? (darkMode ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (darkMode ? 'bg-rose-950/40 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>}
      </div>
      <p className="text-2xl font-black mb-0.5">{value}</p>
      <p className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      {sub && <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
};

// ─── PRODUCT PICKER (Instant Client-Side Filtering) ───────────────────────────
function ProductPicker({ onSelect, placeholder = 'ابحث عن منتج...' }) {
  const [query, setQuery] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get('/sales/inventory-lookup?q=&limit=1000')
      .then(r => setInventory(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filteredResults = query.trim() === '' 
    ? [] 
    : inventory.filter(item => 
        item.name?.toLowerCase().includes(query.toLowerCase()) || 
        item.category?.toLowerCase().includes(query.toLowerCase())
      );

  const displayResults = filteredResults.slice(0, 15);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-indigo-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all pr-9"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{loading ? '⟳' : '🔍'}</span>
      </div>
      {open && displayResults.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {displayResults.map(item => (
            <button key={item.id} type="button" onClick={() => { onSelect(item); setQuery(''); setOpen(false); }}
              className="w-full text-right flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-400">{item.warehouse || '—'} | {item.uom || 'وحدة'} | {item.category || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-600">{fmt(item.qty)} متاح</p>
                <p className="text-xs text-slate-400">{fmt(item.price)} EGP</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() !== '' && filteredResults.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center text-slate-400 text-sm">لا توجد نتائج</div>
      )}
    </div>
  );
}

// ─── NEW CUSTOMER MODAL (Inline Addition - Premium Design) ─────────────────────
const NewCustomerModal = ({ open, onClose, onCreated, language, prefilledName = '', activeCompany = '' }) => {
  const ar = language === 'ar';
  const isPharma = activeCompany?.toLowerCase().includes('primemed');
  const defaultClass = isPharma ? 'Pharmacy' : 'Contractor';

  const [form, setForm] = useState({ 
    name: '', 
    company_name: activeCompany || 'TED CAPITAL', 
    phone: '', 
    email: '', 
    address: '', 
    customer_type: defaultClass,
    credit_balance: 0 
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(f => ({ 
        ...f, 
        name: prefilledName || '',
        company_name: activeCompany || 'TED CAPITAL',
        customer_type: defaultClass
      }));
    }
  }, [open, prefilledName, activeCompany, defaultClass]);

  const save = async () => {
    if (!form.name) {
      alert(ar ? 'يرجى إدخال الاسم بالكامل' : 'Please enter full legal entity name');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/add/customers', form);
      alert(ar ? 'تم إضافة الكيان الاستراتيجي بنجاح!' : 'Strategic entity created successfully!');
      if (onCreated) onCreated(data.data || data);
      onClose();
      setForm({ 
        name: '', 
        company_name: activeCompany || 'TED CAPITAL', 
        phone: '', 
        email: '', 
        address: '', 
        customer_type: defaultClass,
        credit_balance: 0
      });
    } catch (e) {
      alert(e?.response?.data?.error || 'Error adding customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={ar ? 'سجل الكيانات الاستراتيجية الجديد' : 'New Strategic Entity Registry'} maxW="max-w-xl">
      <div className="space-y-4 text-slate-700">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest -mt-2 mb-2">
          {ar ? 'التقاط مرجع علاقة الكيان المؤسسي' : 'INSTITUTIONAL RELATIONSHIP BASELINE CAPTURE'}
        </p>

        <Input 
          label={ar ? 'الاسم القانوني بالكامل للكيان *' : 'FULL LEGAL ENTITY NAME *'} 
          value={form.name} 
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
          placeholder={ar ? 'أدخل الاسم الرسمي...' : 'Enter official name...'}
        />

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
            {ar ? 'اسم الشركة المشغلة' : 'OPERATING COMPANY NAME'}
          </label>
          <div className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-black text-slate-900 bg-slate-50/50">
            {form.company_name}
          </div>
        </div>

        <Select 
          label={ar ? 'تصنيف العميل *' : '⭐ CLIENT CLASSIFICATION *'} 
          value={form.customer_type} 
          onChange={e => setForm(f => ({ ...f, customer_type: e.target.value }))}
        >
          {isPharma ? (
            <>
              <option value="Pharmacy">{ar ? '💊 صيدلية' : '💊 Pharmacy'}</option>
              <option value="Hospital">{ar ? '🏥 مستشفى' : '🏥 Hospital'}</option>
              <option value="Distributor">{ar ? '💼 موزع معتمد' : '💼 Distributor'}</option>
              <option value="Individual">{ar ? '👤 فرد / طبيب' : '👤 Individual'}</option>
            </>
          ) : (
            <>
              <option value="Contractor">{ar ? '🏗️ مقاول' : '🏗️ Contractor'}</option>
              <option value="Buyer">{ar ? '🏠 مشتري عقاري' : '🏠 Buyer'}</option>
              <option value="Partner">{ar ? '🤝 شريك استراتيجي' : '🤝 Partner'}</option>
              <option value="Individual">{ar ? '👤 عميل فردي' : '👤 Individual'}</option>
            </>
          )}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input 
            label={ar ? 'الهاتف الرئيسي لجهة الاتصال' : 'PRIMARY CONTACT PHONE'} 
            value={form.phone} 
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
          />
          <Input 
            label={ar ? 'المراسلات الإلكترونية الرئيسية' : 'PRIMARY EMAIL CORRESPONDENCE'} 
            type="email" 
            value={form.email} 
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
          />
        </div>

        <Input 
          label={ar ? 'التسهيل الائتماني المعتمد' : 'AUTHORIZED CREDIT FACILITY'} 
          type="number"
          value={form.credit_balance} 
          onChange={e => setForm(f => ({ ...f, credit_balance: +e.target.value }))} 
        />

        <div className="pt-2">
          <button 
            type="button" 
            onClick={save} 
            disabled={submitting} 
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-200 text-center hover:opacity-95 transition-all disabled:opacity-50"
          >
            {ar ? 'اعتماد إنشاء الكيان الاستراتيجي 🚀' : 'AUTHORIZE STRATEGIC ENTITY CREATION 🚀'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── MINI BAR CHART (SVG) ─────────────────────────────────────────────────────
function MiniBarChart({ data = [], color = '#6366f1' }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => parseFloat(d.revenue) || 0), 1);
  const W = 600, H = 100;
  const barW = Math.floor(W / data.length) - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full h-32">
      {data.map((d, i) => {
        const h = Math.max(4, ((parseFloat(d.revenue) || 0) / max) * H);
        const x = i * (W / data.length) + 3;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={barW} height={h} rx={4} fill={color} opacity={0.85} />
            <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.label?.split(' ')[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ language, darkMode }) {
  const ar = language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/sales/analytics'); setData(r.data.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-24"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-16 text-slate-400">تعذّر تحميل البيانات</div>;

  const { revenue, pipeline, topProducts, teamTargets, monthlyTrend, conversionRate } = data;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" label={ar ? 'إيراد الشهر' : 'Monthly Revenue'} value={fmt(revenue?.total) + ' EGP'} sub={`${revenue?.count || 0} ${ar ? 'فاتورة' : 'invoices'}`} color="emerald" darkMode={darkMode} />
        <StatCard icon="📄" label={ar ? 'عروض الأسعار' : 'Quotations'} value={pipeline?.total_quotations || 0} sub={`${fmt(pipeline?.quotations_value)} EGP ${ar ? 'قيد المعالجة' : 'in pipeline'}`} color="indigo" darkMode={darkMode} />
        <StatCard icon="📦" label={ar ? 'أوامر البيع' : 'Sales Orders'} value={pipeline?.total_orders || 0} sub={`${fmt(pipeline?.orders_value)} EGP`} color="blue" darkMode={darkMode} />
        <StatCard icon="🎯" label={ar ? 'معدل التحويل' : 'Conversion Rate'} value={`${conversionRate}%`} sub={ar ? 'عروض → أوامر' : 'Quotations → Orders'} color={conversionRate >= 50 ? 'emerald' : conversionRate >= 25 ? 'amber' : 'rose'} darkMode={darkMode} />
      </div>

      {/* Pipeline Funnel + Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={darkMode ? "lg:col-span-2 bg-[#1e2530]/80 border-[#2e3748] p-6 rounded-2xl border text-white shadow-xl shadow-black/10 transition-all duration-300" : "lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300"}>
          <h3 className={`text-sm font-black mb-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>📊 {ar ? 'اتجاه الإيرادات — آخر 6 أشهر' : 'Revenue Trend — Last 6 Months'}</h3>
          <MiniBarChart data={monthlyTrend || []} color="#6366f1" />
          <div className="flex gap-6 mt-3">
            {(monthlyTrend || []).map((m, i) => (
              <div key={i} className="flex-1 text-center">
                <p className={`text-xs font-bold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{fmt(m.revenue)}</p>
                <p className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{m.invoice_count} {ar ? 'فاتورة' : 'inv.'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={darkMode ? "bg-[#1e2530]/80 border-[#2e3748] p-6 rounded-2xl border text-white shadow-xl shadow-black/10 transition-all duration-300" : "bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300"}>
          <h3 className={`text-sm font-black mb-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>🔄 {ar ? 'خط الأنابيب' : 'Pipeline Funnel'}</h3>
          <div className="space-y-3">
            {[
              { label: ar ? 'عروض الأسعار' : 'Quotations', count: pipeline?.total_quotations, value: pipeline?.quotations_value, color: 'bg-indigo-100', bar: 'bg-indigo-500', pct: 100 },
              { label: ar ? 'أوامر البيع' : 'Orders', count: pipeline?.total_orders, value: pipeline?.orders_value, color: 'bg-blue-100', bar: 'bg-blue-500', pct: 75 },
              { label: ar ? 'الفواتير' : 'Invoices', count: pipeline?.total_invoices, value: revenue?.total, color: 'bg-emerald-100', bar: 'bg-emerald-500', pct: 50 },
              { label: ar ? 'التسليمات' : 'Deliveries', count: pipeline?.total_deliveries, value: null, color: 'bg-amber-100', bar: 'bg-amber-500', pct: 35 },
            ].map((s, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{s.label}</span>
                  <span className={`text-xs font-bold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{s.count || 0}</span>
                </div>
                <div className={`w-full rounded-full h-2 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                  <div className={`h-2 rounded-full ${s.bar} transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                </div>
                {s.value !== null && <p className={`text-[10px] mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{fmt(s.value)} EGP</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products + Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={darkMode ? "bg-[#1e2530]/80 border-[#2e3748] p-6 rounded-2xl border text-white shadow-xl shadow-black/10 transition-all duration-300" : "bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300"}>
          <h3 className={`text-sm font-black mb-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>🏆 {ar ? 'أفضل المنتجات' : 'Top Products'}</h3>
          {(topProducts || []).length === 0 ? <p className="text-slate-400 text-sm text-center py-6">لا توجد بيانات بعد</p> : (
            <div className="space-y-3">
              {(topProducts || []).slice(0, 6).map((p, i) => {
                const maxRev = parseFloat(topProducts[0]?.revenue) || 1;
                const pct = Math.round((parseFloat(p.revenue) || 0) / maxRev * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs font-bold truncate ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{p.product_name || '—'}</span>
                        <span className="text-xs font-bold text-indigo-600 shrink-0 mr-2">{fmt(p.revenue)} EGP</span>
                      </div>
                      <div className={`w-full rounded-full h-1.5 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                        <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={darkMode ? "bg-[#1e2530]/80 border-[#2e3748] p-6 rounded-2xl border text-white shadow-xl shadow-black/10 transition-all duration-300" : "bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300"}>
          <h3 className={`text-sm font-black mb-4 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>👥 {ar ? 'أداء فريق المبيعات' : 'Sales Team Performance'}</h3>
          {(teamTargets || []).length === 0 ? <p className="text-slate-400 text-sm text-center py-6">لا توجد أهداف محددة</p> : (
            <div className="space-y-3">
              {(teamTargets || []).slice(0, 5).map((t, i) => {
                const pct = t.target_amount > 0 ? Math.min(Math.round((t.achieved_amount / t.target_amount) * 100), 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-black shrink-0">{t.agent_name?.[0] || '?'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className={`text-xs font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{t.agent_name}</span>
                        <span className={`text-xs font-black ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{pct}%</span>
                      </div>
                      <div className={`w-full rounded-full h-1.5 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                        <div className={`h-1.5 rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. QUOTATIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function QuotationsTab({ clients, language, defaultCurrency, onNewClientClick }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [converting, setConverting] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [form, setForm] = useState({ customer_id: '', valid_until: '', notes: '', currency: defaultCurrency || 'EGP', discount_pct: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [clientSearch, setClientSearch] = useState('');
  const [applyTax, setApplyTax] = useState(false);

  useEffect(() => {
    setForm(f => ({ ...f, currency: defaultCurrency || 'EGP' }));
  }, [defaultCurrency]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/quotations'); setItems(data.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addProductFromPicker = (product) => {
    setCartItems(c => [...c, { inventory_id: product.id, name: product.name, qty: 1, price: parseFloat(product.price) || 0, uom: product.uom || 'وحدة', stock: product.qty, discount_pct: 0 }]);
  };
  const addBlankItem = () => setCartItems(c => [...c, { inventory_id: null, name: '', qty: 1, price: 0, uom: 'وحدة', stock: null, discount_pct: 0 }]);
  const updateItem = (i, field, val) => setCartItems(c => c.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const removeItem = (i) => setCartItems(c => c.filter((_, idx) => idx !== i));

  const total = cartItems.reduce((a, c) => a + (c.qty * c.price * (1 - (c.discount_pct || 0) / 100)), 0);
  const overallDiscountAmt = total * ((form.discount_pct || 0) / 100);
  const netTotal = total - overallDiscountAmt;
  const tax = applyTax ? netTotal * 0.14 : 0;
  const grandTotal = netTotal + tax;

  const save = async () => {
    try {
      await api.post('/sales/quotations', { ...form, items: cartItems, total_amount: grandTotal, tax_amount: tax, discount: overallDiscountAmt });
      setModal(false); setCartItems([]); setForm({ customer_id: '', valid_until: '', notes: '', currency: defaultCurrency || 'EGP', discount_pct: 0 }); load();
    } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const convert = async (id) => {
    setConverting(id);
    try { await api.post(`/sales/quotations/${id}/convert`); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); } finally { setConverting(null); }
  };

  const statusColor = s => ({ Draft: 'slate', Sent: 'blue', Accepted: 'green', Converted: 'purple', Rejected: 'rose' }[s] || 'slate');
  const statusAr = s => ({ Draft: 'مسودة', Sent: 'مرسلة', Accepted: 'مقبولة', Converted: 'محوّلة', Rejected: 'مرفوضة' }[s] || s);

  const filtered = items.filter(i => {
    const matchSearch = !search || i.customer_name?.includes(search) || i.quotation_number?.includes(search);
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredClients = clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي' : 'Total', value: items.length, icon: '📄', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
          { label: ar ? 'مسودة' : 'Draft', value: items.filter(i => i.status === 'Draft').length, icon: '✏️', color: 'bg-slate-50 text-slate-700 border-slate-100' },
          { label: ar ? 'محوّلة' : 'Converted', value: items.filter(i => i.status === 'Converted').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: ar ? 'قيمة مفتوحة' : 'Open Value', value: fmt(items.filter(i => !['Converted', 'Rejected'].includes(i.status)).reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0)) + ' ' + (defaultCurrency || 'EGP'), icon: '💎', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث...' : 'Search...'} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-48" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
            <option value="all">{ar ? 'كل الحالات' : 'All Status'}</option>
            {['Draft', 'Sent', 'Accepted', 'Converted', 'Rejected'].map(s => <option key={s} value={s}>{statusAr(s)}</option>)}
          </select>
        </div>
        <Btn onClick={() => { setModal(true); setCartItems([{ inventory_id: null, name: '', qty: 1, price: 0, uom: 'وحدة', stock: null }]); }}>+ {ar ? 'عرض سعر جديد' : 'New Quotation'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar ? 'الرقم' : 'Number', ar ? 'العميل' : 'Client', ar ? 'الإجمالي' : 'Total', ar ? 'الضريبة' : 'Tax', ar ? 'الصلاحية' : 'Valid Until', ar ? 'الحالة' : 'Status', ar ? 'إجراء' : 'Action'].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-3 font-black text-indigo-700 text-xs">{item.quotation_number}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 font-black text-emerald-700">{fmt(item.total_amount)} {item.currency || 'EGP'}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(item.tax_amount)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(item.valid_until)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{statusAr(item.status)}</Badge></td>
                  <td className="px-4 py-3">
                    {item.status !== 'Converted' && item.status !== 'Rejected' && (
                      <Btn size="xs" variant="primary" onClick={() => convert(item.id)} disabled={converting === item.id}>
                        {converting === item.id ? '⟳' : '↗'} {ar ? 'تحويل' : 'Convert'}
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">{ar ? 'لا توجد عروض أسعار' : 'No quotations'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setCartItems([]); }} title={ar ? 'عرض سعر جديد' : 'New Quotation'} maxW="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{ar ? 'العميل' : 'Client'}</label>
                <div className="flex gap-1">
                  <input 
                    value={clientSearch} 
                    onChange={e => setClientSearch(e.target.value)} 
                    placeholder={ar ? '🔍 بحث...' : '🔍 Search...'} 
                    className="w-1/3 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" 
                  />
                  <select 
                    value={form.customer_id} 
                    onChange={e => {
                      if (e.target.value === 'ADD_NEW_CLIENT') {
                        onNewClientClick(clientSearch);
                      } else {
                        setForm(f => ({ ...f, customer_id: e.target.value }));
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
                  >
                    <option value="">-- {ar ? 'اختر العميل' : 'Select Client'} --</option>
                    {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {clientSearch.trim() !== '' && !filteredClients.some(c => c.name?.toLowerCase() === clientSearch.toLowerCase()) && (
                      <option value="ADD_NEW_CLIENT">
                        {ar ? `+ إضافة "${clientSearch}" كعميل جديد...` : `+ Add "${clientSearch}" as new client...`}
                      </option>
                    )}
                  </select>
                </div>
              </div>
              <Btn type="button" variant="outline" onClick={() => onNewClientClick(clientSearch)} className="px-3.5 py-2.5 h-[42px]">+</Btn>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label={ar ? 'صالح حتى' : 'Valid Until'} type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              <Select label={ar ? 'العملة' : 'Currency'} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="ILS">ILS (שקל)</option>
              </Select>
            </div>
          </div>

          {/* Product Picker */}
          <div>
            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wide">{ar ? 'إضافة منتج من المخزن' : 'Add from Inventory'}</label>
            <ProductPicker onSelect={addProductFromPicker} placeholder={ar ? 'ابحث عن منتج في المخزن...' : 'Search inventory...'} />
          </div>

          {/* Tax Checkbox & Overall Discount */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="applyTax" 
                checked={applyTax} 
                onChange={e => setApplyTax(e.target.checked)} 
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
              />
              <label htmlFor="applyTax" className="text-xs font-black text-slate-700">
                {ar ? 'تطبيق ضريبة القيمة المضافة (14%)' : 'Apply VAT (14%)'}
              </label>
            </div>
            <div className="w-48">
              <Input 
                label={ar ? 'خصم إضافي على الإجمالي %' : 'Overall Discount %'} 
                type="number" 
                value={form.discount_pct || 0} 
                onChange={e => setForm(f => ({ ...f, discount_pct: +e.target.value }))} 
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-black text-slate-600 uppercase">{ar ? 'الأصناف' : 'Line Items'}</span>
              <button type="button" onClick={addBlankItem} className="text-xs text-indigo-600 font-bold hover:underline">+ {ar ? 'سطر يدوي' : 'Manual Line'}</button>
            </div>
            <div className="divide-y divide-slate-100">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center p-3">
                  <div className="flex-1"><input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder={ar ? 'اسم المنتج' : 'Product name'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-20"><input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} placeholder={ar ? 'الكمية' : 'Qty'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-28"><input type="number" value={item.price} onChange={e => updateItem(idx, 'price', +e.target.value)} placeholder={ar ? 'السعر' : 'Price'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-24"><input type="number" value={item.discount_pct || 0} onChange={e => updateItem(idx, 'discount_pct', +e.target.value)} placeholder={ar ? 'خصم %' : 'Disc %'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-20 text-right text-xs font-bold text-emerald-700">{fmt(item.qty * item.price * (1 - (item.discount_pct || 0)/100))}</div>
                  {item.stock !== null && <div className="w-16 text-right text-[10px] text-slate-400">متاح: {fmt(item.stock)}</div>}
                  <button onClick={() => removeItem(idx)} className="w-7 h-7 flex items-center justify-center text-rose-400 hover:bg-rose-50 rounded-lg">×</button>
                </div>
              ))}
              {cartItems.length === 0 && <div className="py-6 text-center text-slate-400 text-sm">{ar ? 'أضف منتجاً' : 'Add products above'}</div>}
            </div>
            <div className="bg-indigo-950 text-white px-4 py-3 flex justify-between items-center">
              <div className="text-xs space-x-4 space-x-reverse flex flex-col gap-1">
                <span className="opacity-60">{ar ? 'المجموع الفرعي:' : 'Subtotal:'} {fmt(total)} {form.currency}</span>
                {overallDiscountAmt > 0 && <span className="opacity-60 text-rose-400">{ar ? 'الخصم الإجمالي:' : 'Overall Disc:'} -{fmt(overallDiscountAmt)} {form.currency}</span>}
                <span className="opacity-60">{ar ? 'الضريبة (14%):' : 'Tax (14%):'} {fmt(tax)} {form.currency}</span>
              </div>
              <div>
                <span className="text-xs opacity-60 ml-2">{ar ? 'الإجمالي النهائي' : 'Grand Total'}</span>
                <span className="text-xl font-black mr-2">{fmt(grandTotal)} {form.currency}</span>
              </div>
            </div>
          </div>

          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => { setModal(false); setCartItems([]); setForm(f => ({ ...f, discount_pct: 0 })); }}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={save}>💾 {ar ? 'حفظ عرض السعر' : 'Save Quotation'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ORDERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OrdersTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoicing, setInvoicing] = useState(null);
  const [dnModal, setDnModal] = useState(null); // order for delivery note
  const [dnForm, setDnForm] = useState({ warehouse: 'المخزن الرئيسي', delivered_by: '', delivery_date: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/orders'); setItems(data.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const invoice = async (id) => {
    setInvoicing(id);
    try { await api.post(`/sales/orders/${id}/invoice`); alert(ar ? 'تمت الفوترة بنجاح!' : 'Invoiced successfully!'); load(); }
    catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
    finally { setInvoicing(null); }
  };

  const createDelivery = async () => {
    try {
      await api.post('/sales/delivery-notes', {
        order_id: dnModal.id, customer_id: dnModal.customer_id,
        warehouse: dnForm.warehouse, delivered_by: dnForm.delivered_by,
        items: typeof dnModal.items === 'string' ? JSON.parse(dnModal.items) : (dnModal.items || []),
        delivery_date: dnForm.delivery_date, notes: dnForm.notes
      });
      setDnModal(null); load();
      alert(ar ? 'تم إنشاء مذكرة التسليم!' : 'Delivery note created!');
    } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const deliveryColor = s => ({ 'Not Shipped': 'slate', 'In Transit': 'amber', 'Delivered': 'green', 'Partial': 'orange' }[s] || 'slate');
  const deliveryAr = s => ({ 'Not Shipped': 'لم يُشحن', 'In Transit': 'في الطريق', 'Delivered': 'مُسلَّم', 'Partial': 'جزئي' }[s] || s);
  const moduleColor = s => ({ Sales: 'indigo', RealEstate: 'amber', Pharma: 'cyan' }[s] || 'slate');
  const statusColor = s => ({ Pending: 'amber', Invoiced: 'green', Cancelled: 'rose', Processing: 'blue' }[s] || 'slate');
  const statusAr = s => ({ Pending: 'معلق', Invoiced: 'مُفوتَر', Cancelled: 'ملغى', Processing: 'قيد التنفيذ' }[s] || s);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي الأوامر' : 'Total Orders', value: items.length, icon: '📦', color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: ar ? 'معلقة' : 'Pending', value: items.filter(i => i.status === 'Pending').length, icon: '⏳', color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: ar ? 'مفوترة' : 'Invoiced', value: items.filter(i => i.status === 'Invoiced').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: ar ? 'إجمالي القيمة' : 'Total Value', value: fmt(items.reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0)) + ' EGP', icon: '💰', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar ? 'الرقم' : 'Order#', ar ? 'العميل' : 'Client', ar ? 'المبلغ' : 'Amount', ar ? 'المصدر' : 'Source', ar ? 'التسليم' : 'Delivery', ar ? 'الحالة' : 'Status', ar ? 'إجراءات' : 'Actions'].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-3 font-black text-blue-700 text-xs">{item.order_number}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 font-black text-emerald-700">{fmt(item.total_amount)} EGP</td>
                  <td className="px-4 py-3"><Badge color={moduleColor(item.source_module)}>{item.source_module || 'Sales'}</Badge></td>
                  <td className="px-4 py-3"><Badge color={deliveryColor(item.delivery_status)}>{ar ? deliveryAr(item.delivery_status) : (item.delivery_status || 'Not Shipped')}</Badge></td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{ar ? statusAr(item.status) : item.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {item.status !== 'Invoiced' && (
                        <Btn size="xs" variant="success" onClick={() => invoice(item.id)} disabled={invoicing === item.id}>
                          {invoicing === item.id ? '⟳' : '🧾'} {ar ? 'فوترة' : 'Invoice'}
                        </Btn>
                      )}
                      {item.delivery_status === 'Not Shipped' && (
                        <Btn size="xs" variant="amber" onClick={() => { setDnModal(item); setDnForm({ warehouse: 'المخزن الرئيسي', delivered_by: '', delivery_date: '', notes: '' }); }}>
                          🚚 {ar ? 'تسليم' : 'Deliver'}
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">{ar ? 'لا توجد أوامر بيع' : 'No sales orders'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Delivery Note Modal */}
      <Modal open={!!dnModal} onClose={() => setDnModal(null)} title={`🚚 ${ar ? 'إنشاء مذكرة تسليم' : 'Create Delivery Note'} — ${dnModal?.order_number || ''}`}>
        <div className="space-y-3">
          <Input label={ar ? 'المخزن' : 'Warehouse'} value={dnForm.warehouse} onChange={e => setDnForm(f => ({ ...f, warehouse: e.target.value }))} />
          <Input label={ar ? 'مندوب التسليم' : 'Delivery Agent'} value={dnForm.delivered_by} onChange={e => setDnForm(f => ({ ...f, delivered_by: e.target.value }))} />
          <Input label={ar ? 'تاريخ التسليم' : 'Delivery Date'} type="date" value={dnForm.delivery_date} onChange={e => setDnForm(f => ({ ...f, delivery_date: e.target.value }))} />
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={dnForm.notes} onChange={e => setDnForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setDnModal(null)}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="amber" onClick={createDelivery}>🚚 {ar ? 'إنشاء مذكرة' : 'Create Note'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DELIVERY NOTES TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DeliveryNotesTab({ language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/delivery-notes'); setItems(data.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try { await api.patch(`/sales/delivery-notes/${id}/status`, { status }); load(); }
    catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
    finally { setUpdating(null); }
  };

  const statusColor = s => ({ Pending: 'amber', 'In Transit': 'blue', Delivered: 'green', Partial: 'orange', Returned: 'rose' }[s] || 'slate');
  const statusAr = s => ({ Pending: 'قيد الانتظار', 'In Transit': 'في الطريق', Delivered: 'مُسلَّم', Partial: 'تسليم جزئي', Returned: 'مُرتجع' }[s] || s);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي' : 'Total', value: items.length, icon: '📋', color: 'bg-slate-50 text-slate-700 border-slate-100' },
          { label: ar ? 'في الطريق' : 'In Transit', value: items.filter(i => i.status === 'In Transit').length, icon: '🚚', color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: ar ? 'مُسلَّمة' : 'Delivered', value: items.filter(i => i.status === 'Delivered').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: ar ? 'معلقة' : 'Pending', value: items.filter(i => i.status === 'Pending').length, icon: '⏳', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar ? 'رقم التسليم' : 'DN#', ar ? 'أمر البيع' : 'Order', ar ? 'العميل' : 'Client', ar ? 'المخزن' : 'Warehouse', ar ? 'المندوب' : 'Agent', ar ? 'تاريخ التسليم' : 'Date', ar ? 'الحالة' : 'Status', ar ? 'إجراء' : 'Action'].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-amber-50/20 transition-colors">
                  <td className="px-4 py-3 font-black text-amber-700 text-xs">{item.delivery_number}</td>
                  <td className="px-4 py-3 font-bold text-blue-600 text-xs">{item.order_number || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.warehouse || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.delivered_by || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(item.delivery_date)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{ar ? statusAr(item.status) : item.status}</Badge></td>
                  <td className="px-4 py-3">
                    {item.status === 'In Transit' && (
                      <Btn size="xs" variant="success" onClick={() => updateStatus(item.id, 'Delivered')} disabled={updating === item.id}>
                        {updating === item.id ? '⟳' : '✅'} {ar ? 'تأكيد' : 'Confirm'}
                      </Btn>
                    )}
                    {item.status === 'Pending' && (
                      <Btn size="xs" variant="amber" onClick={() => updateStatus(item.id, 'In Transit')} disabled={updating === item.id}>
                        {updating === item.id ? '⟳' : '🚚'} {ar ? 'إرسال' : 'Dispatch'}
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400">{ar ? 'لا توجد مذكرات تسليم' : 'No delivery notes'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SALES RETURNS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SalesReturnsTab({ clients, language, defaultCurrency, onNewClientClick }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [returnItems, setReturnItems] = useState([{ inventory_id: null, name: '', qty: 1, price: 0 }]);
  const [form, setForm] = useState({ source_invoice_id: '', customer_id: '', reason: '', reason_code: 'CUSTOMER_REQUEST', refund_method: 'Credit', restock_warehouse: 'المخزن الرئيسي', auto_restock: true, notes: '' });
  const [clientSearch, setClientSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, inv] = await Promise.all([api.get('/sales/return-orders'), api.get('/sales/invoices')]);
      setItems(r.data.data || []); setInvoices(inv.data.data || []);
    } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const total = returnItems.reduce((a, c) => a + (c.qty * c.price), 0);

  const save = async () => {
    try {
      await api.post('/sales/return-orders', { ...form, items: returnItems, total_amount: total });
      setModal(false); setReturnItems([{ inventory_id: null, name: '', qty: 1, price: 0 }]);
      setForm({ source_invoice_id: '', customer_id: '', reason: '', reason_code: 'CUSTOMER_REQUEST', refund_method: 'Credit', restock_warehouse: 'المخزن الرئيسي', auto_restock: true, notes: '' });
      load();
    } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const statusColor = s => ({ Pending: 'amber', Approved: 'green', Rejected: 'rose' }[s] || 'slate');
  const refundColor = s => ({ Credit: 'blue', Cash: 'emerald', Exchange: 'purple' }[s] || 'slate');

  const filteredClients = clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي' : 'Total Returns', value: items.length, icon: '↩️', color: 'bg-rose-50 text-rose-700 border-rose-100' },
          { label: ar ? 'معتمدة' : 'Approved', value: items.filter(i => i.status === 'Approved').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: ar ? 'معلقة' : 'Pending', value: items.filter(i => i.status === 'Pending').length, icon: '⏳', color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: ar ? 'إجمالي المردودات' : 'Total Refunded', value: fmt(items.filter(i => i.status === 'Approved').reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0)) + ' ' + (defaultCurrency || 'EGP'), icon: '💸', color: 'bg-slate-50 text-slate-700 border-slate-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Btn variant="danger" onClick={() => setModal(true)}>↩ {ar ? 'تسجيل مردود' : 'New Return'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar ? 'الرقم' : 'Return#', ar ? 'الفاتورة' : 'Invoice', ar ? 'العميل' : 'Client', ar ? 'المبلغ' : 'Amount', ar ? 'السبب' : 'Reason', ar ? 'طريقة الاسترداد' : 'Refund', ar ? 'الحالة' : 'Status'].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-rose-50/20 transition-colors">
                  <td className="px-4 py-3 font-black text-rose-700 text-xs">{item.return_number}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.invoice_number || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 font-black text-rose-700">{fmt(item.total_amount)} {item.currency || defaultCurrency || 'EGP'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.reason || '—'}</td>
                  <td className="px-4 py-3"><Badge color={refundColor(item.refund_method)}>{item.refund_method}</Badge></td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{item.status === 'Approved' ? (ar ? 'معتمد' : 'Approved') : item.status === 'Pending' ? (ar ? 'معلق' : 'Pending') : (ar ? 'مرفوض' : 'Rejected')}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">{ar ? 'لا توجد مردودات' : 'No returns'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={`↩ ${ar ? 'تسجيل مردود مبيعات' : 'New Sales Return'}`} maxW="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label={ar ? 'الفاتورة المصدر' : 'Source Invoice'} value={form.source_invoice_id} onChange={e => setForm(f => ({ ...f, source_invoice_id: e.target.value }))}>
              <option value="">-- {ar ? 'اختر الفاتورة' : 'Select Invoice'} --</option>
              {invoices.filter(i => i.status === 'مدفوعة').map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {i.customer_name}</option>)}
            </Select>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{ar ? 'العميل' : 'Client'}</label>
                <div className="flex gap-1">
                  <input 
                    value={clientSearch} 
                    onChange={e => setClientSearch(e.target.value)} 
                    placeholder={ar ? '🔍 بحث...' : '🔍 Search...'} 
                    className="w-1/3 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" 
                  />
                  <select 
                    value={form.customer_id} 
                    onChange={e => {
                      if (e.target.value === 'ADD_NEW_CLIENT') {
                        onNewClientClick(clientSearch);
                      } else {
                        setForm(f => ({ ...f, customer_id: e.target.value }));
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
                  >
                    <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
                    {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {clientSearch.trim() !== '' && !filteredClients.some(c => c.name?.toLowerCase() === clientSearch.toLowerCase()) && (
                      <option value="ADD_NEW_CLIENT">
                        {ar ? `+ إضافة "${clientSearch}" كعميل جديد...` : `+ Add "${clientSearch}" as new client...`}
                      </option>
                    )}
                  </select>
                </div>
              </div>
              <Btn type="button" variant="outline" onClick={() => onNewClientClick(clientSearch)} className="px-3.5 py-2.5 h-[42px]">+</Btn>
            </div>
          </div>

          {/* Return Items */}
function InvoicingTab({ clients, staff = [], language, defaultCurrency, onNewClientClick, activeCompany }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const [cartItems, setCartItems] = useState([]);
  const [applyTax, setApplyTax] = useState(false);

  const [form, setForm] = useState({ 
    customer_id: '', 
    invoice_number: '', 
    total_amount: 0, 
    tax_amount: 0, 
    discount: 0, 
    due_date: '', 
    status: 'مسودة', 
    notes: '', 
    salesperson_id: '', 
    sales_type: 'Inventory', 
    commission_rate: 0,
    payment_method: 'Cash',
    amount_paid: 0,
    remaining_balance: 0,
    discount_pct: 0
  });

  const selectedClient = clients.find(c => c.id === parseInt(form.customer_id));

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/invoices'); setItems(data.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addProductFromPicker = (product) => {
    setCartItems(c => [...c, { inventory_id: product.id, name: product.name, qty: 1, price: parseFloat(product.price) || 0, uom: product.uom || 'وحدة', stock: product.qty, discount_pct: 0 }]);
  };
  const addBlankItem = () => setCartItems(c => [...c, { inventory_id: null, name: '', qty: 1, price: 0, uom: 'وحدة', stock: null, discount_pct: 0 }]);
  const updateItem = (i, field, val) => setCartItems(c => c.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const removeItem = (i) => setCartItems(c => c.filter((_, idx) => idx !== i));

  const total = cartItems.reduce((a, c) => a + (c.qty * c.price * (1 - (c.discount_pct || 0) / 100)), 0);
  const overallDiscountAmt = total * ((form.discount_pct || 0) / 100);
  const netTotal = total - overallDiscountAmt;
  const tax = applyTax ? netTotal * 0.14 : 0;
  const grandTotal = netTotal + tax;
  const remaining = grandTotal - (parseFloat(form.amount_paid) || 0);

  const save = async () => {
    try { 
      const invoiceData = { 
        ...form, 
        items: cartItems,
        total_amount: grandTotal,
        tax_amount: tax,
        discount: overallDiscountAmt,
        remaining_balance: remaining
      };
      await api.post('/sales/invoices', invoiceData); 
      setModal(false); 
      setCartItems([]);
      setForm({
        customer_id: '', 
        invoice_number: '', 
        total_amount: 0, 
        tax_amount: 0, 
        discount: 0, 
        due_date: '', 
        status: 'مسودة', 
        notes: '', 
        salesperson_id: '', 
        sales_type: 'Inventory', 
        commission_rate: 0,
        payment_method: 'Cash',
        amount_paid: 0,
        remaining_balance: 0,
        discount_pct: 0
      });
      load(); 
    } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const statusColor = s => ({ 'مسودة': 'slate', 'مرسلة': 'blue', 'مدفوعة': 'green', 'متأخرة': 'rose', 'ملغية': 'amber' }[s] || 'slate');
  const filtered = items.filter(i => i.customer_name?.toLowerCase().includes(search.toLowerCase()) || i.invoice_number?.toLowerCase().includes(search.toLowerCase()));
  const totalRevenue = items.reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0);
  const totalPaid = items.reduce((a, i) => {
    const paid = i.status === 'مدفوعة' ? (parseFloat(i.total_amount) || 0) : (parseFloat(i.amount_paid) || 0);
    return a + paid;
  }, 0);

  const filteredClients = clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()));

  const exportInvoiceCSV = (inv) => {
    const headers = ["Invoice Number", "Date", "Customer Name", "Total Amount", "Tax Amount", "Discount", "Paid Amount", "Remaining Balance", "Payment Method", "Status"];
    const paidVal = inv.status === 'مدفوعة' ? inv.total_amount : (inv.amount_paid || 0);
    const remainingVal = inv.total_amount - paidVal;
    const row = [
      inv.invoice_number,
      fmtDate(inv.created_at),
      inv.customer_name || "—",
      inv.total_amount,
      inv.tax_amount,
      inv.discount,
      paidVal,
      remainingVal,
      inv.payment_method || "Cash",
      inv.status
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), row.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Invoice_${inv.invoice_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي الفواتير' : 'Total Invoices', value: items.length, icon: '🧾', color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: ar ? 'إجمالي الإيرادات' : 'Revenue', value: fmt(totalRevenue) + ' ' + (defaultCurrency || 'EGP'), icon: '💰', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: ar ? 'المحصّل' : 'Collected', value: fmt(totalPaid) + ' ' + (defaultCurrency || 'EGP'), icon: '✅', color: 'bg-green-50 text-green-700 border-green-100' },
          { label: ar ? 'المعلّق' : 'Pending', value: fmt(totalRevenue - totalPaid) + ' ' + (defaultCurrency || 'EGP'), icon: '⏳', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث بالعميل أو الرقم...' : 'Search...'} className="flex-1 sm:max-w-xs border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        <Btn onClick={() => setModal(true)}>+ {ar ? 'فاتورة جديدة' : 'New Invoice'}</Btn>
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar ? 'رقم' : '#', ar ? 'العميل' : 'Client', ar ? 'المبلغ' : 'Amount', ar ? 'المسدد' : 'Paid', ar ? 'المتبقي' : 'Remaining', ar ? 'طريقة الدفع' : 'Payment', ar ? 'الحالة' : 'Status'].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const paidVal = item.status === 'مدفوعة' ? item.total_amount : (item.amount_paid || 0);
                const remainingVal = item.total_amount - paidVal;
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors cursor-pointer" onClick={() => setViewingInvoice(item)}>
                    <td className="px-4 py-3 font-black text-indigo-700 text-xs">{item.invoice_number}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                    <td className="px-4 py-3 font-black text-slate-800">{fmt(item.total_amount)} {item.currency || defaultCurrency || 'EGP'}</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(paidVal)}</td>
                    <td className="px-4 py-3 text-rose-700 font-bold">{fmt(remainingVal)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.payment_method || (ar ? 'نقدي' : 'Cash')}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{item.status}</Badge></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">{ar ? 'لا توجد فواتير' : 'No invoices'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice creation modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'فاتورة جديدة' : 'New Invoice'} maxW="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{ar ? 'العميل' : 'Client'}</label>
                <div className="flex gap-1">
                  <input 
                    value={clientSearch} 
                    onChange={e => setClientSearch(e.target.value)} 
                    placeholder={ar ? '🔍 بحث...' : '🔍 Search...'} 
                    className="w-1/3 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" 
                  />
                  <select 
                    value={form.customer_id} 
                    onChange={e => {
                      if (e.target.value === 'ADD_NEW_CLIENT') {
                        onNewClientClick(clientSearch);
                      } else {
                        setForm(f => ({ ...f, customer_id: e.target.value }));
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
                  >
                    <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
                    {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    {clientSearch.trim() !== '' && !filteredClients.some(c => c.name?.toLowerCase() === clientSearch.toLowerCase()) && (
                      <option value="ADD_NEW_CLIENT">
                        {ar ? `+ إضافة "${clientSearch}" كعميل جديد...` : `+ Add "${clientSearch}" as new client...`}
                      </option>
                    )}
                  </select>
                </div>
              </div>
              <Btn type="button" variant="outline" onClick={() => onNewClientClick(clientSearch)} className="px-3.5 py-2.5 h-[42px]">+</Btn>
            </div>
            {selectedClient && (
              <div className="text-xs text-indigo-700 font-bold bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 self-end">
                ⚡ {ar ? `رصيد محفظة العميل: ` : `Customer Wallet Balance: `} {fmt(selectedClient.credit_balance)} {defaultCurrency || 'EGP'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'رقم الفاتورة' : 'Invoice #'} value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="Auto-generated if empty" />
            <Select label={ar ? 'طريقة الدفع' : 'Payment Method'} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="Cash">{ar ? 'نقدي (Cash)' : 'Cash'}</option>
              <option value="Card">{ar ? 'بطاقة ائتمان (Card)' : 'Card'}</option>
              <option value="Bank Transfer">{ar ? 'تحويل بنكي (Bank)' : 'Bank Transfer'}</option>
              <option value="Customer Wallet">{ar ? 'محفظة العميل (Customer Wallet)' : 'Customer Wallet'}</option>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select label={ar ? 'المندوب / البائع' : 'Salesperson'} value={form.salesperson_id} onChange={e => setForm(f => ({ ...f, salesperson_id: e.target.value }))}>
              <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label={ar ? 'نوع المبيعات' : 'Sales Type'} value={form.sales_type} onChange={e => setForm(f => ({ ...f, sales_type: e.target.value }))}>
              <option value="Inventory">{ar ? 'مخزون' : 'Inventory'}</option>
              <option value="Real Estate">{ar ? 'عقارات' : 'Real Estate'}</option>
              <option value="Service">{ar ? 'خدمات' : 'Service'}</option>
              <option value="Other">{ar ? 'أخرى' : 'Other'}</option>
            </Select>
            <Input label={ar ? 'العمولة %' : 'Commission %'} type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: +e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'تاريخ الاستحقاق' : 'Due Date'} type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <Select label={ar ? 'الحالة' : 'Status'} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {['مسودة', 'مرسلة', 'مدفوعة', 'متأخرة', 'ملغية'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          {/* Product Picker */}
          <div>
            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wide">{ar ? 'إضافة منتج من المخزن' : 'Add from Inventory'}</label>
            <ProductPicker onSelect={addProductFromPicker} placeholder={ar ? 'ابحث عن منتج في المخزن...' : 'Search inventory...'} />
          </div>

          {/* Tax Checkbox & Overall Discount & Paid Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="flex items-center gap-2 pb-3">
              <input 
                type="checkbox" 
                id="applyTaxInvoice" 
                checked={applyTax} 
                onChange={e => setApplyTax(e.target.checked)} 
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
              />
              <label htmlFor="applyTaxInvoice" className="text-xs font-black text-slate-700">
                {ar ? 'تطبيق ضريبة القيمة المضافة (14%)' : 'Apply VAT (14%)'}
              </label>
            </div>
            <div>
              <Input 
                label={ar ? 'خصم إضافي على الإجمالي %' : 'Overall Discount %'} 
                type="number" 
                value={form.discount_pct || 0} 
                onChange={e => setForm(f => ({ ...f, discount_pct: +e.target.value }))} 
              />
            </div>
            <div>
              <Input 
                label={ar ? 'المبلغ المسدد' : 'Amount Paid'} 
                type="number" 
                value={form.amount_paid || 0} 
                onChange={e => setForm(f => ({ ...f, amount_paid: +e.target.value }))} 
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-200">
              <span className="text-xs font-black text-slate-600 uppercase">{ar ? 'الأصناف' : 'Line Items'}</span>
              <button type="button" onClick={addBlankItem} className="text-xs text-indigo-600 font-bold hover:underline">+ {ar ? 'سطر يدوي' : 'Manual Line'}</button>
            </div>
            <div className="divide-y divide-slate-100">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center p-3">
                  <div className="flex-1"><input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder={ar ? 'اسم المنتج' : 'Product name'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-20"><input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} placeholder={ar ? 'الكمية' : 'Qty'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-28"><input type="number" value={item.price} onChange={e => updateItem(idx, 'price', +e.target.value)} placeholder={ar ? 'السعر' : 'Price'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-24"><input type="number" value={item.discount_pct || 0} onChange={e => updateItem(idx, 'discount_pct', +e.target.value)} placeholder={ar ? 'خصم %' : 'Disc %'} className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" /></div>
                  <div className="w-20 text-right text-xs font-bold text-emerald-700">{fmt(item.qty * item.price * (1 - (item.discount_pct || 0)/100))}</div>
                  {item.stock !== null && <div className="w-16 text-right text-[10px] text-slate-400">متاح: {fmt(item.stock)}</div>}
                  <button onClick={() => removeItem(idx)} className="w-7 h-7 flex items-center justify-center text-rose-400 hover:bg-rose-50 rounded-lg">×</button>
                </div>
              ))}
              {cartItems.length === 0 && <div className="py-6 text-center text-slate-400 text-sm">{ar ? 'أضف منتجاً' : 'Add products above'}</div>}
            </div>
            <div className="bg-indigo-950 text-white px-4 py-3 flex justify-between items-center border-b border-indigo-900">
              <div className="text-xs space-x-4 space-x-reverse flex flex-col gap-1">
                <span className="opacity-60">{ar ? 'المجموع الفرعي:' : 'Subtotal:'} {fmt(total)} {defaultCurrency || 'EGP'}</span>
                {overallDiscountAmt > 0 && <span className="opacity-60 text-rose-400">{ar ? 'الخصم الإجمالي:' : 'Overall Disc:'} -{fmt(overallDiscountAmt)} {defaultCurrency || 'EGP'}</span>}
                <span className="opacity-60">{ar ? 'الضريبة (14%):' : 'Tax (14%):'} {fmt(tax)} {defaultCurrency || 'EGP'}</span>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-60">{ar ? 'الإجمالي النهائي' : 'Grand Total'}</p>
                <p className="text-xl font-black">{fmt(grandTotal)} {defaultCurrency || 'EGP'}</p>
                <p className="text-xs opacity-80 mt-1 text-rose-300">
                  {ar ? 'المسدد:' : 'Paid:'} {fmt(form.amount_paid || 0)} | {ar ? 'المتبقي:' : 'Remaining:'} {fmt(remaining)}
                </p>
              </div>
            </div>
          </div>

          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => { setModal(false); setCartItems([]); setForm(f => ({ ...f, discount_pct: 0, amount_paid: 0 })); }}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={save}>💾 {ar ? 'حفظ الفاتورة' : 'Save Invoice'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Viewing Detailed Printable Invoice Modal */}
      {viewingInvoice && (
        <Modal open={!!viewingInvoice} onClose={() => setViewingInvoice(null)} title={ar ? 'تفاصيل الفاتورة' : 'Invoice Details'} maxW="max-w-4xl">
          <div className="space-y-6 print:p-0">
            {/* Printable Area */}
            <div id="printable-invoice" className="bg-white p-6 rounded-xl border border-slate-100 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{activeCompany || "TED CAPITAL"}</h1>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{ar ? 'الفاتورة الرسمية' : 'Official Sales Invoice'}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-black text-indigo-600">{viewingInvoice.invoice_number}</h2>
                  <p className="text-xs text-slate-500">{ar ? 'التاريخ:' : 'Date:'} {fmtDate(viewingInvoice.created_at)}</p>
                  {viewingInvoice.due_date && <p className="text-xs text-slate-500">{ar ? 'تاريخ الاستحقاق:' : 'Due Date:'} {fmtDate(viewingInvoice.due_date)}</p>}
                </div>
              </div>

              {/* Client Info & Metadata */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl text-xs">
                <div>
                  <p className="font-bold text-slate-400 uppercase mb-1">{ar ? 'مستلم الفاتورة' : 'Bill To'}</p>
                  <p className="text-sm font-black text-slate-800">{viewingInvoice.customer_name || '—'}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase mb-1">{ar ? 'طريقة الدفع' : 'Payment details'}</p>
                  <p className="text-sm font-black text-slate-800">{viewingInvoice.payment_method || 'Cash'}</p>
                </div>
              </div>

              {/* Sold Items Table */}
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-3 text-right">{ar ? 'البند / الصنف' : 'Item Description'}</th>
                    <th className="pb-3 text-center">{ar ? 'الكمية' : 'Qty'}</th>
                    <th className="pb-3 text-center">{ar ? 'سعر الوحدة' : 'Price'}</th>
                    <th className="pb-3 text-center">{ar ? 'الخصم %' : 'Disc %'}</th>
                    <th className="pb-3 text-left">{ar ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const parsedItems = typeof viewingInvoice.items === 'string' ? JSON.parse(viewingInvoice.items) : (viewingInvoice.items || []);
                    if (parsedItems.length > 0) {
                      return parsedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 font-bold text-slate-800">{item.name}</td>
                          <td className="py-3 text-center font-bold text-slate-600">{item.qty}</td>
                          <td className="py-3 text-center font-bold text-slate-600">{fmt(item.price)}</td>
                          <td className="py-3 text-center text-rose-500 font-bold">{item.discount_pct || 0}%</td>
                          <td className="py-3 text-left font-black text-slate-800">
                            {fmt(item.qty * item.price * (1 - (item.discount_pct || 0) / 100))}
                          </td>
                        </tr>
                      ));
                    } else {
                      // Fallback: use notes as description
                      const val = parseFloat(viewingInvoice.total_amount) || 0;
                      return (
                        <tr>
                          <td className="py-3 font-bold text-slate-800">{viewingInvoice.notes || (ar ? 'صنف افتراضي' : 'Line Item')}</td>
                          <td className="py-3 text-center font-bold text-slate-600">1</td>
                          <td className="py-3 text-center font-bold text-slate-600">{fmt(val)}</td>
                          <td className="py-3 text-center text-rose-500 font-bold">0%</td>
                          <td className="py-3 text-left font-black text-slate-800">{fmt(val)}</td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>

              {/* Totals & Summary */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-start">
                <div className="text-slate-400 text-[10px] max-w-sm">
                  {viewingInvoice.notes && <p className="font-bold mb-1">{ar ? 'ملاحظات:' : 'Notes:'}</p>}
                  <p>{viewingInvoice.notes || ''}</p>
                </div>
                <div className="w-72 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">{ar ? 'الخصم الإجمالي:' : 'Discount Total:'}</span>
                    <span className="font-bold text-slate-700">-{fmt(viewingInvoice.discount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">{ar ? 'الضريبة:' : 'Tax:'}</span>
                    <span className="font-bold text-slate-700">+{fmt(viewingInvoice.tax_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-sm">
                    <span className="font-black text-slate-900">{ar ? 'الإجمالي المطلوب:' : 'Total Amount:'}</span>
                    <span className="font-black text-slate-900">{fmt(viewingInvoice.total_amount)} {defaultCurrency || 'EGP'}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <span className="font-bold">{ar ? 'المبلغ المسدد:' : 'Amount Paid:'}</span>
                    <span className="font-black">{fmt(viewingInvoice.status === 'مدفوعة' ? viewingInvoice.total_amount : (viewingInvoice.amount_paid || 0))}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-100">
                    <span className="font-bold">{ar ? 'المبلغ المتبقي:' : 'Remaining Balance:'}</span>
                    <span className="font-black">{fmt(viewingInvoice.status === 'مدفوعة' ? 0 : (viewingInvoice.total_amount - (viewingInvoice.amount_paid || 0)))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="outline" onClick={() => exportInvoiceCSV(viewingInvoice)}>
                📊 {ar ? 'تصدير إلى Excel' : 'Export to CSV'}
              </Btn>
              <Btn variant="primary" onClick={() => {
                const printContents = document.getElementById('printable-invoice').innerHTML;
                const originalContents = document.body.innerHTML;
                document.body.innerHTML = printContents;
                window.print();
                document.body.innerHTML = originalContents;
                window.location.reload();
              }}>
                🖨️ {ar ? 'طباعة الفاتورة' : 'Print Invoice'}
              </Btn>
              <Btn variant="ghost" onClick={() => setViewingInvoice(null)}>{ar ? 'إغلاق' : 'Close'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CUSTOMER LEDGER TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CustomerLedgerTab({ clients, language, defaultCurrency }) {
  const ar = language === 'ar';
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function loadLedger() {
      setLoading(true);
      try {
        const [customersRes, invoicesRes] = await Promise.all([
          api.get('/table/customers?limit=500'),
          api.get('/sales/invoices')
        ]);
        const customers = customersRes.data.data || [];
        const invoices = invoicesRes.data.data || [];

        const data = customers.map(cust => {
          const custInvoices = invoices.filter(inv => inv.customer_id === cust.id);
          const totalPurchases = custInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
          const totalPaid = custInvoices.reduce((sum, inv) => {
            const paid = inv.status === 'مدفوعة' ? (parseFloat(inv.total_amount) || 0) : (parseFloat(inv.amount_paid) || 0);
            return sum + paid;
          }, 0);
          const remainingBalance = totalPurchases - totalPaid;

          return {
            ...cust,
            invoices: custInvoices,
            totalPurchases,
            totalPaid,
            remainingBalance
          };
        });
        setLedger(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadLedger();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="text-lg font-black text-slate-800">👥 {ar ? 'سجل العملاء المالي' : 'Customer Financial Ledger'}</div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {[
                ar ? 'العميل' : 'Customer',
                ar ? 'التصنيف' : 'Type',
                ar ? 'إجمالي المشتريات' : 'Total Purchases',
                ar ? 'إجمالي المسدد' : 'Total Paid',
                ar ? 'المتبقي عليهم' : 'Remaining Balance',
                ar ? 'رصيد المحفظة' : 'Wallet Balance'
              ].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {ledger.map(cust => {
              const isExpanded = expandedId === cust.id;
              return (
                <React.Fragment key={cust.id}>
                  <tr 
                    className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : cust.id)}
                  >
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <span className="inline-block mr-1 text-slate-400">{isExpanded ? '▼' : '▶'}</span> {cust.name}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{cust.customer_type || '—'}</td>
                    <td className="px-4 py-3 font-black text-slate-800">{fmt(cust.totalPurchases)} {defaultCurrency || 'EGP'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">{fmt(cust.totalPaid)}</td>
                    <td className="px-4 py-3 font-bold text-rose-700">{fmt(cust.remainingBalance)}</td>
                    <td className="px-4 py-3 text-indigo-700 font-bold">{fmt(cust.credit_balance)}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="bg-slate-50/60 p-4 border-b border-slate-100">
                        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-inner">
                          <p className="text-xs font-black text-indigo-600 mb-3">{ar ? 'كشف فواتير العميل التفصيلي:' : 'Detailed Customer Invoices:'}</p>
                          {cust.invoices.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">{ar ? 'لا توجد فواتير مسجلة لهذا العميل' : 'No invoices for this customer'}</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                                  <th className="py-2 text-right">{ar ? 'رقم الفاتورة' : 'Inv#'}</th>
                                  <th className="py-2 text-right">{ar ? 'التاريخ' : 'Date'}</th>
                                  <th className="py-2 text-right">{ar ? 'الإجمالي' : 'Total'}</th>
                                  <th className="py-2 text-right">{ar ? 'المسدد' : 'Paid'}</th>
                                  <th className="py-2 text-right">{ar ? 'المتبقي' : 'Remaining'}</th>
                                  <th className="py-2 text-right">{ar ? 'طريقة الدفع' : 'Payment'}</th>
                                  <th className="py-2 text-right">{ar ? 'الحالة' : 'Status'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cust.invoices.map(inv => {
                                  const paidVal = inv.status === 'مدفوعة' ? inv.total_amount : (inv.amount_paid || 0);
                                  const remainingVal = inv.total_amount - paidVal;
                                  return (
                                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                                      <td className="py-2 font-black text-indigo-600">{inv.invoice_number}</td>
                                      <td className="py-2 text-slate-500">{fmtDate(inv.created_at)}</td>
                                      <td className="py-2 font-bold">{fmt(inv.total_amount)} {defaultCurrency || 'EGP'}</td>
                                      <td className="py-2 text-emerald-700 font-bold">{fmt(paidVal)}</td>
                                      <td className="py-2 text-rose-700 font-bold">{fmt(remainingVal)}</td>
                                      <td className="py-2 text-slate-500">{inv.payment_method || 'Cash'}</td>
                                      <td className="py-2"><Badge color={inv.status === 'مدفوعة' ? 'green' : 'amber'}>{inv.status}</Badge></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. OFFERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OffersTab({ language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', discount_type: 'نسبة', discount_value: 0, min_purchase: 0, start_date: '', end_date: '', status: 'نشط', description: '' });
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/sales/offers'); setItems(data.data || []); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => { try { await api.post('/sales/offers', form); setModal(false); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); } };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-black text-slate-800">🎁 {ar ? 'العروض الترويجية' : 'Promotional Offers'}</div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'عرض جديد' : 'New Offer'}</Btn>
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-full" />
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-black text-slate-900">{item.name}</h4>
                <Badge color={item.status === 'نشط' ? 'green' : 'slate'}>{item.status}</Badge>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 mb-3 text-center">
                <p className="text-3xl font-black text-amber-600">{item.discount_value}{item.discount_type === 'نسبة' ? '%' : ' EGP'}</p>
                <p className="text-xs text-amber-700 font-medium">{ar ? 'خصم' : 'Discount'}</p>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                {item.min_purchase > 0 && <p>🛒 {ar ? 'حد أدنى:' : 'Min:'} {fmt(item.min_purchase)} EGP</p>}
                <p>📅 {fmtDate(item.start_date)} → {fmtDate(item.end_date)}</p>
                {item.description && <p className="text-slate-400">{item.description}</p>}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-3 text-center py-16 text-slate-400"><div className="text-5xl mb-3">🎁</div><p>{ar ? 'لا توجد عروض' : 'No offers'}</p></div>}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'عرض ترويجي جديد' : 'New Offer'}>
        <div className="space-y-3">
          <Input label={ar ? 'اسم العرض' : 'Offer Name'} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-3 gap-2">
            <Select label={ar ? 'نوع الخصم' : 'Type'} value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}><option value="نسبة">نسبة %</option><option value="مبلغ">مبلغ ثابت</option></Select>
            <Input label={ar ? 'القيمة' : 'Value'} type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: +e.target.value }))} />
            <Input label={ar ? 'حد أدنى' : 'Min Buy'} type="number" value={form.min_purchase} onChange={e => setForm(f => ({ ...f, min_purchase: +e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'البداية' : 'Start'} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label={ar ? 'النهاية' : 'End'} type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <Textarea label={ar ? 'الوصف' : 'Description'} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn><Btn variant="success" onClick={save}>{ar ? 'حفظ' : 'Save'}</Btn></div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PRICE LISTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function PriceListsTab({ language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', product_name: '', base_price: 0, selling_price: 0, category: '', effective_date: '', notes: '' });
  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/sales/price-lists'); setItems(data.data || []); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => { try { await api.post('/sales/price-lists', form); setModal(false); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); } };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-lg font-black text-slate-800">📋 {ar ? 'قوائم الأسعار' : 'Price Lists'}</div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'سعر جديد' : 'New Price'}</Btn>
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar ? 'القائمة' : 'List', ar ? 'المنتج' : 'Product', ar ? 'التصنيف' : 'Category', ar ? 'سعر التكلفة' : 'Base', ar ? 'سعر البيع' : 'Selling', ar ? 'الهامش' : 'Margin'].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => {
                const margin = item.selling_price > 0 ? ((item.selling_price - item.base_price) / item.selling_price * 100) : 0;
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-700">{item.product_name || '—'}</td>
                    <td className="px-4 py-3"><Badge color="blue">{item.category || '—'}</Badge></td>
                    <td className="px-4 py-3 text-slate-500">{fmt(item.base_price)}</td>
                    <td className="px-4 py-3 font-black text-emerald-700">{fmt(item.selling_price)}</td>
                    <td className="px-4 py-3"><Badge color={margin > 20 ? 'green' : margin > 0 ? 'amber' : 'rose'}>{margin.toFixed(1)}%</Badge></td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">{ar ? 'لا توجد أسعار' : 'No price lists'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'سعر جديد' : 'New Price Entry'}>
        <div className="space-y-3">
          <Input label={ar ? 'اسم القائمة' : 'List Name'} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label={ar ? 'المنتج' : 'Product'} value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} />
          <Input label={ar ? 'التصنيف' : 'Category'} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'سعر التكلفة' : 'Base Price'} type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: +e.target.value }))} />
            <Input label={ar ? 'سعر البيع' : 'Selling Price'} type="number" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: +e.target.value }))} />
          </div>
          <Input label={ar ? 'التاريخ الفعّال' : 'Effective Date'} type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn><Btn variant="success" onClick={save}>{ar ? 'حفظ' : 'Save'}</Btn></div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. COMMISSIONS & TARGETS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CommissionsTab({ staff = [], language }) {
  const ar = language === 'ar';
  const [subTab, setSubTab] = useState('commissions'); // 'commissions' or 'targets'
  const [targets, setTargets] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ agent_name: '', target_amount: 0, achieved_amount: 0, commission_rate: 0, period: '' });
  const [payingId, setPayingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.get('/sales/targets'),
        api.get('/sales/commissions')
      ]);
      setTargets(tRes.data.data || []);
      setCommissions(cRes.data.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveTarget = async () => {
    try {
      await api.post('/sales/targets', form);
      setModal(false);
      setForm({ agent_name: '', target_amount: 0, achieved_amount: 0, commission_rate: 0, period: '' });
      load();
    } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const payout = async (id) => {
    setPayingId(id);
    try {
      await api.post(`/sales/commissions/${id}/payout`);
      alert(ar ? 'تم تأكيد صرف العمولة بنجاح!' : 'Commission payout confirmed!');
      load();
    } catch (e) {
      alert(e?.response?.data?.error || 'خطأ');
    } finally {
      setPayingId(null);
    }
  };

  const totalCommission = targets.reduce((a, t) => a + ((t.achieved_amount / Math.max(t.target_amount, 1)) * t.commission_rate * t.achieved_amount / 100), 0);
  const unpaidCommissionsSum = commissions.filter(c => c.payout_status !== 'Paid').reduce((a, c) => a + (parseFloat(c.commission_earned) || 0), 0);
  const paidCommissionsSum = commissions.filter(c => c.payout_status === 'Paid').reduce((a, c) => a + (parseFloat(c.commission_earned) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي مندوبي الأهداف' : 'Target Agents', value: targets.length, icon: '👥', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
          { label: ar ? 'عمولات مستحقة (غير مدفوعة)' : 'Unpaid Commissions', value: fmt(unpaidCommissionsSum) + ' EGP', icon: '⏳', color: 'bg-amber-50 text-amber-700 border-amber-100' },
          { label: ar ? 'عمولات مدفوعة' : 'Paid Commissions', value: fmt(paidCommissionsSum) + ' EGP', icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: ar ? 'تقدير عمولات المستهدفات' : 'Est. Target Commissions', value: fmt(totalCommission) + ' EGP', icon: '💎', color: 'bg-slate-50 text-slate-700 border-slate-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sub tabs selector */}
      <div className="flex justify-between items-center bg-slate-100/80 p-1 rounded-xl w-fit">
        <button onClick={() => setSubTab('commissions')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${subTab === 'commissions' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
          💼 {ar ? 'سجل عمولات المبيعات' : 'Commissions Ledger'}
        </button>
        <button onClick={() => setSubTab('targets')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${subTab === 'targets' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
          🎯 {ar ? 'مستهدفات المندوبين (Targets)' : 'Sales Targets'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : subTab === 'commissions' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  ar ? 'المرجع' : 'Ref No',
                  ar ? 'المندوب / موظف المبيعات' : 'Salesperson',
                  ar ? 'مبلغ المبيعات' : 'Sales Amount',
                  ar ? 'العمولة المستحقة' : 'Commission',
                  ar ? 'نوع المبيعات' : 'Type',
                  ar ? 'حالة الصرف' : 'Payout Status',
                  ar ? 'التاريخ' : 'Date',
                  ar ? 'إجراء' : 'Action'
                ].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {commissions.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                  <td className="px-4 py-3 font-black text-xs text-indigo-600">{c.reference_no || `TX-${c.id}`}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{c.salesperson_name || c.agent_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{fmt(c.sales_amount)} EGP</td>
                  <td className="px-4 py-3 font-black text-emerald-700">{fmt(c.commission_earned)} EGP</td>
                  <td className="px-4 py-3">
                    <Badge color={c.sales_type === 'Real Estate' ? 'amber' : c.sales_type === 'Service' ? 'purple' : 'blue'}>
                      {c.sales_type || 'Inventory'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={c.payout_status === 'Paid' ? 'green' : 'amber'}>
                      {c.payout_status === 'Paid' ? (ar ? 'مدفوعة' : 'Paid') : (ar ? 'غير مدفوعة' : 'Unpaid')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    {c.payout_status !== 'Paid' ? (
                      <Btn size="xs" variant="success" onClick={() => payout(c.id)} disabled={payingId === c.id}>
                        {payingId === c.id ? '⟳' : '💵'} {ar ? 'صرف' : 'Pay Out'}
                      </Btn>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {commissions.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    {ar ? 'لا توجد سجلات عمولات' : 'No commission records'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end"><Btn onClick={() => setModal(true)}>+ {ar ? 'هدف جديد' : 'New Target'}</Btn></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {targets.map(t => {
              const pct = t.target_amount > 0 ? Math.min(Math.round((t.achieved_amount / t.target_amount) * 100), 100) : 0;
              const est = Math.round((t.achieved_amount * t.commission_rate) / 100);
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm">{t.agent_name?.[0] || '?'}</div>
                      <div><p className="font-black text-slate-900">{t.agent_name}</p><p className="text-xs text-slate-400">{t.period || '—'}</p></div>
                    </div>
                    <Badge color={pct >= 100 ? 'green' : pct >= 50 ? 'amber' : 'rose'}>{pct}%</Badge>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-3">
                    <div><p className="text-xs text-slate-400">{ar ? 'محقق' : 'Achieved'}</p><p className="font-black text-sm text-slate-800">{fmt(t.achieved_amount)}</p></div>
                    <div><p className="text-xs text-slate-400">{ar ? 'الهدف' : 'Target'}</p><p className="font-black text-sm text-slate-800">{fmt(t.target_amount)}</p></div>
                    <div><p className="text-xs text-slate-400">{ar ? 'العمولة' : 'Commission'}</p><p className="font-black text-sm text-indigo-700">{fmt(est)} EGP</p></div>
                  </div>
                </div>
              );
            })}
            {targets.length === 0 && <div className="col-span-3 text-center py-16 text-slate-400"><div className="text-5xl mb-3">🎯</div><p>{ar ? 'لا توجد أهداف' : 'No targets defined'}</p></div>}
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'هدف مبيعات جديد' : 'New Sales Target'}>
        <div className="space-y-3">
          <Select label={ar ? 'الموظف / المندوب' : 'Agent Name'} value={form.agent_name} onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))}>
            <option value="">-- {ar ? 'اختر الموظف' : 'Select staff'} --</option>
            {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-2">
            <Input label={ar ? 'الهدف' : 'Target'} type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: +e.target.value }))} />
            <Input label={ar ? 'المحقق' : 'Achieved'} type="number" value={form.achieved_amount} onChange={e => setForm(f => ({ ...f, achieved_amount: +e.target.value }))} />
            <Input label={ar ? 'العمولة %' : 'Commission %'} type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: +e.target.value }))} />
          </div>
          <Input label={ar ? 'الفترة' : 'Period'} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder={ar ? 'مثال: مايو 2026' : 'e.g. May 2026'} />
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn><Btn variant="primary" onClick={saveTarget}>{ar ? 'حفظ' : 'Save'}</Btn></div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. INSTALLMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function InstallmentsTab({ clients, language, defaultCurrency, onNewClientClick }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customer_id: '', total_amount: 0, installment_count: 12, monthly_amount: 0, start_date: '', status: 'نشط', notes: '' });
  const [clientSearch, setClientSearch] = useState('');

  const load = useCallback(async () => { setLoading(true); try { const { data } = await api.get('/sales/installments'); setItems(data.data || []); } catch { } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (form.total_amount > 0 && form.installment_count > 0) setForm(f => ({ ...f, monthly_amount: Math.ceil(f.total_amount / f.installment_count) })); }, [form.total_amount, form.installment_count]);
  const save = async () => { try { await api.post('/sales/installments', form); setModal(false); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); } };
  const statusColor = s => ({ 'نشط': 'green', 'مكتمل': 'blue', 'متعثر': 'rose', 'ملغي': 'slate' }[s] || 'slate');

  const filteredClients = clients.filter(c => c.name?.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي الخطط' : 'Total Plans', value: items.length, icon: '📝', color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: ar ? 'نشطة' : 'Active', value: items.filter(i => i.status === 'نشط').length, icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: ar ? 'متعثرة' : 'Defaulted', value: items.filter(i => i.status === 'متعثر').length, icon: '⚠️', color: 'bg-rose-50 text-rose-700 border-rose-100' },
          { label: ar ? 'إجمالي القيمة' : 'Total Value', value: fmt(items.reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0)) + ' ' + (defaultCurrency || 'EGP'), icon: '💰', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-end"><Btn onClick={() => setModal(true)}>+ {ar ? 'خطة تقسيط جديدة' : 'New Plan'}</Btn></div>
      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar ? 'العميل' : 'Client', ar ? 'المبلغ' : 'Total', ar ? 'الأقساط' : 'Count', ar ? 'القسط الشهري' : 'Monthly', ar ? 'البداية' : 'Start', ar ? 'الحالة' : 'Status'].map(h => <th key={h} className="px-4 py-3 text-xs font-black text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 font-black text-indigo-700">{fmt(item.total_amount)} {item.currency || defaultCurrency || 'EGP'}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{item.installment_count}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{fmt(item.monthly_amount)} {item.currency || defaultCurrency || 'EGP'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(item.start_date)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{item.status}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">{ar ? 'لا توجد خطط تقسيط' : 'No installment plans'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'خطة تقسيط جديدة' : 'New Installment Plan'}>
        <div className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{ar ? 'العميل' : 'Client'}</label>
              <div className="flex gap-1">
                <input 
                  value={clientSearch} 
                  onChange={e => setClientSearch(e.target.value)} 
                  placeholder={ar ? '🔍 بحث...' : '🔍 Search...'} 
                  className="w-1/3 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" 
                />
                <select 
                  value={form.customer_id} 
                  onChange={e => {
                    if (e.target.value === 'ADD_NEW_CLIENT') {
                      onNewClientClick(clientSearch);
                    } else {
                      setForm(f => ({ ...f, customer_id: e.target.value }));
                    }
                  }}
                  className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"
                >
                  <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
                  {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {clientSearch.trim() !== '' && !filteredClients.some(c => c.name?.toLowerCase() === clientSearch.toLowerCase()) && (
                    <option value="ADD_NEW_CLIENT">
                      {ar ? `+ إضافة "${clientSearch}" كعميل جديد...` : `+ Add "${clientSearch}" as new client...`}
                    </option>
                  )}
                </select>
              </div>
            </div>
            <Btn type="button" variant="outline" onClick={() => onNewClientClick(clientSearch)} className="px-3.5 py-2.5 h-[42px]">+</Btn>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input label={ar ? 'المبلغ الإجمالي' : 'Total'} type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: +e.target.value }))} />
            <Input label={ar ? 'عدد الأقساط' : 'Installments'} type="number" value={form.installment_count} onChange={e => setForm(f => ({ ...f, installment_count: +e.target.value }))} />
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wide">{ar ? 'القسط الشهري' : 'Monthly'}</label>
              <div className="w-full border border-indigo-200 bg-indigo-50 rounded-xl px-3.5 py-2.5 text-sm font-black text-indigo-700">{fmt(form.monthly_amount)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'تاريخ البداية' : 'Start Date'} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Select label={ar ? 'الحالة' : 'Status'} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {['نشط', 'مكتمل', 'متعثر', 'ملغي'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn><Btn variant="primary" onClick={save}>💳 {ar ? 'حفظ' : 'Save'}</Btn></div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'analytics',      ar: 'لوحة التحكم',        en: 'Analytics',              icon: '📊' },
  { id: 'customerledger', ar: 'سجل العملاء المالي',   en: 'Customer Ledger',        icon: '👥' },
  { id: 'quotations',     ar: 'عروض الأسعار',        en: 'Quotations',             icon: '📄' },
  { id: 'orders',         ar: 'أوامر البيع',          en: 'Sales Orders',           icon: '📦' },
  { id: 'delivery',       ar: 'التسليمات',            en: 'Delivery Notes',         icon: '🚚' },
  { id: 'returns',        ar: 'المردودات',            en: 'Returns',                icon: '↩️' },
  { id: 'invoicing',      ar: 'الفواتير',             en: 'Invoicing',              icon: '🧾' },
  { id: 'offers',         ar: 'العروض',              en: 'Offers',                 icon: '🎁' },
  { id: 'pricelists',     ar: 'قوائم الأسعار',       en: 'Price Lists',            icon: '📋' },
  { id: 'commissions',    ar: 'الأهداف والعمولات',    en: 'Targets',                icon: '🎯' },
  { id: 'installments',   ar: 'التقسيط',             en: 'Installments',           icon: '💳' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SALES PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Sales() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const ar = language === 'ar';
  const [activeTab, setActiveTab] = useState('analytics');
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [prefilledClientName, setPrefilledClientName] = useState('');

  const refreshClients = () => {
    api.get('/table/customers?limit=500').then(r => setClients(r.data.data || [])).catch(() => {});
  };

  const openNewClientModal = (name = '') => {
    setPrefilledClientName(name);
    setNewClientOpen(true);
  };

  useEffect(() => {
    refreshClients();
    api.get('/table/staff?limit=1000').then(r => setStaff(r.data.data || [])).catch(() => {});
  }, []);

  const activeCompany = user?.selectedCompany || localStorage.getItem('active_company') || '';
  const defaultCurrency = activeCompany?.toLowerCase().includes('primemed') ? 'ILS' : 'EGP';

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 space-y-5" dir={ar ? 'rtl' : 'ltr'}>
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/20">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 85%, #818cf8 0%, transparent 55%), radial-gradient(circle at 85% 20%, #f472b6 0%, transparent 50%), radial-gradient(circle at 50% 50%, #0ea5e9 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 opacity-5">
          <svg viewBox="0 0 200 200" className="w-full h-full"><circle cx="100" cy="100" r="80" fill="none" stroke="white" strokeWidth="2" /><circle cx="100" cy="100" r="50" fill="none" stroke="white" strokeWidth="2" /><circle cx="100" cy="100" r="20" fill="none" stroke="white" strokeWidth="2" /></svg>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl backdrop-blur-sm border border-white/10">💹</div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight">{ar ? 'إدارة المبيعات' : 'Sales Management'}</h1>
                <p className="text-xs text-white/50 font-medium">{activeCompany || (ar ? 'كل الشركات' : 'All Companies')}</p>
              </div>
            </div>
            <p className="text-xs text-white/40 mt-1">{ar ? 'نظام ERP احترافي — عروض الأسعار · أوامر البيع · التسليم · المردودات · التحليلات' : 'Enterprise Sales — Quotations · Orders · Delivery · Returns · Analytics'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-bold border border-white/10">
              {ar ? '🌐 متكامل مع: المخازن · العقارات · المحاسبة · CRM' : '🌐 Integrated: Inventory · Real Estate · Finance · CRM'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 overflow-x-auto">
        <div className="flex gap-1 min-w-max sm:min-w-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{ar ? tab.ar : tab.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'analytics'      && <AnalyticsTab      language={language} />}
        {activeTab === 'customerledger' && <CustomerLedgerTab clients={clients} language={language} defaultCurrency={defaultCurrency} />}
        {activeTab === 'quotations'     && <QuotationsTab     clients={clients} language={language} defaultCurrency={defaultCurrency} onNewClientClick={openNewClientModal} />}
        {activeTab === 'orders'         && <OrdersTab         clients={clients} language={language} />}
        {activeTab === 'delivery'       && <DeliveryNotesTab  language={language} />}
        {activeTab === 'returns'        && <SalesReturnsTab   clients={clients} language={language} defaultCurrency={defaultCurrency} onNewClientClick={openNewClientModal} />}
        {activeTab === 'invoicing'      && <InvoicingTab      clients={clients} staff={staff} language={language} defaultCurrency={defaultCurrency} onNewClientClick={openNewClientModal} activeCompany={activeCompany} />}
        {activeTab === 'offers'         && <OffersTab         language={language} />}
        {activeTab === 'pricelists'     && <PriceListsTab     language={language} />}
        {activeTab === 'commissions'    && <CommissionsTab    staff={staff} language={language} />}
        {activeTab === 'installments'   && <InstallmentsTab   clients={clients} language={language} defaultCurrency={defaultCurrency} onNewClientClick={openNewClientModal} />}
      </div>

      <NewCustomerModal open={newClientOpen} onClose={() => setNewClientOpen(false)} onCreated={refreshClients} language={language} prefilledName={prefilledClientName} activeCompany={activeCompany} />
    </div>
  );
}
