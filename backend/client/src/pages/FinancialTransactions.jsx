import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function FinancialTransactions() {
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [activeTab, setActiveTab] = useState('collections'); // 'collections' | 'payments'
  
  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [subInvoices, setSubInvoices] = useState([]);
  
  // History Logs
  const [collectionsLog, setCollectionsLog] = useState([]);
  const [paymentsLog, setPaymentsLog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Collections Form State
  const [colForm, setColForm] = useState({
    client_id: '',
    project_id: '',
    valuation_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'نقداً',
    reference_no: '',
    source_account: 'صندوق نقدية - تيد كابيتال',
    notes: ''
  });

  // Payments Form State
  const [payForm, setPayForm] = useState({
    subcontractor_id: '',
    project_name: '',
    invoice_id: '',
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    reference_no: '',
    source_account: 'نقدية بالبنوك والصندوق',
    notes: ''
  });

  // Alerts
  const [alert, setAlert] = useState({ type: '', msg: '' });

  // Fetch Master Data
  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const [resClients, resSubs, resProjs, resClientInvs, resSubInvs] = await Promise.all([
        api.get('/dynamic/table/customers?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractors?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/projects?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/ar_invoices?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractor_invoices?limit=2000').catch(() => ({ data: { data: [] } }))
      ]);

      setClients(resClients.data?.data || []);
      setSubcontractors(resSubs.data?.data || []);
      setProjects(resProjs.data?.data || []);
      setClientInvoices(resClientInvs.data?.data || []);
      setSubInvoices(resSubInvs.data?.data || []);
    } catch (err) {
      triggerAlert('danger', ar ? 'خطأ في جلب البيانات الأساسية' : 'Error fetching metadata');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const [resCols, resPays] = await Promise.all([
        api.get('/dynamic/table/client_payment_history?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractor_statements?limit=2000').catch(() => ({ data: { data: [] } }))
      ]);
      setCollectionsLog(resCols.data?.data || []);
      setPaymentsLog(resPays.data?.data || []);
    } catch (err) {
      triggerAlert('danger', ar ? 'خطأ في جلب سجل المعاملات' : 'Error fetching transaction logs');
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchLogs();
  }, []);

  const triggerAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: '', msg: '' }), 5000);
  };

  // Handle Collection Submit
  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    if (!colForm.client_id) {
      triggerAlert('warning', ar ? 'يرجى اختيار العميل أولاً' : 'Please select a client');
      return;
    }
    if (!colForm.amount || parseFloat(colForm.amount) <= 0) {
      triggerAlert('warning', ar ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        client_id: parseInt(colForm.client_id) || null,
        project_id: colForm.project_id ? parseInt(colForm.project_id) : null,
        valuation_id: colForm.valuation_id ? parseInt(colForm.valuation_id) : null,
        amount: parseFloat(colForm.amount),
        payment_date: colForm.payment_date,
        payment_method: colForm.payment_method,
        reference_no: colForm.reference_no,
        source_account: colForm.source_account,
        notes: colForm.notes
      };

      await api.post('/projects/record_collection', payload);
      triggerAlert('success', ar ? 'تم تسجيل التحصيل وقيد الدفعة بنجاح' : 'Collection registered successfully');
      setColForm({
        client_id: '',
        project_id: '',
        valuation_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'نقداً',
        reference_no: '',
        source_account: 'صندوق نقدية - تيد كابيتال',
        notes: ''
      });
      fetchLogs();
    } catch (err) {
      triggerAlert('danger', err.response?.data?.error || (ar ? 'فشل تسجيل التحصيل' : 'Failed to record collection'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Payment Submit
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payForm.subcontractor_id) {
      triggerAlert('warning', ar ? 'يرجى اختيار المقاول أولاً' : 'Please select a subcontractor');
      return;
    }
    if (!payForm.amount_paid || parseFloat(payForm.amount_paid) <= 0) {
      triggerAlert('warning', ar ? 'يرجى إدخال مبلغ سداد صحيح' : 'Please enter a valid payment amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        subcontractor_id: parseInt(payForm.subcontractor_id),
        project_name: payForm.project_name || null,
        invoice_id: payForm.invoice_id ? parseInt(payForm.invoice_id) : null,
        amount_paid: parseFloat(payForm.amount_paid),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        reference_no: payForm.reference_no,
        source_account: payForm.source_account,
        notes: payForm.notes
      };

      await api.post('/subcontractors/record_payment', payload);
      triggerAlert('success', ar ? 'تم تسجيل سداد المقاول وقيد المحاسبة بنجاح' : 'Subcontractor payment recorded successfully');
      setPayForm({
        subcontractor_id: '',
        project_name: '',
        invoice_id: '',
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        reference_no: '',
        source_account: 'نقدية بالبنوك والصندوق',
        notes: ''
      });
      fetchLogs();
    } catch (err) {
      triggerAlert('danger', err.response?.data?.error || (ar ? 'فشل تسجيل السداد' : 'Failed to record payment'));
    } finally {
      setLoading(false);
    }
  };

  // Delete Log Record (Reversal)
  const handleDeleteRecord = async (type, id) => {
    if (!window.confirm(ar ? 'هل أنت متأكد من إلغاء/عكس هذه المعاملة؟' : 'Are you sure you want to reverse this transaction?')) return;
    try {
      setLoading(true);
      await api.delete(`/dynamic/delete/${type}/${id}`);
      triggerAlert('success', ar ? 'تم عكس المعاملة وإلغاء القيود بنجاح' : 'Transaction reversed successfully');
      fetchLogs();
    } catch (err) {
      triggerAlert('danger', err.response?.data?.error || (ar ? 'فشل إلغاء المعاملة' : 'Failed to reverse transaction'));
    } finally {
      setLoading(false);
    }
  };

  // Dynamic dropdown filters
  const selectedClientObj = clients.find(c => c.id === parseInt(colForm.client_id));
  const filteredProjects = colForm.client_id
    ? projects.filter(p => p.client_name && selectedClientObj && p.client_name.toLowerCase().trim() === selectedClientObj.name.toLowerCase().trim())
    : [];

  const selectedProjObj = projects.find(p => p.id === parseInt(colForm.project_id));
  const filteredClientInvoices = colForm.project_id
    ? clientInvoices.filter(inv => inv.project_name && selectedProjObj && inv.project_name.toLowerCase().trim() === selectedProjObj.name.toLowerCase().trim() && inv.status !== 'Paid')
    : colForm.client_id
    ? clientInvoices.filter(inv => inv.client_name && selectedClientObj && inv.client_name.toLowerCase().trim() === selectedClientObj.name.toLowerCase().trim() && inv.status !== 'Paid')
    : clientInvoices.filter(inv => inv.status !== 'Paid');

  const selectedSubObj = subcontractors.find(s => s.id === parseInt(payForm.subcontractor_id));
  const filteredSubInvoices = payForm.subcontractor_id
    ? subInvoices.filter(inv => inv.subcontractor_id === parseInt(payForm.subcontractor_id) && inv.status !== 'Paid')
    : subInvoices.filter(inv => inv.status !== 'Paid');

  // Filter logs by search
  const filteredCollections = collectionsLog.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.client_name || '').toLowerCase().includes(q) ||
      (c.project_name || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q) ||
      (c.reference_no || '').toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  const filteredPayments = paymentsLog.filter(p => {
    const q = searchQuery.toLowerCase();
    const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
    return (
      (p.sub_name || '').toLowerCase().includes(q) ||
      (meta.project_name || '').toLowerCase().includes(q) ||
      (p.details || '').toLowerCase().includes(q) ||
      (meta.reference_no || '').toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  // Calculate totals
  const totalCollections = collectionsLog.reduce((sum, item) => sum + parseFloat(item.amount_paid || 0), 0);
  const totalPayments = paymentsLog.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="container-fluid p-6 max-w-7xl mx-auto space-y-6" style={{ direction: 'rtl' }}>
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-emerald-800 to-cyan-900 text-white p-6 rounded-2xl shadow-xl space-y-4 md:space-y-0 transition duration-300">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {ar ? 'التحصيلات والمدفوعات المالية' : 'Collections & Subcontractor Payments'}
          </h1>
          <p className="text-emerald-100 text-xs">
            {ar ? 'إدارة تحصيل دفعات العملاء وسداد مقاولي الباطن مع ربط مرن بالمشاريع والمستخلصات وتوليد القيود الآلية' : 'Manage general and linked transactions cleanly'}
          </p>
        </div>
        <div className="flex space-x-2 space-x-reverse">
          <button 
            onClick={() => { fetchMasterData(); fetchLogs(); }}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center transition duration-200"
          >
            🔄 {ar ? 'تحديث البيانات' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert.msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold shadow-md border ${
          alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          alert.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        } transition-all duration-300`}>
          {alert.msg}
        </div>
      )}

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 space-x-reverse">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xl">📥</div>
          <div>
            <p className="text-gray-400 text-xs font-semibold">{ar ? 'إجمالي التحصيلات (العملاء)' : 'Total Client Collections'}</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1">{totalCollections.toLocaleString()} <span className="text-xs text-gray-500">{ar ? 'جنيه' : 'EGP'}</span></h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 space-x-reverse">
          <div className="p-3 bg-cyan-100 text-cyan-800 rounded-xl text-xl">📤</div>
          <div>
            <p className="text-gray-400 text-xs font-semibold">{ar ? 'إجمالي المدفوعات (المقاولين)' : 'Total Payments to Subs'}</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1">{totalPayments.toLocaleString()} <span className="text-xs text-gray-500">{ar ? 'جنيه' : 'EGP'}</span></h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 space-x-reverse md:col-span-2 lg:col-span-1">
          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl text-xl">⚖️</div>
          <div>
            <p className="text-gray-400 text-xs font-semibold">{ar ? 'صافي التدفق النقدي الداخلي' : 'Net Inflow Balance'}</p>
            <h3 className="text-xl font-bold text-gray-800 mt-1">{(totalCollections - totalPayments).toLocaleString()} <span className="text-xs text-gray-500">{ar ? 'جنيه' : 'EGP'}</span></h3>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-200 bg-white p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'collections'
              ? 'bg-gradient-to-r from-emerald-800 to-cyan-900 text-white shadow'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          📥 {ar ? 'تحصيل دفعات العملاء' : 'Client Collections'}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'payments'
              ? 'bg-gradient-to-r from-emerald-800 to-cyan-900 text-white shadow'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          📤 {ar ? 'سداد مستحقات المقاولين' : 'Subcontractor Payments'}
        </button>
      </div>

      {/* TAB CONTENT: COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Collection Form (1/3 width) */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center">
              💰 {ar ? 'سجل تحصيل دفعة جديدة' : 'Record Client Collection'}
            </h2>
            <form onSubmit={handleCollectionSubmit} className="space-y-3.5">
              
              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'العميل' : 'Client'} *</label>
                <select
                  value={colForm.client_id}
                  onChange={(e) => setColForm({ ...colForm, client_id: e.target.value, project_id: '', valuation_id: '' })}
                  required
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                >
                  <option value="">{ar ? '-- اختر العميل --' : '-- Select Client --'}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'المشروع (اختياري)' : 'Project (Optional)'}</label>
                <select
                  value={colForm.project_id}
                  onChange={(e) => setColForm({ ...colForm, project_id: e.target.value, valuation_id: '' })}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                >
                  <option value="">{ar ? '-- دفعة عامة (بدون مشروع) --' : '-- General Payment (No Project) --'}</option>
                  {filteredProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'المستخلص / الفاتورة (اختياري)' : 'Valuation / Invoice (Optional)'}</label>
                <select
                  value={colForm.valuation_id}
                  onChange={(e) => setColForm({ ...colForm, valuation_id: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                >
                  <option value="">{ar ? '-- غير مرتبطة بمستخلص --' : '-- Not Linked to a Valuation --'}</option>
                  {filteredClientInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {ar ? `مستخلص رقم ${inv.id} - بقيمة ${parseFloat(inv.total_amount || 0).toLocaleString()} جنيه` : `Valuation #${inv.id} - ${inv.total_amount} EGP`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'المبلغ المحصل' : 'Amount'} *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={colForm.amount}
                    onChange={(e) => setColForm({ ...colForm, amount: e.target.value })}
                    required
                    placeholder="0.00"
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'تاريخ الاستلام' : 'Date'}</label>
                  <input
                    type="date"
                    value={colForm.payment_date}
                    onChange={(e) => setColForm({ ...colForm, payment_date: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={colForm.payment_method}
                    onChange={(e) => setColForm({ ...colForm, payment_method: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                  >
                    <option value="نقداً">{ar ? 'نقداً' : 'Cash'}</option>
                    <option value="بنك">{ar ? 'بنك' : 'Bank'}</option>
                    <option value="شيك">{ar ? 'شيك' : 'Check'}</option>
                    <option value="تحويل بنكي">{ar ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'الرقم المرجعي' : 'Ref No'}</label>
                  <input
                    type="text"
                    value={colForm.reference_no}
                    onChange={(e) => setColForm({ ...colForm, reference_no: e.target.value })}
                    placeholder={ar ? 'رقم الشيك أو التحويل' : 'Check / Transfer No.'}
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'الحساب المودع فيه' : 'Source Account'}</label>
                <input
                  type="text"
                  value={colForm.source_account}
                  onChange={(e) => setColForm({ ...colForm, source_account: e.target.value })}
                  placeholder={ar ? 'مثال: نقدية بالصندوق أو بنك مصر' : 'e.g. Cash in Hand or Bank Account'}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'ملاحظات / البيان الهندسي' : 'Notes'}</label>
                <textarea
                  value={colForm.notes}
                  onChange={(e) => setColForm({ ...colForm, notes: e.target.value })}
                  placeholder={ar ? 'أدخل تفاصيل إضافية أو وصف الدفعة...' : 'Enter details here...'}
                  rows="2"
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-800 to-cyan-900 hover:from-emerald-700 hover:to-cyan-800 text-white py-3 rounded-lg text-xs font-bold transition shadow-md duration-200 flex justify-center items-center"
              >
                {loading ? '...' : `🟢 ${ar ? 'تسجيل وقيد الدفعة بنجاح' : 'Register Collection'}`}
              </button>
            </form>
          </div>

          {/* Collection Logs (2/3 width) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 border-b pb-2">
              <h2 className="text-sm font-bold text-gray-800 flex items-center">
                📋 {ar ? 'سجل تحصيلات دفعات العملاء' : 'Customer Collections History Log'}
              </h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ar ? 'بحث باسم العميل أو المشروع...' : 'Search by client or project...'}
                className="text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:border-emerald-600 w-full sm:w-64 bg-gray-50/50"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <th className="p-3 text-center">ID</th>
                    <th className="p-3">{ar ? 'العميل' : 'Client'}</th>
                    <th className="p-3">{ar ? 'المشروع' : 'Project'}</th>
                    <th className="p-3">{ar ? 'المستخلص' : 'Valuation'}</th>
                    <th className="p-3 text-center">{ar ? 'المبلغ' : 'Amount'}</th>
                    <th className="p-3 text-center">{ar ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3 text-center">{ar ? 'طريقة الدفع' : 'Method'}</th>
                    <th className="p-3 text-center">{ar ? 'المرجع' : 'Ref No'}</th>
                    <th className="p-3">{ar ? 'البيان' : 'Notes'}</th>
                    <th className="p-3 text-center">{ar ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-6 text-center text-gray-400">
                        {ar ? 'لا توجد تحصيلات مسجلة مطابقة للبحث.' : 'No collections recorded.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map(c => {
                      const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {});
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/80 transition duration-150">
                          <td className="p-3 text-center text-gray-400 font-mono">#{c.id}</td>
                          <td className="p-3 font-semibold text-gray-700">{c.client_name || ar ? 'عميل عام' : 'General Client'}</td>
                          <td className="p-3 text-emerald-800 font-medium">{c.project_name || meta.project_name || ar ? 'دفعة عامة' : 'General'}</td>
                          <td className="p-3 text-cyan-800 font-medium">
                            {meta.valuation_id ? (
                              <span className="bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded-full text-[10px]">
                                {ar ? 'مستخلص' : 'Valuation'} #{meta.valuation_id}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700">
                            {parseFloat(c.amount_paid).toLocaleString()}
                          </td>
                          <td className="p-3 text-center text-gray-500 font-mono">
                            {new Date(c.payment_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-3 text-center text-gray-600">{c.payment_method}</td>
                          <td className="p-3 text-center font-mono text-gray-500">{c.reference_no || '-'}</td>
                          <td className="p-3 text-gray-600 max-w-[150px] truncate" title={c.notes}>{c.notes || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord('client_payment_history', c.id)}
                              className="text-rose-600 hover:text-rose-900 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-semibold transition"
                            >
                              {ar ? 'عكس القيد' : 'Reverse'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Payment Form (1/3 width) */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center">
              👷 {ar ? 'سجل سداد دفعة للمقاول' : 'Record Subcontractor Payment'}
            </h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              
              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'المقاول' : 'Subcontractor'} *</label>
                <select
                  value={payForm.subcontractor_id}
                  onChange={(e) => setPayForm({ ...payForm, subcontractor_id: e.target.value, invoice_id: '' })}
                  required
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                >
                  <option value="">{ar ? '-- اختر المقاول --' : '-- Select Subcontractor --'}</option>
                  {subcontractors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'المشروع (اختياري)' : 'Project Name (Optional)'}</label>
                <select
                  value={payForm.project_name}
                  onChange={(e) => setPayForm({ ...payForm, project_name: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                >
                  <option value="">{ar ? '-- سداد عام (بدون مشروع محدد) --' : '-- General Payment (No Project) --'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'مستخلص المقاول (اختياري)' : 'Subcontractor Invoice (Optional)'}</label>
                <select
                  value={payForm.invoice_id}
                  onChange={(e) => setPayForm({ ...payForm, invoice_id: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                >
                  <option value="">{ar ? '-- غير مرتبط بمستخلص مقاول --' : '-- Not Linked to Sub Invoice --'}</option>
                  {filteredSubInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {ar ? `مستخلص #${inv.id} - مشروع: ${inv.project_name || 'عام'} - بقيمة ${parseFloat(inv.net_amount || 0).toLocaleString()} جنيه` : `Invoice #${inv.id} - ${inv.net_amount} EGP`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'المبلغ المدفوع' : 'Amount'} *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payForm.amount_paid}
                    onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })}
                    required
                    placeholder="0.00"
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'تاريخ السداد' : 'Date'}</label>
                  <input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    required
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'طريقة السداد' : 'Payment Method'}</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                  >
                    <option value="Cash">{ar ? 'نقداً' : 'Cash'}</option>
                    <option value="Bank Transfer">{ar ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="Check">{ar ? 'شيك' : 'Check'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'الرقم المرجعي' : 'Ref No'}</label>
                  <input
                    type="text"
                    value={payForm.reference_no}
                    onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })}
                    placeholder={ar ? 'رقم الشيك أو التحويل' : 'Check / Transfer No.'}
                    className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'الحساب الدائن / مصدر الصرف' : 'Source Account'}</label>
                <input
                  type="text"
                  value={payForm.source_account}
                  onChange={(e) => setPayForm({ ...payForm, source_account: e.target.value })}
                  placeholder={ar ? 'مثال: نقدية بالبنوك والصندوق' : 'e.g. Cash or Bank Account'}
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold mb-1.5">{ar ? 'ملاحظات / تفاصيل المعاملة' : 'Notes'}</label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder={ar ? 'أدخل تفاصيل إضافية أو رقم الدفعة...' : 'Enter details here...'}
                  rows="2"
                  className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-600 bg-gray-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-900 to-emerald-800 hover:from-cyan-800 hover:to-emerald-700 text-white py-3 rounded-lg text-xs font-bold transition shadow-md duration-200 flex justify-center items-center"
              >
                {loading ? '...' : `🟢 ${ar ? 'تسجيل وقيد السداد بنجاح' : 'Record Payment'}`}
              </button>
            </form>
          </div>

          {/* Payment Logs (2/3 width) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 border-b pb-2">
              <h2 className="text-sm font-bold text-gray-800 flex items-center">
                📋 {ar ? 'سجل مدفوعات مقاولي الباطن' : 'Subcontractor Payments history Ledger'}
              </h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ar ? 'بحث باسم المقاول أو التفاصيل...' : 'Search by contractor or details...'}
                className="text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:border-cyan-600 w-full sm:w-64 bg-gray-50/50"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <th className="p-3 text-center">ID</th>
                    <th className="p-3">{ar ? 'المقاول' : 'Subcontractor'}</th>
                    <th className="p-3">{ar ? 'المشروع' : 'Project'}</th>
                    <th className="p-3">{ar ? 'المستخلص' : 'Invoice/Valuation'}</th>
                    <th className="p-3 text-center">{ar ? 'المبلغ' : 'Amount'}</th>
                    <th className="p-3 text-center">{ar ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3 text-center">{ar ? 'طريقة السداد' : 'Method'}</th>
                    <th className="p-3 text-center">{ar ? 'المرجع' : 'Ref No'}</th>
                    <th className="p-3">{ar ? 'البيان' : 'Notes'}</th>
                    <th className="p-3 text-center">{ar ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-6 text-center text-gray-400">
                        {ar ? 'لا توجد مدفوعات مسجلة مطابقة للبحث.' : 'No subcontractor statements.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => {
                      const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition duration-150">
                          <td className="p-3 text-center text-gray-400 font-mono">#{p.id}</td>
                          <td className="p-3 font-semibold text-gray-700">{p.sub_name || ar ? 'مقاول عام' : 'Subcontractor'}</td>
                          <td className="p-3 text-emerald-800 font-medium">{meta.project_name || ar ? 'سداد عام' : 'General'}</td>
                          <td className="p-3 text-cyan-800 font-medium">
                            {meta.invoice_id ? (
                              <span className="bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded-full text-[10px]">
                                {ar ? 'مستخلص' : 'Valuation'} #{meta.invoice_id}
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-rose-700">
                            {parseFloat(p.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center text-gray-500 font-mono">
                            {new Date(p.created_at || p.payment_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-3 text-center text-gray-600">{meta.payment_method || p.type}</td>
                          <td className="p-3 text-center font-mono text-gray-500">{meta.reference_no || '-'}</td>
                          <td className="p-3 text-gray-600 max-w-[150px] truncate" title={p.details}>{p.details || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord('subcontractor_statements', p.id)}
                              className="text-rose-600 hover:text-rose-900 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-semibold transition"
                            >
                              {ar ? 'إلغاء المعاملة' : 'Reverse'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
