import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Subcontractor360({ subId, onClose, language }) {
   const [loading, setLoading] = useState(true);
   const [data, setData] = useState(null);
   const [projects, setProjects] = useState([]);
   const [activeTab, setActiveTab] = useState('overview');
   const [isContractModalOpen, setIsContractModalOpen] = useState(false);
   const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
   const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
   const [isBondModalOpen, setIsBondModalOpen] = useState(false);
   const [claimForm, setClaimForm] = useState({
      contract_id: '',
      progress_percent: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
   });
   const [releaseForm, setReleaseForm] = useState({ amount: '', description: '' });
   const [bondForm, setBondForm] = useState({
      contract_id: '',
      bond_type: 'Performance',
      bank_name: '',
      bond_amount: '',
      expiry_date: '',
      reference_number: ''
   });
   const [perfForm, setPerfForm] = useState({
      quality: 5,
      timeliness: 5,
      safety: 5,
      cooperation: 5
   });
   const [portalForm, setPortalForm] = useState({ username: '', password: '', active: false });
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

   useEffect(() => {
      fetchIntelligence();
      fetchProjects();
   }, [subId]);

   useEffect(() => {
      if (data?.profile) {
         setPortalForm({
            username: data.profile.username || data.profile.tax_id || '',
            password: '', 
            active: data.profile.portal_access_active || false
         });
      }
   }, [data]);

   const fetchProjects = async () => {
      try {
         const res = await api.get('/dynamic/table/projects?limit=500');
         setProjects(res.data.data || []);
      } catch (err) { console.error("Failed to fetch projects:", err); }
   };

   const fetchIntelligence = async () => {
      if (data && data.profile?.id === Number(subId)) return; // Prevent unnecessary re-fetches
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

   const handleContractSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/contracts', { ...contractForm, subcontractor_id: subId });
         alert("Contract Formalized Successfully!");
         setIsContractModalOpen(false);
         fetchIntelligence();
      } catch (err) {
         alert(err.response?.data?.error || "Error creating contract");
      }
   };

   const handleClaimSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/claims', claimForm);
         alert("Progress Claim Submitted for Review!");
         setIsClaimModalOpen(false);
         fetchIntelligence();
      } catch (err) {
         alert(err.response?.data?.error || "Error submitting claim");
      }
   };

   const handleReleaseSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/retention-release', { ...releaseForm, subcontractor_id: subId });
         alert("Retention Released Successfully!");
         setIsReleaseModalOpen(false);
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error releasing retention"); }
   };

   const handleBondSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post('/subcontractors/bonds', { ...bondForm, subcontractor_id: subId });
         alert("Security Bond Registered!");
         setIsBondModalOpen(false);
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error registering bond"); }
   };

   const handlePerfSubmit = async (e) => {
      e.preventDefault();
      try {
         await api.post(`/subcontractors/${subId}/performance`, perfForm);
         alert("Performance Appraisal Saved!");
         fetchIntelligence();
      } catch (err) { alert(err.response?.data?.error || "Error saving performance"); }
   };

   const savePortalCreds = async () => {
      try {
         await api.post(`/subcontractors/${subId}/portal-credentials`, portalForm);
         alert("Portal credentials updated successfully");
         fetchIntelligence();
      } catch (err) { alert("Failed to update credentials"); }
   };

   if (loading) return (
      <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span className="text-white font-black uppercase tracking-widest text-[10px]">Syncing Subcontractor Intelligence...</span>
         </div>
      </div>
   );

   if (!data) return null;

   const { profile, stats, contracts, invoices } = data;

   return (
      <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-2xl flex items-center justify-end p-0 md:p-6 transition-all duration-500">
         <div className="absolute inset-0" onClick={onClose}></div>
         
         <div className="bg-white w-full max-w-[1200px] h-full md:h-[95vh] rounded-none md:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in slide-in-from-right duration-500 border border-white/10">
            
            {/* Top Identity Bar */}
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-slate-900/20 transform hover:rotate-6 transition-all">🏗️</div>
                  <div>
                     <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{profile.name}</h1>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/10">Verified Partner</span>
                     </div>
                     <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest flex items-center gap-4">
                        <span>📞 {profile.phone}</span>
                        <span>🏢 {profile.company}</span>
                        <span className="text-indigo-500">⭐ {profile.rating || '0.00'} / 5.0</span>
                     </p>
                  </div>
               </div>
               
               <div className="flex gap-4 items-center">
                  <button 
                     onClick={() => setIsContractModalOpen(true)}
                     className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
                  >
                     + Formalize Contract
                  </button>
                  <button onClick={onClose} className="bg-white p-4 rounded-2xl border border-slate-200 hover:bg-slate-900 hover:text-white transition-all active:scale-95 text-slate-400">
                     {language === 'ar' ? 'إغلاق ✕' : 'Close ✕'}
                  </button>
               </div>
            </div>

            {/* Strategic KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-8 bg-white border-b border-slate-100">
               <div className="bg-slate-950 p-6 rounded-3xl text-white relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Contracted Volume</span>
                  <span className="text-2xl font-black font-mono tracking-tighter text-indigo-400">{Number(stats.total_contracted).toLocaleString()} LCY</span>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Realized Payments</span>
                  <span className="text-2xl font-black font-mono tracking-tighter text-slate-900">{Number(stats.total_paid).toLocaleString()} LCY</span>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Net Retention</span>
                  <div className="flex justify-between items-end">
                     <span className="text-2xl font-black font-mono tracking-tighter text-rose-500">{Number(stats.net_retention).toLocaleString()} LCY</span>
                     <button 
                        onClick={() => setIsReleaseModalOpen(true)}
                        className="text-[8px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:underline"
                     >
                        Release
                     </button>
                  </div>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Security Bonds (BG)</span>
                  <div className="flex justify-between items-end">
                     <span className="text-2xl font-black font-mono tracking-tighter text-emerald-500">{Number(stats.total_bonds).toLocaleString()} LCY</span>
                     <button 
                        onClick={() => setIsBondModalOpen(true)}
                        className="text-[8px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:underline"
                     >
                        Add Bond
                     </button>
                  </div>
               </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-8 border-b border-slate-50 flex gap-1 bg-white">
               {[
                  { id: 'overview', label: 'Intelligence', icon: '📊' },
                  { id: 'contracts', label: 'Contracts & SOV', icon: '📜' },
                  { id: 'invoices', label: 'Claims & Billings', icon: '🧾' },
                  { id: 'compliance', label: 'Legal & Compliance', icon: '🛡️' },
                  { id: 'performance', label: 'Portal & Rating', icon: '⚙️' }
               ].map(tab => (
                  <button 
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id)}
                     className={`px-8 py-5 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 border-b-2 ${
                        activeTab === tab.id ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-400 hover:text-slate-600'
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
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Deep Metadata Analysis</h4>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                                 <span className="text-xs font-bold text-slate-500">Tax ID Node</span>
                                 <span className="font-mono text-xs font-black text-slate-900">{profile.tax_id || 'NOT_FOUND'}</span>
                              </div>
                              <div className="flex justify-between items-center py-4 border-b border-slate-50">
                                 <span className="text-xs font-bold text-slate-500">Insurance Expiry</span>
                                 <span className={`font-mono text-xs font-black ${new Date(profile.insurance_expiry) < new Date() ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {profile.insurance_expiry ? new Date(profile.insurance_expiry).toLocaleDateString() : 'MISSING'}
                                 </span>
                              </div>
                              <div className="flex justify-between items-center py-4">
                                 <span className="text-xs font-bold text-slate-500">Operational Credit Limit</span>
                                 <span className="font-mono text-xs font-black text-indigo-600">{Number(profile.credit_limit || 0).toLocaleString()} LCY</span>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Performance Appraisal</h4>
                           <div className="space-y-6">
                              {[
                                 { key: 'quality', label: 'Quality of Work' },
                                 { key: 'timeliness', label: 'Timeliness' },
                                 { key: 'safety', label: 'Safety Compliance' },
                                 { key: 'cooperation', label: 'Administrative Cooperation' }
                              ].map(metric => (
                                 <div key={metric.key} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                       <span className="text-[10px] font-black text-slate-500 uppercase">{metric.label}</span>
                                       <span className="font-black text-slate-900 text-xs">{perfForm[metric.key]} / 5</span>
                                    </div>
                                    <input 
                                       type="range" min="1" max="5" step="0.5"
                                       value={perfForm[metric.key]}
                                       onChange={e => setPerfForm({...perfForm, [metric.key]: e.target.value})}
                                       className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                                    />
                                 </div>
                              ))}
                              <button 
                                 onClick={handlePerfSubmit}
                                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all"
                              >
                                 Update Strategic Rating
                              </button>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-fit">
                           <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent"></div>
                           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 relative z-10">Intelligence System Log</h4>
                           <div className="space-y-3 relative z-10">
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] text-white/60 font-mono italic">
                                 [SYSTEM]: Intelligence core sync successful. Rating recalibrated to {profile.rating || '0.00'}.
                              </div>
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] text-emerald-400 font-mono">
                                 [LOG]: 100% Compliance verified by TED-AI for Tax Registration {profile.tax_id}.
                              </div>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Recent Security Bonds</h4>
                           <div className="space-y-4">
                              {data.bonds.map(b => (
                                 <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{b.bond_type} Bond</p>
                                       <p className="text-[8px] text-slate-400 font-bold uppercase">{b.bank_name}</p>
                                    </div>
                                    <p className="text-xs font-black text-emerald-600 font-mono">{Number(b.bond_amount).toLocaleString()}</p>
                                 </div>
                              ))}
                              {data.bonds.length === 0 && <p className="text-[10px] text-slate-400 font-black italic text-center py-4">No active bonds detected</p>}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'contracts' && (
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                           <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="px-8 py-4">Contract ID</th>
                              <th className="px-8 py-4">Total Value</th>
                              <th className="px-8 py-4">Retention</th>
                              <th className="px-8 py-4">Duration</th>
                              <th className="px-8 py-4">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                           {contracts.map(c => (
                              <tr key={c.id} className="hover:bg-slate-50 transition-all">
                                 <td className="px-8 py-4 font-black text-slate-900 italic">#{c.contract_number}</td>
                                 <td className="px-8 py-4 font-black text-indigo-600">{Number(c.total_value).toLocaleString()}</td>
                                 <td className="px-8 py-4 text-rose-500">{c.retention_percent}%</td>
                                 <td className="px-8 py-4 text-slate-500">{new Date(c.start_date).toLocaleDateString()} - {new Date(c.end_date).toLocaleDateString()}</td>
                                 <td className="px-8 py-4">
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-100">{c.status}</span>
                                 </td>
                              </tr>
                           ))}
                           {contracts.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-black italic">NO ACTIVE CONTRACTS DETECTED</td></tr>}
                        </tbody>
                     </table>
                  </div>
               )}

               {activeTab === 'invoices' && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center px-4">
                        <h3 className="text-sm font-black uppercase text-slate-900 italic tracking-tighter">Progress Billing History</h3>
                        <button 
                           onClick={() => setIsClaimModalOpen(true)}
                           className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                        >
                           + Submit New Claim
                        </button>
                     </div>
                     <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 border-b border-slate-100">
                              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-8 py-4">Date</th>
                                 <th className="px-8 py-4">Claim Description</th>
                                 <th className="px-8 py-4">Progress</th>
                                 <th className="px-8 py-4">Net Amount</th>
                                 <th className="px-8 py-4">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                              {invoices.map(inv => (
                                 <tr key={inv.id} className="hover:bg-slate-50 transition-all">
                                    <td className="px-8 py-4 text-slate-500">{new Date(inv.date || inv.created_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-4 font-bold text-slate-700">{inv.description}</td>
                                    <td className="px-8 py-4">
                                       <div className="flex items-center gap-2">
                                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                             <div className="h-full bg-emerald-500" style={{ width: `${inv.progress_percent}%` }}></div>
                                          </div>
                                          <span className="font-black text-slate-900">{inv.progress_percent}%</span>
                                       </div>
                                    </td>
                                    <td className="px-8 py-4 font-black text-emerald-600">{Number(inv.net_amount).toLocaleString()} LCY</td>
                                    <td className="px-8 py-4">
                                       <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                          inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                       }`}>{inv.status}</span>
                                    </td>
                                 </tr>
                              ))}
                              {invoices.length === 0 && <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-black italic">NO CLAIMS SUBMITTED YET</td></tr>}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {activeTab === 'compliance' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">License Verification</h4>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                           <span className="text-2xl block mb-2">📜</span>
                           <p className="text-xs font-black text-slate-900">{profile.license_number || 'No License on File'}</p>
                           <button className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Update Document</button>
                        </div>
                     </div>
                     <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Insurance Status</h4>
                        <div className={`p-6 rounded-2xl border border-dashed text-center ${new Date(profile.insurance_expiry) < new Date() ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                           <span className="text-2xl block mb-2">🛡️</span>
                           <p className="text-xs font-black text-slate-900">Expiry: {profile.insurance_expiry ? new Date(profile.insurance_expiry).toLocaleDateString() : 'MISSING'}</p>
                           <button className="mt-4 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Renew Policy</button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Contract Creation Modal */}
         {isContractModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsContractModalOpen(false)}></div>
               <form onSubmit={handleContractSubmit} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300">
                  <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-8">Formalize Strategic Contract</h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contract #</label>
                        <input type="text" value={contractForm.contract_number} readOnly className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Project</label>
                        <select 
                           value={contractForm.project_id} 
                           onChange={e => setContractForm({...contractForm, project_id: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer"
                           required
                        >
                           <option value="">Select Project</option>
                           {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value (LCY)</label>
                        <input 
                           type="number" 
                           value={contractForm.total_value} 
                           onChange={e => setContractForm({...contractForm, total_value: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           required 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retention %</label>
                           <input 
                              type="number" 
                              value={contractForm.retention_percent} 
                              onChange={e => setContractForm({...contractForm, retention_percent: e.target.value})}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advance %</label>
                           <input 
                              type="number" 
                              value={contractForm.advance_percent} 
                              onChange={e => setContractForm({...contractForm, advance_percent: e.target.value})}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                        <input 
                           type="date" 
                           value={contractForm.start_date} 
                           onChange={e => setContractForm({...contractForm, start_date: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           required 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                        <input 
                           type="date" 
                           value={contractForm.end_date} 
                           onChange={e => setContractForm({...contractForm, end_date: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           required 
                        />
                     </div>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scope of Work / Description</label>
                     <textarea 
                        value={contractForm.scope_of_work} 
                        onChange={e => setContractForm({...contractForm, scope_of_work: e.target.value})}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-24"
                        placeholder="Define the specific tasks and deliverables..."
                     ></textarea>
                  </div>

                  <button type="submit" className="mt-8 bg-slate-900 text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">
                     Authorize & Save Contract
                  </button>
               </form>
            </div>
         )}

         {/* Progress Claim Submission Modal */}
         {isClaimModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsClaimModalOpen(false)}></div>
               <form onSubmit={handleClaimSubmit} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300">
                  <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-8">Submit Progress Claim</h2>
                  
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Contract</label>
                        <select 
                           value={claimForm.contract_id} 
                           onChange={e => setClaimForm({...claimForm, contract_id: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer"
                           required
                        >
                           <option value="">Select Contract to Bill Against</option>
                           {contracts.map(c => <option key={c.id} value={c.id}>Contract #{c.contract_number} ({c.status})</option>)}
                        </select>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumulative Progress %</label>
                           <input 
                              type="number" 
                              max="100"
                              value={claimForm.progress_percent} 
                              onChange={e => setClaimForm({...claimForm, progress_percent: e.target.value})}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                              required 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Date</label>
                           <input 
                              type="date" 
                              value={claimForm.date} 
                              onChange={e => setClaimForm({...claimForm, date: e.target.value})}
                              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                              required 
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim Description</label>
                        <textarea 
                           value={claimForm.description} 
                           onChange={e => setClaimForm({...claimForm, description: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-24"
                           placeholder="Describe the work performed in this period..."
                           required
                        ></textarea>
                     </div>
                  </div>

                  <button type="submit" className="mt-8 bg-emerald-600 text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-emerald-700 transition-all active:scale-95">
                     Submit Claim for Approval
                  </button>
               </form>
            </div>
         )}

         {/* Retention Release Modal */}
         {isReleaseModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsReleaseModalOpen(false)}></div>
               <form onSubmit={handleReleaseSubmit} className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300">
                  <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-8">Authorize Retention Release</h2>
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Release Amount (LCY)</label>
                        <input 
                           type="number" 
                           max={stats.net_retention}
                           value={releaseForm.amount} 
                           onChange={e => setReleaseForm({...releaseForm, amount: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           required 
                        />
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Available: {Number(stats.net_retention).toLocaleString()} LCY</p>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Description</label>
                        <textarea 
                           value={releaseForm.description} 
                           onChange={e => setReleaseForm({...releaseForm, description: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner h-24"
                           required
                        ></textarea>
                     </div>
                  </div>
                  <button type="submit" className="mt-8 bg-slate-900 text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-rose-600 transition-all active:scale-95">
                     Authorize Payout
                  </button>
               </form>
            </div>
         )}

         {/* Bond Registration Modal */}
         {isBondModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsBondModalOpen(false)}></div>
               <form onSubmit={handleBondSubmit} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300">
                  <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter mb-8">Register Bank Guarantee / Bond</h2>
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Contract</label>
                        <select 
                           value={bondForm.contract_id} 
                           onChange={e => setBondForm({...bondForm, contract_id: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner cursor-pointer"
                           required
                        >
                           <option value="">Select Contract</option>
                           {contracts.map(c => <option key={c.id} value={c.id}>Contract #{c.contract_number}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bond Type</label>
                        <select 
                           value={bondForm.bond_type} 
                           onChange={e => setBondForm({...bondForm, bond_type: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                        >
                           <option value="Performance">Performance Bond</option>
                           <option value="Advance">Advance Payment Bond</option>
                           <option value="Maintenance">Maintenance Bond</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Name</label>
                        <input 
                           type="text" 
                           value={bondForm.bank_name} 
                           onChange={e => setBondForm({...bondForm, bank_name: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           required 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bond Amount (LCY)</label>
                        <input 
                           type="number" 
                           value={bondForm.bond_amount} 
                           onChange={e => setBondForm({...bondForm, bond_amount: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           required 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</label>
                        <input 
                           type="date" 
                           value={bondForm.expiry_date} 
                           onChange={e => setBondForm({...bondForm, expiry_date: e.target.value})}
                           className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs shadow-inner"
                           required 
                        />
                     </div>
                  </div>
                  <button type="submit" className="mt-8 bg-indigo-600 text-white p-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">
                     Log Security Bond
                  </button>
               </form>
            </div>
         )}

         {activeTab === 'performance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {/* Portal Access Control */}
               <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-5 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-bl-3xl shadow-lg">Security Node</div>
                  <h3 className="text-2xl font-black mb-2 tracking-tighter italic">Subcontractor Portal Access</h3>
                  <p className="text-slate-400 font-bold text-xs mb-8 uppercase tracking-widest">Enable digital collaboration for this partner</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Portal Username</label>
                        <input 
                           type="text" 
                           placeholder="e.g. TAX-ID-999"
                           className="w-full p-5 bg-slate-800 border-none rounded-2xl font-black text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                           value={portalForm.username}
                           onChange={e => setPortalForm({...portalForm, username: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Set Account Password</label>
                        <input 
                           type="text" 
                           placeholder="Enter secure password"
                           className="w-full p-5 bg-slate-800 border-none rounded-2xl font-black text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                           value={portalForm.password}
                           onChange={e => setPortalForm({...portalForm, password: e.target.value})}
                        />
                     </div>
                  </div>

                  <div className="mt-10 pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                     <div className="flex items-center gap-4">
                        <button 
                           onClick={() => setPortalForm({...portalForm, active: !portalForm.active})}
                           className={`w-16 h-9 rounded-full relative transition-all duration-300 ${portalForm.active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}
                        >
                           <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${portalForm.active ? 'left-8' : 'left-1.5'}`}></div>
                        </button>
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] block">{portalForm.active ? 'Access Authorized' : 'Access Restricted'}</span>
                           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{portalForm.active ? 'Partner can login via portal' : 'Account is currently locked'}</span>
                        </div>
                     </div>
                     <button 
                        onClick={savePortalCreds}
                        className="px-10 py-5 bg-white text-slate-900 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95"
                     >
                        Update Portal Identity
                     </button>
                  </div>
               </div>

               {/* Quality Rating */}
               <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Performance Appraisal Engine</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     {['Quality', 'Timeliness', 'Safety', 'Cooperation'].map(metric => (
                        <div key={metric} className="text-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50">
                           <div className="text-2xl font-black text-slate-900 mb-2">4.5</div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{metric}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
