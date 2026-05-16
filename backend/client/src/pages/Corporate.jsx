import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../hooks/useSecurity';

export default function Corporate() {
  const { language } = useLanguage();
  const { hasPermission } = useSecurity();
  const [activeTab, setActiveTab] = useState('structure');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ orgUnits: [], committees: [], tasks: [], staff: [] });
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});

  const t = {
    ar: {
      title: "الحوكمة واللجان والمهام",
      subtitle: "إدارة الهياكل التنظيمية، تشكيل اللجان، ومتابعة التكليفات الإدارية",
      tabs: {
        structure: "الهيكل التنظيمي",
        committees: "اللجان",
        tasks: "المهام والتكليفات"
      },
      structure: {
        title: "وحدات الهيكل التنظيمي",
        add: "إضافة وحدة جديدة",
        name: "اسم الوحدة",
        type: "النوع",
        parent: "يتبع لـ",
        actions: "الإجراءات"
      },
      committees: {
        title: "اللجان المشكلة",
        add: "تشكيل لجنة",
        name: "اسم اللجنة",
        chair: "رئيس اللجنة",
        members: "الأعضاء",
        status: "الحالة",
        actions: "الإجراءات"
      },
      tasks: {
        title: "سجل المهام والتكليفات",
        add: "تكليف جديد",
        titleCol: "المهمة",
        assignedTo: "المكلف بها",
        priority: "الأهمية",
        status: "الحالة",
        deadline: "الموعد النهائي",
        progress: "الإنجاز"
      }
    },
    en: {
      title: "Governance & Tasks",
      subtitle: "Org structures, committee formations, and administrative assignments",
      tabs: {
        structure: "Org Structure",
        committees: "Committees",
        tasks: "Tasks & Assignments"
      },
      structure: {
        title: "Organizational Units",
        add: "New Unit",
        name: "Unit Name",
        type: "Type",
        parent: "Reports To",
        actions: "Actions"
      },
      committees: {
        title: "Committees",
        add: "Form Committee",
        name: "Committee Name",
        chair: "Chairperson",
        members: "Members",
        status: "Status",
        actions: "Actions"
      },
      tasks: {
        title: "Tasks & Assignments",
        add: "New Task",
        titleCol: "Task",
        assignedTo: "Assigned To",
        priority: "Priority",
        status: "Status",
        deadline: "Deadline",
        progress: "Progress"
      }
    }
  }[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgRes, comRes, taskRes, staffRes] = await Promise.all([
        api.get('/table/org_units'),
        api.get('/table/committees'),
        api.get('/table/tasks'),
        api.get('/dropdowns')
      ]);
      setData({
        orgUnits: orgRes.data.data || [],
        committees: comRes.data.data || [],
        tasks: taskRes.data.data || [],
        staff: staffRes.data.staff_dd || []
      });
    } catch (err) {
      console.error("Error fetching corporate data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const endpoint = showModal.includes('edit') ? `/update/${showModal.split('-')[1]}/${formData.id}` : `/add/${showModal.split('-')[1]}`;
      const method = showModal.includes('edit') ? 'put' : 'post';
      await api[method](endpoint, formData);
      setShowModal(null);
      setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving data");
    }
  };

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10">
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20 transform -rotate-3">🏛️</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200">CORP-GOV</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">{t.subtitle}</p>
            </div>
          </div>

          <div className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 flex gap-1 relative z-10 overflow-x-auto scrollbar-none">
            {Object.keys(t.tabs).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                {t.tabs[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                {activeTab === 'structure' ? '📊' : activeTab === 'committees' ? '👥' : '✅'}
              </span>
              {activeTab === 'structure' ? t.structure.title : activeTab === 'committees' ? t.committees.title : t.tasks.title}
            </h3>
            <button onClick={() => setShowModal(`add-${activeTab === 'structure' ? 'org_units' : activeTab}`)} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 transform active:scale-95">
              <span className="text-lg leading-none">+</span> {activeTab === 'structure' ? t.structure.add : activeTab === 'committees' ? t.committees.add : t.tasks.add}
            </button>
          </div>

          {loading ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Central Governance Registry...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'structure' && (
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{t.structure.name}</th>
                      <th className="px-8 py-5">{t.structure.type}</th>
                      <th className="px-8 py-5">{t.structure.parent}</th>
                      <th className="px-8 py-5 text-center">{t.structure.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.orgUnits.map(unit => (
                      <tr key={unit.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-6 font-black text-slate-900 text-sm">{unit.name}</td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100/50">{unit.type}</span>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-slate-500">{data.orgUnits.find(u => u.id === unit.parent_id)?.name || '---'}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button onClick={() => { setFormData(unit); setShowModal('edit-org_units'); }} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg border border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-sm mx-auto">✏️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'committees' && (
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{t.committees.name}</th>
                      <th className="px-8 py-5">{t.committees.chair}</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5 text-center">{t.committees.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.committees.map(com => (
                      <tr key={com.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors leading-tight">{com.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{com.type}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-bold text-slate-600 text-xs">{com.chair_id || '---'}</td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${com.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                            {com.status === 'Active' ? 'Operational' : 'On Hold'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button onClick={() => { setFormData(com); setShowModal('edit-committees'); }} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg border border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-sm mx-auto">✏️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'tasks' && (
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{t.tasks.titleCol}</th>
                      <th className="px-8 py-5">{t.tasks.assignedTo}</th>
                      <th className="px-8 py-5 text-center">{t.tasks.priority}</th>
                      <th className="px-8 py-5 text-center">{t.tasks.status}</th>
                      <th className="px-8 py-5 text-center">{t.tasks.progress}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.tasks.map(task => (
                      <tr key={task.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col max-w-xs overflow-hidden">
                            <span className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors leading-tight truncate">{task.title || task.task_name}</span>
                            <span className="text-[10px] text-slate-400 font-bold mt-1 truncate">{task.description}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">{task.assigned_to || '---'}</td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${task.priority === 'High' || task.priority === 'Critical' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : task.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3 justify-end">
                              <span className="font-black font-mono text-[10px] text-slate-400">{task.progress_percent || 0}%</span>
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                                <div className="bg-slate-900 h-full transition-all duration-700 ease-out" style={{ width: `${task.progress_percent || 0}%` }}></div>
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">📁</div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {showModal.includes('add') ? 'سجل جديد' : 'تحديث البيانات'}
                 </h3>
              </div>
              <button onClick={() => setShowModal(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-8">
              {showModal.includes('org_units') && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">المسمى الوظيفي / اسم الوحدة</label>
                    <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" required />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">تصنيف الوحدة</label>
                      <select value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none appearance-none cursor-pointer">
                        <option value="">-- اختر --</option>
                        <option value="Holding">قابضة</option>
                        <option value="Company">شركة</option>
                        <option value="Branch">فرع</option>
                        <option value="Department">إدارة</option>
                        <option value="Unit">قسم / وحدة</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">تتبع إدارياً لـ</label>
                      <select value={formData.parent_id || ''} onChange={e => setFormData({ ...formData, parent_id: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none appearance-none cursor-pointer">
                        <option value="">لا يوجد (مستوى أعلى)</option>
                        {data.orgUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {showModal.includes('committees') && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">مسمى اللجنة</label>
                    <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">رئيس اللجنة (مسؤول التشكيل)</label>
                    <select value={formData.chair_id || ''} onChange={e => setFormData({ ...formData, chair_id: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none appearance-none cursor-pointer">
                      <option value="">-- اختر من السجل --</option>
                      {data.staff.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">نطاق العمل / الغرض</label>
                    <textarea value={formData.purpose || ''} onChange={e => setFormData({ ...formData, purpose: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner h-24"></textarea>
                  </div>
                </>
              )}

              {showModal.includes('tasks') && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">موضوع التكليف / المهمة</label>
                    <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" required />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">الموظف المكلف</label>
                      <select value={formData.assigned_to || ''} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none appearance-none cursor-pointer">
                        <option value="">-- اختر --</option>
                        {data.staff.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">الموعد النهائي</label>
                      <input type="date" value={formData.deadline || ''} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">مستوى الأولوية</label>
                      <select value={formData.priority || 'Medium'} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none appearance-none cursor-pointer">
                        <option value="Low">منخفضة</option>
                        <option value="Medium">متوسطة</option>
                        <option value="High">عالية</option>
                        <option value="Critical">حرجة</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">الإنجاز المحقق %</label>
                      <input type="number" value={formData.progress_percent || 0} onChange={e => setFormData({ ...formData, progress_percent: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black font-mono text-center text-slate-900 text-xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" min="0" max="100" />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-[0.98] mt-4">
                 🚀 ترحيل وحفظ السجلات
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
