import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function SubcontractorPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('sub-token'));
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');

  // Claim Form State
  const [claimForm, setClaimForm] = useState({ contract_id: '', progress_percent: '', description: '' });

  useEffect(() => {
    if (isLoggedIn) fetchIntelligence();
  }, [isLoggedIn]);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const subId = JSON.parse(atob(localStorage.getItem('sub-token').split('.')[1])).id;
      const res = await api.get(`/subcontractors/${subId}/intelligence`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('sub-token')}` }
      });
      setSubData(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) handleLogout();
    } finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/subcontractors/portal/login', credentials);
      localStorage.setItem('sub-token', res.data.token);
      setIsLoggedIn(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('sub-token');
    setIsLoggedIn(false);
    setSubData(null);
  };

  const submitClaim = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/subcontractors/claims', claimForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('sub-token')}` }
      });
      alert('Claim submitted successfully for review.');
      setClaimForm({ contract_id: '', progress_percent: '', description: '' });
      fetchIntelligence();
    } catch (err) {
      alert(err.response?.data?.error || 'Claim submission failed');
    } finally { setLoading(false); }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="p-12 text-center bg-slate-900 text-white relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl mx-auto mb-6 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20 rotate-3 transition-transform hover:rotate-0">🏗️</div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">TED ERP</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Subcontractor Portal</p>
          </div>
          <form onSubmit={handleLogin} className="p-12 space-y-6">
            {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black text-center border border-rose-100">{error}</div>}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID / Username</label>
              <input 
                type="text" 
                required
                className="w-full p-5 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner"
                value={credentials.username}
                onChange={e => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full p-5 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner"
                value={credentials.password}
                onChange={e => setCredentials({...credentials, password: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Secure Login'}
            </button>
          </form>
          <div className="p-8 bg-slate-50 text-center border-t border-slate-100">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Authorized Access Only</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl font-black">T</div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Portal</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subData?.profile?.name || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="h-10 w-[1px] bg-slate-100"></div>
           <button onClick={handleLogout} className="px-6 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          {['dashboard', 'claims', 'compliance'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-sm ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
           <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing Intelligence...</div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Dashboard View */}
            {activeTab === 'dashboard' && subData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Stats */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 col-span-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Financial Exposure</span>
                  <div className="text-4xl font-black text-slate-900 font-mono mb-2">
                    {Number(subData.stats.total_contracted).toLocaleString()} <span className="text-sm">LCY</span>
                  </div>
                  <p className="text-slate-400 font-bold text-xs">Total Active Contracts Value</p>
                  
                  <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid</span>
                       <span className="font-mono text-emerald-600 font-black">{Number(subData.stats.total_paid).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retention Held</span>
                       <span className="font-mono text-rose-600 font-black">{Number(subData.stats.net_retention).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Active Contracts */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 col-span-2 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter">My Active Contracts</h3>
                    <span className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Verified</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {subData.contracts.map(c => (
                      <div key={c.id} className="p-8 hover:bg-slate-50/50 transition-colors flex justify-between items-center group">
                        <div>
                          <h4 className="font-black text-slate-900 text-lg mb-1 group-hover:text-emerald-600 transition-colors">{c.contract_number}</h4>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-tighter">Valid until: {new Date(c.end_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900 font-mono">{Number(c.total_value).toLocaleString()} LCY</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Claims View */}
            {activeTab === 'claims' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100">
                  <div className="mb-10 text-center">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">📝</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Submit Progress Claim</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Milestone Achievement</p>
                  </div>
                  <form onSubmit={submitClaim} className="space-y-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Contract</label>
                       <select 
                         required
                         className="w-full p-5 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner cursor-pointer"
                         value={claimForm.contract_id}
                         onChange={e => setClaimForm({...claimForm, contract_id: e.target.value})}
                       >
                         <option value="">-- Select Active Contract --</option>
                         {subData?.contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} ({c.status})</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Done Percentage (%)</label>
                       <input 
                         type="number" 
                         required 
                         max="100"
                         className="w-full p-5 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner"
                         value={claimForm.progress_percent}
                         onChange={e => setClaimForm({...claimForm, progress_percent: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Details / Scope</label>
                       <textarea 
                         required 
                         rows="4"
                         className="w-full p-5 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner resize-none"
                         value={claimForm.description}
                         onChange={e => setClaimForm({...claimForm, description: e.target.value})}
                       />
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-emerald-600 transition-all shadow-2xl active:scale-95"
                    >
                      Certify & Submit Claim
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter">Recent Payment Certificates</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {subData?.invoices.map(inv => (
                      <div key={inv.id} className="p-8 flex justify-between items-center">
                        <div>
                           <div className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">{inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A'}</div>
                           <h5 className="font-black text-slate-900 text-sm">{inv.description}</h5>
                        </div>
                        <div className="text-right">
                           <div className="text-lg font-black text-slate-900 font-mono">{Number(inv.net_amount).toLocaleString()} LCY</div>
                           <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{inv.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Compliance View */}
            {activeTab === 'compliance' && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-8">
                  <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center text-3xl">🪪</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">License & Registration</h3>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-tighter">License Number: {subData?.profile?.license_number}</p>
                    <div className="mt-4 flex items-center gap-3">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry:</span>
                       <span className="px-4 py-1 bg-slate-900 text-white rounded-lg text-xs font-black font-mono">{new Date(subData?.profile?.insurance_expiry).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-8">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-3xl">🧾</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Tax Compliance</h3>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-tighter">VAT / Tax ID: {subData?.profile?.tax_id}</p>
                    <div className="mt-4">
                       <span className="px-4 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">Status: Fully Compliant</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
