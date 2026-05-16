import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const defaultPermissions = {
    projects: false, finance: false, inventory: false, 
    purchases: false, real_estate: false, hr: false
  };

  const [formData, setFormData] = useState({
    username: '', email: '', password: '', role: 'User', status: 'Active', permissions: defaultPermissions
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // بناءً على authRoutes.js في النظام القديم
      const res = await api.get('/users');
      setUsers(res.data.data || res.data || []);
    } catch (error) {
      console.error("خطأ في جلب المستخدمين", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionChange = (e) => {
    setFormData({
      ...formData,
      permissions: { ...formData.permissions, [e.target.name]: e.target.checked }
    });
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        username: user.username,
        email: user.email || '',
        password: '', // لا نعرض الباسورد القديم
        role: user.role,
        status: user.status,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || defaultPermissions)
      });
    } else {
      setEditingId(null);
      setFormData({ username: '', email: '', password: '', role: 'User', status: 'Active', permissions: defaultPermissions });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        // تحديث مستخدم
        await api.put(`/users/${editingId}`, formData);
        alert("تم تحديث بيانات وصلاحيات المستخدم بنجاح!");
      } else {
        // إضافة مستخدم جديد (بناءً على مسار الإضافة)
        // قد يكون الباك إند يستخدم مسار مخصص للـ register أو add/users
        await api.post('/users', formData); 
        alert("تم إنشاء المستخدم بنجاح!");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      alert("حدث خطأ أثناء حفظ المستخدم. قد يكون اسم المستخدم مكرراً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = async (id) => {
    if(!window.confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟")) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert("حدث خطأ أثناء الحذف.");
    }
  };

  return (
    <div className="animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">صلاحيات المستخدمين (Users & RBAC)</h2>
          <p className="text-slate-500 font-bold text-sm mt-1">إدارة هويات النظام والتحكم في الوصول للشاشات</p>
        </div>
        <button onClick={() => openModal()} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold shadow-md transition">
          + مستخدم جديد
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-black text-slate-600">اسم المستخدم</th>
                <th className="p-4 font-black text-slate-600">البريد الإلكتروني</th>
                <th className="p-4 font-black text-slate-600">الصلاحية (الرتبة)</th>
                <th className="p-4 font-black text-slate-600">الحالة</th>
                <th className="p-4 font-black text-slate-600 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center animate-pulse font-bold text-slate-400">جاري التحميل...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-bold">لا يوجد مستخدمين.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-black text-slate-800">@{user.username}</td>
                    <td className="p-4 font-bold text-slate-600">{user.email || '-'}</td>
                    <td className="p-4 font-bold">
                      <span className={`px-3 py-1 rounded-md text-xs border ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 font-bold">
                      <span className={`px-3 py-1 rounded-lg text-sm border ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2 space-x-reverse">
                      <button onClick={() => openModal(user)} className="bg-blue-50 text-blue-600 px-3 py-1 rounded font-bold hover:bg-blue-100">تعديل</button>
                      <button onClick={() => deleteUser(user.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded font-bold hover:bg-red-100">حذف</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">{editingId ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم *</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور {editingId && '(اتركه فارغاً لعدم التغيير)'}</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required={!editingId} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الرتبة</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-purple-700">
                    <option value="User">مستخدم عادي (User)</option>
                    <option value="Admin">مدير نظام (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الحالة</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold">
                    <option value="Active">نشط</option>
                    <option value="Inactive">موقوف</option>
                  </select>
                </div>
              </div>

              {/* مصفوفة الصلاحيات المبسطة */}
              {formData.role !== 'Admin' && (
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <label className="block text-sm font-black text-slate-800 mb-3">صلاحيات الوصول للشاشات:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(defaultPermissions).map(perm => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <input type="checkbox" name={perm} checked={formData.permissions[perm] || false} onChange={handlePermissionChange} className="w-4 h-4 accent-blue-600" />
                        <span className="text-sm font-bold text-slate-700 capitalize">{perm.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 mt-6 border-t border-slate-100">
                <button type="submit" disabled={isSubmitting} className="bg-slate-800 text-white px-8 py-2 rounded-xl font-bold shadow-md hover:bg-slate-900 transition">
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ المستخدم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}