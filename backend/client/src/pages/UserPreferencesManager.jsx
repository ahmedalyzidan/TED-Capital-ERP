import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function UserPreferencesManager() {
  const { language } = useLanguage();
  const [preferences, setPreferences] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPref, setEditingPref] = useState(null);

  const [form, setForm] = useState({
    user_id: '',
    language: 'en',
    theme_mode: 'light',
    timezone: 'Africa/Cairo',
    date_format: 'DD/MM/YYYY',
    sidebar_collapsed: false
  });

  const t = {
    ar: {
      title: "إدارة تفضيلات وإعدادات المستخدمين",
      subtitle: "عرض، تعديل، وإعادة ضبط تفضيلات ومظهر الحسابات للمستخدمين",
      addBtn: "تخصيص تفضيل جديد ⚙️",
      editTitle: "تعديل تفضيلات المستخدم",
      addTitle: "تخصيص تفضيل جديد لمستخدم",
      save: "حفظ الإعدادات",
      cancel: "إلغاء",
      table: {
        username: "المستخدم",
        role: "الدور",
        lang: "اللغة الافتراضية",
        theme: "المظهر",
        timezone: "التوقيت المحلي",
        dateFormat: "تنسيق التاريخ",
        sidebar: "حالة الشريط الجانبي",
        actions: "الإجراءات"
      },
      fields: {
        user: "اختر المستخدم",
        lang: "اللغة",
        theme: "المظهر",
        timezone: "المنطقة الزمنية",
        dateFormat: "تنسيق التاريخ",
        sidebar: "شريط جانبي مصغر"
      },
      confirmDelete: "هل أنت متأكد من إعادة ضبط تفضيلات هذا المستخدم للمقادير الافتراضية؟",
      successSave: "تم حفظ التفضيلات بنجاح!",
      successDelete: "تم إعادة ضبط تفضيلات المستخدم بنجاح!"
    },
    en: {
      title: "User Preferences & Configurations",
      subtitle: "View, edit, and reset UI preferences and layouts for all system accounts",
      addBtn: "Configure User Preferences ⚙️",
      editTitle: "Edit User Preferences",
      addTitle: "Configure Preferences for User",
      save: "Save Preferences",
      cancel: "Cancel",
      table: {
        username: "User",
        role: "Role",
        lang: "Default Language",
        theme: "Theme Mode",
        timezone: "Local Timezone",
        dateFormat: "Date Format",
        sidebar: "Sidebar Collapsed",
        actions: "Actions"
      },
      fields: {
        user: "Select User",
        lang: "Language",
        theme: "Theme",
        timezone: "Timezone",
        dateFormat: "Date Format",
        sidebar: "Collapsed Sidebar"
      },
      confirmDelete: "Are you sure you want to reset this user's preferences to defaults?",
      successSave: "Preferences saved successfully!",
      successDelete: "User preferences reset to defaults successfully!"
    }
  }[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prefsRes, usersRes] = await Promise.all([
        api.get('/user/preferences/all'),
        api.get('/table/users?limit=1000')
      ]);
      setPreferences(prefsRes.data || []);
      setUsers(usersRes.data.data || []);
    } catch (e) {
      console.error("Failed to load user preferences settings", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingPref(null);
    setForm({
      user_id: '',
      language: 'en',
      theme_mode: 'light',
      timezone: 'Africa/Cairo',
      date_format: 'DD/MM/YYYY',
      sidebar_collapsed: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pref) => {
    setEditingPref(pref);
    setForm({
      user_id: pref.user_id,
      language: pref.language || 'en',
      theme_mode: pref.theme_mode || 'light',
      timezone: pref.timezone || 'Africa/Cairo',
      date_format: pref.date_format || 'DD/MM/YYYY',
      sidebar_collapsed: pref.sidebar_collapsed || false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await api.delete(`/user/preferences/${userId}`);
      alert(t.successDelete);
      fetchData();
    } catch (e) {
      alert("Error resetting preferences");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user_id) {
      alert(language === 'en' ? "Please select a user." : "يرجى اختيار المستخدم.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.put(`/user/preferences/${form.user_id}`, form);
      alert(t.successSave);
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      alert("Error saving preferences");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnconfiguredUsers = () => {
    if (editingPref) return users.filter(u => u.id === editingPref.user_id);
    return users.filter(u => !preferences.some(p => p.user_id === u.id));
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-white rounded-3xl p-20">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs animate-pulse">Syncing User Configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/30 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20 transform rotate-3">⚙️</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200">PREF-MGR</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">{t.subtitle}</p>
            </div>
          </div>

          <button onClick={handleOpenAdd} className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-all shadow-lg flex items-center gap-2 transform active:scale-95 z-10">
            {t.addBtn}
          </button>
        </div>

        {/* --- TABLE LIST --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                  <th className={`px-8 py-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t.table.username}</th>
                  <th className="px-8 py-5 text-center">{t.table.role}</th>
                  <th className="px-8 py-5 text-center">{t.table.lang}</th>
                  <th className="px-8 py-5 text-center">{t.table.theme}</th>
                  <th className="px-8 py-5 text-center">{t.table.timezone}</th>
                  <th className="px-8 py-5 text-center">{t.table.dateFormat}</th>
                  <th className="px-8 py-5 text-center">{t.table.sidebar}</th>
                  <th className="px-8 py-5 text-center">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preferences.map(pref => (
                  <tr key={pref.user_id} className="hover:bg-slate-50/50 transition-all">
                    <td className={`px-8 py-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm">@{pref.username}</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-1">{pref.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black border border-slate-200/50">
                        {pref.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center font-mono font-bold text-sm uppercase">
                      {pref.language === 'ar' ? '🇸🇦 Arabic (AR)' : '🇺🇸 English (EN)'}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${pref.theme_mode === 'dark' ? 'bg-slate-900 text-slate-200 border border-slate-700' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {pref.theme_mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center font-mono text-xs text-slate-500">
                      {pref.timezone || 'Africa/Cairo'}
                    </td>
                    <td className="px-8 py-6 text-center font-mono text-xs text-slate-500">
                      {pref.date_format || 'DD/MM/YYYY'}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pref.sidebar_collapsed ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {pref.sidebar_collapsed ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleOpenEdit(pref)} className="px-3.5 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-100 rounded-xl text-[10px] font-bold transition-all shadow-sm transform active:scale-95">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(pref.user_id)} className="px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100 rounded-xl text-[10px] font-bold transition-all shadow-sm transform active:scale-95">
                          🗑️ Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {preferences.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-8 py-12 text-center text-slate-400 font-bold italic">
                      No custom user configurations found. Defaults will apply.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative">
              <div>
                <h3 className="text-xl font-black tracking-tight">{editingPref ? t.editTitle : t.addTitle}</h3>
                <p className="text-xs text-slate-400 mt-1">Configure individual display parameters</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              {/* User Dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fields.user}</label>
                <select 
                  value={form.user_id} 
                  disabled={!!editingPref}
                  onChange={e => setForm({...form, user_id: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                >
                  <option value="">{language === 'en' ? '-- Select User --' : '-- اختر المستخدم --'}</option>
                  {getUnconfiguredUsers().map(u => (
                    <option key={u.id} value={u.id}>@{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fields.lang}</label>
                <select 
                  value={form.language} 
                  onChange={e => setForm({...form, language: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                >
                  <option value="en">🇺🇸 English (EN)</option>
                  <option value="ar">🇸🇦 Arabic (AR)</option>
                </select>
              </div>

              {/* Theme Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fields.theme}</label>
                <select 
                  value={form.theme_mode} 
                  onChange={e => setForm({...form, theme_mode: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all"
                >
                  <option value="light">☀️ Light Theme</option>
                  <option value="dark">🌙 Dark Theme</option>
                </select>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fields.timezone}</label>
                <input 
                  type="text" 
                  value={form.timezone}
                  onChange={e => setForm({...form, timezone: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all" 
                />
              </div>

              {/* Date Format */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.fields.dateFormat}</label>
                <input 
                  type="text" 
                  value={form.date_format}
                  onChange={e => setForm({...form, date_format: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-slate-800 outline-none focus:bg-white focus:border-slate-400 transition-all" 
                />
              </div>

              {/* Sidebar Collapsed */}
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                <span className="text-sm font-bold text-slate-700">{t.fields.sidebar}</span>
                <input 
                  type="checkbox" 
                  checked={form.sidebar_collapsed} 
                  onChange={e => setForm({...form, sidebar_collapsed: e.target.checked})}
                  className="w-6 h-6 rounded-lg accent-slate-900" 
                />
              </label>

              {/* Modal Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all transform active:scale-95">{t.cancel}</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md transform active:scale-95">
                  {isSubmitting ? '...' : t.save}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
