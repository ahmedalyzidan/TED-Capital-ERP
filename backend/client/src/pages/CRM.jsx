import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, cur = '') => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + (cur ? ' ' + cur : '');
};
const today = () => new Date().toISOString().slice(0, 10);
const now    = () => new Date().toISOString().slice(0, 16);

// ── sub-components ────────────────────────────────────────────────────────────
const Badge = ({ color, children }) => {
  const map = {
    green:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue:   'bg-blue-100 text-blue-700 border-blue-200',
    amber:  'bg-amber-100 text-amber-700 border-amber-200',
    rose:   'bg-rose-100 text-rose-700 border-rose-200',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${map[color] || map.slate}`}>
      {children}
    </span>
  );
};

const Modal = ({ open, onClose, title, children, maxW = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors text-lg">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
    <input {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all" />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
    <select {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all bg-white">
      {children}
    </select>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
    <textarea {...props} rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all resize-none" />
  </div>
);

const Btn = ({ children, variant = 'primary', size = 'md', ...props }) => {
  const vMap = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    danger:  'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    ghost:   'bg-slate-100 text-slate-700 hover:bg-slate-200',
  };
  const sMap = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button {...props} className={`font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${vMap[variant]} ${sMap[size]}`}>
      {children}
    </button>
  );
};

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'appointments', ar: 'المواعيد',      en: 'Appointments',    icon: '📅' },
  { id: 'memberships',  ar: 'الاشتراكات',    en: 'Memberships',     icon: '🎫' },
  { id: 'points',       ar: 'النقاط والأرصدة', en: 'Points & Credits', icon: '⭐' },
  { id: 'attendance',   ar: 'حضور العملاء',   en: 'Client Attendance', icon: '✅' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AppointmentsTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form, setForm] = useState({
    customer_id: '', title: '', appointment_date: now(),
    duration_minutes: 60, status: 'مجدول', notes: '', assigned_to: ''
  });

  const [staff, setStaff] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resApp, resStaff] = await Promise.all([
        api.get('/crm/appointments'),
        api.get('/table/staff?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);
      setItems(resApp.data.data || []);
      setStaff(resStaff.data.data || []);
    } catch { /* graceful */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await api.post('/crm/appointments', form);
      setModal(false);
      setForm({ customer_id: '', title: '', appointment_date: now(), duration_minutes: 60, status: 'مجدول', notes: '', assigned_to: '' });
      load();
    } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const statusColor = s => ({ 'مجدول': 'blue', 'مكتمل': 'green', 'ملغي': 'rose', 'غائب': 'amber' }[s] || 'slate');

  const filtered = items.filter(i =>
    (statusFilter === 'ALL' || i.status === statusFilter) &&
    (i.customer_name?.toLowerCase().includes(search.toLowerCase()) || i.title?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'مجدول', 'مكتمل', 'ملغي', 'غائب'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {s === 'ALL' ? (ar ? 'الكل' : 'All') : s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث...' : 'Search...'}
            className="flex-1 sm:w-56 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          <Btn onClick={() => setModal(true)}>+ {ar ? 'موعد جديد' : 'New'}</Btn>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{item.title || '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.customer_name || '—'}</p>
                </div>
                <Badge color={statusColor(item.status)}>{item.status}</Badge>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">📅 <span>{item.appointment_date ? new Date(item.appointment_date).toLocaleString('ar-EG') : '—'}</span></div>
                <div className="flex items-center gap-1.5">⏱️ <span>{item.duration_minutes} {ar ? 'دقيقة' : 'min'}</span></div>
                {item.assigned_to && <div className="flex items-center gap-1.5">👤 <span>{item.assigned_to}</span></div>}
                {item.notes && <p className="text-slate-400 text-[11px] mt-1 line-clamp-2">{item.notes}</p>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm font-medium">{ar ? 'لا توجد مواعيد' : 'No appointments'}</p>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'موعد جديد' : 'New Appointment'}>
        <div className="space-y-3">
          <Select label={ar ? 'العميل' : 'Client'} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
            <option value="">-- {ar ? 'اختر العميل' : 'Select Client'} --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
          </Select>
          <Input label={ar ? 'عنوان الموعد' : 'Title'} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'التاريخ والوقت' : 'Date & Time'} type="datetime-local" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} />
            <Input label={ar ? 'المدة (دقيقة)' : 'Duration (min)'} type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={ar ? 'الحالة' : 'Status'} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {['مجدول', 'مكتمل', 'ملغي', 'غائب'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label={ar ? 'المسؤول' : 'Assigned To'} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">-- {ar ? 'اختر المسؤول' : 'Select Employee'} --</option>
              {staff.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.role ? `(${s.role})` : s.department ? `(${s.department})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={save}>{ar ? 'حفظ' : 'Save'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBERSHIPS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function MembershipsTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems]   = useState([]);
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customer_id: '', plan_id: '', start_date: today(), end_date: '', notes: '' });
  const [planForm, setPlanForm] = useState({ name: '', duration_days: 30, price: 0, sessions_included: 0, description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([api.get('/crm/memberships'), api.get('/crm/membership-plans')]);
      setItems(m.data.data || []);
      setPlans(p.data.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/crm/memberships', form); setModal(false); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };
  const savePlan = async () => {
    try { await api.post('/crm/membership-plans', planForm); setPlanModal(false); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const statusOf = item => {
    const end = item.end_date ? new Date(item.end_date) : null;
    if (!end) return { label: ar ? 'نشط' : 'Active', color: 'green' };
    return end > new Date() ? { label: ar ? 'نشط' : 'Active', color: 'green' } : { label: ar ? 'منتهي' : 'Expired', color: 'rose' };
  };

  const filtered = items.filter(i => i.customer_name?.toLowerCase().includes(search.toLowerCase()) || i.plan_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث بالعميل أو الباقة...' : 'Search...'}
          className="flex-1 sm:max-w-xs border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setPlanModal(true)}>⚙️ {ar ? 'باقات' : 'Plans'}</Btn>
          <Btn onClick={() => setModal(true)}>+ {ar ? 'اشتراك جديد' : 'New'}</Btn>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[ar ? 'العميل' : 'Client', ar ? 'الباقة' : 'Plan', ar ? 'البداية' : 'Start', ar ? 'النهاية' : 'End', ar ? 'الجلسات' : 'Sessions', ar ? 'الحالة' : 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const st = statusOf(item);
                return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.plan_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{item.start_date?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{item.end_date?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.sessions_used || 0} / {item.sessions_included || '∞'}</td>
                    <td className="px-4 py-3"><Badge color={st.color}>{st.label}</Badge></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">{ar ? 'لا توجد اشتراكات' : 'No memberships'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Membership Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'اشتراك جديد' : 'New Membership'}>
        <div className="space-y-3">
          <Select label={ar ? 'العميل' : 'Client'} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
            <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label={ar ? 'الباقة' : 'Plan'} value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}>
            <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)} EGP</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'تاريخ البداية' : 'Start Date'} type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label={ar ? 'تاريخ النهاية' : 'End Date'} type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={save}>{ar ? 'حفظ' : 'Save'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Plans Modal */}
      <Modal open={planModal} onClose={() => setPlanModal(false)} title={ar ? 'إضافة باقة' : 'Add Plan'} maxW="max-w-md">
        <div className="space-y-3">
          <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
            {plans.map(p => (
              <div key={p.id} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-xl text-sm">
                <span className="font-bold text-slate-800">{p.name}</span>
                <span className="text-slate-500">{fmt(p.price)} EGP / {p.duration_days}d</span>
              </div>
            ))}
          </div>
          <Input label={ar ? 'اسم الباقة' : 'Plan Name'} value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-3 gap-2">
            <Input label={ar ? 'السعر' : 'Price'} type="number" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: +e.target.value }))} />
            <Input label={ar ? 'الأيام' : 'Days'} type="number" value={planForm.duration_days} onChange={e => setPlanForm(f => ({ ...f, duration_days: +e.target.value }))} />
            <Input label={ar ? 'الجلسات' : 'Sessions'} type="number" value={planForm.sessions_included} onChange={e => setPlanForm(f => ({ ...f, sessions_included: +e.target.value }))} />
          </div>
          <Textarea label={ar ? 'الوصف' : 'Description'} value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setPlanModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={savePlan}>{ar ? 'إضافة' : 'Add'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POINTS & CREDITS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function PointsTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customer_id: '', points: 0, type: 'إضافة', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/crm/points');
      setItems(data.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/crm/points', form); setModal(false); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const filtered = items.filter(i => i.customer_name?.toLowerCase().includes(search.toLowerCase()));

  // Group by customer for summary cards
  const summaries = Object.values(filtered.reduce((acc, row) => {
    if (!acc[row.customer_id]) acc[row.customer_id] = { customer_id: row.customer_id, customer_name: row.customer_name, balance: 0, txns: 0 };
    const pts = parseFloat(row.points) || 0;
    acc[row.customer_id].balance += row.type === 'إضافة' ? pts : -pts;
    acc[row.customer_id].txns += 1;
    return acc;
  }, {}));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث بالعميل...' : 'Search...'}
          className="flex-1 sm:max-w-xs border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
        <Btn onClick={() => setModal(true)}>+ {ar ? 'حركة نقاط' : 'Add Points'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {summaries.map(s => (
            <div key={s.customer_id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">⭐</div>
                <Badge color={s.balance >= 0 ? 'green' : 'rose'}>{s.balance >= 0 ? ar ? 'رصيد' : 'Balance' : ar ? 'عجز' : 'Deficit'}</Badge>
              </div>
              <p className="font-bold text-slate-900 text-sm mb-0.5">{s.customer_name}</p>
              <p className="text-2xl font-black text-amber-600">{fmt(Math.abs(s.balance))} <span className="text-sm text-slate-400 font-medium">{ar ? 'نقطة' : 'pts'}</span></p>
              <p className="text-xs text-slate-400 mt-1">{s.txns} {ar ? 'حركة' : 'transactions'}</p>
            </div>
          ))}
          {summaries.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">⭐</div>
              <p className="text-sm font-medium">{ar ? 'لا توجد بيانات نقاط' : 'No points data'}</p>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'حركة نقاط' : 'Points Transaction'}>
        <div className="space-y-3">
          <Select label={ar ? 'العميل' : 'Client'} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
            <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label={ar ? 'النوع' : 'Type'} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="إضافة">{ar ? 'إضافة' : 'Add'}</option>
              <option value="خصم">{ar ? 'خصم' : 'Deduct'}</option>
              <option value="استبدال">{ar ? 'استبدال' : 'Redeem'}</option>
            </Select>
            <Input label={ar ? 'النقاط' : 'Points'} type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: +e.target.value }))} />
          </div>
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={save}>{ar ? 'حفظ' : 'Save'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT ATTENDANCE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AttendanceTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [dateFilter, setDateFilter] = useState(today());
  const [form, setForm] = useState({ customer_id: '', check_in: now(), check_out: '', notes: '', visit_type: 'زيارة عادية' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/crm/client-attendance?date=${dateFilter}`);
      setItems(data.data || []);
    } catch { } finally { setLoading(false); }
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/crm/client-attendance', form); setModal(false); load(); } catch (e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const checkout = async (id) => {
    try { await api.patch(`/crm/client-attendance/${id}/checkout`); load(); } catch { }
  };

  const duration = (ci, co) => {
    if (!ci || !co) return '—';
    const diff = (new Date(co) - new Date(ci)) / 60000;
    return `${Math.round(diff)} ${ar ? 'دقيقة' : 'min'}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">{ar ? 'التاريخ:' : 'Date:'}</label>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
        </div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'تسجيل دخول' : 'Check In'}</Btn>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي الزيارات' : 'Total Visits', value: items.length, icon: '🏃', color: 'bg-blue-50 text-blue-700' },
          { label: ar ? 'داخل الآن' : 'Currently In', value: items.filter(i => !i.check_out).length, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
          { label: ar ? 'غادروا' : 'Checked Out', value: items.filter(i => i.check_out).length, icon: '🚪', color: 'bg-slate-50 text-slate-600' },
          { label: ar ? 'متوسط المدة' : 'Avg Duration', value: (() => { const done = items.filter(i => i.check_out); if (!done.length) return '—'; const avg = done.reduce((a, i) => a + (new Date(i.check_out) - new Date(i.check_in)) / 60000, 0) / done.length; return `${Math.round(avg)}m`; })(), icon: '⏱️', color: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 p-4 ${s.color} bg-opacity-50`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[ar ? 'العميل' : 'Client', ar ? 'نوع الزيارة' : 'Type', ar ? 'دخول' : 'Check-In', ar ? 'خروج' : 'Check-Out', ar ? 'المدة' : 'Duration', ar ? 'الحالة' : 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-bold text-slate-500 text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.visit_type || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.check_in ? new Date(item.check_in).toLocaleTimeString('ar-EG') : '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.check_out ? new Date(item.check_out).toLocaleTimeString('ar-EG') : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{duration(item.check_in, item.check_out)}</td>
                  <td className="px-4 py-3"><Badge color={item.check_out ? 'slate' : 'green'}>{item.check_out ? (ar ? 'غادر' : 'Out') : (ar ? 'داخل' : 'In')}</Badge></td>
                  <td className="px-4 py-3">
                    {!item.check_out && (
                      <Btn size="sm" variant="ghost" onClick={() => checkout(item.id)}>{ar ? 'خروج' : 'Check Out'}</Btn>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">{ar ? 'لا توجد زيارات اليوم' : 'No visits today'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'تسجيل دخول عميل' : 'Client Check-In'}>
        <div className="space-y-3">
          <Select label={ar ? 'العميل' : 'Client'} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
            <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label={ar ? 'نوع الزيارة' : 'Visit Type'} value={form.visit_type} onChange={e => setForm(f => ({ ...f, visit_type: e.target.value }))}>
            {['زيارة عادية', 'جلسة اشتراك', 'استشارة', 'متابعة', 'شكوى'].map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label={ar ? 'وقت الدخول' : 'Check-In Time'} type="datetime-local" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} />
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={save}>{ar ? 'تسجيل دخول' : 'Check In'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CRM PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CRM() {
  const { language } = useLanguage();
  const { user }     = useAuth();
  const ar = language === 'ar';

  const [activeTab, setActiveTab] = useState('appointments');
  const [clients, setClients]     = useState([]);

  useEffect(() => {
    api.get('/table/customers?limit=200').then(r => setClients(r.data.data || [])).catch(() => {});
  }, []);

  const activeCompany = user?.selectedCompany || localStorage.getItem('active_company') || '';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-5" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 md:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #4ade80 0%, transparent 60%), radial-gradient(circle at 70% 20%, #60a5fa 0%, transparent 50%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">{ar ? 'إدارة علاقات العملاء' : 'CRM'}</h1>
            <p className="text-xs text-white/50 mt-1 font-medium">{activeCompany || (ar ? 'كل الشركات' : 'All Companies')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-sm font-bold border border-white/10">
              👥 {clients.length} {ar ? 'عميل' : 'clients'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200
              ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <span>{tab.icon}</span>
            <span>{ar ? tab.ar : tab.en}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'appointments' && <AppointmentsTab clients={clients} language={language} />}
        {activeTab === 'memberships'  && <MembershipsTab  clients={clients} language={language} />}
        {activeTab === 'points'       && <PointsTab       clients={clients} language={language} />}
        {activeTab === 'attendance'   && <AttendanceTab   clients={clients} language={language} />}
      </div>
    </div>
  );
}
