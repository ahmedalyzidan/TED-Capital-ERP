import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function InterCompany() {
   const { language } = useLanguage();
   const activeCompany = localStorage.getItem('active_company') || '';
   const [loading, setLoading] = useState(true);
   const [transactions, setTransactions] = useState([]);
   const [companies, setCompanies] = useState([]);
   const [projects, setProjects] = useState([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [formData, setFormData] = useState({
      source_company_id: '',
      target_company_id: '',
      amount: '',
      description: '',
      project_id: ''
   });

   useEffect(() => {
      fetchData();
   }, []);

   const fetchData = async () => {
      setLoading(true);
      try {
         const [txRes, compRes, projRes] = await Promise.all([
            api.get('/dynamic/table/intercompany_transactions?limit=100'),
            api.get('/dynamic/table/companies'),
            api.get('/dynamic/table/projects?limit=500')
         ]);
         setTransactions(txRes.data.data || []);
         setCompanies(compRes.data.data || []);
         setProjects(projRes.data.data || []);
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      try {
         // This endpoint will be created in the systemController or a new InterCompanyController
         await api.post('/finance/reconcile-ic', formData);
         alert("Transaction Reconciled Successfully!");
         setIsModalOpen(false);
         fetchData();
      } catch (err) {
         alert(err.response?.data?.error || "Error reconciling transaction");
      }
   };

   if (loading) return <div className="p-8 text-center animate-pulse font-black text-slate-400">SYNCING MULTI-ENTITY DATA NODES...</div>;

   return (
      <div className="p-6 space-y-6 text-right bg-slate-50 min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
         
         <div className="flex justify-between items-center bg-slate-950 p-8 rounded-[2rem] text-white shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 opacity-50"></div>
            <div className="relative z-10">
               <h1 className="text-2xl font-black uppercase tracking-tighter italic">Strategic Inter-Company Reconciler</h1>
               <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-1">Multi-Entity Ledger Synchronization • Audit-Ready Protocol</p>
            </div>
            <button 
               onClick={() => {
                  const matching = activeCompany ? companies.find(c => 
                     c.name.toLowerCase().includes(activeCompany.toLowerCase()) || 
                     activeCompany.toLowerCase().includes(c.name.toLowerCase())
                  ) : null;
                  setFormData({
                     source_company_id: matching ? String(matching.id) : '',
                     target_company_id: '',
                     amount: '',
                     description: '',
                     project_id: ''
                  });
                  setIsModalOpen(true);
               }}
               className="bg-white text-slate-950 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl relative z-10"
            >
               + New IC Transaction
            </button>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reconciliation Status</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">Total Volume</span>
                        <span className="text-lg font-black font-mono">{transactions.reduce((acc, t) => acc + Number(t.amount), 0).toLocaleString()} LCY</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">Active Entities</span>
                        <span className="text-lg font-black font-mono">{companies.length}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Transactions Table */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden">
               <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail</h3>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                     <thead className="bg-slate-950 text-white font-black uppercase tracking-widest">
                        <tr>
                           <th className="p-4">Source</th>
                           <th className="p-4">Target</th>
                           <th className="p-4">Amount</th>
                           <th className="p-4">Vouchers</th>
                           <th className="p-4">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-mono">
                        {transactions.map((t, i) => (
                           <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-sans font-black text-slate-900">{companies.find(c => c.id === t.source_company_id)?.name || 'N/A'}</td>
                              <td className="p-4 font-sans font-black text-slate-900">{companies.find(c => c.id === t.target_company_id)?.name || 'N/A'}</td>
                              <td className="p-4 font-black text-emerald-600">{Number(t.amount).toLocaleString()}</td>
                              <td className="p-4 text-[9px] text-slate-500">
                                 <div>{t.source_voucher}</div>
                                 <div className="text-indigo-400">{t.target_voucher}</div>
                              </td>
                              <td className="p-4">
                                 <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-black uppercase text-[8px]">Reconciled</span>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>

         {/* Modal */}
         {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
               <form onSubmit={handleSubmit} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-8 border border-white/20">
                  <h2 className="text-lg font-black uppercase tracking-tighter mb-6 text-slate-900 italic underline decoration-emerald-500 underline-offset-8">Execute IC Reconciliation</h2>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payer Entity (Company A)</label>
                        <select 
                           className={`w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 ${
                              activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies' ? 'pointer-events-none opacity-80' : ''
                           }`}
                           value={formData.source_company_id}
                           onChange={e => setFormData({...formData, source_company_id: e.target.value})}
                           disabled={activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies'}
                           required
                        >
                           <option value="">Select Entity</option>
                           {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>

                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Receiver Entity (Company B)</label>
                        <select 
                           className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-900"
                           value={formData.target_company_id}
                           onChange={e => setFormData({...formData, target_company_id: e.target.value})}
                           required
                        >
                           <option value="">Select Entity</option>
                           {companies.filter(c => !activeCompany || !(c.name.toLowerCase().includes(activeCompany.toLowerCase()) || activeCompany.toLowerCase().includes(c.name.toLowerCase()))).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                           ))}
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Amount</label>
                           <input 
                              type="number"
                              className="w-full p-4 rounded-2xl bg-slate-50 border-none font-mono font-black text-slate-900"
                              value={formData.amount}
                              onChange={e => setFormData({...formData, amount: e.target.value})}
                              required
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Linked Project</label>
                           <select 
                              className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-900"
                              value={formData.project_id}
                              onChange={e => setFormData({...formData, project_id: e.target.value})}
                           >
                              <option value="">N/A</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                        </div>
                     </div>

                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Strategic Description</label>
                        <textarea 
                           className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 h-24"
                           value={formData.description}
                           onChange={e => setFormData({...formData, description: e.target.value})}
                           placeholder="Describe the nature of the inter-company work..."
                           required
                        ></textarea>
                     </div>
                  </div>

                  <button 
                     type="submit"
                     className="mt-8 bg-slate-950 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl"
                  >
                     Authorize Transaction
                  </button>
               </form>
            </div>
         )}
      </div>
   );
}
