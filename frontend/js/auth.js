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
            err.classList.add('hidden');
            
            try {
                const res = await window.apiFetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                const data = await res.json();
                
                if (data.success) {
                    localStorage.setItem('erp_token', data.token);
                    localStorage.setItem('erp_user', JSON.stringify(data.user));
                    window.location.reload();
                } else {
                    err.innerText = data.error || "Login failed. Invalid credentials.";
                    err.classList.remove('hidden');
                }
            } catch (error) {
                err.innerText = "Network Error. Check Server connection.";
                err.classList.remove('hidden');
            } finally {
                btn.disabled = false; 
                btn.innerText = "Sign In";
            }
        };
    }
});

window.logout = function() {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    window.location.reload();
};

// ================= RBAC UI LOGIC & HELPERS =================
window.hasPerm = function(table, action) {
    const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
    const userRole = (user.role || '').toLowerCase();
    
    // 1. فحص رتبة المدير (غير حساس لحالة الأحرف)
    if (userRole === 'admin') return true;
    
    const perms = user.permissions || {};
    
    // 2. فحص الصلاحيات الوظيفية الديناميكية (System Functions)
    if (perms.functions && (perms.functions.includes(action) || perms.functions.includes('ALL'))) return true;

    // 3. فحص صلاحيات الجداول
    if (perms.tables && perms.tables['ALL']) return true;
    if (perms.tables && perms.tables[table] && perms.tables[table].includes(action)) return true;
    
    if (userRole === 'custom') return false; 
    
    // 4. الصلاحيات الثابتة
    const STATIC_PERMS = {
        'hr': ['staff', 'attendance', 'leaves', 'payroll', 'system_parameters', 'projects', 'audit_logs'],
        'accountant': ['ledger', 'chart_of_accounts', 'ar_invoices', 'payment_receipts', 'installments', 'contracts', 'customers', 'subcontractor_invoices', 'partners', 'partner_deposits', 'partner_withdrawals', 'projects', 'system_parameters', 'property_units'],
        'engineer': ['projects', 'boq', 'subcontractors', 'subcontractor_items', 'tasks', 'daily_reports', 'inventory', 'inventory_transfers', 'material_usage', 'returns', 'rfq', 'purchase_orders', 'system_parameters']
    };
    
    if (STATIC_PERMS[userRole] && STATIC_PERMS[userRole].includes(table)) {
        if(['read', 'create', 'update'].includes(action)) return true;
        if(action === 'delete' && userRole !== 'engineer') return true;
        if(action === 'export' || action === 'print') return true; 
    }
    return false;
};

window.applyRBAC = function() {
    const user = JSON.parse(localStorage.getItem('erp_user') || '{}');
    const role = (user.role || 'engineer').toLowerCase();
    const perms = user.permissions || {};
    
    const allTabs = ['ceoTab', 'projectsTab', 'operationsTab', 'realestateTab', 'partnersTab', 'procurementTab', 'inventoryTab', 'usageTab', 'hrTab', 'financeTab', 'auditTab'];
    let allowedTabs = [];
    
    if (role === 'admin' || (perms.screens && perms.screens.includes('ALL'))) {
        allowedTabs = allTabs;
    } else if (perms.screens && perms.screens.length > 0) {
        allowedTabs = perms.screens;
    } else {
        if (role === 'admin') allowedTabs = allTabs;
        else if (role === 'hr') allowedTabs = ['hrTab', 'projectsTab', 'auditTab'];
        else if (role === 'accountant') allowedTabs = ['financeTab', 'realestateTab', 'partnersTab', 'projectsTab', 'auditTab'];
        else if (role === 'engineer') allowedTabs = ['projectsTab', 'operationsTab', 'procurementTab', 'inventoryTab', 'usageTab'];
    }

    allTabs.forEach(t => {
        const btn = document.getElementById('btn-' + t);
        if (btn) {
            if (allowedTabs.includes(t)) btn.style.display = 'block';
            else btn.style.display = 'none';
        }
    });

    if (!allowedTabs.includes(window.currentTab) && allowedTabs.length > 0) {
        if(typeof window.showTab === 'function') window.showTab(allowedTabs[0]);
    }
    
    if (role !== 'admin') {
        document.querySelectorAll('.rbac-admin').forEach(el => el.style.display = 'none');
    } else {
        document.querySelectorAll('.rbac-admin').forEach(el => el.style.display = 'inline-block');
    }
};

// ================= USER MANAGEMENT =================
window.openUserManagement = async function() {
    document.getElementById('userManagementModal').classList.remove('hidden');
    window.loadUsersList();
};

window.loadUsersList = async function() {
    try {
        const res = await window.apiFetch('/api/users');
        if (!res.ok) {
            let errorMsg = "Failed to load users list. Access Denied.";
            try { const errData = await res.json(); if(errData.error) errorMsg = `Server Blocked: ${errData.error}`; } catch(e){}
            throw new Error(errorMsg);
        }
        const json = await res.json();
        const tbody = document.getElementById('usersListBody');
        tbody.innerHTML = json.data.map(u => `
            <tr class="border-b hover:bg-slate-50 text-sm transition">
                <td class="p-3 text-slate-500 font-bold">#${u.id}</td>
                <td class="p-3 font-bold text-blue-700">${u.username} <span class="text-xs text-slate-400 block">${u.email||''}</span></td>
                <td class="p-3 font-bold">${u.role}</td>
                <td class="p-3"><span class="px-2 py-1 rounded text-xs font-bold ${u.status==='Active'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}">${u.status}</span></td>
                
                <td class="p-3 text-slate-400 font-bold text-center">-</td>
                
                <td class="p-3 text-xs text-slate-500">${new Date(u.created_at).toLocaleDateString()}</td>
                <td class="p-3">
                    <button onclick="openUserForm(${u.id})" class="text-blue-500 hover:scale-110 mr-2">✏️</button>
                    ${u.username.toLowerCase() !== 'admin' ? `<button onclick="deleteUser(${u.id})" class="text-red-500 hover:scale-110">🗑️</button>` : ''}
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="p-4 text-slate-400 font-bold text-center">No users found</td></tr>';
    } catch(e) { 
        alert(e.message || "Failed to load users list. Are you Admin?"); 
    }
};
window.openUserForm = async function(id = null) {
    document.getElementById('userForm').reset();
    document.getElementById('userIdInput').value = id || '';
    document.getElementById('userFormTitle').innerText = id ? 'Edit User Permissions' : 'Create New User';

    const projSelect = document.getElementById('userProjectsSelect');
    if (projSelect && window.erpData && window.erpData.projects_dd) {
        projSelect.innerHTML = window.erpData.projects_dd.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    }

    const screens = ['ceoTab', 'projectsTab', 'operationsTab', 'realestateTab', 'partnersTab', 'procurementTab', 'inventoryTab', 'usageTab', 'hrTab', 'financeTab', 'auditTab'];
    const tables = ['projects', 'partners', 'customers', 'property_units', 'contracts', 'installments', 'payment_receipts', 'boq', 'subcontractors', 'subcontractor_items', 'subcontractor_invoices', 'tasks', 'daily_reports', 'inventory', 'inventory_transfers', 'material_usage', 'returns', 'rfq', 'purchase_orders', 'staff', 'attendance', 'leaves', 'payroll', 'chart_of_accounts', 'ledger', 'audit_logs', 'client_consumptions_balances'];
    const systemFunctions = ['manage_users', 'approve_payments', 'view_reports', 'system_config', 'manage_backups'];
    const advancedActions = ['read', 'create', 'update', 'delete', 'approve', 'export', 'import', 'print', 'audit'];
    
    let matrixHTML = '';

    // 1. Screens Group
    matrixHTML += `<tr class="bg-slate-200"><td colspan="${advancedActions.length + 1}" class="p-2 font-bold text-slate-700 uppercase">📺 Screens & Dashboards</td></tr>`;
    screens.forEach(s => {
        matrixHTML += `
            <tr class="border-b hover:bg-slate-50 transition screens-row" data-screen="${s}">
                <td class="p-3 font-bold text-left text-slate-600 sticky left-0 bg-white shadow-[1px_0_5px_rgba(0,0,0,0.05)]">${s.replace('Tab', '')} Module</td>
                <td colspan="${advancedActions.length}" class="p-3">
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" class="rbac-screen-cb w-4 h-4 text-blue-600 rounded border-gray-300" value="${s}">
                        <span class="text-sm text-slate-600 font-semibold">Allow Access</span>
                    </label>
                </td>
            </tr>
        `;
    });

    // 2. Tables Group
    matrixHTML += `<tr class="bg-slate-200"><td colspan="${advancedActions.length + 1}" class="p-2 font-bold text-slate-700 uppercase">🗄️ Database Tables</td></tr>`;
    matrixHTML += `
        <tr class="bg-slate-100 text-xs text-slate-500 uppercase">
            <td class="p-2 font-bold sticky left-0 bg-slate-100">Table Name</td>
            ${advancedActions.map(act => `<td class="p-2 font-bold text-center">${act}</td>`).join('')}
        </tr>
    `;
    tables.forEach(t => {
        matrixHTML += `
            <tr class="border-b hover:bg-slate-50 transition tables-row" data-table="${t}">
                <td class="p-3 font-bold text-left text-slate-600 sticky left-0 bg-white shadow-[1px_0_5px_rgba(0,0,0,0.05)]">${t.replace(/_/g, ' ').toUpperCase()}</td>
                ${advancedActions.map(act => {
                    let isDisabled = '';
                    if (t === 'client_consumptions_balances' && (act === 'update' || act === 'delete')) {
                        isDisabled = 'disabled title="Read-only integrity enforced"';
                    }
                    return `<td class="p-3 text-center"><input type="checkbox" class="rbac-checkbox crud-${act} w-4 h-4 text-blue-600 rounded" value="${act}" ${isDisabled}></td>`;
                }).join('')}
            </tr>
        `;
    });

    // 3. System Functions Group
    matrixHTML += `<tr class="bg-slate-200"><td colspan="${advancedActions.length + 1}" class="p-2 font-bold text-slate-700 uppercase">⚙️ System Functions</td></tr>`;
    systemFunctions.forEach(f => {
        matrixHTML += `
            <tr class="border-b hover:bg-slate-50 transition functions-row" data-function="${f}">
                <td class="p-3 font-bold text-left text-slate-600 sticky left-0 bg-white shadow-[1px_0_5px_rgba(0,0,0,0.05)]">${f.replace(/_/g, ' ').toUpperCase()}</td>
                <td colspan="${advancedActions.length}" class="p-3">
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" class="rbac-function-cb w-4 h-4 text-blue-600 rounded border-gray-300" value="${f}">
                        <span class="text-sm text-slate-600 font-semibold">Enable Function</span>
                    </label>
                </td>
            </tr>
        `;
    });

    document.getElementById('crudMatrixBody').innerHTML = matrixHTML;
    document.querySelectorAll('.rbac-notif-cb').forEach(cb => cb.checked = false);

    if (id) {
        try {
            const res = await window.apiFetch('/api/users');
            if (!res.ok) {
                let errorMsg = "Failed to fetch user details.";
                try { const errData = await res.json(); if(errData.error) errorMsg = errData.error; } catch(e){}
                throw new Error(errorMsg);
            }
            const json = await res.json();
            const user = json.data.find(u => u.id === id);
            if (user) {
                document.getElementById('userNameInput').value = user.username;
                if (document.getElementById('userEmailInput')) document.getElementById('userEmailInput').value = user.email || '';
                document.getElementById('userRoleInput').value = user.role;
                document.getElementById('userStatusInput').value = user.status;
                
                const perms = user.permissions || {};
                
                if (perms.screens) {
                    if (perms.screens.includes('ALL')) document.querySelectorAll('.rbac-screen-cb').forEach(cb => cb.checked = true);
                    else document.querySelectorAll('.rbac-screen-cb').forEach(cb => { if (perms.screens.includes(cb.value)) cb.checked = true; });
                }
                
                if (perms.projects && projSelect) { Array.from(projSelect.options).forEach(opt => { if (perms.projects.includes(opt.value)) opt.selected = true; }); }
                
                if (perms.tables) {
                    if (perms.tables['ALL']) document.querySelectorAll('.tables-row input[type="checkbox"]:not([disabled])').forEach(cb => cb.checked = true);
                    else Object.keys(perms.tables).forEach(t => { const tr = document.querySelector(`tr.tables-row[data-table="${t}"]`); if (tr) { perms.tables[t].forEach(action => { const cb = tr.querySelector(`.crud-${action}`); if (cb && !cb.disabled) cb.checked = true; }); } });
                }

                if (perms.functions) {
                    if (perms.functions.includes('ALL')) document.querySelectorAll('.rbac-function-cb').forEach(cb => cb.checked = true);
                    else document.querySelectorAll('.rbac-function-cb').forEach(cb => { if (perms.functions.includes(cb.value)) cb.checked = true; });
                }

                if (perms.notifications) { document.querySelectorAll('.rbac-notif-cb').forEach(cb => { if (perms.notifications.includes(cb.value)) cb.checked = true; }); }
            }
        } catch(e) {
            alert(e.message || "Failed to load user details.");
        }
    }
    document.getElementById('userFormModal').classList.remove('hidden');
};

document.getElementById('userForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('userIdInput').value;
    const username = document.getElementById('userNameInput').value;
    const email = document.getElementById('userEmailInput') ? document.getElementById('userEmailInput').value : null;
    const password = document.getElementById('userPassInput').value;
    const role = document.getElementById('userRoleInput').value;
    const status = document.getElementById('userStatusInput').value;

    const screens = Array.from(document.querySelectorAll('.rbac-screen-cb:checked')).map(cb => cb.value);
    const projSelect = document.getElementById('userProjectsSelect');
    const projects = projSelect ? Array.from(projSelect.selectedOptions).map(opt => opt.value) : [];
    const notifications = Array.from(document.querySelectorAll('.rbac-notif-cb:checked')).map(cb => cb.value);
    const functions = Array.from(document.querySelectorAll('.rbac-function-cb:checked')).map(cb => cb.value);

    const tables = {};
    document.querySelectorAll('tr.tables-row').forEach(tr => {
        const tName = tr.getAttribute('data-table');
        const actions = Array.from(tr.querySelectorAll('input:checked')).map(cb => cb.value);
        if (actions.length > 0) tables[tName] = actions;
    });

    const allScreensCount = document.querySelectorAll('.rbac-screen-cb').length;
    if (screens.length === allScreensCount && allScreensCount > 0) { screens.length = 0; screens.push('ALL'); }
    
    const allFunctionsCount = document.querySelectorAll('.rbac-function-cb').length;
    if (functions.length === allFunctionsCount && allFunctionsCount > 0) { functions.length = 0; functions.push('ALL'); }

    const allTablesCount = document.querySelectorAll('tr.tables-row').length;
    if (Object.keys(tables).length === allTablesCount && allTablesCount > 0) { 
        Object.keys(tables).forEach(k => delete tables[k]); 
        tables['ALL'] = ['read', 'create', 'update', 'delete', 'approve', 'export', 'import', 'print', 'audit']; 
    }

    const payload = { username, email, role, status, permissions: { screens, projects, tables, functions, notifications } };
    if (password) payload.password = password;

    try {
        const res = await window.apiFetch(id ? `/api/users/${id}` : `/api/users`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        if (res.ok) { 
            document.getElementById('userFormModal').classList.add('hidden'); 
            window.loadUsersList(); 
        } 
        else { 
            let errorMsg = "Failed to save user. Access Denied.";
            try { const errData = await res.json(); if(errData.error) errorMsg = `Server Error: ${errData.error}`; } catch(err){}
            throw new Error(errorMsg);
        }
    } catch(e) { 
        alert(e.message || "Network error"); 
    }
};

window.deleteUser = async function(id) {
    if(!confirm("Delete this user permanently?")) return;
    try { 
        const res = await window.apiFetch(`/api/users/${id}`, { method: 'DELETE' }); 
        if (!res.ok) {
            let errorMsg = "Error deleting user. Access Denied.";
            try { const errData = await res.json(); if(errData.error) errorMsg = `Server Error: ${errData.error}`; } catch(err){}
            throw new Error(errorMsg);
        }
        window.loadUsersList(); 
    } catch(e) { 
        alert(e.message || "Error deleting user"); 
    }
};
// هذا السطر يحل مشكلة اختلاف اسم الدالة في أزرار HTML
window.editUser = function(id) {
    if (typeof window.openUserForm === 'function') {
        window.openUserForm(id);
    } else {
        console.error("Error: openUserForm function is missing!");
    }
};