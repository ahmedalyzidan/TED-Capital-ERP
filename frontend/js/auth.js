// ================= AUTHENTICATION FLOW =================
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('erp_token');
    
    if (token) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        
        const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
        const userDisplay = document.getElementById('currentUserDisplay');
        if (userDisplay) {
            userDisplay.innerText = `${user.role || 'User'} - ${user.username || ''}`;
        }
        if (typeof window.initApp === 'function') window.initApp(); 
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('hidden');
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const u = document.getElementById('loginUsername').value;
            const p = document.getElementById('loginPassword').value;
            const err = document.getElementById('loginError');
            const btn = document.getElementById('loginBtn');
            
            btn.disabled = true; 
            btn.innerText = "Authenticating..."; 
            if(err) err.classList.add('hidden');
            
            try {
                const res = await window.apiFetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                const data = await res.json();
                
                if (data.success) {
                    localStorage.setItem('erp_token', data.token);
                    localStorage.setItem('erp_refresh_token', data.refreshToken);
                    localStorage.setItem('erp_user', JSON.stringify(data.user));
                    
                    if(typeof window.showToast === 'function') window.showToast("تم تسجيل الدخول بنجاح", "success");
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    if(err) { err.innerText = data.error || "Login failed. Invalid credentials."; err.classList.remove('hidden'); }
                    else if(typeof window.showToast === 'function') window.showToast(data.error || "خطأ في بيانات الدخول", "error");
                }
            } catch (error) {
                if(err) { err.innerText = "Network Error. Check Server connection."; err.classList.remove('hidden'); }
                else if(typeof window.showToast === 'function') window.showToast("خطأ في الاتصال بالخادم", "error");
            } finally {
                btn.disabled = false; 
                btn.innerText = "Sign In";
            }
        };
    }
});

window.logout = async function(showMessage = true) {
    const refreshToken = localStorage.getItem('erp_refresh_token');
    if (refreshToken) {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken })
            });
        } catch(e) {}
    }
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_refresh_token');
    localStorage.removeItem('erp_user');
    
    if(showMessage && typeof window.showToast === 'function') window.showToast("تم تسجيل الخروج بنجاح", "success");
    setTimeout(() => window.location.reload(), 800);
};

// ================= RBAC UI LOGIC & HELPERS =================
window.hasPerm = function(table, action) {
    const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
    const userRole = (user.role || '').toLowerCase();
    let perms = user.permissions || {};
    if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch(e) { perms = {}; } }
    
    if (userRole.includes('admin')) return true;

    if (perms.tables) {
        if (perms.tables['ALL']) return true;
        if (perms.tables[table] && perms.tables[table].includes(action)) return true;
        if (Object.keys(perms.tables).length > 0) return false;
    }
    
    if (perms.functions && (perms.functions.includes(action) || perms.functions.includes('ALL'))) return true;

    const STATIC_PERMS = {
        'hr': ['staff', 'attendance', 'leaves', 'payroll', 'system_parameters', 'projects', 'audit_logs'],
        'accountant': ['ledger', 'chart_of_accounts', 'ar_invoices', 'payment_receipts', 'installments', 'contracts', 'customers', 'subcontractor_invoices', 'partners', 'partner_deposits', 'partner_withdrawals', 'projects', 'system_parameters', 'property_units'],
        'engineer': ['projects', 'boq', 'subcontractors', 'subcontractor_items', 'tasks', 'daily_reports', 'inventory', 'inventory_transfers', 'material_usage', 'returns', 'rfq', 'purchase_orders', 'system_parameters']
    };
    
    if (STATIC_PERMS[userRole] && STATIC_PERMS[userRole].includes(table)) {
        if(['read', 'create', 'update'].includes(action)) return true;
        if(action === 'delete' && userRole !== 'engineer') return true;
        return true; 
    }
    return false;
};

window.applyRBAC = function() {
    const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
    const role = (user.role || 'engineer').toLowerCase();
    let perms = user.permissions || {};
    if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch(e) { perms = {}; } }
    
    const allTabs = ['ceoTab', 'projectsTab', 'operationsTab', 'realestateTab', 'customersTab', 'partnersTab', 'procurementTab', 'inventoryTab', 'usageTab', 'hrTab', 'financeTab', 'accountantTab', 'auditTab'];
    let allowedTabs = [];
    
    if (perms.screens && perms.screens.length > 0) {
        if (perms.screens.includes('ALL')) allowedTabs = allTabs;
        else allowedTabs = perms.screens; 
    } else {
        if (role.includes('admin')) allowedTabs = allTabs;
        else if (role.includes('hr')) allowedTabs = ['hrTab', 'projectsTab', 'auditTab'];
        else if (role.includes('accountant') || role.includes('finance')) allowedTabs = ['financeTab', 'accountantTab', 'realestateTab', 'partnersTab', 'projectsTab', 'auditTab'];
        else allowedTabs = ['projectsTab', 'operationsTab', 'procurementTab', 'inventoryTab', 'usageTab'];
    }

    allTabs.forEach(t => {
        const btn = document.getElementById('btn-' + t);
        if (btn) {
            if (allowedTabs.includes(t)) {
                btn.style.setProperty('display', 'block', 'important');
            } else {
                btn.style.setProperty('display', 'none', 'important');
            }
        }
    });

    if (!allowedTabs.includes(window.currentTab) && allowedTabs.length > 0) {
        if(typeof window.showTab === 'function') window.showTab(allowedTabs[0]);
    }
    
    if (!role.includes('admin')) {
        document.querySelectorAll('.rbac-admin').forEach(el => el.style.setProperty('display', 'none', 'important'));
    } else {
        document.querySelectorAll('.rbac-admin').forEach(el => el.style.setProperty('display', 'inline-block', 'important'));
    }
};

// ================= USER MANAGEMENT =================
window.openUserManagement = async function() {
    document.getElementById('userManagementModal').classList.remove('hidden');
    window.loadUsersList();
};

window.loadUsersList = async function() {
    const tbody = document.getElementById('usersListBody');
    if (!tbody) return;
    try {
        const res = await window.apiFetch('/api/users');
        if (!res.ok) throw new Error("Unauthorized");
        const json = await res.json();
        const users = json.data || [];

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center font-bold">لا يوجد مستخدمين مسجلين</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            try {
                const username = u.username || 'N/A';
                const role = u.role || 'User';
                const status = u.status || 'Inactive';
                const date = u.created_at ? new Date(u.created_at).toLocaleDateString() : '-';

                return `
                    <tr class="border-b hover:bg-slate-50 text-sm transition">
                        <td class="p-3 text-slate-500 font-bold">#${u.id}</td>
                        <td class="p-3 font-bold text-blue-700">${username} <span class="text-[10px] text-slate-400 block">${u.email||''}</span></td>
                        <td class="p-3 font-bold">${role}</td>
                        <td class="p-3"><span class="px-2 py-1 rounded text-[10px] font-bold ${status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${status}</span></td>
                        <td class="p-3 text-center font-bold text-slate-400">-</td>
                        <td class="p-3 text-xs text-slate-500">${date}</td>
                        <td class="p-3 flex gap-1 justify-center">
                            <button onclick="editUser(${u.id})" class="text-blue-500 hover:scale-110" title="تعديل الصلاحيات">✏️</button>
                            ${username.toLowerCase() !== 'admin' ? `
                                <button onclick="revokeUserSession(${u.id})" class="bg-orange-100 text-orange-600 px-2 rounded font-bold hover:bg-orange-200 text-[10px]" title="طرد من النظام">طرد 🚫</button>
                                <button onclick="deleteUser(${u.id})" class="text-red-500 hover:scale-110 ml-1" title="حذف">🗑️</button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            } catch (err) { return ''; }
        }).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">خطأ في التحميل</td></tr>'; }
};

window.revokeUserSession = async function(id) {
    if(!confirm("إنهاء كافة جلسات المستخدم فوراً وطرده من النظام؟")) return;
    try {
        const res = await window.apiFetch(`/api/users/${id}/revoke`, { method: 'POST' });
        if (res.ok) {
            if(typeof window.showToast === 'function') window.showToast("تم طرد المستخدم بنجاح.", "success");
            else alert("تم طرد المستخدم بنجاح.");
        }
    } catch(e) { 
        if(typeof window.showToast === 'function') window.showToast("خطأ في الاتصال بالخادم.", "error");
    }
};

window.openUserForm = async function(id = null) {
    const form = document.getElementById('userForm');
    if (!form) return;
    form.reset();
    document.getElementById('userIdInput').value = id || '';
    document.getElementById('userFormTitle').innerText = id ? 'تعديل صلاحيات المستخدم' : 'إنشاء مستخدم جديد';

    const matrixContainer = document.getElementById('crudMatrixBody');
    if (matrixContainer) {
        // تفريغ الجدول لضمان التحديث
        matrixContainer.innerHTML = '';
        
        // الجداول الشاملة لكل قطاعات النظام
        const allTables = [
            { id: 'projects', name: 'المشاريع' }, { id: 'boq', name: 'المقايسات (BOQ)' },
            { id: 'subcontractors', name: 'المقاولين' }, { id: 'subcontractor_items', name: 'بنود العقود' },
            { id: 'subcontractor_invoices', name: 'مستخلصات المقاولين' }, { id: 'tasks', name: 'المهام' },
            { id: 'daily_reports', name: 'تقارير الموقع' }, { id: 'customers', name: 'العملاء' },
            { id: 'property_units', name: 'الوحدات العقارية' }, { id: 'contracts', name: 'العقود' },
            { id: 'installments', name: 'الأقساط والتحصيل' }, { id: 'payment_receipts', name: 'سندات القبض' },
            { id: 'partners', name: 'الشركاء والأرباح' }, { id: 'rfq', name: 'طلبات عروض الأسعار' },
            { id: 'purchase_orders', name: 'أوامر الشراء' }, { id: 'pre_orders', name: 'الحجوزات المسبقة' },
            { id: 'inventory', name: 'المخزون والرصيد' }, { id: 'inventory_sales', name: 'المبيعات والمنصرف' },
            { id: 'returns', name: 'المرتجعات' }, { id: 'inventory_transfers', name: 'تحويلات المخازن' },
            { id: 'client_consumptions_balances', name: 'مسحوبات العملاء' }, { id: 'staff', name: 'الموظفين' },
            { id: 'attendance', name: 'الحضور والانصراف' }, { id: 'leaves', name: 'الإجازات' },
            { id: 'payroll', name: 'الرواتب' }, { id: 'chart_of_accounts', name: 'شجرة الحسابات' },
            { id: 'ledger', name: 'دفتر الأستاذ العام' }, { id: 'ar_invoices', name: 'فواتير المبيعات' },
            { id: 'gl_mappings', name: 'التوجيه المحاسبي' }, { id: 'users', name: 'إدارة المستخدمين' },
            { id: 'audit_logs', name: 'سجل الرقابة' }
        ];

        const actions = ['read', 'create', 'update', 'delete', 'approve', 'export', 'import', 'print', 'audit'];

        matrixContainer.innerHTML = allTables.map(t => `
            <tr class="border-b hover:bg-slate-50 transition tables-row" data-table="${t.id}">
                <td class="p-3 font-bold text-slate-600 bg-white sticky left-0 shadow-sm rbac-table-label" style="min-width:160px">${t.name}</td>
                ${actions.map(act => `
                    <td class="p-3 text-center">
                        <input type="checkbox" class="rbac-table-checkbox w-4 h-4 text-blue-600 rounded" data-table="${t.id}" data-action="${act}" value="${act}">
                    </td>
                `).join('')}
            </tr>
        `).join('');
    }

    // تصفير شاشات العرض قبل التعبئة
    document.querySelectorAll('#screensCheckboxGroup input').forEach(cb => cb.checked = false);

    if (id) {
        try {
            const res = await window.apiFetch('/api/users');
            const json = await res.json();
            const user = json.data.find(u => String(u.id) === String(id));
            if (user) {
                if(document.getElementById('userNameInput')) document.getElementById('userNameInput').value = user.username || '';
                if(document.getElementById('userEmailInput')) document.getElementById('userEmailInput').value = user.email || '';
                if(document.getElementById('userRoleInput')) document.getElementById('userRoleInput').value = user.role || 'Engineer';
                if(document.getElementById('userStatusInput')) document.getElementById('userStatusInput').value = user.status || 'Active';
                
                let perms = user.permissions;
                if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch(e) { perms = {}; } }

                if (perms.screens) {
                    document.querySelectorAll('#screensCheckboxGroup input').forEach(cb => {
                        if (perms.screens.includes('ALL') || perms.screens.includes(cb.value)) cb.checked = true;
                    });
                }
                
                if (perms.tables) {
                    document.querySelectorAll('.rbac-table-checkbox').forEach(cb => {
                        const tName = cb.getAttribute('data-table');
                        const action = cb.getAttribute('data-action');
                        if (perms.tables['ALL'] || (perms.tables[tName] && perms.tables[tName].includes(action))) cb.checked = true;
                    });
                }
            }
        } catch (e) { 
            if(typeof window.showToast === 'function') window.showToast("خطأ في تحميل بيانات المستخدم.", "error");
            else alert("خطأ في تحميل بيانات المستخدم.");
        }
    }
    document.getElementById('userFormModal').classList.remove('hidden');
};

document.getElementById('userForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('userIdInput').value;
    const payload = {
        username: document.getElementById('userNameInput').value,
        email: document.getElementById('userEmailInput') ? document.getElementById('userEmailInput').value : '',
        role: document.getElementById('userRoleInput') ? document.getElementById('userRoleInput').value : 'Engineer',
        status: document.getElementById('userStatusInput') ? document.getElementById('userStatusInput').value : 'Active',
        permissions: {
            screens: Array.from(document.querySelectorAll('#screensCheckboxGroup input:checked')).map(cb => cb.value),
            tables: {}
        }
    };
    
    if (document.getElementById('userPassInput') && document.getElementById('userPassInput').value) {
        payload.password = document.getElementById('userPassInput').value;
    }

    document.querySelectorAll('.rbac-table-checkbox:checked').forEach(cb => {
        const t = cb.getAttribute('data-table');
        const a = cb.getAttribute('data-action');
        if (!payload.permissions.tables[t]) payload.permissions.tables[t] = [];
        payload.permissions.tables[t].push(a);
    });

    try {
        const res = await window.apiFetch(id ? `/api/users/${id}` : `/api/users`, { 
            method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) 
        });
        
        if (res.ok) {
            if(typeof window.showToast === 'function') window.showToast("تم الحفظ بنجاح وتحديث الصلاحيات.", "success");
            else alert("تم الحفظ بنجاح.");
            
            document.getElementById('userFormModal').classList.add('hidden');
            window.loadUsersList();
            
            const currentUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
            if (String(currentUser.id) === String(id)) {
                localStorage.setItem('erp_user', JSON.stringify({...currentUser, role: payload.role, permissions: payload.permissions}));
                window.applyRBAC();
            }
        } else {
            const err = await res.json();
            if(typeof window.showToast === 'function') window.showToast(err.error || "فشل الحفظ", "error");
            else alert(err.error || "فشل الحفظ");
        }
    } catch(e) { 
        if(typeof window.showToast === 'function') window.showToast("خطأ في الاتصال بالخادم.", "error");
        else alert("خطأ في الاتصال بالخادم.");
    }
};

window.editUser = function(id) { window.openUserForm(id); };

window.deleteUser = async function(id) {
    if(!confirm("هل أنت متأكد من حذف هذا المستخدم بشكل نهائي؟")) return;
    try { 
        const res = await window.apiFetch(`/api/users/${id}`, { method: 'DELETE' }); 
        if (res.ok) {
            if(typeof window.showToast === 'function') window.showToast("تم الحذف بنجاح.", "success");
            window.loadUsersList(); 
        } else {
            if(typeof window.showToast === 'function') window.showToast("خطأ أثناء الحذف.", "error");
        }
    } catch(e) { 
        if(typeof window.showToast === 'function') window.showToast("خطأ في الاتصال بالخادم.", "error");
    }
};