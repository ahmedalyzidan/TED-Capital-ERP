import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Users() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('users'); // users, roles, audit
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [employees, setEmployees] = useState([]); 
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = {
    ar: {
      title: "إدارة الهوية والصلاحيات",
      subtitle: "التحكم المركزي في الوصول، مصفوفة الصلاحيات، وسجل التدقيق الأمني",
      tabs: {
        users: "المستخدمين",
        roles: "الأدوار",
        audit: "سجل الأمان"
      },
      usersTab: {
        search: "بحث عن مستخدم...",
        add: "إنشاء مستخدم جديد",
        table: {
          user: "المستخدم",
          email: "البريد الإلكتروني",
          role: "الدور الوظيفي",
          status: "الحالة",
          actions: "الإجراءات"
        },
        loading: "جاري تحميل الهويات..."
      },
      rolesTab: {
        rolesTitle: "الأدوار الوظيفية (Roles)",
        matrixTitle: "مصفوفة صلاحيات",
        enterpriseMatrix: "مصفوفة التحكم في الوصول للمؤسسات",
        saveMatrix: "حفظ المصفوفة 💾",
        selectAll: "تحديد الكل",
        deselectAll: "إلغاء الكل",
        editSettings: "تعديل الإعدادات →",
        placeholder: "اختر دوراً لعرض وتعديل مصفوفة صلاحياته"
      },
      auditTab: {
        title: "سجل التدقيق الأمني والوصول",
        time: "التوقيت",
        user: "المستخدم",
        action: "الإجراء المتخذ",
        resource: "المورد المستهدف",
        level: "المستوى"
      },
      modal: {
        createTitle: "إنشاء مستخدم عالمي",
        editTitle: "تعديل ملف المستخدم",
        linkEmployee: "🔗 ربط السجل بالموظفين",
        linkPlaceholder: "-- اختر لتعبئة البيانات تلقائياً --",
        username: "اسم المستخدم",
        password: "كلمة المرور",
        fullName: "الاسم الكامل",
        email: "البريد الإلكتروني",
        role: "الدور الوظيفي",
        dept: "القسم الرئيسي",
        deptPlaceholder: "-- اختر القسم --",
        status: "حالة الحساب",
        twoFactor: "المصادقة الثنائية (2FA)",
        twoFactorDesc: "إرسال كود التحقق للجوال عند كل دخول للنظام",
        save: "ترحيل وحفظ هوية المستخدم"
      },
      departments: [
        { id: 'Finance', name: 'المالية', icon: '💵' },
        { id: 'CRM', name: 'خدمة العملاء', icon: '🤝' },
        { id: 'Inventory', name: 'المخازن', icon: '📦' },
        { id: 'Projects', name: 'المشاريع', icon: '🏗️' },
        { id: 'HCM', name: 'الموارد البشرية', icon: '👥' },
        { id: 'Security', name: 'الأمن والمعلومات', icon: '🛡️' }
      ],
      alerts: {
        createSuccess: "تم إنشاء المستخدم بنجاح.",
        updateSuccess: "تم تحديث المستخدم بنجاح.",
        deleteConfirm: "هل أنت متأكد من حذف المستخدم؟",
        permSuccess: "تم تحديث الصلاحيات بنجاح."
      }
    },
    en: {
      title: "Identity & Access Management (IAM)",
      subtitle: "Centralized access control, permissions matrix, and security audit trail",
      tabs: {
        users: "Users",
        roles: "Roles",
        audit: "Security Audit"
      },
      usersTab: {
        search: "Search for a user...",
        add: "Create New User",
        table: {
          user: "User",
          email: "Email Address",
          role: "Role",
          status: "Status",
          actions: "Actions"
        },
        loading: "Loading Identities..."
      },
      rolesTab: {
        rolesTitle: "Job Roles (IAM)",
        matrixTitle: "Permissions Matrix",
        enterpriseMatrix: "Enterprise Access Control Matrix",
        saveMatrix: "Save Matrix 💾",
        selectAll: "Select All",
        deselectAll: "Deselect All",
        editSettings: "Edit Settings →",
        placeholder: "Select a role to view and edit its access matrix"
      },
      auditTab: {
        title: "Security Audit & Access Logs",
        time: "Timestamp",
        user: "User",
        action: "Action Taken",
        resource: "Target Resource",
        level: "Impact"
      },
      modal: {
        createTitle: "Create Global User Identity",
        editTitle: "Edit User Profile",
        linkEmployee: "🔗 Link to Staff Record",
        linkPlaceholder: "-- Select to auto-fill data --",
        username: "Username",
        password: "Password",
        fullName: "Full Name",
        email: "Email Address",
        role: "Job Role",
        dept: "Primary Department",
        deptPlaceholder: "-- Select Department --",
        status: "Account Status",
        twoFactor: "Two-Factor Auth (2FA)",
        twoFactorDesc: "Send verification code to mobile upon login",
        save: "Post & Save User Identity"
      },
      departments: [
        { id: 'Finance', name: 'Finance', icon: '💵' },
        { id: 'CRM', name: 'Customer Service', icon: '🤝' },
        { id: 'Inventory', name: 'Warehouse', icon: '📦' },
        { id: 'Projects', name: 'Projects', icon: '🏗️' },
        { id: 'HCM', name: 'Human Resources', icon: '👥' },
        { id: 'Security', name: 'Security & Info', icon: '🛡️' }
      ],
      alerts: {
        createSuccess: "User created successfully.",
        updateSuccess: "User updated successfully.",
        deleteConfirm: "Are you sure you want to delete this user?",
        permSuccess: "Permissions updated successfully."
      }
    }
  };
  const cur = t[language === 'en' ? 'en' : 'ar'];

  const [searchTerm, setSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [newUser, setNewUser] = useState({ 
    username: '', full_name: '', email: '', password: '', role: 'Custom', 
    status: 'Active', phone: '', department: '', employee_id: '', 
    linked_employee_id: '', two_factor: false
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffRes = await api.get('/dynamic/table/staff?limit=1000');
      setEmployees(staffRes.data.data || []);
      if (activeTab === 'users') {
        const uRes = await api.get('/table/users');
        setUsers(uRes.data.data || []);
        const rRes = await api.get('/iam/roles');
        setRoles(rRes.data || []);
      } else if (activeTab === 'roles') {
        const rRes = await api.get('/iam/roles');
        setRoles(rRes.data || []);
        const pRes = await api.get('/iam/permissions');
        setPermissions(pRes.data || []);
      } else if (activeTab === 'audit') {
        const res = await api.get('/table/security_audit_trail?limit=50');
        setAuditLogs(res.data.data || []);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleEmployeeSelection = (empId, type = 'new') => {
    const emp = employees.find(e => Number(e.id) === Number(empId));
    if (emp) {
      const data = {
        linked_employee_id: emp.emp_id || emp.id,
        full_name: emp.name,
        email: emp.email || '', 
        phone: emp.phone || '',
        department: emp.position || emp.department || '', 
        employee_id: (emp.emp_id || emp.id).toString()
      };
      if (type === 'new') setNewUser({ ...newUser, ...data });
      else setSelectedUser({ ...selectedUser, ...data });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/iam/users', newUser);
      alert(cur.alerts.createSuccess);
      setIsUserModalOpen(false);
      setNewUser({ username: '', full_name: '', email: '', password: '', role: 'Custom', status: 'Active', phone: '', department: '', employee_id: '', linked_employee_id: '', two_factor: false });
      fetchData();
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/iam/users/${selectedUser.id}`, selectedUser);
      alert(cur.alerts.updateSuccess);
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm(cur.alerts.deleteConfirm)) return;
    try {
      await api.delete(`/dynamic/delete/users/${id}`);
      fetchData();
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  const handleRolePermUpdate = async () => {
    if (!selectedRole) return;
    try {
      await api.post('/iam/roles/permissions', { 
        roleId: selectedRole.id, 
        permissionIds: selectedRole.permissionIds || []
      });
      alert(cur.alerts.permSuccess);
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  const togglePermission = (pId) => {
    if (!selectedRole) return;
    const currentIds = selectedRole.permissionIds || [];
    const newIds = currentIds.includes(pId) ? currentIds.filter(id => id !== pId) : [...currentIds, pId];
    setSelectedRole({ ...selectedRole, permissionIds: newIds });
  };

  const toggleModulePermissions = (module, allSelected) => {
    if (!selectedRole) return;
    const modulePermIds = permissions.filter(p => p.module === module).map(p => p.id);
    const currentIds = selectedRole.permissionIds || [];
    let newIds = allSelected ? currentIds.filter(id => !modulePermIds.includes(id)) : [...new Set([...currentIds, ...modulePermIds])];
    setSelectedRole({ ...selectedRole, permissionIds: newIds });
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getModuleIcon = (module) => {
    const found = cur.departments.find(d => d.id === module);
    return found ? found.icon : '⚙️';
  };

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/30 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20 transform rotate-3">🔐</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{cur.title}</h1>
                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">IAM-CORE</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">{cur.subtitle}</p>
            </div>
          </div>

          <div className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 flex gap-1 relative z-10 overflow-x-auto scrollbar-none">
            {Object.keys(cur.tabs).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span>{tab === 'users' ? '👤' : tab === 'roles' ? '🎭' : '🛡️'}</span> {cur.tabs[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          
          {activeTab === 'users' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="relative w-full sm:w-[400px]">
                  <input 
                    type="text" 
                    placeholder={cur.usersTab.search} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-12 pl-4 py-4 bg-white border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm" 
                  />
                  <span className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 text-lg`}>🔍</span>
                </div>
                <button onClick={() => setIsUserModalOpen(true)} className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 transform active:scale-95 whitespace-nowrap">
                  <span className="text-lg leading-none">+</span> {cur.usersTab.add}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{cur.usersTab.table.user}</th>
                      <th className="px-8 py-5">{cur.usersTab.table.email}</th>
                      <th className="px-8 py-5">{cur.usersTab.table.role}</th>
                      <th className="px-8 py-5 text-center">{cur.usersTab.table.status}</th>
                      <th className="px-8 py-5 text-center">{cur.usersTab.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="5" className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">{cur.usersTab.loading}</td></tr>
                    ) : filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-105 transition-transform uppercase">
                              {u.username?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors">@{u.username}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{u.full_name || 'System Identity'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-xs font-bold text-slate-500 font-mono">{u.email}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black border border-slate-200 uppercase tracking-widest">{u.role}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => { setSelectedUser(u); setIsEditModalOpen(true); }} className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 rounded-lg border border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-sm">✏️</button>
                            <button onClick={() => handleDeleteUser(u.id)} className="w-8 h-8 flex items-center justify-center bg-white text-rose-400 rounded-lg border border-slate-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className={`grid grid-cols-1 lg:grid-cols-4 animate-fade-in divide-slate-100 h-full ${language === 'ar' ? 'divide-x-reverse divide-x' : 'divide-x'}`}>
              <div className="lg:col-span-1 bg-slate-50/50 p-8 space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{cur.rolesTab.rolesTitle}</h3>
                <div className="space-y-3">
                  {roles.map(role => (
                    <button 
                      key={role.id}
                      onClick={async () => {
                        const res = await api.get(`/iam/roles/${role.id}/permissions`);
                        setSelectedRole({ ...role, permissionIds: res.data.map(p => p.permission_id) });
                      }}
                      className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} p-5 rounded-[2rem] border transition-all group ${selectedRole?.id === role.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      <p className="font-black text-sm mb-1 transition-transform group-hover:scale-105">{role.name}</p>
                      <p className="text-[9px] font-bold opacity-60 line-clamp-1">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 p-10 space-y-10">
                {selectedRole ? (
                  <div className="space-y-10 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-slate-100">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{cur.rolesTab.matrixTitle}: {selectedRole.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{cur.rolesTab.enterpriseMatrix}</p>
                      </div>
                      <button onClick={handleRolePermUpdate} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-slate-800 active:scale-95 transition-all">{cur.rolesTab.saveMatrix}</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {Array.from(new Set(permissions.map(p => p.module))).map(module => {
                        const modulePerms = permissions.filter(p => p.module === module);
                        const allSelected = modulePerms.every(p => selectedRole.permissionIds?.includes(p.id));
                        return (
                          <div key={module} className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
                            <div className="flex justify-between items-center px-2">
                              <h4 className="font-black text-slate-900 text-xs flex items-center gap-3">
                                <span className="text-lg">{getModuleIcon(module)}</span> {module}
                              </h4>
                              <button onClick={() => toggleModulePermissions(module, allSelected)} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800">{allSelected ? cur.rolesTab.deselectAll : cur.rolesTab.selectAll}</button>
                            </div>
                            <div className="space-y-2">
                              {modulePerms.map(p => (
                                <label key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer group border ${selectedRole.permissionIds?.includes(p.id) ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}>
                                  <input type="checkbox" checked={selectedRole.permissionIds?.includes(p.id)} onChange={() => togglePermission(p.id)} className="w-5 h-5 rounded-lg accent-slate-900 cursor-pointer" />
                                  <div className={`flex flex-col ${language === 'ar' ? 'items-end text-right' : 'items-start text-left'} flex-1`}>
                                    <span className={`font-black text-xs ${selectedRole.permissionIds?.includes(p.id) ? 'text-slate-900' : 'text-slate-500'}`}>{p.name}</span>
                                    <span className="text-[8px] font-black text-slate-300 font-mono uppercase mt-0.5">{p.code}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6 opacity-60">
                    <div className="text-8xl">🎭</div>
                    <p className="font-black text-sm uppercase tracking-[0.3em]">{cur.rolesTab.placeholder}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-rose-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-rose-900 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-rose-100">🛡️</span>
                  {cur.auditTab.title}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{cur.auditTab.time}</th>
                      <th className="px-8 py-5">{cur.auditTab.user}</th>
                      <th className="px-8 py-5">{cur.auditTab.action}</th>
                      <th className="px-8 py-5">{cur.auditTab.resource}</th>
                      <th className="px-8 py-5 text-center">{cur.auditTab.level}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-8 py-6 font-mono text-[11px] text-slate-400">{new Date(log.created_at || log.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                        <td className="px-8 py-6 font-black text-slate-900 text-sm">@{log.username}</td>
                        <td className="px-8 py-6">
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.action === 'ACCESS_DENIED' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                             {log.action}
                           </span>
                        </td>
                        <td className="px-8 py-6 text-[11px] font-bold text-slate-500 font-mono">{log.resource}</td>
                        <td className="px-8 py-6 text-center">
                           <div className={`w-3 h-3 rounded-full mx-auto ${log.impact_level === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL: CREATE/EDIT USER --- */}
      {(isUserModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">👤</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isEditModalOpen ? cur.modal.editTitle : cur.modal.createTitle}</h3>
                 </div>
                 <button onClick={() => { setIsUserModalOpen(false); setIsEditModalOpen(false); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 transition-all shadow-sm">✕</button>
              </div>
              <form onSubmit={isEditModalOpen ? handleUpdateUser : handleCreateUser} className={`p-10 space-y-8 overflow-y-auto custom-scrollbar ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                 <div className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100/50 space-y-4">
                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest ml-1">{cur.modal.linkEmployee}</label>
                    <select 
                      value={isEditModalOpen ? (selectedUser?.linked_employee_id || '') : (newUser.linked_employee_id)} 
                      onChange={(e) => handleEmployeeSelection(e.target.value, isEditModalOpen ? 'edit' : 'new')} 
                      className="w-full p-4 bg-white border border-indigo-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">{cur.modal.linkPlaceholder}</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.username}</label>
                       <input type="text" value={isEditModalOpen ? selectedUser?.username : newUser.username} onChange={(e) => isEditModalOpen ? setSelectedUser({...selectedUser, username: e.target.value}) : setNewUser({...newUser, username: e.target.value})} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                    </div>
                    {!isEditModalOpen && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.password}</label>
                         <input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                      </div>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.fullName}</label>
                       <input type="text" value={isEditModalOpen ? selectedUser?.full_name : newUser.full_name} className="w-full p-4 bg-slate-100 border-none rounded-2xl font-black text-slate-500 outline-none" readOnly />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.email}</label>
                       <input type="email" value={isEditModalOpen ? selectedUser?.email : newUser.email} onChange={(e) => isEditModalOpen ? setSelectedUser({...selectedUser, email: e.target.value}) : setNewUser({...newUser, email: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.role}</label>
                       <select value={isEditModalOpen ? selectedUser?.role : newUser.role} onChange={(e) => isEditModalOpen ? setSelectedUser({...selectedUser, role: e.target.value}) : setNewUser({...newUser, role: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none cursor-pointer">
                          <option value="Custom">Custom</option>
                          {roles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.dept}</label>
                       <select value={isEditModalOpen ? selectedUser?.department : newUser.department} onChange={(e) => isEditModalOpen ? setSelectedUser({...selectedUser, department: e.target.value}) : setNewUser({...newUser, department: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none cursor-pointer">
                          <option value="">{cur.modal.deptPlaceholder}</option>
                          {cur.departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.status}</label>
                       <select value={isEditModalOpen ? selectedUser?.status : newUser.status} onChange={(e) => isEditModalOpen ? setSelectedUser({...selectedUser, status: e.target.value}) : setNewUser({...newUser, status: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none cursor-pointer">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Suspended">Suspended</option>
                       </select>
                    </div>
                 </div>
                 <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl">
                    <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                       <p className="font-black text-sm">{cur.modal.twoFactor}</p>
                       <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">{cur.modal.twoFactorDesc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" checked={isEditModalOpen ? (selectedUser?.two_factor || false) : newUser.two_factor} onChange={(e) => isEditModalOpen ? setSelectedUser({...selectedUser, two_factor: e.target.checked}) : setNewUser({...newUser, two_factor: e.target.checked})} className="sr-only peer" />
                       <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
                    </label>
                 </div>
                 <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-[0.98] mt-4">{cur.modal.save}</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
