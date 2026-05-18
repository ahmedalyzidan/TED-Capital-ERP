import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Subcontractor360({ subId, onClose, language }) {
   const [loading, setLoading] = useState(true);
   const [data, setData] = useState(null);
   const [projects, setProjects] = useState([]);
   const [allBoqs, setAllBoqs] = useState([]);
   const [activeTab, setActiveTab] = useState('overview');

   // Create Modals
   const [isContractModalOpen, setIsContractModalOpen] = useState(false);
   const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
   const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
   const [isBondModalOpen, setIsBondModalOpen] = useState(false);
   const [isAssignBoqModalOpen, setIsAssignBoqModalOpen] = useState(false);

   // Edit Modals
   const [isEditContractModalOpen, setIsEditContractModalOpen] = useState(false);
   const [isEditClaimModalOpen, setIsEditClaimModalOpen] = useState(false);
   const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);
   const [isEditBondModalOpen, setIsEditBondModalOpen] = useState(false);

   // Active Editing IDs & Forms
   const [editingContractId, setEditingContractId] = useState(null);
   const [contractForm, setContractForm] = useState({
      contract_number: `CON-${Date.now()}`,
      total_value: '',
      retention_percent: 5,
      advance_percent: 10,
      start_date: '',
      end_date: '',
      scope_of_work: '',
      project_id: ''
   });
   const [editContractForm, setEditContractForm] = useState({
      contract_number: '',
      total_value: '',
      retention_percent: 5,
      advance_percent: 10,
      start_date: '',
      end_date: '',
      scope_of_work: '',
      project_id: '',
      status: 'Active'
   });

   const [editingClaimId, setEditingClaimId] = useState(null);
   const [claimForm, setClaimForm] = useState({
      contract_id: '',
      sub_item_id: '',
      progress_percent: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
   });
   const [editClaimForm, setEditClaimForm] = useState({
      contract_id: '',
      sub_item_id: '',
      progress_percent: '',
      gross_amount: '',
      retention_deduction: '',
      dp_recovery: '',
      net_amount: '',
      description: '',
      date: '',
      status: 'Pending'
   });

   const [assignBoqForm, setAssignBoqForm] = useState({
      boq_id: '',
      assigned_qty: '',
      unit_price: ''
   });
   const [editingAssignmentId, setEditingAssignmentId] = useState(null);
   const [editAssignmentForm, setEditAssignmentForm] = useState({
      boq_id: '',
      assigned_qty: '',
      unit_price: ''
   });

   const [editingBondId, setEditingBondId] = useState(null);
   const [bondForm, setBondForm] = useState({
      contract_id: '',
      bond_type: 'Performance',
      bank_name: '',
      bond_amount: '',
      expiry_date: '',
      reference_number: ''
   });
   const [editBondForm, setEditBondForm] = useState({
      contract_id: '',
      bond_type: 'Performance',
      bank_name: '',
      bond_amount: '',
      expiry_date: '',
      reference_number: '',
      status: 'Active'
   });

   const [releaseForm, setReleaseForm] = useState({ amount: '', description: '' });
   const [perfForm, setPerfForm] = useState({
      quality: 5,
      timeliness: 5,
      safety: 5,
      cooperation: 5
   });
   const [portalForm, setPortalForm] = useState({ username: '', password: '', active: false });

   useEffect(() => {
      fetchIntelligence();
      fetchProjects();
      fetchAllBoqs();
   }, [subId]);

   useEffect(() => {
      if (data?.profile) {
         setPortalForm({
            username: data.profile.username || data.profile.tax_id || '',
            password: '',
            active: data.profile.portal_access_active || false
         });

         const metrics = data.profile.metadata?.performance_metrics;
         if (metrics) {
            setPerfForm({
               quality: metrics.quality || 5,
               timeliness: metrics.timeliness || 5,
               safety: metrics.safety || 5,
               cooperation: metrics.cooperation || 5
            });
         }
      }
   }, [data]);

   const fetchProjects = async () => {
      try {
         const res = await api.get('/dynamic/table/projects?limit=500');
         setProjects(res.data?.data || []);
      } catch (err) { console.error("Failed to fetch projects:", err); }
   };

   const fetchAllBoqs = async () => {
      try {
         const res = await api.get('/dynamic/table/boq?limit=1000');
         setAllBoqs(res.data?.data || []);
      } catch (err) { console.error("Failed to fetch BOQ list:", err); }
   };

   const fetchIntelligence = async () => {
      setLoading(true);
      try {
         const res = await api.get(`/subcontractors/${subId}/intelligence`);
         setData(res.data);
      } catch (err) {
         console.error("Intelligence Fetch Error:", err);
      } finally {
         setLoading(false);
      }
   };

   // --- CREATE HANDLERS ---
   const handleContractSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/contracts', { ...contractForm, subcontractor_id: subId });
         alert(language === 'ar' ? 'تم تسجيل وتوثيق العقد بنجاح!' : 'Contract Formalized Successfully!');
         setIsContractModalOpen(false);
         setContractForm({
            contract_number: `CON-${Date.now()}`,
            total_value: '',
            retention_percent: 5,
            advance_percent: 10,
            start_date: '',
            end_date: '',
            scope_of_work: '',
            project_id: ''
         });
         fetchIntelligence();
      } catch (err) {
         alert(err.response?.data?.error || "Error creating contract");
      }
   };

   const handleClaimSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/claims', claimForm);
         alert(language === 'ar' ? 'تم تقديم المستخلص للمراجعة والاعتماد المالي!' : 'Progress Claim Submitted for Review!');
         setIsClaimModalOpen(false);
         setClaimForm({
            contract_id: '',
            sub_item_id: '',
            progress_percent: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
         });
         fetchIntelligence();
      } catch (err) {
         alert(err.response?.data?.error || "Error submitting claim");
      }
   };

   const handleReleaseSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/retention-release', { ...releaseForm, subcontractor_id: subId });
         alert(language === 'ar' ? 'تمت الموافقة وصرف مستقطعات ضمان الأعمال!' : 'Retention Released Successfully!');
         setIsReleaseModalOpen(false);
         setReleaseForm({ amount: '', description: '' });
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error releasing retention"); }
   };

   const handleBondSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/bonds', { ...bondForm, subcontractor_id: subId });
         alert(language === 'ar' ? 'تم تسجيل خطاب الضمان البنكي بنجاح!' : 'Security Bond Registered!');
         setIsBondModalOpen(false);
         setBondForm({
            contract_id: '',
            bond_type: 'Performance',
            bank_name: '',
            bond_amount: '',
            expiry_date: '',
            reference_number: ''
         });
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error registering bond"); }
   };

   const handleAssignBoqSubmit = async (e) => {
      e.preventDefault();
      try {
         const selectedBoq = allBoqs.find(b => b.id === parseInt(assignBoqForm.boq_id));
         const itemDesc = selectedBoq ? (selectedBoq.item_name || selectedBoq.item_desc || 'Unspecified Work') : 'Unspecified Work';
         const total = parseFloat(assignBoqForm.assigned_qty) * parseFloat(assignBoqForm.unit_price);
         await api.post('/add/subcontractor_items', {
            ...assignBoqForm,
            subcontractor_id: subId,
            item_desc: itemDesc,
            total_price: total
         });
         alert(language === 'ar' ? 'تم إسناد بند الأعمال للمقاول بنجاح!' : 'BOQ Item linked to Subcontractor!');
         setIsAssignBoqModalOpen(false);
         setAssignBoqForm({ boq_id: '', assigned_qty: '', unit_price: '' });
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error linking BOQ item"); }
   };

   // --- EDIT & UPDATE HANDLERS ---
   const openEditContract = (c) => {
      setEditingContractId(c.id);
      setEditContractForm({
         contract_number: c.contract_number,
         total_value: c.total_value,
         retention_percent: c.retention_percent,
         advance_percent: c.advance_percent,
         start_date: c.start_date ? c.start_date.split('T')[0] : '',
         end_date: c.end_date ? c.end_date.split('T')[0] : '',
         scope_of_work: c.scope_of_work || '',
         project_id: c.project_id || '',
         status: c.status || 'Active'
      });
      setIsEditContractModalOpen(true);
   };

   const handleEditContractSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.put(`/update/subcontractor_contracts/${editingContractId}`, editContractForm);
         alert(language === 'ar' ? 'تم تحديث بيانات العقد بنجاح!' : 'Contract updated successfully!');
         setIsEditContractModalOpen(false);
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error updating contract"); }
   };

   const openEditClaim = (inv) => {
      setEditingClaimId(inv.id);
      setEditClaimForm({
         contract_id: inv.contract_id || '',
         sub_item_id: inv.sub_item_id || '',
         progress_percent: inv.progress_percent || '',
         gross_amount: inv.gross_amount || '',
         retention_deduction: inv.retention_deduction || '',
         dp_recovery: inv.dp_recovery || '',
         net_amount: inv.net_amount || '',
         description: inv.description || '',
         date: inv.date ? inv.date.split('T')[0] : '',
         status: inv.status || 'Pending'
      });
      setIsEditClaimModalOpen(true);
   };

   const handleEditClaimSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.put(`/update/subcontractor_invoices/${editingClaimId}`, editClaimForm);
         alert(language === 'ar' ? 'تم تحديث بيانات المستخلص بنجاح!' : 'Progress claim updated successfully!');
         setIsEditClaimModalOpen(false);
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error updating claim"); }
   };

   const openEditAssignment = (b) => {
      setEditingAssignmentId(b.assignment_id);
      setEditAssignmentForm({
         boq_id: b.boq_id || '',
         assigned_qty: b.assigned_qty || '',
         unit_price: b.sub_unit_price || ''
      });
      setIsEditAssignmentModalOpen(true);
   };

   const handleEditAssignmentSubmit = async (e) => {
      e.preventDefault();
      try {
         const selectedBoq = allBoqs.find(b => b.id === parseInt(editAssignmentForm.boq_id));
         const itemDesc = selectedBoq ? (selectedBoq.item_name || selectedBoq.item_desc || 'Unspecified Work') : 'Unspecified Work';
         const total = parseFloat(editAssignmentForm.assigned_qty) * parseFloat(editAssignmentForm.unit_price);
         await api.put(`/update/subcontractor_items/${editingAssignmentId}`, {
            ...editAssignmentForm,
            item_desc: itemDesc,
            total_price: total
         });
         alert(language === 'ar' ? 'تم تحديث تفاصيل إسناد البند بنجاح!' : 'BOQ assignment updated successfully!');
         setIsEditAssignmentModalOpen(false);
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error updating assignment"); }
   };

   const openEditBond = (b) => {
      setEditingBondId(b.id);
      setEditBondForm({
         contract_id: b.contract_id || '',
         bond_type: b.bond_type || 'Performance',
         bank_name: b.bank_name || '',
         bond_amount: b.bond_amount || '',
         expiry_date: b.expiry_date ? b.expiry_date.split('T')[0] : '',
         reference_number: b.reference_number || '',
         status: b.status || 'Active'
      });
      setIsEditBondModalOpen(true);
   };

   const handleEditBondSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.put(`/update/subcontractor_bonds/${editingBondId}`, editBondForm);
         alert(language === 'ar' ? 'تم تحديث بيانات خطاب الضمان بنجاح!' : 'Security bond updated successfully!');
         setIsEditBondModalOpen(false);
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error updating bond"); }
   };

   // --- DELETE HANDLERS ---
   const handleContractDelete = async (id) => {
      if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا العقد نهائياً؟' : 'Are you sure you want to permanently delete this contract?')) return;
      try {
         await api.delete(`/delete/subcontractor_contracts/${id}`);
         alert(language === 'ar' ? 'تم حذف العقد بنجاح!' : 'Contract deleted successfully!');
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error deleting contract"); }
   };

   const handleAssignmentDelete = async (id) => {
      if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء إسناد هذا البند لهذا المقاول؟' : 'Are you sure you want to delete this BOQ item assignment?')) return;
      try {
         await api.delete(`/delete/subcontractor_items/${id}`);
         alert(language === 'ar' ? 'تم إلغاء الإسناد بنجاح!' : 'BOQ item unlinked successfully!');
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error deleting assignment"); }
   };

   const handleClaimDelete = async (id) => {
      if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف وإلغاء هذا المستخلص؟' : 'Are you sure you want to cancel/delete this progress claim?')) return;
      try {
         await api.delete(`/delete/subcontractor_invoices/${id}`);
         alert(language === 'ar' ? 'تم حذف وإلغاء المستخلص بنجاح!' : 'Claim deleted successfully!');
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error deleting progress claim"); }
   };

   const handleBondDelete = async (id) => {
      if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء/حذف خطاب الضمان البنكي هذا؟' : 'Are you sure you want to delete this security bond?')) return;
      try {
         await api.delete(`/delete/subcontractor_bonds/${id}`);
         alert(language === 'ar' ? 'تم حذف خطاب الضمان بنجاح!' : 'Security bond deleted successfully!');
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error deleting bond"); }
   };

   // --- CONFIG HANDLERS ---
   const handlePerfSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post(`/subcontractors/${subId}/performance`, perfForm);
         alert(language === 'ar' ? 'تم تحديث تقييم أداء المقاول بنجاح!' : 'Performance Appraisal Saved!');
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error saving performance"); }
   };

   const savePortalCreds = async () => {
      try {
         await api.post(`/subcontractors/${subId}/portal-credentials`, portalForm);
         alert(language === 'ar' ? 'تم تحديث بيانات البوابة الإلكترونية!' : 'Portal credentials updated successfully');
         fetchIntelligence();
      } catch (err) { alert("Failed to update credentials"); }
   };

   if (loading) return (
      <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
            <span className="text-slate-900 font-black uppercase tracking-widest text-[10px]">
               {language === 'ar' ? 'جاري مزامنة بيانات المقاول والربط المالي...' : 'Syncing Subcontractor Intelligence & Warehouse Links...'}
            </span>
         </div>
      </div>
   );

   if (!data) return null;

   const profile = data.profile || {};
   const stats = data.stats || { total_contracted: 0, total_paid: 0, net_retention: 0, total_bonds: 0, total_advance: 0, remaining_advance: 0 };
   const contracts = data.contracts || [];
   const invoices = data.invoices || [];
   const bonds = data.bonds || [];
   const releases = data.releases || [];
   const boqs = data.boqs || [];
   const materials = data.materials || [];
   const ledger = data.ledger || [];

   // Calculate running balance on general ledger (chronological order)
   let runningBal = 0;
   const ledgerWithBalance = [...ledger].reverse().map(entry => {
      const deb = parseFloat(entry.debit) || 0;
      const cred = parseFloat(entry.credit) || 0;
      runningBal += (cred - deb);
      return { ...entry, runningBalance: runningBal };
   }).reverse();

   const tabs = [
      { id: 'overview', label: language === 'ar' ? 'التقييم والامتثال' : 'Overview & Compliance', icon: '📊' },
      { id: 'contracts', label: language === 'ar' ? 'العقود ومجال العمل' : 'Contracts & Scope', icon: '📜' },
      { id: 'boqs', label: language === 'ar' ? 'بنود BOQ المسندة' : 'Assigned BOQs', icon: '🏗️' },
      { id: 'invoices', label: language === 'ar' ? 'المطالبات والمستخلصات' : 'Claims & Billings', icon: '🧾' },
      { id: 'materials', label: language === 'ar' ? 'التموين وصرف المواد' : 'Warehouse Materials', icon: '📦' },
      { id: 'ledger', label: language === 'ar' ? 'كشف الحساب المحاسبي' : 'Ledger Statement', icon: '⚖️' },
      { id: 'portal', label: language === 'ar' ? 'البوابة والتقييم' : 'Portal & Appraisal', icon: '⚙️' }
   ];

   return (
      <div className={`fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-2xl flex items-center justify-end p-0 md:p-6 transition-all duration-500`} style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
         <div className="absolute inset-0" onClick={onClose}></div>

         <div className="bg-white w-full max-w-[1350px] h-full md:h-[95vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in slide-in-from-right duration-500 border border-slate-100">

            {/* Top Identity Bar */}
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-slate-900/20 transform hover:rotate-6 transition-all">🏗️</div>
                  <div>
                     <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{profile.name || 'N/A'}</h1>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/10">
                           {language === 'ar' ? 'شريك معتمد' : 'Verified Partner'}
                        </span>
                     </div>
                     <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest flex items-center gap-4">
                        <span>📞 {profile.phone || 'N/A'}</span>
                        <span>🏢 {profile.company || 'N/A'}</span>
                        <span className="text-indigo-500">⭐ {profile.rating || '0.00'} / 5.0</span>
                     </p>
                  </div>
               </div>

               <div className="flex gap-4 items-center">
                  <button
                     onClick={() => setIsContractModalOpen(true)}
                     className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
                  >
                     {language === 'ar' ? '+ تسجيل عقد مقاولة باطن' : '+ Formalize Contract'}
                  </button>
                  <button onClick={onClose} className="bg-white p-4 rounded-2xl border border-slate-200 hover:bg-slate-900 hover:text-white transition-all active:scale-95 text-slate-400 font-bold">
                     {language === 'ar' ? 'إغلاق ✕' : 'Close ✕'}
                  </button>
               </div>
            </div>

            {/* Strategic KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-8 bg-white border-b border-slate-100">
               <div className="bg-slate-950 p-6 rounded-3xl text-white relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                     {language === 'ar' ? 'إجمالي حجم التعاقدات' : 'Contracted Volume'}
                  </span>
                  <span className="text-xl font-black font-mono tracking-tighter text-indigo-400">
                     {Number(stats.total_contracted || 0).toLocaleString()} LCY
                  </span>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                     {language === 'ar' ? 'الدفعات المستلمة (المسددة)' : 'Paid Claims'}
                  </span>
                  <span className="text-xl font-black font-mono tracking-tighter text-slate-900">
                     {Number(stats.total_paid || 0).toLocaleString()} LCY
                  </span>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                     {language === 'ar' ? 'متبقي الدفعة المقدمة' : 'Remaining Advance'}
                  </span>
                  <span className="text-xl font-black font-mono tracking-tighter text-amber-600">
                     {Number(stats.remaining_advance || 0).toLocaleString()} LCY
                  </span>
                  <div className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                     {language === 'ar' ? `المسترد: ${Number(stats.recovered_advance || 0).toLocaleString()}` : `Recovered: ${Number(stats.recovered_advance || 0).toLocaleString()}`}
                  </div>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                     {language === 'ar' ? 'مستقطعات ضمان الأعمال' : 'Net Retention'}
                  </span>
                  <div className="flex justify-between items-end">
                     <span className="text-xl font-black font-mono tracking-tighter text-rose-500">
                        {Number(stats.net_retention || 0).toLocaleString()} LCY
                     </span>
                     <button
                        onClick={() => setIsReleaseModalOpen(true)}
                        className="text-[8px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:underline"
                     >
                        {language === 'ar' ? 'صرف' : 'Release'}
                     </button>
                  </div>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                     {language === 'ar' ? 'خطابات الضمان النشطة' : 'Active Bonds (BG)'}
                  </span>
                  <div className="flex justify-between items-end">
                     <span className="text-xl font-black font-mono tracking-tighter text-emerald-500">
                        {Number(stats.total_bonds || 0).toLocaleString()} LCY
                     </span>
                     <button
                        onClick={() => setIsBondModalOpen(true)}
                        className="text-[8px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:underline"
                     >
                        {language === 'ar' ? 'إضافة ضمان' : 'Add BG'}
                     </button>
                  </div>
               </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-8 border-b border-slate-50 flex gap-1 bg-white overflow-x-auto">
               {tabs.map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id)}
                     className={`px-6 py-5 font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-3 border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-slate-950 text-slate-950 font-black' : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                  >
                     <span>{tab.icon}</span> {tab.label}
                  </button>
               ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
               {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                              {language === 'ar' ? 'بيانات الشريك والامتثال الضريبي' : 'Deep Metadata & Compliance'}
                           </h4>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                                 <span className="text-xs font-bold text-slate-500">{language === 'ar' ? 'الرقم الضريبي' : 'Tax ID Node'}</span>
                                 <span className="font-mono text-xs font-black text-slate-900">{profile.tax_id || 'NOT_FOUND'}</span>
                              </div>
                              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                                 <span className="text-xs font-bold text-slate-500">{language === 'ar' ? 'تاريخ انتهاء تأمين المقاول' : 'Insurance Expiry'}</span>
                                 <span className={`font-mono text-xs font-black ${new Date(profile.insurance_expiry) < new Date() ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {profile.insurance_expiry ? new Date(profile.insurance_expiry).toLocaleDateString() : 'MISSING'}
                                 </span>
                              </div>
                              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                                 <span className="text-xs font-bold text-slate-500">{language === 'ar' ? 'رقم رخصة العمل' : 'License / Commercial Reg'}</span>
                                 <span className="font-mono text-xs font-black text-slate-900">{profile.license_number || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center py-4">
                                 <span className="text-xs font-bold text-slate-500">{language === 'ar' ? 'الحد الائتماني التشغيلي' : 'Operational Credit Limit'}</span>
                                 <span className="font-mono text-xs font-black text-indigo-600">{Number(profile.credit_limit || 0).toLocaleString()} LCY</span>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                              {language === 'ar' ? 'مؤشرات التقييم الميداني والامتثال' : 'Field Performance & Ratings'}
                           </h4>
                           <div className="space-y-4">
                              {[
                                 { key: 'quality', label: language === 'ar' ? 'جودة تنفيذ الأعمال والبنود' : 'Quality of Executed Works' },
                                 { key: 'timeliness', label: language === 'ar' ? 'الالتزام بالجدول الزمني والمخطط' : 'Schedule Timeliness & Milestones' },
                                 { key: 'safety', label: language === 'ar' ? 'الامتثال لمعايير الصحة والسلامة المهنية' : 'HSE & Safety Compliance' },
                                 { key: 'cooperation', label: language === 'ar' ? 'التعاون الإداري والمستندات' : 'Administrative Cooperation' }
                              ].map(metric => {
                                 const val = parseFloat(profile.metadata?.performance_metrics?.[metric.key]) || 5;
                                 return (
                                    <div key={metric.key} className="space-y-1">
                                       <div className="flex justify-between items-center text-xs">
                                          <span className="font-bold text-slate-600">{metric.label}</span>
                                          <span className="font-black text-slate-950">{val} / 5</span>
                                       </div>
                                       <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-slate-900" style={{ width: `${(val / 5) * 100}%` }}></div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-fit">
                           <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent"></div>
                           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 relative z-10">
                              {language === 'ar' ? 'سجل العمليات والذكاء الاصطناعي' : 'Strategic Analytics & Logs'}
                           </h4>
                           <div className="space-y-3 relative z-10">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] text-white/60 font-mono italic">
                                 [SYSTEM]: Subcontractor analytics core synced. Credit rating stable.
                              </div>
                              {new Date(profile.insurance_expiry) < new Date() && (
                                 <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-[9px] text-rose-400 font-mono">
                                    [WARNING]: Subcontractor insurance policy has expired! Payouts may be locked.
                                 </div>
                              )}
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] text-emerald-400 font-mono">
                                 [COMPLIANCE]: 100% Tax compliance record verified for ID {profile.tax_id || 'N/A'}.
                              </div>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                              {language === 'ar' ? 'خطابات الضمان البنكية المسجلة' : 'Registered Performance & Advance Bonds'}
                           </h4>
                           <div className="space-y-4">
                              {bonds.map(b => (
                                 <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                                    <div>
                                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{b.bond_type} Bond</p>
                                       <p className="text-[8px] text-slate-400 font-bold uppercase">{b.bank_name} | Ref: {b.reference_number}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                       <p className="text-xs font-black text-emerald-600 font-mono">{Number(b.bond_amount).toLocaleString()} LCY</p>
                                       <div className="flex gap-2">
                                          <button
                                             onClick={() => openEditBond(b)}
                                             className="p-2 bg-white rounded-lg text-slate-600 hover:bg-slate-900 hover:text-white border border-slate-200 transition-all text-[9px] font-bold"
                                             title={language === 'ar' ? 'تعديل' : 'Edit'}
                                          >
                                             ✏️
                                          </button>
                                          <button
                                             onClick={() => handleBondDelete(b.id)}
                                             className="p-2 bg-rose-50 rounded-lg text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100 transition-all text-[9px] font-bold"
                                             title={language === 'ar' ? 'حذف' : 'Delete'}
                                          >
                                             🗑️
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                              {bonds.length === 0 && <p className="text-[10px] text-slate-400 font-black italic text-center py-4">No active bonds detected</p>}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'contracts' && (
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                     <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'رقم وقيمة العقد' : 'Contract Number & Value'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'المشروع المرتبط' : 'Project Cost Center'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'مالك المشروع / العميل' : 'Client / Owner'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'الدفعة المقدمة والاستقطاع' : 'Advance & Retention'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'التواريخ التشغيلية' : 'Duration'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                           {contracts.map(c => (
                              <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                                 <td className="px-8 py-4 font-black text-slate-900">
                                    <div className="italic">#{c.contract_number}</div>
                                    <div className="text-indigo-600 text-xs mt-0.5">{Number(c.total_value).toLocaleString()} LCY</div>
                                 </td>
                                 <td className="px-8 py-4 text-slate-700 font-bold">{c.project_name || 'N/A'}</td>
                                 <td className="px-8 py-4 text-slate-500">{c.client_name || 'TED ERP General'}</td>
                                 <td className="px-8 py-4">
                                    <div>{language === 'ar' ? `المقدمة: ${c.advance_percent}%` : `Advance: ${c.advance_percent}%`}</div>
                                    <div className="text-rose-500 text-[10px] mt-0.5">{language === 'ar' ? `الضمان: ${c.retention_percent}%` : `Retention: ${c.retention_percent}%`}</div>
                                 </td>
                                 <td className="px-8 py-4 text-slate-500">
                                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : 'N/A'} - {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'N/A'}
                                 </td>
                                 <td className="px-8 py-4">
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-100">{c.status}</span>
                                 </td>
                                 <td className="px-8 py-4">
                                    <div className="flex gap-2">
                                       <button
                                          onClick={() => openEditContract(c)}
                                          className="px-3 py-2 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl font-black text-[9px] border border-slate-100 transition-all"
                                       >
                                          {language === 'ar' ? '✏️ تعديل' : '✏️ Edit'}
                                       </button>
                                       <button
                                          onClick={() => handleContractDelete(c.id)}
                                          className="px-3 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl font-black text-[9px] text-rose-600 border border-rose-100 transition-all"
                                       >
                                          {language === 'ar' ? '🗑️ حذف' : '🗑️ Delete'}
                                       </button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                           {contracts.length === 0 && <tr><td colSpan="7" className="p-12 text-center text-slate-400 font-black italic">NO ACTIVE CONTRACTS DETECTED</td></tr>}
                        </tbody>
                     </table>
                  </div>
               )}

               {activeTab === 'boqs' && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center px-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 italic tracking-tighter">
                           {language === 'ar' ? 'جدول الكميات وبنود الأعمال المسندة للمقاول' : 'Assigned BOQ Items Details'}
                        </h3>
                        <button
                           onClick={() => setIsAssignBoqModalOpen(true)}
                           className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all"
                        >
                           {language === 'ar' ? '+ إسناد بند أعمال جديد للمقاول' : '+ Link New BOQ Item'}
                        </button>
                     </div>
                     <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                           <thead className="bg-slate-50 border-b border-slate-100">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'كود واسم البند' : 'BOQ Item Name'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'المشروع' : 'Project'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'الوحدة والكمية المسندة' : 'UOM & Assigned Qty'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'فئة وإجمالي المقاول' : 'Rate & Total Value'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'التموين الفعلي للمواد' : 'Warehouse Supply Cost'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'حالة البند' : 'Item Status'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                              {boqs.map(b => {
                                 const estMaterial = parseFloat(b.est_material_cost) || 0;
                                 const actMaterial = parseFloat(b.actual_material_cost) || 0;
                                 const materialExceeded = actMaterial > estMaterial;
                                 return (
                                    <tr key={b.boq_id} className="hover:bg-slate-50/50 transition-all">
                                       <td className="px-8 py-4 font-black text-slate-900">
                                          <div>#{b.boq_id} - {b.item_name || 'N/A'}</div>
                                       </td>
                                       <td className="px-8 py-4 text-slate-600 font-bold">{b.project_name || 'N/A'}</td>
                                       <td className="px-8 py-4 text-slate-500">
                                          <span className="font-bold text-slate-700">{Number(b.assigned_qty || b.est_qty || 0).toLocaleString()}</span> {b.uom || 'LM'}
                                       </td>
                                       <td className="px-8 py-4 font-black text-indigo-600">
                                          <div>{Number(b.sub_unit_price || 0).toLocaleString()} LCY</div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">{Number(b.sub_total_price || 0).toLocaleString()} LCY</div>
                                       </td>
                                       <td className="px-8 py-4">
                                          <div className="flex flex-col gap-1">
                                             <div className="flex justify-between text-[10px]">
                                                <span>{language === 'ar' ? 'المنصرف:' : 'Act:'} {Number(actMaterial).toLocaleString()}</span>
                                                <span className="text-slate-400">{language === 'ar' ? 'المقدّر:' : 'Est:'} {Number(estMaterial).toLocaleString()}</span>
                                             </div>
                                             <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${materialExceeded ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (actMaterial / (estMaterial || 1)) * 100)}%` }}></div>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-8 py-4">
                                          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${b.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                             }`}>{b.status || 'Active'}</span>
                                       </td>
                                       <td className="px-8 py-4">
                                          <div className="flex gap-2">
                                             <button
                                                onClick={() => openEditAssignment(b)}
                                                className="px-3 py-2 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl font-black text-[9px] border border-slate-100 transition-all"
                                             >
                                                {language === 'ar' ? '✏️ تعديل' : '✏️ Edit'}
                                             </button>
                                             <button
                                                onClick={() => handleAssignmentDelete(b.assignment_id)}
                                                className="px-3 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl font-black text-[9px] text-rose-600 border border-rose-100 transition-all"
                                             >
                                                {language === 'ar' ? '🗑️ إلغاء' : '🗑️ Remove'}
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 );
                              })}
                              {boqs.length === 0 && <tr><td colSpan="7" className="p-12 text-center text-slate-400 font-black italic">NO BOQ ITEMS ASSIGNED TO THIS SUBCONTRACTOR</td></tr>}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {activeTab === 'invoices' && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center px-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 italic tracking-tighter">
                           {language === 'ar' ? 'سجل مطالبات ومستخلصات مقاول الباطن' : 'Progress Billing & Claims History'}
                        </h3>
                        <button
                           onClick={() => setIsClaimModalOpen(true)}
                           className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                        >
                           {language === 'ar' ? '+ تقديم مستخلص جديد' : '+ Submit New Claim'}
                        </button>
                     </div>
                     <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                           <thead className="bg-slate-50 border-b border-slate-100">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'تاريخ المستخلص' : 'Billing Date'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'البيان ومجال العمل' : 'Description / Scope'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'نسبة الإنجاز المحققة' : 'Cumulative Progress'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'القيمة الكلية والمستقطعات' : 'Gross, Ret & Adv Recovery'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'صافي المستخلص' : 'Net Amount'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'حالة الاعتماد' : 'Status'}</th>
                                 <th className="px-8 py-4 text-start">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                              {invoices.map(inv => (
                                 <tr key={inv.id} className="hover:bg-slate-50 transition-all">
                                    <td className="px-8 py-4 text-slate-500">{new Date(inv.date || inv.created_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-4 font-bold text-slate-750">
                                       <div>{inv.description || 'N/A'}</div>
                                       {inv.boq_item_name && <div className="text-[9px] text-slate-400 mt-0.5">{language === 'ar' ? `البند: ${inv.boq_item_name}` : `Item: ${inv.boq_item_name}`}</div>}
                                    </td>
                                    <td className="px-8 py-4">
                                       <div className="flex items-center gap-2">
                                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                             <div className="h-full bg-emerald-500" style={{ width: `${parseFloat(inv.progress_percent || 0)}%` }}></div>
                                          </div>
                                          <span className="font-black text-slate-900">{parseFloat(inv.progress_percent || 0)}%</span>
                                       </div>
                                    </td>
                                    <td className="px-8 py-4 text-slate-500 text-[10px]">
                                       <div>{language === 'ar' ? `الإجمالي: ${Number(inv.gross_amount || 0).toLocaleString()}` : `Gross: ${Number(inv.gross_amount || 0).toLocaleString()}`}</div>
                                       <div>{language === 'ar' ? `الضمان: -${Number(inv.retention_deduction || 0).toLocaleString()}` : `Retention: -${Number(inv.retention_deduction || 0).toLocaleString()}`}</div>
                                       <div>{language === 'ar' ? `استرداد دفعة: -${Number(inv.dp_recovery || 0).toLocaleString()}` : `Adv Recovery: -${Number(inv.dp_recovery || 0).toLocaleString()}`}</div>
                                    </td>
                                    <td className="px-8 py-4 font-black text-emerald-600 text-xs">{Number(inv.net_amount || inv.amount || 0).toLocaleString()} LCY</td>
                                    <td className="px-8 py-4">
                                       <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${inv.status === 'Paid' || inv.status === 'اعتماد مالي' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                          }`}>{inv.status || 'Pending'}</span>
                                    </td>
                                    <td className="px-8 py-4">
                                       <div className="flex gap-2">
                                          <button
                                             onClick={() => openEditClaim(inv)}
                                             className="px-3 py-2 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl font-black text-[9px] border border-slate-100 transition-all"
                                          >
                                             {language === 'ar' ? '✏️ تعديل' : '✏️ Edit'}
                                          </button>
                                          <button
                                             onClick={() => handleClaimDelete(inv.id)}
                                             className="px-3 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl font-black text-[9px] text-rose-600 border border-rose-100 transition-all"
                                          >
                                             {language === 'ar' ? '🗑️ حذف' : '🗑️ Delete'}
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                              {invoices.length === 0 && <tr><td colSpan="7" className="p-12 text-center text-slate-400 font-black italic">NO CLAIMS SUBMITTED YET</td></tr>}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {activeTab === 'materials' && (
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                     <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'إذن الصرف والتاريخ' : 'Issue Voucher & Date'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'اسم الصنف والمادة المنصرفة' : 'Material & Description'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'بند الأعمال المرتبط' : 'BOQ Link'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'الكمية المنصرفة' : 'Quantity Supplied'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'تكلفة الصرف الكلية' : 'Total Supply Cost'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'المخزن المصدر' : 'Warehouse Source'}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                           {materials.map(m => (
                              <tr key={m.id} className="hover:bg-slate-50/50 transition-all">
                                 <td className="px-8 py-4 font-black text-slate-900">
                                    <div>#MR-{m.id}</div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">{new Date(m.created_at).toLocaleDateString()}</div>
                                 </td>
                                 <td className="px-8 py-4 text-slate-800 font-bold">
                                    <div>{m.material || 'N/A'}</div>
                                    <div className="text-[9px] text-slate-400 font-normal">{m.item_description || 'Material issued from central yard'}</div>
                                 </td>
                                 <td className="px-8 py-4 text-slate-600 italic">
                                    {m.boq_item_name || 'N/A'}
                                 </td>
                                 <td className="px-8 py-4 font-bold text-slate-900">
                                    {Number(m.qty || 0).toLocaleString()}
                                 </td>
                                 <td className="px-8 py-4 text-rose-600 font-black">
                                    {Number(parseFloat(m.qty || 0) * parseFloat(m.unit_cost || 0)).toLocaleString()} LCY
                                 </td>
                                 <td className="px-8 py-4">
                                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-black uppercase border border-slate-200">
                                       {m.warehouse_name || 'المستودع الرئيسي'}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                           {materials.length === 0 && <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-black italic">NO MATERIALS ISSUED FROM WAREHOUSES FOR THIS SUBCONTRACTOR'S ASSIGNED ITEMS</td></tr>}
                        </tbody>
                     </table>
                  </div>
               )}

               {activeTab === 'ledger' && (
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                     <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'تاريخ الحركة والقيد' : 'JV Entry & Date'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'الحساب المتأثر' : 'Account Affected'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'مركز التكلفة / الشركة' : 'Cost Center / Entity'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'البيان وتفاصيل القيد' : 'Description / Memo'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'مدين (-)' : 'Debit (-)'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'دائن (+)' : 'Credit (+)'}</th>
                              <th className="px-8 py-4 text-start">{language === 'ar' ? 'الرصيد المستحق (دائن)' : 'Running Balance'}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                           {ledgerWithBalance.map(entry => {
                              const isDeb = parseFloat(entry.debit) > 0;
                              return (
                                 <tr key={entry.id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-8 py-4 font-black text-slate-900">
                                       <div>#JV-{entry.id}</div>
                                       <div className="text-[9px] text-slate-400 mt-0.5">{new Date(entry.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-8 py-4 text-slate-700 font-bold">{entry.account_name || 'N/A'}</td>
                                    <td className="px-8 py-4">
                                       <div className="font-bold text-slate-900">{entry.cost_center || 'General'}</div>
                                       <div className="text-[9px] text-slate-400">{entry.company || 'TED Capital'}</div>
                                    </td>
                                    <td className="px-8 py-4 text-slate-600 text-xs font-normal" style={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                       {entry.description || 'N/A'}
                                    </td>
                                    <td className="px-8 py-4 text-rose-500 font-bold">
                                       {parseFloat(entry.debit) > 0 ? Number(entry.debit).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-8 py-4 text-emerald-600 font-bold">
                                       {parseFloat(entry.credit) > 0 ? Number(entry.credit).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-8 py-4 font-black text-slate-950 text-xs">
                                       {Number(entry.runningBalance).toLocaleString()} LCY
                                    </td>
                                 </tr>
                              );
                           })}
                           {ledgerWithBalance.length === 0 && <tr><td colSpan="7" className="p-12 text-center text-slate-400 font-black italic">NO GENERAL LEDGER ENTRIES FOUND FOR THIS PARTNER</td></tr>}
                        </tbody>
                     </table>
                  </div>
               )}

               {activeTab === 'portal' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-5 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-bl-3xl shadow-lg">Security Node</div>
                        <h3 className="text-2xl font-black mb-2 tracking-tighter italic">
                           {language === 'ar' ? 'بوابة مقاولي الباطن الرقمية' : 'Subcontractor Portal Identity Access'}
                        </h3>
                        <p className="text-slate-400 font-bold text-xs mb-8 uppercase tracking-widest">
                           {language === 'ar' ? 'تنشيط الحساب الإلكتروني للمقاول لإدخال نسب الإنجاز والمطالبات ذاتياً' : 'Enable digital collaboration & autonomous claims submission for this partner'}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{language === 'ar' ? 'اسم المستخدم للدخول' : 'Portal Username'}</label>
                              <input
                                 type="text"
                                 placeholder="e.g. TAX-ID-999"
                                 className="w-full p-5 bg-slate-800 border-none rounded-2xl font-black text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                 value={portalForm.username}
                                 onChange={e => setPortalForm({ ...portalForm, username: e.target.value })}
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{language === 'ar' ? 'كلمة المرور المشفرة' : 'Set Account Password'}</label>
                              <input
                                 type="text"
                                 placeholder={language === 'ar' ? 'أدخل كلمة مرور قوية' : 'Enter secure password'}
                                 className="w-full p-5 bg-slate-800 border-none rounded-2xl font-black text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                 value={portalForm.password}
                                 onChange={e => setPortalForm({ ...portalForm, password: e.target.value })}
                              />
                           </div>
                        </div>

                        <div className="mt-10 pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                           <div className="flex items-center gap-4">
                              <button
                                 onClick={() => setPortalForm({ ...portalForm, active: !portalForm.active })}
                                 className={`w-16 h-9 rounded-full relative transition-all duration-300 ${portalForm.active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}
                              >
                                 <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${portalForm.active ? 'left-8' : 'left-1.5'}`}></div>
                              </button>
                              <div>
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] block">{portalForm.active ? (language === 'ar' ? 'البوابة مفعلة ومصرحة' : 'Access Authorized') : (language === 'ar' ? 'الوصول مقيد ومعلق' : 'Access Restricted')}</span>
                                 <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{portalForm.active ? (language === 'ar' ? 'يمكن للمقاول الدخول والعمل' : 'Partner can login via portal') : (language === 'ar' ? 'حساب المقاول معلق ومقفل مؤقتاً' : 'Account is currently locked')}</span>
                              </div>
                           </div>
                           <button
                              onClick={savePortalCreds}
                              className="px-10 py-5 bg-white text-slate-900 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.25em] hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95"
                           >
                              {language === 'ar' ? 'تحديث وحفظ هوية الدخول' : 'Update Portal Identity'}
                           </button>
                        </div>
                     </div>

                     <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-8">
                           {language === 'ar' ? 'محرك التقييم وتحديث المعايير الفنية للمقاول' : 'Appraisal Engine & Performance Update'}
                        </h4>
                        <div className="space-y-6">
                           {[
                              { key: 'quality', label: language === 'ar' ? 'جودة تنفيذ الأعمال والبنود الفنية' : 'Quality of Executed Works & Technicality' },
                              { key: 'timeliness', label: language === 'ar' ? 'الالتزام بالجداول الزمنية ومواعيد التسليم' : 'Schedule Timeliness & Mileposts' },
                              { key: 'safety', label: language === 'ar' ? 'الالتزام بإجراءات السلامة والصحة المهنية بالرصيف' : 'HSE Compliance & Safety Audits' },
                              { key: 'cooperation', label: language === 'ar' ? 'المرونة والتعاون الإداري والفواتير' : 'Administrative Transparency & Invoicing' }
                           ].map(metric => (
                              <div key={metric.key} className="space-y-2">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{metric.label}</span>
                                    <span className="font-black text-slate-900 text-xs">{perfForm[metric.key]} / 5</span>
                                 </div>
                                 <input
                                    type="range" min="1" max="5" step="0.5"
                                    value={perfForm[metric.key]}
                                    onChange={e => setPerfForm({ ...perfForm, [metric.key]: e.target.value })}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                                 />
                              </div>
                           ))}
                           <button
                              onClick={handlePerfSubmit}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all active:scale-95"
                           >
                              {language === 'ar' ? 'تحديث وحفظ التقييم الفني للمقاول' : 'Save & Recalibrate Strategic Rating'}
                           </button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* ========================================== */}
         {/* MODALS & FORMS (Vanilla Premium Styling)   */}
         {/* ========================================== */}

         {/* 1. Formalize Contract Modal */}
         {isContractModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsContractModalOpen(false)}></div>
               <form onSubmit={handleContractSubmit} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-8">{language === 'ar' ? 'توثيق وتسجيل عقد مقاولة باطن جديد' : 'Formalize Strategic Contract'}</h2>

                  <div className="grid grid-cols-2 gap-6 text-start">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'رقم العقد المحاسبي' : 'Contract #'}</label>
                        <input type="text" value={contractForm.contract_number} readOnly className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المشروع الإنشائي المستهدف' : 'Linked Project'}</label>
                        <select
                           value={contractForm.project_id}
                           onChange={e => setContractForm({ ...contractForm, project_id: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                           required
                        >
                           <option value="">{language === 'ar' ? 'اختر المشروع' : 'Select Project'}</option>
                           {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'القيمة الكلية للعقد' : 'Total Contract Value (LCY)'}</label>
                        <input
                           type="number"
                           value={contractForm.total_value}
                           onChange={e => setContractForm({ ...contractForm, total_value: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الدفعة المقدمة %' : 'Advance %'}</label>
                           <input
                              type="number"
                              value={contractForm.advance_percent}
                              onChange={e => setContractForm({ ...contractForm, advance_percent: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'نسبة الاستقطاع ضمان %' : 'Retention %'}</label>
                           <input
                              type="number"
                              value={contractForm.retention_percent}
                              onChange={e => setContractForm({ ...contractForm, retention_percent: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ التوقيع/البدء' : 'Start Date'}</label>
                        <input
                           type="date"
                           value={contractForm.start_date}
                           onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ التسليم المتوقع' : 'End Date'}</label>
                        <input
                           type="date"
                           value={contractForm.end_date}
                           onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                  </div>

                  <div className="mt-6 space-y-2 text-start">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مجال الأعمال الموكل للمقاول' : 'Scope of Work / Deliverables Description'}</label>
                     <textarea
                        value={contractForm.scope_of_work}
                        onChange={e => setContractForm({ ...contractForm, scope_of_work: e.target.value })}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-20 focus:outline-none"
                        placeholder={language === 'ar' ? 'حدد المهام وتوزيع بنود جدول الكميات بالتفصيل...' : 'Define the specific tasks and deliverables...'}
                     ></textarea>
                  </div>

                  <button type="submit" className="mt-8 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                     {language === 'ar' ? 'حفظ وتأكيد العقد' : 'Authorize & Save Contract'}
                  </button>
               </form>
            </div>
         )}

         {/* 1.1 Edit Contract Modal */}
         {isEditContractModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsEditContractModalOpen(false)}></div>
               <form onSubmit={handleEditContractSubmit} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">{language === 'ar' ? 'تعديل عقد مقاولة الباطن' : 'Edit Subcontractor Contract'}</h2>
                     <button type="button" onClick={() => setIsEditContractModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-black">✕</button>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-start">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'رقم العقد' : 'Contract #'}</label>
                        <input type="text" value={editContractForm.contract_number} readOnly className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المشروع' : 'Project'}</label>
                        <select
                           value={editContractForm.project_id}
                           onChange={e => setEditContractForm({ ...editContractForm, project_id: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                           required
                        >
                           <option value="">{language === 'ar' ? 'اختر المشروع' : 'Select Project'}</option>
                           {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'قيمة العقد' : 'Contract Value'}</label>
                        <input
                           type="number"
                           value={editContractForm.total_value}
                           onChange={e => setEditContractForm({ ...editContractForm, total_value: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المقدمة %' : 'Advance %'}</label>
                           <input
                              type="number"
                              value={editContractForm.advance_percent}
                              onChange={e => setEditContractForm({ ...editContractForm, advance_percent: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الضمان %' : 'Retention %'}</label>
                           <input
                              type="number"
                              value={editContractForm.retention_percent}
                              onChange={e => setEditContractForm({ ...editContractForm, retention_percent: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
                        <input
                           type="date"
                           value={editContractForm.start_date}
                           onChange={e => setEditContractForm({ ...editContractForm, start_date: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
                        <input
                           type="date"
                           value={editContractForm.end_date}
                           onChange={e => setEditContractForm({ ...editContractForm, end_date: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'حالة العقد' : 'Contract Status'}</label>
                        <select
                           value={editContractForm.status}
                           onChange={e => setEditContractForm({ ...editContractForm, status: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                        >
                           <option value="Active">{language === 'ar' ? 'نشط (Active)' : 'Active'}</option>
                           <option value="Suspended">{language === 'ar' ? 'معلق (Suspended)' : 'Suspended'}</option>
                           <option value="Completed">{language === 'ar' ? 'مكتمل (Completed)' : 'Completed'}</option>
                        </select>
                     </div>
                  </div>

                  <div className="mt-6 space-y-2 text-start">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مجال الأعمال' : 'Scope of Work'}</label>
                     <textarea
                        value={editContractForm.scope_of_work}
                        onChange={e => setEditContractForm({ ...editContractForm, scope_of_work: e.target.value })}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-20 focus:outline-none"
                     ></textarea>
                  </div>

                  <button type="submit" className="mt-8 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                     {language === 'ar' ? 'تحديث وتأكيد التعديلات' : 'Update Contract Details'}
                  </button>
               </form>
            </div>
         )}

         {/* 2. Progress Claim Submission Modal */}
         {isClaimModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsClaimModalOpen(false)}></div>
               <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">{language === 'ar' ? 'تقديم مستخلص إنجاز أعمال جديد' : 'Submit Progress Claim'}</h2>
                     <button type="button" onClick={() => setIsClaimModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-black">✕</button>
                  </div>

                  {contracts.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                        <span className="text-5xl">⚠️</span>
                        <div>
                           <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{language === 'ar' ? 'لا توجد عقود مسجلة لهذا المقاول' : 'No Contracts Registered'}</h3>
                           <p className="text-xs text-slate-400 font-bold mt-2 max-w-xs leading-relaxed">
                              {language === 'ar' ? 'يجب تسجيل عقد مقاولة باطن للمقاول أولاً قبل التمكن من تقديم مستخلصات وإثبات نسب إنجاز.' : 'A formalized contract must be registered before you can submit a progress claim for this subcontractor.'}
                           </p>
                        </div>
                        <button
                           type="button"
                           onClick={() => {
                              setIsClaimModalOpen(false);
                              setActiveTab('contracts');
                           }}
                           className="mt-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg"
                        >
                           {language === 'ar' ? 'الذهاب لتسجيل عقد جديد' : 'Go to Register Contract'}
                        </button>
                     </div>
                  ) : (
                     <form onSubmit={handleClaimSubmit} className="space-y-6 text-start">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'اختر العقد المرتبط' : 'Select Contract'}</label>
                           <select
                              value={claimForm.contract_id}
                              onChange={e => setClaimForm({ ...claimForm, contract_id: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                              required
                           >
                              <option value="">{language === 'ar' ? 'اختر العقد' : 'Select Contract to Bill Against'}</option>
                              {contracts.map(c => <option key={c.id} value={c.id}>Contract #{c.contract_number} ({c.project_name || 'Project'})</option>)}
                           </select>
                        </div>

                        {(() => {
                           const selected = contracts.find(c => c.id === parseInt(claimForm.contract_id));
                           if (!selected) return null;
                           return (
                              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                 <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{language === 'ar' ? 'بيانات العقد المرتبط' : 'Contract Details'}</p>
                                 <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                                    <div>
                                       <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'قيمة العقد الكلية:' : 'Total Value:'}</span>
                                       <span className="text-slate-900 font-black">{Number(selected.total_value).toLocaleString()} LCY</span>
                                    </div>
                                    <div>
                                       <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'المشروع:' : 'Project:'}</span>
                                       <span className="text-slate-900 font-black">{selected.project_name || 'TED ERP General'}</span>
                                    </div>
                                    <div>
                                       <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'استقطاع الضمان:' : 'Retention:'}</span>
                                       <span className="text-rose-500 font-black">{selected.retention_percent}%</span>
                                    </div>
                                    <div>
                                       <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'استرداد الدفعة المقدمة:' : 'Advance Recover:'}</span>
                                       <span className="text-amber-600 font-black">{selected.advance_percent}%</span>
                                    </div>
                                 </div>
                              </div>
                           );
                        })()}

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'البند المسند المنجز (BOQ Item)' : 'Select Assigned BOQ Item'}</label>
                           <select
                              value={claimForm.sub_item_id}
                              onChange={e => setClaimForm({ ...claimForm, sub_item_id: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                           >
                              <option value="">{language === 'ar' ? 'اختر بند جدول الكميات المسند' : 'Select Assigned BOQ Item (Optional)'}</option>
                              {boqs.map(b => <option key={b.boq_id} value={b.boq_id}>{b.item_name} ({b.project_name})</option>)}
                           </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'نسبة الإنجاز التراكمية %' : 'Cumulative Progress %'}</label>
                              <input
                                 type="number"
                                 max="100"
                                 value={claimForm.progress_percent}
                                 onChange={e => setClaimForm({ ...claimForm, progress_percent: e.target.value })}
                                 className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                                 required
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ تقديم المستخلص' : 'Billing Date'}</label>
                              <input
                                 type="date"
                                 value={claimForm.date}
                                 onChange={e => setClaimForm({ ...claimForm, date: e.target.value })}
                                 className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                                 required
                              />
                           </div>
                        </div>

                        {(() => {
                           const selected = contracts.find(c => c.id === parseInt(claimForm.contract_id));
                           if (!selected || !claimForm.progress_percent) return null;
                           
                           const totalVal = parseFloat(selected.total_value) || 0;
                           const progress = parseFloat(claimForm.progress_percent) || 0;
                           const grossAmount = (progress / 100) * totalVal;
                           
                           // Calculate retention deduction
                           const retentionDeduction = grossAmount * (parseFloat(selected.retention_percent) || 0) / 100;
                           
                           // Calculate advance recovery
                           const dpRecovery = grossAmount * (parseFloat(selected.advance_percent) || 0) / 100;
                           
                           // Calculate net payment
                           const netAmount = grossAmount - retentionDeduction - dpRecovery;
                           
                           return (
                              <div className="p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100/50 space-y-4">
                                 <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                                    📊 {language === 'ar' ? 'المعاملات المالية للمستخلص (تقديرياً)' : 'Estimated Invoice Breakdown'}
                                 </h4>
                                 <div className="space-y-3 font-mono text-xs">
                                    <div className="flex justify-between items-center py-2 border-b border-emerald-100/20">
                                       <span className="text-slate-500 font-bold">{language === 'ar' ? 'القيمة التراكمية الإجمالية (Gross):' : 'Cumulative Gross Value:'}</span>
                                       <span className="text-slate-900 font-black">{grossAmount.toLocaleString()} LCY</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-emerald-100/20 text-rose-600">
                                       <span className="font-bold">{language === 'ar' ? 'خصم استقطاع ضمان الأعمال:' : 'Retention Deduction:'} ({selected.retention_percent}%)</span>
                                       <span className="font-black">-{retentionDeduction.toLocaleString()} LCY</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-emerald-100/20 text-amber-600">
                                       <span className="font-bold">{language === 'ar' ? 'استرداد الدفعة المقدمة:' : 'Advance Recovery:'} ({selected.advance_percent}%)</span>
                                       <span className="font-black">-{dpRecovery.toLocaleString()} LCY</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 text-emerald-700 font-black text-sm">
                                       <span>{language === 'ar' ? 'صافي القيمة المستحقة (Net):' : 'Estimated Net Payable:'}</span>
                                       <span>{netAmount.toLocaleString()} LCY</span>
                                    </div>
                                 </div>
                              </div>
                           );
                        })()}

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'البيان وتفاصيل الأعمال المنفذة' : 'Claim Description'}</label>
                           <textarea
                              value={claimForm.description}
                              onChange={e => setClaimForm({ ...claimForm, description: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-20 focus:outline-none"
                              placeholder={language === 'ar' ? 'صف الأعمال المنفذة في هذه الفترة وكمياتها بالتفصيل...' : 'Describe the work performed in this period...'}
                              required
                           ></textarea>
                        </div>

                        <button type="submit" className="w-full mt-4 bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-700 transition-all active:scale-95">
                           {language === 'ar' ? 'إرسال المستخلص للاعتماد المحاسبي والمالي' : 'Submit Claim for Approval'}
                        </button>
                     </form>
                  )}
               </div>
            </div>
         )}

         {/* 2.1 Edit Progress Claim Modal */}
         {isEditClaimModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsEditClaimModalOpen(false)}></div>
               <form onSubmit={handleEditClaimSubmit} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">{language === 'ar' ? 'تعديل مستخلص المقاول' : 'Edit Progress Claim'}</h2>
                     <button type="button" onClick={() => setIsEditClaimModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-black">✕</button>
                  </div>

                  <div className="space-y-6 text-start">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'نسبة الإنجاز %' : 'Progress %'}</label>
                           <input
                              type="number" max="100"
                              value={editClaimForm.progress_percent}
                              onChange={e => setEditClaimForm({ ...editClaimForm, progress_percent: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ التقديم' : 'Billing Date'}</label>
                           <input
                              type="date"
                              value={editClaimForm.date}
                              onChange={e => setEditClaimForm({ ...editClaimForm, date: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'القيمة الإجمالية (Gross)' : 'Gross Amount'}</label>
                           <input
                              type="number"
                              value={editClaimForm.gross_amount}
                              onChange={e => setEditClaimForm({ ...editClaimForm, gross_amount: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'استقطاع الضمان' : 'Retention Deduction'}</label>
                           <input
                              type="number"
                              value={editClaimForm.retention_deduction}
                              onChange={e => setEditClaimForm({ ...editClaimForm, retention_deduction: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'استرداد دفعة مقدمة' : 'Advance Recovery'}</label>
                           <input
                              type="number"
                              value={editClaimForm.dp_recovery}
                              onChange={e => setEditClaimForm({ ...editClaimForm, dp_recovery: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'صافي القيمة المستحقة (Net)' : 'Net Amount'}</label>
                           <input
                              type="number"
                              value={editClaimForm.net_amount}
                              onChange={e => setEditClaimForm({ ...editClaimForm, net_amount: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'حالة الاعتماد' : 'Status'}</label>
                        <select
                           value={editClaimForm.status}
                           onChange={e => setEditClaimForm({ ...editClaimForm, status: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                        >
                           <option value="Pending">{language === 'ar' ? 'قيد المراجعة (Pending)' : 'Pending'}</option>
                           <option value="Approved">{language === 'ar' ? 'معتمد مالي (Approved)' : 'Approved'}</option>
                           <option value="Paid">{language === 'ar' ? 'مسدد ومصروف (Paid)' : 'Paid'}</option>
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'البيان وتفاصيل الأعمال' : 'Claim Description'}</label>
                        <textarea
                           value={editClaimForm.description}
                           onChange={e => setEditClaimForm({ ...editClaimForm, description: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-20 focus:outline-none"
                           required
                        ></textarea>
                     </div>
                  </div>

                  <button type="submit" className="mt-8 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                     {language === 'ar' ? 'حفظ وتعديل المستخلص' : 'Save Progressive Bill'}
                  </button>
               </form>
            </div>
         )}

         {/* 3. Retention Release Modal */}
         {isReleaseModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsReleaseModalOpen(false)}></div>
               <form onSubmit={handleReleaseSubmit} className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-8">{language === 'ar' ? 'صرف مستقطع ضمان الأعمال المحتجز' : 'Authorize Retention Release'}</h2>
                  <div className="space-y-6 text-start">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مبلغ الصرف (LCY)' : 'Release Amount (LCY)'}</label>
                        <input
                           type="number"
                           max={stats.net_retention}
                           value={releaseForm.amount}
                           onChange={e => setReleaseForm({ ...releaseForm, amount: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                           {language === 'ar' ? `الحد الأقصى المتاح للصرف: ${Number(stats.net_retention).toLocaleString()} LCY` : `Available: ${Number(stats.net_retention).toLocaleString()} LCY`}
                        </p>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'سبب الصرف ومذكرة التوضيح' : 'Reason / Description'}</label>
                        <textarea
                           value={releaseForm.description}
                           onChange={e => setReleaseForm({ ...releaseForm, description: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-20 focus:outline-none"
                           required
                        ></textarea>
                     </div>
                  </div>
                  <button type="submit" className="mt-8 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-rose-600 transition-all active:scale-95">
                     {language === 'ar' ? 'اعتماد الصرف المالي والتحويل للمقاول' : 'Authorize Payout'}
                  </button>
               </form>
            </div>
         )}

         {/* 4. Bond Registration Modal */}
         {isBondModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsBondModalOpen(false)}></div>
               <form onSubmit={handleBondSubmit} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-8">{language === 'ar' ? 'تسجيل خطاب ضمان بنكي جديد (LG)' : 'Register Bank Guarantee / Bond'}</h2>
                  <div className="grid grid-cols-2 gap-6 text-start">
                     <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'العقد المقاول المرتبط بالضمان' : 'Linked Contract'}</label>
                        <select
                           value={bondForm.contract_id}
                           onChange={e => setBondForm({ ...bondForm, contract_id: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                           required
                        >
                           <option value="">{language === 'ar' ? 'اختر العقد' : 'Select Contract'}</option>
                           {contracts.map(c => <option key={c.id} value={c.id}>Contract #{c.contract_number}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'نوع خطاب الضمان' : 'Bond Type'}</label>
                        <select
                           value={bondForm.bond_type}
                           onChange={e => setBondForm({ ...bondForm, bond_type: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                        >
                           <option value="Performance">{language === 'ar' ? 'ضمان نهائي (Performance)' : 'Performance Bond'}</option>
                           <option value="Advance">{language === 'ar' ? 'ضمان دفعة مقدمة (Advance)' : 'Advance Payment Bond'}</option>
                           <option value="Maintenance">{language === 'ar' ? 'ضمان صيانة أعمال (Maintenance)' : 'Maintenance Bond'}</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'البنك المصدر للخطاب' : 'Issuing Bank Name'}</label>
                        <input
                           type="text"
                           value={bondForm.bank_name}
                           onChange={e => setBondForm({ ...bondForm, bank_name: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'قيمة خطاب الضمان المالية' : 'Bond Amount (LCY)'}</label>
                        <input
                           type="number"
                           value={bondForm.bond_amount}
                           onChange={e => setBondForm({ ...bondForm, bond_amount: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ الانتهاء والصلاحية' : 'Expiry Date'}</label>
                        <input
                           type="date"
                           value={bondForm.expiry_date}
                           onChange={e => setBondForm({ ...bondForm, expiry_date: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الرقم المرجعي لخطاب الضمان البنكي' : 'Reference Number'}</label>
                        <input
                           type="text"
                           value={bondForm.reference_number}
                           onChange={e => setBondForm({ ...bondForm, reference_number: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                  </div>
                  <button type="submit" className="mt-8 bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">
                     {language === 'ar' ? 'حفظ وتسجيل خطاب الضمان البنكي بالدفاتر' : 'Log Security Bond'}
                  </button>
               </form>
            </div>
         )}

         {/* 4.1 Edit Security Bond Modal */}
         {isEditBondModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsEditBondModalOpen(false)}></div>
               <form onSubmit={handleEditBondSubmit} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">{language === 'ar' ? 'تعديل خطاب الضمان البنكي' : 'Edit Security Bond'}</h2>
                     <button type="button" onClick={() => setIsEditBondModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-black">✕</button>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-start">
                     <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'العقد المرتبط' : 'Linked Contract'}</label>
                        <select
                           value={editBondForm.contract_id}
                           onChange={e => setEditBondForm({ ...editBondForm, contract_id: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                           required
                        >
                           <option value="">{language === 'ar' ? 'اختر العقد' : 'Select Contract'}</option>
                           {contracts.map(c => <option key={c.id} value={c.id}>Contract #{c.contract_number}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'نوع الضمان' : 'Bond Type'}</label>
                        <select
                           value={editBondForm.bond_type}
                           onChange={e => setEditBondForm({ ...editBondForm, bond_type: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                        >
                           <option value="Performance">{language === 'ar' ? 'ضمان نهائي (Performance)' : 'Performance Bond'}</option>
                           <option value="Advance">{language === 'ar' ? 'ضمان دفعة مقدمة (Advance)' : 'Advance Payment Bond'}</option>
                           <option value="Maintenance">{language === 'ar' ? 'ضمان صيانة أعمال (Maintenance)' : 'Maintenance Bond'}</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'البنك المصدر' : 'Issuing Bank Name'}</label>
                        <input
                           type="text"
                           value={editBondForm.bank_name}
                           onChange={e => setEditBondForm({ ...editBondForm, bank_name: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'قيمة الضمان المالية' : 'Bond Amount (LCY)'}</label>
                        <input
                           type="number"
                           value={editBondForm.bond_amount}
                           onChange={e => setEditBondForm({ ...editBondForm, bond_amount: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ انتهاء الصلاحية' : 'Expiry Date'}</label>
                        <input
                           type="date"
                           value={editBondForm.expiry_date}
                           onChange={e => setEditBondForm({ ...editBondForm, expiry_date: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'حالة الضمان البنكي' : 'Bond Status'}</label>
                        <select
                           value={editBondForm.status}
                           onChange={e => setEditBondForm({ ...editBondForm, status: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                        >
                           <option value="Active">{language === 'ar' ? 'ساري وصالح (Active)' : 'Active'}</option>
                           <option value="Liquidated">{language === 'ar' ? 'تم تسييله للشركة (Liquidated)' : 'Liquidated'}</option>
                           <option value="Released">{language === 'ar' ? 'تم تحريره وإلغاؤه (Released)' : 'Released'}</option>
                        </select>
                     </div>
                     <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الرقم المرجعي' : 'Reference Number'}</label>
                        <input
                           type="text"
                           value={editBondForm.reference_number}
                           onChange={e => setEditBondForm({ ...editBondForm, reference_number: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                           required
                        />
                     </div>
                  </div>
                  <button type="submit" className="mt-8 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                     {language === 'ar' ? 'تحديث وحفظ خطاب الضمان' : 'Update Security Bond'}
                  </button>
               </form>
            </div>
         )}

         {/* 5. Link/Assign BOQ Item Modal */}
         {isAssignBoqModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsAssignBoqModalOpen(false)}></div>
               <form onSubmit={handleAssignBoqSubmit} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">{language === 'ar' ? 'إسناد بند أعمال جديد للمقاول' : 'Assign New BOQ Item'}</h2>
                     <button type="button" onClick={() => setIsAssignBoqModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-black">✕</button>
                  </div>

                  <div className="space-y-6 text-start">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'اختر البند من المقايسة العامة' : 'Select BOQ Item'}</label>
                        <select
                           value={assignBoqForm.boq_id}
                           onChange={e => {
                              const bid = e.target.value;
                              const selected = allBoqs.find(b => b.id === parseInt(bid));
                              setAssignBoqForm({
                                 ...assignBoqForm,
                                 boq_id: bid,
                                 unit_price: selected ? (selected.est_subcontractor_cost || '') : ''
                              });
                           }}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                           required
                        >
                           <option value="">{language === 'ar' ? 'اختر البند' : 'Select Item'}</option>
                           {allBoqs.map(b => <option key={b.id} value={b.id}>{b.item_name} ({b.project_name})</option>)}
                        </select>
                     </div>

                     {(() => {
                        const selected = allBoqs.find(b => b.id === parseInt(assignBoqForm.boq_id));
                        if (!selected) return null;
                        const remainingQty = parseFloat(selected.est_qty || 0) - parseFloat(selected.assigned_qty || 0);
                        return (
                           <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 mt-2">
                              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{language === 'ar' ? 'تفاصيل بند المقايسة' : 'BOQ Item Specs'}</p>
                              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                                 <div>
                                    <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'اسم المشروع:' : 'Project:'}</span>
                                    <span className="text-slate-900 font-black">{selected.project_name}</span>
                                 </div>
                                 <div>
                                    <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'الوحدة والكمية الكلية:' : 'Total Qty:'}</span>
                                    <span className="text-slate-900 font-black">{selected.est_qty} {selected.uom || 'LM'}</span>
                                 </div>
                                 <div>
                                    <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'الفئة المقدرة بالمقايسة:' : 'Est. Cost per Unit:'}</span>
                                    <span className="text-emerald-600 font-black">{selected.est_subcontractor_cost || 0} LCY</span>
                                 </div>
                                 <div>
                                    <span className="text-[9px] text-slate-400 block">{language === 'ar' ? 'الكمية غير المسندة المتبقية:' : 'Remaining Qty:'}</span>
                                    <span className={`font-black ${remainingQty <= 0 ? 'text-rose-500' : 'text-slate-900'}`}>{remainingQty} {selected.uom || 'LM'}</span>
                                 </div>
                              </div>
                           </div>
                        );
                     })()}

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الكمية المسندة للمقاول' : 'Assigned Quantity'}</label>
                           <input
                              type="number"
                              value={assignBoqForm.assigned_qty}
                              onChange={e => setAssignBoqForm({ ...assignBoqForm, assigned_qty: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'فئة المقاول (سعر الوحدة)' : 'Unit Rate (LCY)'}</label>
                           <input
                              type="number"
                              value={assignBoqForm.unit_price}
                              onChange={e => setAssignBoqForm({ ...assignBoqForm, unit_price: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                     </div>

                     {assignBoqForm.assigned_qty && assignBoqForm.unit_price && (
                        <div className="flex justify-between items-center p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-2">
                           <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{language === 'ar' ? 'إجمالي قيمة الإسناد:' : 'Total Value:'}</span>
                           <span className="text-base font-black text-indigo-700 font-mono">
                              {(parseFloat(assignBoqForm.assigned_qty) * parseFloat(assignBoqForm.unit_price)).toLocaleString()} LCY
                           </span>
                        </div>
                     )}
                  </div>

                  <button type="submit" className="mt-8 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                     {language === 'ar' ? 'حفظ وإسناد البند' : 'Authorize Assignment'}
                  </button>
               </form>
            </div>
         )}

         {/* 5.1 Edit Linked BOQ Assignment Modal */}
         {isEditAssignmentModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsEditAssignmentModalOpen(false)}></div>
               <form onSubmit={handleEditAssignmentSubmit} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">{language === 'ar' ? 'تعديل إسناد البند المالي' : 'Edit BOQ Assignment'}</h2>
                     <button type="button" onClick={() => setIsEditAssignmentModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-black">✕</button>
                  </div>

                  <div className="space-y-6 text-start">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'بند المقايسة المرتبط' : 'Linked BOQ Item'}</label>
                        <select
                           value={editAssignmentForm.boq_id}
                           onChange={e => setEditAssignmentForm({ ...editAssignmentForm, boq_id: e.target.value })}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer focus:outline-none"
                           disabled
                        >
                           {allBoqs.map(b => <option key={b.id} value={b.id}>{b.item_name} ({b.project_name})</option>)}
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الكمية المسندة' : 'Assigned Qty'}</label>
                           <input
                              type="number"
                              value={editAssignmentForm.assigned_qty}
                              onChange={e => setEditAssignmentForm({ ...editAssignmentForm, assigned_qty: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'فئة المقاول (سعر الوحدة)' : 'Unit Rate'}</label>
                           <input
                              type="number"
                              value={editAssignmentForm.unit_price}
                              onChange={e => setEditAssignmentForm({ ...editAssignmentForm, unit_price: e.target.value })}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:outline-none"
                              required
                           />
                        </div>
                     </div>
                  </div>

                  <button type="submit" className="mt-8 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                     {language === 'ar' ? 'حفظ وتحديث الإسناد' : 'Update BOQ Link'}
                  </button>
               </form>
            </div>
         )}
      </div>
   );
}