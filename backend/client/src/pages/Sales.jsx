import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const fmt = (n) => (parseFloat(n) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const Badge = ({ color, children }) => {
  const m = { green:'bg-emerald-100 text-emerald-700 border-emerald-200', blue:'bg-blue-100 text-blue-700 border-blue-200', amber:'bg-amber-100 text-amber-700 border-amber-200', rose:'bg-rose-100 text-rose-700 border-rose-200', slate:'bg-slate-100 text-slate-600 border-slate-200', purple:'bg-purple-100 text-purple-700 border-purple-200', indigo:'bg-indigo-100 text-indigo-700 border-indigo-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${m[color]||m.slate}`}>{children}</span>;
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
    <select {...props} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all bg-white">{children}</select>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
    <textarea {...props} rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all resize-none" />
  </div>
);

const Btn = ({ children, variant = 'primary', size = 'md', ...props }) => {
  const v = { primary:'bg-slate-900 text-white hover:bg-slate-700 shadow-sm', success:'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm', danger:'bg-rose-600 text-white hover:bg-rose-700 shadow-sm', ghost:'bg-slate-100 text-slate-700 hover:bg-slate-200' };
  const s = { sm:'px-3 py-1.5 text-xs', md:'px-4 py-2 text-sm', lg:'px-5 py-2.5 text-sm' };
  return <button {...props} className={`font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${s[size]}`}>{children}</button>;
};

const TABS = [
  { id: 'invoicing',    ar: 'الفواتير',            en: 'Billing & Invoicing', icon: '🧾' },
  { id: 'pos',          ar: 'نقاط البيع',          en: 'POS',                 icon: '🏪' },
  { id: 'offers',       ar: 'العروض',              en: 'Offers',              icon: '🎁' },
  { id: 'pricelists',   ar: 'قوائم الأسعار',       en: 'Price Lists',         icon: '📋' },
  { id: 'insurance',    ar: 'التأمينات',           en: 'Insurance',           icon: '🛡️' },
  { id: 'commissions',  ar: 'العمولات والأهداف',    en: 'Targets & Commissions', icon: '🎯' },
  { id: 'installments', ar: 'التقسيط',             en: 'Installments',        icon: '💳' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICING TAB
// ═══════════════════════════════════════════════════════════════════════════════
function InvoicingTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ customer_id:'', invoice_number:'', total_amount:0, tax_amount:0, discount:0, due_date:'', status:'مسودة', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/invoices'); setItems(data.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/sales/invoices', form); setModal(false); load(); } catch(e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const statusColor = s => ({ 'مسودة':'slate', 'مرسلة':'blue', 'مدفوعة':'green', 'متأخرة':'rose', 'ملغية':'amber' }[s] || 'slate');
  const filtered = items.filter(i => i.customer_name?.toLowerCase().includes(search.toLowerCase()) || i.invoice_number?.toLowerCase().includes(search.toLowerCase()));

  const totalRevenue = filtered.reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0);
  const totalPaid    = filtered.filter(i => i.status === 'مدفوعة').reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0);
  const totalPending = filtered.filter(i => i.status !== 'مدفوعة' && i.status !== 'ملغية').reduce((a, i) => a + (parseFloat(i.total_amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي الفواتير' : 'Total Invoices', value: filtered.length, icon: '🧾', bg: 'bg-blue-50 text-blue-700' },
          { label: ar ? 'إجمالي الإيرادات' : 'Revenue', value: fmt(totalRevenue) + ' EGP', icon: '💰', bg: 'bg-emerald-50 text-emerald-700' },
          { label: ar ? 'المحصل' : 'Collected', value: fmt(totalPaid) + ' EGP', icon: '✅', bg: 'bg-green-50 text-green-700' },
          { label: ar ? 'معلق' : 'Pending', value: fmt(totalPending) + ' EGP', icon: '⏳', bg: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 p-4 ${s.bg}`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-xs font-bold opacity-70">{s.label}</p>
            <p className="text-lg font-black">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث...' : 'Search...'} className="flex-1 sm:max-w-xs border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
        <Btn onClick={() => setModal(true)}>+ {ar ? 'فاتورة جديدة' : 'New Invoice'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar?'رقم':'#', ar?'العميل':'Client', ar?'المبلغ':'Amount', ar?'الضريبة':'Tax', ar?'الخصم':'Discount', ar?'الاستحقاق':'Due', ar?'الحالة':'Status'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-800 text-xs">{item.invoice_number || `INV-${item.id}`}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 font-bold">{fmt(item.total_amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(item.tax_amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(item.discount)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.due_date?.slice(0,10) || '—'}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{item.status}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">{ar ? 'لا توجد فواتير' : 'No invoices'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'فاتورة جديدة' : 'New Invoice'}>
        <div className="space-y-3">
          <Select label={ar ? 'العميل' : 'Client'} value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))}>
            <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label={ar ? 'رقم الفاتورة' : 'Invoice #'} value={form.invoice_number} onChange={e => setForm(f => ({...f, invoice_number: e.target.value}))} />
          <div className="grid grid-cols-3 gap-2">
            <Input label={ar ? 'المبلغ' : 'Amount'} type="number" value={form.total_amount} onChange={e => setForm(f => ({...f, total_amount: +e.target.value}))} />
            <Input label={ar ? 'الضريبة' : 'Tax'} type="number" value={form.tax_amount} onChange={e => setForm(f => ({...f, tax_amount: +e.target.value}))} />
            <Input label={ar ? 'الخصم' : 'Discount'} type="number" value={form.discount} onChange={e => setForm(f => ({...f, discount: +e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'تاريخ الاستحقاق' : 'Due Date'} type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} />
            <Select label={ar ? 'الحالة' : 'Status'} value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              {['مسودة','مرسلة','مدفوعة','متأخرة','ملغية'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
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
// POS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function POSTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ customer_id:'', payment_method:'نقدي', notes:'' });
  const [productSearch, setProductSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/pos-transactions'); setItems(data.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addToCart = () => { setCart(c => [...c, { name:'', qty:1, price:0 }]); };
  const updateCart = (idx, field, val) => { setCart(c => c.map((item, i) => i === idx ? {...item, [field]: val} : item)); };
  const removeCart = (idx) => { setCart(c => c.filter((_, i) => i !== idx)); };
  const cartTotal = cart.reduce((a, c) => a + (c.qty * c.price), 0);

  const save = async () => {
    try {
      await api.post('/sales/pos-transactions', { ...form, items: cart, total_amount: cartTotal });
      setModal(false); setCart([]); load();
    } catch(e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="text-lg font-black text-slate-800">🏪 {ar ? 'نقطة البيع' : 'Point of Sale'}</div>
        <Btn onClick={() => { setModal(true); setCart([{ name:'', qty:1, price:0 }]); }}>+ {ar ? 'عملية بيع جديدة' : 'New Sale'}</Btn>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: ar ? 'عمليات اليوم' : "Today's Sales", value: items.filter(i => i.created_at?.slice(0,10) === new Date().toISOString().slice(0,10)).length, icon: '📊', bg: 'bg-blue-50 text-blue-700' },
          { label: ar ? 'إيرادات اليوم' : "Today's Revenue", value: fmt(items.filter(i => i.created_at?.slice(0,10) === new Date().toISOString().slice(0,10)).reduce((a,i) => a+(parseFloat(i.total_amount)||0),0)) + ' EGP', icon: '💵', bg: 'bg-emerald-50 text-emerald-700' },
          { label: ar ? 'إجمالي العمليات' : 'Total Txns', value: items.length, icon: '🧾', bg: 'bg-slate-50 text-slate-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 p-4 ${s.bg}`}>
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
              <tr>{[ar?'الرقم':'#', ar?'العميل':'Client', ar?'المبلغ':'Amount', ar?'الدفع':'Payment', ar?'التاريخ':'Date'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.slice(0,50).map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 text-xs">POS-{item.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || (ar ? 'عميل عابر' : 'Walk-in')}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{fmt(item.total_amount)} EGP</td>
                  <td className="px-4 py-3"><Badge color="blue">{item.payment_method}</Badge></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.created_at ? new Date(item.created_at).toLocaleString('ar-EG') : '—'}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">{ar ? 'لا توجد عمليات' : 'No transactions'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'عملية بيع جديدة' : 'New POS Sale'} maxW="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label={ar ? 'العميل (اختياري)' : 'Client (Optional)'} value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))}>
              <option value="">{ar ? 'عميل عابر' : 'Walk-in Customer'}</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label={ar ? 'طريقة الدفع' : 'Payment Method'} value={form.payment_method} onChange={e => setForm(f => ({...f, payment_method: e.target.value}))}>
              {['نقدي','بطاقة','تحويل بنكي','آجل'].map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600">{ar ? 'الأصناف' : 'Items'}</label>
              <button onClick={addToCart} className="text-xs text-blue-600 font-bold hover:underline">+ {ar ? 'إضافة صنف' : 'Add Item'}</button>
            </div>
            {cart.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1"><Input label={ar ? 'الصنف' : 'Item'} value={item.name} onChange={e => updateCart(idx, 'name', e.target.value)} /></div>
                <div className="w-20"><Input label={ar ? 'الكمية' : 'Qty'} type="number" value={item.qty} onChange={e => updateCart(idx, 'qty', +e.target.value)} /></div>
                <div className="w-28"><Input label={ar ? 'السعر' : 'Price'} type="number" value={item.price} onChange={e => updateCart(idx, 'price', +e.target.value)} /></div>
                <button onClick={() => removeCart(idx)} className="w-8 h-10 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg text-lg">×</button>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
            <span className="font-bold">{ar ? 'الإجمالي' : 'Total'}</span>
            <span className="text-2xl font-black">{fmt(cartTotal)} EGP</span>
          </div>

          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>{ar ? 'إلغاء' : 'Cancel'}</Btn>
            <Btn variant="success" onClick={save}>💳 {ar ? 'إتمام البيع' : 'Complete Sale'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OffersTab({ language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:'', discount_type:'نسبة', discount_value:0, min_purchase:0, start_date:'', end_date:'', status:'نشط', description:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/offers'); setItems(data.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/sales/offers', form); setModal(false); load(); } catch(e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="text-lg font-black text-slate-800">🎁 {ar ? 'العروض الترويجية' : 'Promotional Offers'}</div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'عرض جديد' : 'New Offer'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-bl-full" />
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-bold text-slate-900">{item.name}</h4>
                <Badge color={item.status === 'نشط' ? 'green' : 'slate'}>{item.status}</Badge>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 mb-3 text-center">
                <p className="text-2xl font-black text-amber-600">{item.discount_value}{item.discount_type === 'نسبة' ? '%' : ' EGP'}</p>
                <p className="text-xs text-amber-700 font-medium">{ar ? 'خصم' : 'Discount'}</p>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                {item.min_purchase > 0 && <p>🛒 {ar ? 'حد أدنى:' : 'Min Purchase:'} {fmt(item.min_purchase)} EGP</p>}
                <p>📅 {item.start_date?.slice(0,10) || '—'} → {item.end_date?.slice(0,10) || '—'}</p>
                {item.description && <p className="text-slate-400 mt-1">{item.description}</p>}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-3 text-center py-12 text-slate-400"><div className="text-4xl mb-2">🎁</div><p>{ar ? 'لا توجد عروض' : 'No offers'}</p></div>}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'عرض جديد' : 'New Offer'}>
        <div className="space-y-3">
          <Input label={ar ? 'اسم العرض' : 'Offer Name'} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          <div className="grid grid-cols-3 gap-2">
            <Select label={ar ? 'نوع الخصم' : 'Discount Type'} value={form.discount_type} onChange={e => setForm(f => ({...f, discount_type: e.target.value}))}>
              <option value="نسبة">{ar ? 'نسبة %' : 'Percentage %'}</option>
              <option value="مبلغ">{ar ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
            </Select>
            <Input label={ar ? 'القيمة' : 'Value'} type="number" value={form.discount_value} onChange={e => setForm(f => ({...f, discount_value: +e.target.value}))} />
            <Input label={ar ? 'حد أدنى' : 'Min Purchase'} type="number" value={form.min_purchase} onChange={e => setForm(f => ({...f, min_purchase: +e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'البداية' : 'Start'} type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
            <Input label={ar ? 'النهاية' : 'End'} type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
          </div>
          <Textarea label={ar ? 'الوصف' : 'Description'} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
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
// PRICE LISTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function PriceListsTab({ language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:'', product_name:'', base_price:0, selling_price:0, category:'', effective_date:'', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/price-lists'); setItems(data.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/sales/price-lists', form); setModal(false); load(); } catch(e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="text-lg font-black text-slate-800">📋 {ar ? 'قوائم الأسعار' : 'Price Lists'}</div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'سعر جديد' : 'New Price'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar?'القائمة':'List', ar?'المنتج':'Product', ar?'التصنيف':'Category', ar?'سعر التكلفة':'Base', ar?'سعر البيع':'Selling', ar?'الهامش':'Margin'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 text-right">{h}</th>)}</tr>
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
                    <td className="px-4 py-3 font-bold text-emerald-700">{fmt(item.selling_price)}</td>
                    <td className="px-4 py-3"><Badge color={margin > 20 ? 'green' : margin > 0 ? 'amber' : 'rose'}>{margin.toFixed(1)}%</Badge></td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">{ar ? 'لا توجد أسعار' : 'No prices'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'سعر جديد' : 'New Price Entry'}>
        <div className="space-y-3">
          <Input label={ar ? 'اسم القائمة' : 'List Name'} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          <Input label={ar ? 'المنتج' : 'Product'} value={form.product_name} onChange={e => setForm(f => ({...f, product_name: e.target.value}))} />
          <Input label={ar ? 'التصنيف' : 'Category'} value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'سعر التكلفة' : 'Base Price'} type="number" value={form.base_price} onChange={e => setForm(f => ({...f, base_price: +e.target.value}))} />
            <Input label={ar ? 'سعر البيع' : 'Selling Price'} type="number" value={form.selling_price} onChange={e => setForm(f => ({...f, selling_price: +e.target.value}))} />
          </div>
          <Input label={ar ? 'التاريخ الفعال' : 'Effective Date'} type="date" value={form.effective_date} onChange={e => setForm(f => ({...f, effective_date: e.target.value}))} />
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
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
// INSURANCE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function InsuranceTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customer_id:'', provider:'', policy_number:'', coverage_amount:0, premium:0, start_date:'', end_date:'', status:'نشط', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/insurance'); setItems(data.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/sales/insurance', form); setModal(false); load(); } catch(e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  const statusColor = s => ({ 'نشط':'green', 'منتهي':'rose', 'معلق':'amber' }[s] || 'slate');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="text-lg font-black text-slate-800">🛡️ {ar ? 'إدارة التأمينات' : 'Insurance Management'}</div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'وثيقة جديدة' : 'New Policy'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{[ar?'العميل':'Client', ar?'المزود':'Provider', ar?'رقم الوثيقة':'Policy#', ar?'التغطية':'Coverage', ar?'القسط':'Premium', ar?'الانتهاء':'Expires', ar?'الحالة':'Status'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.provider}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.policy_number}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{fmt(item.coverage_amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(item.premium)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.end_date?.slice(0,10) || '—'}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{item.status}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">{ar ? 'لا توجد وثائق' : 'No policies'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'وثيقة تأمين جديدة' : 'New Insurance Policy'}>
        <div className="space-y-3">
          <Select label={ar ? 'العميل' : 'Client'} value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))}>
            <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'المزود' : 'Provider'} value={form.provider} onChange={e => setForm(f => ({...f, provider: e.target.value}))} />
            <Input label={ar ? 'رقم الوثيقة' : 'Policy #'} value={form.policy_number} onChange={e => setForm(f => ({...f, policy_number: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'مبلغ التغطية' : 'Coverage'} type="number" value={form.coverage_amount} onChange={e => setForm(f => ({...f, coverage_amount: +e.target.value}))} />
            <Input label={ar ? 'القسط' : 'Premium'} type="number" value={form.premium} onChange={e => setForm(f => ({...f, premium: +e.target.value}))} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input label={ar ? 'البداية' : 'Start'} type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
            <Input label={ar ? 'النهاية' : 'End'} type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
            <Select label={ar ? 'الحالة' : 'Status'} value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              {['نشط','منتهي','معلق'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
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
// COMMISSIONS & TARGETS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function CommissionsTab({ language }) {
  const ar = language === 'ar';
  const [targets, setTargets] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ agent_name:'', target_amount:0, achieved_amount:0, commission_rate:0, period:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([api.get('/sales/targets'), api.get('/sales/commissions')]);
      setTargets(t.data.data || []);
      setCommissions(c.data.data || []);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/sales/targets', form); setModal(false); load(); } catch(e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="text-lg font-black text-slate-800">🎯 {ar ? 'الأهداف والعمولات' : 'Targets & Commissions'}</div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'هدف جديد' : 'New Target'}</Btn>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {targets.map(t => {
            const pct = t.target_amount > 0 ? Math.min((t.achieved_amount / t.target_amount) * 100, 100) : 0;
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{t.agent_name}</p>
                    <p className="text-xs text-slate-400">{t.period || '—'}</p>
                  </div>
                  <Badge color={pct >= 100 ? 'green' : pct >= 50 ? 'amber' : 'rose'}>{pct.toFixed(0)}%</Badge>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{ar ? 'محقق:' : 'Achieved:'} {fmt(t.achieved_amount)}</span>
                  <span>{ar ? 'هدف:' : 'Target:'} {fmt(t.target_amount)}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">{ar ? 'نسبة العمولة:' : 'Commission Rate:'} {t.commission_rate}%</div>
              </div>
            );
          })}
          {targets.length === 0 && <div className="col-span-3 text-center py-12 text-slate-400"><div className="text-4xl mb-2">🎯</div><p>{ar ? 'لا توجد أهداف' : 'No targets'}</p></div>}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'هدف مبيعات جديد' : 'New Sales Target'}>
        <div className="space-y-3">
          <Input label={ar ? 'اسم الموظف/الوكيل' : 'Agent Name'} value={form.agent_name} onChange={e => setForm(f => ({...f, agent_name: e.target.value}))} />
          <div className="grid grid-cols-3 gap-2">
            <Input label={ar ? 'الهدف' : 'Target'} type="number" value={form.target_amount} onChange={e => setForm(f => ({...f, target_amount: +e.target.value}))} />
            <Input label={ar ? 'المحقق' : 'Achieved'} type="number" value={form.achieved_amount} onChange={e => setForm(f => ({...f, achieved_amount: +e.target.value}))} />
            <Input label={ar ? 'نسبة العمولة %' : 'Commission %'} type="number" value={form.commission_rate} onChange={e => setForm(f => ({...f, commission_rate: +e.target.value}))} />
          </div>
          <Input label={ar ? 'الفترة' : 'Period'} value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))} placeholder={ar ? 'مثال: يناير 2026' : 'e.g. January 2026'} />
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
// INSTALLMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function InstallmentsTab({ clients, language }) {
  const ar = language === 'ar';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ customer_id:'', total_amount:0, installment_count:12, monthly_amount:0, start_date:'', status:'نشط', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/sales/installments'); setItems(data.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try { await api.post('/sales/installments', form); setModal(false); load(); } catch(e) { alert(e?.response?.data?.error || 'خطأ'); }
  };

  useEffect(() => {
    if (form.total_amount > 0 && form.installment_count > 0) {
      setForm(f => ({ ...f, monthly_amount: Math.ceil(f.total_amount / f.installment_count) }));
    }
  }, [form.total_amount, form.installment_count]);

  const statusColor = s => ({ 'نشط':'green', 'مكتمل':'blue', 'متعثر':'rose', 'ملغي':'slate' }[s] || 'slate');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="text-lg font-black text-slate-800">💳 {ar ? 'خطط التقسيط' : 'Installment Plans'}</div>
        <Btn onClick={() => setModal(true)}>+ {ar ? 'خطة جديدة' : 'New Plan'}</Btn>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ar ? 'إجمالي الخطط' : 'Total Plans', value: items.length, icon: '📝', bg: 'bg-blue-50 text-blue-700' },
          { label: ar ? 'نشطة' : 'Active', value: items.filter(i => i.status === 'نشط').length, icon: '✅', bg: 'bg-emerald-50 text-emerald-700' },
          { label: ar ? 'متعثرة' : 'Defaulted', value: items.filter(i => i.status === 'متعثر').length, icon: '⚠️', bg: 'bg-rose-50 text-rose-700' },
          { label: ar ? 'إجمالي المبالغ' : 'Total Value', value: fmt(items.reduce((a,i) => a + (parseFloat(i.total_amount)||0),0)) + ' EGP', icon: '💰', bg: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-slate-100 p-4 ${s.bg}`}>
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
              <tr>{[ar?'العميل':'Client', ar?'المبلغ':'Total', ar?'الأقساط':'Installments', ar?'القسط الشهري':'Monthly', ar?'البداية':'Start', ar?'الحالة':'Status'].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 text-right">{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{item.customer_name || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{fmt(item.total_amount)} EGP</td>
                  <td className="px-4 py-3 text-slate-600">{item.paid_count || 0} / {item.installment_count}</td>
                  <td className="px-4 py-3 text-emerald-700 font-bold">{fmt(item.monthly_amount)} EGP</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.start_date?.slice(0,10) || '—'}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(item.status)}>{item.status}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">{ar ? 'لا توجد خطط' : 'No plans'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={ar ? 'خطة تقسيط جديدة' : 'New Installment Plan'}>
        <div className="space-y-3">
          <Select label={ar ? 'العميل' : 'Client'} value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))}>
            <option value="">-- {ar ? 'اختر' : 'Select'} --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-2">
            <Input label={ar ? 'المبلغ الإجمالي' : 'Total'} type="number" value={form.total_amount} onChange={e => setForm(f => ({...f, total_amount: +e.target.value}))} />
            <Input label={ar ? 'عدد الأقساط' : 'Count'} type="number" value={form.installment_count} onChange={e => setForm(f => ({...f, installment_count: +e.target.value}))} />
            <Input label={ar ? 'القسط الشهري' : 'Monthly'} type="number" value={form.monthly_amount} readOnly />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={ar ? 'تاريخ البداية' : 'Start Date'} type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
            <Select label={ar ? 'الحالة' : 'Status'} value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              {['نشط','مكتمل','متعثر','ملغي'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Textarea label={ar ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
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
// MAIN SALES PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Sales() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const ar = language === 'ar';
  const [activeTab, setActiveTab] = useState('invoicing');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    api.get('/table/customers?limit=200').then(r => setClients(r.data.data || [])).catch(() => {});
  }, []);

  const activeCompany = user?.selectedCompany || localStorage.getItem('active_company') || '';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-5" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 md:p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #818cf8 0%, transparent 60%), radial-gradient(circle at 80% 30%, #f472b6 0%, transparent 50%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">{ar ? 'إدارة المبيعات' : 'Sales Management'}</h1>
            <p className="text-xs text-white/50 mt-1 font-medium">{activeCompany || (ar ? 'كل الشركات' : 'All Companies')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-sm font-bold border border-white/10">
              💰 {ar ? 'المبيعات' : 'Sales'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200
              ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{ar ? tab.ar : tab.en}</span>
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'invoicing'    && <InvoicingTab    clients={clients} language={language} />}
        {activeTab === 'pos'          && <POSTab          clients={clients} language={language} />}
        {activeTab === 'offers'       && <OffersTab       language={language} />}
        {activeTab === 'pricelists'   && <PriceListsTab   language={language} />}
        {activeTab === 'insurance'    && <InsuranceTab    clients={clients} language={language} />}
        {activeTab === 'commissions'  && <CommissionsTab  language={language} />}
        {activeTab === 'installments' && <InstallmentsTab clients={clients} language={language} />}
      </div>
    </div>
  );
}
