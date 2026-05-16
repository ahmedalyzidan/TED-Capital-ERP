import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function RBACMatrix() {
  const { language } = useLanguage();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [matrix, setMatrix] = useState({}); // { roleId: { permId: true/false } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/iam/roles'),
        api.get('/iam/permissions')
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);

      // Fetch existing assignments for each role
      const assignments = {};
      for (const role of rolesRes.data) {
        const res = await api.get(`/iam/roles/${role.id}/permissions`);
        assignments[role.id] = res.data.reduce((acc, p) => {
          acc[p.permission_id] = true;
          return acc;
        }, {});
      }
      setMatrix(assignments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (roleId, permId) => {
    setMatrix(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permId]: !prev[roleId]?.[permId]
      }
    }));
  };

  const saveRolePermissions = async (roleId) => {
    try {
      setSaving(true);
      const permissionIds = Object.keys(matrix[roleId] || {}).filter(id => matrix[roleId][id]);
      await api.put('/iam/roles/permissions', { roleId, permissionIds });
      alert(language === 'ar' ? "تم حفظ الصلاحيات بنجاح" : "Permissions saved successfully");
    } catch (err) {
      alert("Error saving permissions");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 text-3xl">Loading Matrix...</div>;

  // Group permissions by module/resource
  const groupedPermissions = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="page-container animate-fade-in pb-20 space-y-10">
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <h2 className="text-4xl font-black relative z-10">
          {language === 'ar' ? 'مصفوفة الصلاحيات والأدوار' : 'RBAC Permission Matrix'}
        </h2>
        <p className="text-blue-200 font-bold mt-2 opacity-80">
          {language === 'ar' ? 'إدارة دقيقة لكافة موارد النظام لكل دور وظيفي' : 'Granular access control for all system resources'}
        </p>
      </div>

      <div className="overflow-x-auto bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="p-8 text-slate-500 font-black uppercase text-xs tracking-widest sticky left-0 bg-slate-50 z-20 w-80">
                Resource & Permission
              </th>
              {roles.map(role => (
                <th key={role.id} className="p-8 text-center min-w-[200px]">
                  <div className="flex flex-col items-center gap-3">
                    <span className="font-black text-slate-900 text-lg">{role.name}</span>
                    <button 
                      onClick={() => saveRolePermissions(role.id)}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {language === 'ar' ? 'حفظ' : 'SAVE'}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedPermissions).map(([module, modulePerms]) => (
              <React.Fragment key={module}>
                <tr className="bg-blue-50/50">
                  <td colSpan={roles.length + 1} className="p-4 px-8 font-black text-blue-900 uppercase text-xs tracking-wider border-y border-blue-100">
                    {module} Module
                  </td>
                </tr>
                {modulePerms.map(perm => (
                  <tr key={perm.id} className="hover:bg-slate-50 border-b border-slate-100 transition-all">
                    <td className="p-6 px-8 sticky left-0 bg-white z-10 border-r shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{perm.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{perm.code}</span>
                      </div>
                    </td>
                    {roles.map(role => (
                      <td key={role.id} className="p-6 text-center">
                        <label className="relative inline-flex items-center cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={!!matrix[role.id]?.[perm.id]}
                            onChange={() => togglePermission(role.id, perm.id)}
                            disabled={role.is_system_role && role.name === 'Super Admin'}
                          />
                          <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
