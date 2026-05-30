import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { useSecurity } from '../hooks/useSecurity';
import { useLanguage } from '../contexts/LanguageContext';

const Projects = () => {
  const { language } = useLanguage();
  const { hasPermission, isSuperAdmin } = useSecurity();
  const [viewMode, setViewMode] = useState('grid'); // 'table' or 'grid'
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgUnits, setOrgUnits] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    code: '',
    project_serial: '',
    company: '',
    project_manager: '',
    fcy_budget: '',
    fx_rate: 1,
    budget: '',
    start_date: '',
    end_date: '',
    expected_profit: '',
    actual_profit: '',
    expected_profit_percent: '',
    actual_profit_percent: '',
    management_profit_percent: '',
    management_profit_amount: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchProjects();
    fetchOrgUnits();
  }, []);

  const fetchOrgUnits = async () => {
    try {
      const response = await api.get('/dynamic/table/org_units?limit=1000');
      setOrgUnits(response.data.data || []);
    } catch (err) {
      console.error('Failed to load organizational units:', err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dynamic/table/projects?limit=100');
      setProjects(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(language === 'ar' ? 'فشل في تحميل المشاريع.' : 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'fcy_budget' || name === 'fx_rate') {
      const fcy = parseFloat(name === 'fcy_budget' ? value : formData.fcy_budget) || 0;
      const rate = parseFloat(name === 'fx_rate' ? value : formData.fx_rate) || 1;
      newFormData.budget = (fcy * rate).toFixed(2);
    }

    if (name === 'expected_profit_percent') {
      const budget = parseFloat(newFormData.budget) || 0;
      const percent = parseFloat(value) || 0;
      newFormData.expected_profit = (budget * percent / 100).toFixed(2);
    } else if (name === 'expected_profit') {
      const budget = parseFloat(newFormData.budget) || 0;
      const amount = parseFloat(value) || 0;
      newFormData.expected_profit_percent = budget > 0 ? (amount / budget * 100).toFixed(1) : 0;
    }

    if (name === 'actual_profit_percent') {
      const budget = parseFloat(newFormData.budget) || 0;
      const percent = parseFloat(value) || 0;
      newFormData.actual_profit = (budget * percent / 100).toFixed(2);
      const actualAmt = parseFloat(newFormData.actual_profit) || 0;
      const mgmtPct = parseFloat(newFormData.management_profit_percent) || 0;
      newFormData.management_profit_amount = (actualAmt * mgmtPct / 100).toFixed(2);
    } else if (name === 'actual_profit') {
      const budget = parseFloat(newFormData.budget) || 0;
      const amount = parseFloat(value) || 0;
      newFormData.actual_profit_percent = budget > 0 ? (amount / budget * 100).toFixed(1) : 0;
      const mgmtPct = parseFloat(newFormData.management_profit_percent) || 0;
      newFormData.management_profit_amount = (amount * mgmtPct / 100).toFixed(2);
    }

    if (name === 'management_profit_percent') {
      const actualProfit = parseFloat(newFormData.actual_profit) || 0;
      const percent = parseFloat(value) || 0;
      newFormData.management_profit_amount = (actualProfit * percent / 100).toFixed(2);
    } else if (name === 'management_profit_amount') {
      const actualProfit = parseFloat(newFormData.actual_profit) || 0;
      const amount = parseFloat(value) || 0;
      newFormData.management_profit_percent = actualProfit > 0 ? (amount / actualProfit * 100).toFixed(1) : 0;
    }

    setFormData(newFormData);
  };

  const openCreateModal = () => {
    const activeCompany = localStorage.getItem('active_company') || '';
    setFormData({
      id: null,
      name: '',
      code: '',
      project_serial: '',
      company: activeCompany,
      project_manager: '',
      fcy_budget: '',
      fx_rate: 1,
      budget: '',
      start_date: '',
      end_date: '',
      expected_profit: '',
      actual_profit: '',
      expected_profit_percent: '',
      actual_profit_percent: '',
      management_profit_percent: '',
      management_profit_amount: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (project) => {
    setFormData({
      ...project,
      id: project.id,
      name: project.name || '',
      code: project.code || '',
      project_serial: project.project_serial || '',
      company: project.company || '',
      project_manager: project.project_manager || project.manager || '',
      fcy_budget: project.fcy_budget || '',
      fx_rate: project.fx_rate || 1,
      budget: project.budget || '',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      expected_profit: project.expected_profit || '',
      actual_profit: project.actual_profit || '',
      expected_profit_percent: project.expected_profit_percent || '',
      actual_profit_percent: project.actual_profit_percent || '',
      management_profit_percent: project.management_profit_percent || '',
      management_profit_amount: project.management_profit_amount || '',
      status: project.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (formData.id) {
        await api.put(`/dynamic/update/projects/${formData.id}`, formData);
      } else {
        await api.post('/dynamic/add/projects', formData);
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ أثناء حفظ المشروع.' : 'Error saving project.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(language === 'ar' ? `هل أنت متأكد من حذف المشروع (${name})؟` : `Are you sure you want to delete project (${name})?`)) return;
    try {
      await api.delete(`/dynamic/delete/projects/${id}`);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.error || (language === 'ar' ? 'حدث خطأ أثناء الحذف.' : 'Error deleting project.'));
    }
  };


  const [detailModal, setDetailModal] = useState({ isOpen: false, project: null });

  const openAuditModal = (project) => {
    setDetailModal({ isOpen: true, project });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-fade-in">

      {/* STRATEGIC AUDIT MODAL (ELITE UI) --- */}
      {detailModal.isOpen && detailModal.project && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setDetailModal({ isOpen: false, project: null })}></div>
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-white/20 animate-in slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/30">📊</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{detailModal.project.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Deep-Dive Operational Audit • Node {detailModal.project.project_serial}</p>
                </div>
              </div>
              <button onClick={() => setDetailModal({ isOpen: false, project: null })} className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm active:scale-90">✕</button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900 p-8 rounded-2xl text-white">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Contract Value</p>
                  <p className="text-3xl font-black font-mono tracking-tighter">{Number(detailModal.project.budget).toLocaleString()}</p>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">Validated LCY</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Actual Realized Profit</p>
                  <p className="text-3xl font-black font-mono tracking-tighter text-slate-900">{Number(detailModal.project.actual_profit || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2">{detailModal.project.actual_profit_percent || 0}% Margin</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mgmt Distributed Profit</p>
                  <p className="text-3xl font-black font-mono tracking-tighter text-slate-900">{Number(detailModal.project.management_profit_amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-2">{detailModal.project.management_profit_percent || 0}% Share</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Execution Lifecycle Timeline</h4>
                <div className="flex flex-col md:flex-row justify-between gap-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center text-sm">📅</div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commencement</p>
                      <p className="font-bold text-slate-900">{new Date(detailModal.project.start_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm">🏗️</div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handover Target</p>
                      <p className="font-bold text-slate-900">{detailModal.project.end_date ? new Date(detailModal.project.end_date).toLocaleDateString() : 'TBD'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-sm">✓</div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Status</p>
                      <p className="font-bold text-emerald-600 uppercase">{detailModal.project.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Technical Metadata (JSON Audit)</h4>
                <pre className="p-6 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto shadow-inner border border-white/5">
                  {JSON.stringify(detailModal.project, null, 4)}
                </pre>
              </div>
            </div>

            <div className="p-8 bg-slate-950 flex justify-between items-center border-t border-white/5 relative">
              <p className="text-white/40 font-black text-[10px] uppercase tracking-widest">TED ERP • PROJECT INTELLIGENCE NODE</p>
              <div className="flex gap-4">
                <button className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Export Specs</button>
                <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 transition-all">Authorize Phase Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section --- */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-slate-900/20">
                🏗️
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {language === 'ar' ? 'إدارة المشاريع والعمليات' : 'Project Operations & Engineering Hub'}
                </h1>
                <p className="text-slate-400 font-medium text-xs mt-1 uppercase tracking-widest">
                  {language === 'ar' ? 'تتبع الميزانيات والربحية والجدول الزمني' : 'Lifecycle tracking of budgets, profitability, and schedules'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  🖼️ {language === 'ar' ? 'شبكي' : 'Grid'}
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  📋 {language === 'ar' ? 'جدولي' : 'Table'}
                </button>
              </div>

              {(isSuperAdmin || hasPermission('PROJ_MANAGE')) && (
                <button
                  onClick={openCreateModal}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] flex items-center gap-2"
                >
                  <span className="text-sm">+</span> {language === 'ar' ? 'مشروع جديد' : 'New Project'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-10 space-y-10">
        {error && (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-xl font-bold border border-rose-100 flex items-center gap-3 text-sm animate-shake">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Quick Stats Overview --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {(() => {
            const activeProjects = projects.filter(p => p.status === 'Active');
            const avgProfit = projects.length > 0
              ? (projects.reduce((sum, p) => sum + (parseFloat(p.expected_profit_percent) || 0), 0) / projects.length).toFixed(1)
              : 0;
            const fundingGap = projects.reduce((sum, p) => {
              const budget = parseFloat(p.budget) || 0;
              const deposits = parseFloat(p.deposits) || 0;
              return sum + Math.max(0, budget - deposits);
            }, 0);

            return [
              { label: (language === 'ar' ? 'قاعدة المشاريع' : 'Project Base'), val: projects.length, sub: (language === 'ar' ? 'إجمالي العمليات' : 'Total Operations'), color: 'slate' },
              { label: (language === 'ar' ? 'التنفيذ النشط' : 'Active Execution'), val: activeProjects.length, sub: (language === 'ar' ? 'قيد التنفيذ' : 'In Progress'), color: 'emerald' },
              { label: (language === 'ar' ? 'متوسط الربحية' : 'Avg Profitability'), val: `${avgProfit}%`, sub: (language === 'ar' ? 'حسب العقود' : 'Contracted Avg'), color: 'blue' },
              { label: (language === 'ar' ? 'فجوة التمويل' : 'Funding Gap'), val: fundingGap.toLocaleString(), sub: (language === 'ar' ? 'مبالغ متأخرة' : 'Delayed Funding'), color: 'rose', dark: true }
            ].map((stat, i) => (
              <div key={i} className={`${stat.dark ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'} p-8 rounded-2xl group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer`} onClick={fetchProjects}>
                {stat.dark && <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>}
                <p className={`text-[9px] font-bold ${stat.dark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-2`}>{stat.label}</p>
                <h3 className={`text-4xl font-bold font-mono tracking-tighter ${!stat.dark && stat.color === 'emerald' ? 'text-emerald-600' : !stat.dark && stat.color === 'blue' ? 'text-blue-600' : ''}`}>{stat.val}</h3>
                <p className={`text-[10px] font-bold ${stat.dark ? 'text-slate-500' : 'text-slate-400'} mt-1 italic uppercase tracking-widest`}>{stat.sub}</p>
              </div>
            ));
          })()}
        </div>

        {/* Content Section --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] animate-fade-in">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-32 gap-6">
              <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">Syncing Project Data...</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {projects.map((project) => {
                    const remainingGap = parseFloat(project.remaining_budget) || 0;
                    const progress = project.budget > 0 ? (parseFloat(project.deposits) / parseFloat(project.budget)) * 100 : 0;

                    return (
                      <div key={project.id} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all group flex flex-col h-full relative overflow-hidden cursor-pointer" onClick={() => openAuditModal(project)}>
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-8xl pointer-events-none group-hover:scale-110 transition-transform">🏗️</div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                                {project.project_serial}
                              </span>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 uppercase tracking-widest">
                                {project.code || 'ENG-OPS'}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mt-1">{project.name}</h3>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{project.company}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest border ${project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                            {project.status || 'Active'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                          <div className="flex flex-col">
                            <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1">{language === 'ar' ? 'الميزانية (محلي)' : 'Budget (LCY)'}</span>
                            <span className="text-xl font-bold text-slate-900 font-mono tracking-tighter">
                              {Number(project.budget || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1">{language === 'ar' ? 'الميزانية (أجنبي)' : 'Budget (FCY)'}</span>
                            <span className="text-base font-bold text-slate-600 font-mono italic">
                              {Number(project.fcy_budget || 0).toLocaleString()} <small className="text-[8px] opacity-40 uppercase">FCY</small>
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 mb-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 relative z-10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-500 font-bold text-[9px] uppercase tracking-widest">{language === 'ar' ? 'حالة التمويل' : 'Funding Index'}</span>
                            <span className={`text-[9px] font-bold px-2 py-1 rounded-md ${remainingGap > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                              {remainingGap > 0 ? `${language === 'ar' ? 'فجوة:' : 'GAP:'} ${remainingGap.toLocaleString()}` : (language === 'ar' ? 'تمويل كامل ✓' : 'FULLY FUNDED ✓')}
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${progress > 100 ? 'bg-rose-500' : 'bg-slate-900'}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto relative z-10">
                          <div className="flex gap-2">
                            <div className="flex flex-col items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 min-w-[55px]">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">{language === 'ar' ? 'شركاء' : 'PRTR'}</span>
                              <span className="text-xs font-bold text-slate-900">{project.partners_count || 0}</span>
                            </div>
                            <div className="flex flex-col items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 min-w-[55px]">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">{language === 'ar' ? 'مدراء' : 'ADMN'}</span>
                              <span className="text-xs font-bold text-slate-900">{project.admins_count || 0}</span>
                            </div>
                          </div>

                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Link to={`/projects/${project.id}`} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md active:scale-95">
                              {language === 'ar' ? 'بيئة العمل 👁️' : 'Workspace 👁️'}
                            </Link>
                            <div className="flex gap-1">
                              {(isSuperAdmin || hasPermission('PROJ_MANAGE')) && (
                                <button onClick={() => openEditModal(project)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all">✏️</button>
                              )}
                              {(isSuperAdmin || hasPermission('PROJ_MANAGE')) && (
                                <button onClick={() => handleDelete(project.id, project.name)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all">🗑️</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                        <th className="px-6 py-4">{language === 'ar' ? 'التسلسلي' : 'Serial'}</th>
                        <th className="px-6 py-4">{language === 'ar' ? 'بيانات المشروع' : 'Project Profile'}</th>
                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'الميزانية (أجنبي)' : 'Budget (FCY)'}</th>
                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'الميزانية (محلي)' : 'Budget (LCY)'}</th>
                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'الحركات المالية' : 'Treasury Flow'}</th>
                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'فجوة التمويل' : 'Funding Gap'}</th>
                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                        <th className="px-6 py-4 text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projects.map((project) => {
                        const remainingGap = parseFloat(project.remaining_budget) || 0;
                        return (
                          <tr key={project.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => openAuditModal(project)}>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                                {project.project_serial || '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-sm tracking-tight">{project.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{project.company || '-'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-mono font-bold text-slate-600 text-sm">{Number(project.fcy_budget || 0).toLocaleString()} <small className="text-[8px] opacity-40 uppercase">FCY</small></span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-3 py-1 rounded-lg">
                                {Number(project.budget || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-md border border-emerald-100 w-full">+ {Number(project.deposits || 0).toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-3 py-0.5 rounded-md border border-rose-100 w-full">- {Number(project.withdrawals || 0).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-bold border ${remainingGap > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {remainingGap > 0 ? remainingGap.toLocaleString() : '✓'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest border ${project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {project.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Link to={`/projects/${project.id}`} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all">👁️</Link>
                                {(isSuperAdmin || hasPermission('PROJ_MANAGE')) && (
                                  <button onClick={() => openEditModal(project)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all">✏️</button>
                                )}
                                {(isSuperAdmin || hasPermission('PROJ_MANAGE')) && (
                                  <button onClick={() => handleDelete(project.id, project.name)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all">🗑️</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: PROJECT MANAGEMENT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4 md:p-10 animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-slate-100 flex flex-col relative animate-scale-up">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{formData.id ? (language === 'ar' ? 'تعديل بيانات المشروع' : 'Edit Project Specifications') : (language === 'ar' ? 'إنشاء مشروع جديد' : 'Initiate New Engineering Project')}</h3>
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Strategic Operations Registration</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'اسم المشروع *' : 'Project Title *'}</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none"
                    placeholder="e.g., Al-Watan Phase II..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الشركة / الجهة *' : 'Owning Entity / Client *'}</label>
                  <select
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none pointer-events-none opacity-80"
                    required
                    disabled
                  >
                    <option value={formData.company}>{formData.company || localStorage.getItem('active_company') || ''}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'مدير المشروع' : 'Assigned Project Manager'}</label>
                  <input type="text" name="project_manager" value={formData.project_manager} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>

                <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الميزانية (أجنبي)' : 'Budget (FCY)'}</label>
                    <input type="number" name="fcy_budget" value={formData.fcy_budget} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-slate-900 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'سعر الصرف' : 'FX Multiplier'}</label>
                    <input type="number" name="fx_rate" value={formData.fx_rate} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-slate-900 outline-none" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{language === 'ar' ? 'الإجمالي (محلي)' : 'Total Valuation (LCY)'}</label>
                    <input type="number" name="budget" value={formData.budget} className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl font-mono font-bold text-indigo-700 outline-none" readOnly />
                  </div>
                </div>

                <div className="col-span-full bg-emerald-50/50 p-8 rounded-2xl border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="col-span-full border-b border-emerald-100 pb-3">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">{language === 'ar' ? 'تحليل الربحية المتوقع' : 'Projected Profitability Index'}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'نسبة الربح (%)' : 'Expected Margin (%)'}</label>
                    <input type="number" name="expected_profit_percent" value={formData.expected_profit_percent} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-mono font-bold text-emerald-700 outline-none" step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مبلغ الربح' : 'Target Profit Amount'}</label>
                    <input type="number" name="expected_profit" value={formData.expected_profit} onChange={handleInputChange} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-mono font-bold text-emerald-700 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'تاريخ البدء *' : 'Commencement Date *'}</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white outline-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'تاريخ التسليم' : 'Projected Handover'}</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white outline-none" />
                </div>

                <div className="col-span-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الحالة التشغيلية' : 'Execution Status'}</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white outline-none">
                    <option value="Active">{language === 'ar' ? 'نشط (Active)' : 'Active'}</option>
                    <option value="On Hold">{language === 'ar' ? 'قيد الانتظار (On Hold)' : 'On Hold'}</option>
                    <option value="Completed">{language === 'ar' ? 'مكتمل (Completed)' : 'Completed'}</option>
                    <option value="Canceled">{language === 'ar' ? 'ملغى (Canceled)' : 'Canceled'}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50">
                  {isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Syncing...') : (formData.id ? (language === 'ar' ? 'تحديث بيانات المشروع 🚀' : 'Authorize Update 🚀') : (language === 'ar' ? 'اعتماد المشروع الجديد 🏗️' : 'Authorize Project Initiation 🏗️'))}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm uppercase tracking-widest transition-all">{language === 'ar' ? 'إلغاء' : 'Abort'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;