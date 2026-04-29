/**
 * Forms & Calculations Module
 * [UPDATED: Highly Optimized, DRY Architecture, Reduced Boilerplate]
 * 100% COMPLETE NO SHORTCUTS WITH AGGRESSIVE AUTO-REFRESH
 */

window.safeApiCall = async function({ url, method = 'POST', body = null, confirmMsg, successMsg, refresh = [], btnId = null, btnLoading = "جاري...", isFormData = false }) {
    if (confirmMsg && !confirm(confirmMsg)) return false;
    
    const btn = btnId ? document.getElementById(btnId) : null;
    let originalText = '';
    if (btn) { originalText = btn.innerText; btn.disabled = true; btn.innerText = btnLoading; }
    
    try {
        const options = { method };
        if (body) {
            if (isFormData) {
                options.body = body;
                options.isFormData = true;
            } else {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(body);
            }
        }
        
        const res = await window.apiFetch(url, options);
        const contentType = res.headers.get('content-type');
        const data = (contentType && contentType.includes('application/json')) ? await res.json() : { success: res.ok, error: await res.text() };
        
        if (res.ok && data.success !== false) {
            if (successMsg) alert(successMsg);
            if (refresh.length > 0) {
                for (const target of refresh) await window.safeSystemRefresh(target);
            }
            return { success: true, data };
        } else {
            alert("خطأ (Error): " + (data.error || data || "فشل الإجراء"));
            return { success: false, error: data.error };
        }
    } catch (e) {
        console.error("[FRONTEND ERROR]", e);
        alert("حدث خطأ في الاتصال بالخادم (Network Error).");
        return { success: false, error: e };
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = originalText; }
    }
};

window.buildSelectOptions = function(arr, valKey, textKey, selectedVal, prefix = '') {
    let html = prefix ? `<option value="">${prefix}</option>` : '';
    if (!arr || !Array.isArray(arr)) return html;
    return html + arr.map(item => {
        const v = valKey ? item[valKey] : item;
        const t = textKey ? (typeof textKey === 'function' ? textKey(item) : item[textKey]) : item;
        return `<option value="${v}" ${v == selectedVal ? 'selected' : ''}>${t}</option>`;
    }).join('');
};

window.getStockUnitCostLCY = function(i) {
    if (!i) return 0;
    if (i.po_id && i.po_unit_cost_fcy !== undefined) {
        const q = parseFloat(i.po_original_qty) || 1;
        const ucFcy = parseFloat(i.po_unit_cost_fcy) || 0;
        const fx = parseFloat(i.fx_rate) || 1;
        const ddpFcy = parseFloat(i.po_ddp_added) || 0;
        const ddpLcy = parseFloat(i.po_ddp_lcy_added) || 0;
        const exWork = q * ucFcy;
        const totalDdpFcy = exWork + ddpFcy;
        const totalDdpLcy = (totalDdpFcy * fx) + ddpLcy;
        return q > 0 ? +(totalDdpLcy / q).toFixed(2) : 0;
    }
    return parseFloat(i.buy_price || 0);
};

window.filterConsumptionsByClient = function(clientId) {
    const select = document.querySelector('select[name="inventory_id"]');
    if(!select) return;
    const client = (window.erpData.customers_dd || []).find(c => c.id == clientId);
    const clientName = client ? client.name : '';
    
    const clientSales = (window.erpData.inventory_sales || []).filter(s => s.customer_name === clientName);
    
    select.innerHTML = '<option value="">-- Select Consumed Stock Item --</option>' + 
        clientSales.map(s => `<option value="${s.inventory_id}" data-buy="${s.buy_price||0}">[PO-${s.po_id||'Manual'}] ${s.item_name} (Qty: ${s.qty})</option>`).join('');
};

window.calcOSBalance = function() {
    const transEl = document.getElementById('osTransAmt');
    const paidEl = document.getElementById('osPaidAmt');
    const balEl = document.getElementById('osBalance');
    if(transEl && paidEl && balEl) {
        const trans = parseFloat(transEl.value) || 0;
        const paid = parseFloat(paidEl.value) || 0;
        let bal = trans - paid;
        if(bal < 0) bal = 0;
        balEl.value = bal.toFixed(2);
    }
};

window.addDueRow = function() {
    const container = document.getElementById('dueRowsContainer');
    if(container) {
        container.insertAdjacentHTML('beforeend', `
            <div class="flex gap-2 items-center due-row">
                <input type="number" name="due_amount[]" step="0.01" min="0" placeholder="Due Amount" class="p-2 border rounded text-center flex-1" required>
                <input type="date" name="due_date[]" class="p-2 border rounded text-center flex-1" required>
                <button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-2 hover:text-red-700">✕</button>
            </div>
        `);
    }
};

window.systemWipeData = async function() {
    const promptCheck = prompt("Security Check: Type 'DELETE' to confirm factory reset:");
    if(promptCheck !== 'DELETE') { alert("Factory reset cancelled."); return; }
    
    const res = await window.safeApiCall({ url: '/api/system/wipe', method: 'DELETE', confirmMsg: "⚠️ WARNING: This will permanently delete ALL data! Are you sure?" });
    if(res && res.success) { alert("System wiped successfully. Reloading..."); window.location.reload(); }
};

window.systemEOYClosure = async function() {
    const msg = "Execute End of Year Closure? This calculates total Net Profit/Loss and posts it to 'Retained Earnings'.";
    const res = await window.safeApiCall({ url: '/api/system/eoy_closure', confirmMsg: msg, refresh: ['ledger'] });
    if(res && res.success) alert("EOY Closure Successful.\nNet Amount Transferred: " + formatMoney(res.data.net));
};

window.openBackupManagement = async function() {
    document.getElementById('backupManagementModal')?.classList.remove('hidden');
    window.loadBackupsList();
};

window.saveBackupLink = async function() {
    const link = document.getElementById('backupLinkInput')?.value || '';
    const dir = document.getElementById('backupDirInput')?.value || '';
    if(!link && !dir) return alert("Please enter a valid link or local directory.");
    await window.safeApiCall({ url: '/api/system/backup_config', body: { link, local_directory: dir }, successMsg: "Backup config saved!" });
};

window.loadBackupsList = async function() {
    const tbody = document.getElementById('backupsListBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-slate-400 text-center font-bold">Loading backups...</td></tr>';
    try {
        const res = await window.apiFetch('/api/system/backups');
        const json = await res.json();
        const dataList = json.data || json.backups || [];
        if (res.ok && dataList.length > 0) {
            tbody.innerHTML = dataList.map(b => `<tr class="border-b hover:bg-slate-50 text-sm transition"><td class="p-3 font-bold text-slate-700 text-left">${b.name}</td><td class="p-3 text-slate-500 font-mono">${new Date(b.date).toLocaleString()}</td><td class="p-3 text-slate-500 font-mono">${b.size}</td><td class="p-3 text-xs font-bold text-blue-600">${b.source}</td><td class="p-3 text-xs text-slate-500">${b.local_directory || '-'}</td><td class="p-3 text-center"><button onclick="restoreBackup('${b.name}')" class="bg-red-100 text-red-600 px-3 py-1 rounded font-bold hover:bg-red-200 transition">Restore Data</button></td></tr>`).join('');
        } else { tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-slate-400 font-bold text-center">No backups found</td></tr>`; }
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-red-500 text-center font-bold">Network error loading backups.</td></tr>'; }
};

window.triggerManualBackup = async function() {
    const res = await window.safeApiCall({ url: '/api/system/backup/manual', btnId: 'manualBackupBtn', btnLoading: "Creating..." });
    if(res && res.success) { alert(`Backup created: ${res.data.file}`); window.loadBackupsList(); }
};

window.sendManualEmail = async function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const res = await window.safeApiCall({ url: '/api/action/send_email', body: data, successMsg: "Email sent successfully!", refresh: ['email_logs'], btnId: 'sendEmailBtn', btnLoading: "Sending..." });
    if(res && res.success) e.target.reset();
};

window.openEmailLogs = async function() {
    document.getElementById('emailLogsModal').classList.remove('hidden');
    await window.safeSystemRefresh('email_logs');
};

window.openNewPayAppModal = async function(subId) {
    const editIdInput = document.getElementById('subInvoiceEditId'); if(editIdInput) editIdInput.value = '';
    const form = document.getElementById('subInvoiceForm'); if(form) form.reset();
    document.getElementById('subcontractorIdInput').value = subId;
    
    const select = document.getElementById('subInvItemSelect');
    if(select) {
        select.innerHTML = '<option value="">Loading...</option>';
        try {
            const res = await window.apiFetch(`/api/subcontractor_items/${subId}`);
            const json = await res.json();
            select.innerHTML = '<option value="">-- Select Contract Item --</option>' + 
                json.data.map(i => `<option value="${i.id}" data-qty="${i.assigned_qty}" data-price="${i.unit_price}">${i.item_desc}</option>`).join('');
        } catch(e) {
            select.innerHTML = '<option value="">Error loading items</option>';
        }
    }
    document.getElementById('newPayAppModal').classList.remove('hidden');
};

setTimeout(() => {
    const origOpenSubItems = window.openSubcontractorItems;
    window.openSubcontractorItems = function(subId, projectName) {
        if (origOpenSubItems) origOpenSubItems(subId, projectName);
        const boqItems = (window.erpData.boq || []).filter(b => b.project_name === projectName);
        const subBoqSelect = document.getElementById('subBoqSelect');
        if(subBoqSelect) {
            subBoqSelect.innerHTML = '<option value="">-- Select BOQ Item --</option>' + 
                boqItems.map(b => `<option value="${b.id}">[BOQ] ${b.item_desc} - Unit: ${b.unit} - Est Qty: ${b.est_qty}</option>`).join('');
        }
    };
}, 1000);

window.openManageProjectsList = async function() {
    document.getElementById('manageProjectsListModal').classList.remove('hidden');
    window.loadProjectsList();
};

window.loadProjectsList = async function() {
    const listDiv = document.getElementById('projectsManageList');
    listDiv.innerHTML = '<p class="text-center text-slate-400 text-sm">Loading...</p>';
    try {
        const res = await window.apiFetch('/api/dropdowns');
        const data = await res.json();
        const paramProjects = data.param_projects || [];
        listDiv.innerHTML = paramProjects.map(p => `
            <div class="flex justify-between items-center bg-white border p-3 rounded-lg shadow-sm mb-2">
                <span class="font-bold text-slate-700">${p.value}</span>
                <button onclick="deleteSystemParameter('Project', '${p.value}')" class="text-red-500 bg-red-50 px-3 py-1 rounded text-xs font-bold hover:bg-red-100">Delete</button>
            </div>
        `).join('') || '<p class="text-center text-slate-400 text-sm">No custom projects added.</p>';
    } catch(e) { listDiv.innerHTML = '<p class="text-red-500 text-center">Failed to load.</p>'; }
};

window.addProjectParameter = async function() {
    const val = document.getElementById('newProjectNameInput')?.value.trim();
    if(!val) return;
    const res = await window.safeApiCall({ url: '/api/system_parameters/project', body: {value: val} });
    if(res && res.success) {
        document.getElementById('newProjectNameInput').value = '';
        if(window.fetchDropdownData) await window.fetchDropdownData();
        window.refreshAllSelects(); window.loadProjectsList();
    }
};

window.deleteSystemParameter = async function(category, val) {
    const res = await window.safeApiCall({ url: `/api/system_parameters/${category.toLowerCase()}/${encodeURIComponent(val)}`, method: 'DELETE', confirmMsg: `Delete ${val}?` });
    if(res && res.success) {
        if(window.fetchDropdownData) await window.fetchDropdownData();
        window.refreshAllSelects(); if(category === 'Project') window.loadProjectsList();
    }
};

window.refreshAllSelects = function() {
    const projOptsList = window.erpData.projects_dd || window.erpData.projects || [];
    document.querySelectorAll('select[id$="ProjectFilter"]').forEach(sel => {
        const val = sel.value;
        sel.innerHTML = window.buildSelectOptions(projOptsList, 'name', 'name', val, '-- All Projects --');
        sel.value = val;
    });
};

window.updateCompaniesDatalist = function() {
    const dList = document.getElementById('companiesList');
    if(dList && window.erpData && window.erpData.companies_dd) {
        dList.innerHTML = window.erpData.companies_dd.map(c => `<option value="${c}">`).join('');
    }
};

window.calcPO = function() {
    const qty = parseFloat(document.getElementById('poQty').value) || 0;
    const unitCostFcy = parseFloat(document.getElementById('poUnitCostFcy').value) || 0;
    const fxRate = parseFloat(document.getElementById('poFxRate').value) || 1;
    const ddpAdded = parseFloat(document.getElementById('poDdpAddedAmount').value) || 0;
    
    const totalExWork = qty * unitCostFcy;
    const totalDdpFcy = totalExWork + ddpAdded;
    const totalDdpLcy = totalDdpFcy * fxRate;
    const unitCostLcy = qty > 0 ? (totalDdpLcy / qty) : 0;

    document.getElementById('poTotalExWork').value = totalExWork.toFixed(2);
    document.getElementById('poTotalDdpFcy').value = totalDdpFcy.toFixed(2);
    document.getElementById('poTotalDdpLcy').value = totalDdpLcy.toFixed(2);
    document.getElementById('poUnitCostLcy').value = unitCostLcy.toFixed(2);
};

window.attachCurrencyConversionListeners = function() {
    const fcyInput = document.getElementById('fcy_amount');
    const rateInput = document.getElementById('exchange_rate');
    const lcyInput = document.getElementById('total_cost_ddp_lcy');

    function calculateLCY() {
        const getSafeNum = typeof window.safeNum === 'function' ? window.safeNum : (v, f) => parseFloat(v) || f;
        const fcy = getSafeNum(fcyInput?.value, 0);
        const rate = getSafeNum(rateInput?.value, 1);
        
        if (fcy > 0 && lcyInput) {
            if(rateInput) rateInput.setAttribute('required', 'true');
            lcyInput.value = (fcy * rate).toFixed(2);
            lcyInput.setAttribute('readonly', 'true'); 
            lcyInput.classList.add('bg-slate-100');
        } else if(lcyInput) {
            if(rateInput) rateInput.removeAttribute('required');
            lcyInput.removeAttribute('readonly');
            lcyInput.classList.remove('bg-slate-100');
        }
    }

    if(fcyInput) fcyInput.addEventListener('input', calculateLCY);
    if(rateInput) rateInput.addEventListener('input', calculateLCY);
};

window.openPreOrderModal = function() {
    const modal = document.getElementById('preOrderModal');
    const clientSelect = document.getElementById('preOrderClientSelect');
    const poSelect = document.getElementById('preOrderPoSelect');
    
    const customers = window.erpData?.customers_dd || window.erpData?.customers || [];
    clientSelect.innerHTML = '<option value="">-- اختر العميل --</option>' + 
        customers.map(c => {
            const cName = c.name || c.Name || c.client_name || c.company_name || 'بدون اسم';
            const cId = c.id || c.ID;
            return `<option value="${cId}">${cName}</option>`;
        }).join('');

    const pos = window.erpData?.purchase_orders || [];
    poSelect.innerHTML = '<option value="">-- اختر أمر الشراء --</option>' + 
        pos.map(p => {
            const itemName = p.item || p.Item || p.item_name || p.specification || 'صنف غير محدد';
            const supplierName = p.supplier || p.Supplier || p.vendor || '';
            const poId = p.id || p.ID || p.po_id;
            
            return `<option value="${poId}">[PO-${poId}] ${itemName} ${supplierName ? '- ' + supplierName : ''}</option>`;
        }).join('');

    modal.classList.remove('hidden');
};

window.loadPreOrders = async function() {
    const tbody = document.getElementById('preOrdersBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-500 font-bold animate-pulse">⏳ جاري جلب البيانات...</td></tr>';

    try {
        const res = await window.apiFetch('/api/table/client_preorders');
        
        if (res.ok) {
            const data = await res.json();
            const preOrders = data.data || data.rows || data || [];

            if (preOrders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-slate-400 font-bold italic">لا توجد حجوزات معلقة حالياً.</td></tr>';
                return;
            }

            tbody.innerHTML = preOrders.map(po => {
                const customers = window.erpData?.customers_dd || window.erpData?.customers || [];
                const clientObj = customers.find(c => c.id == po.client_id);
                const clientName = clientObj ? (clientObj.name || clientObj.Name || clientObj.company_name) : po.client_id;

                const pos = window.erpData?.purchase_orders || [];
                const poObj = pos.find(p => p.id == po.po_id);
                const itemName = poObj ? (poObj.item || poObj.item_name || 'غير محدد') : 'غير محدد';

                const date = new Date(po.created_at).toLocaleDateString('en-GB');
                
                const statusBadge = po.status === 'Pending' 
                    ? '<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">قيد الانتظار ⏳</span>'
                    : '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">تم التسليم ✅</span>';

                const actionBtn = po.status === 'Pending'
                    ? `<button onclick="fulfillPreOrder(${po.id})" class="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm">تسليم البضاعة (Fulfill) 📦</button>`
                    : `<span class="text-slate-400 text-xs font-bold">- مقفل -</span>`;

                return `
                    <tr class="border-b hover:bg-slate-50 transition">
                        <td class="p-3">${date}</td>
                        <td class="p-3 font-bold text-slate-700">${clientName}</td>
                        <td class="p-3 font-mono text-blue-600">[PO-${po.po_id}]</td>
                        <td class="p-3 font-bold">${itemName}</td>
                        <td class="p-3 font-bold">${po.reserved_qty}</td>
                        <td class="p-3 font-bold font-mono text-emerald-600">${po.advance_payment}</td>
                        <td class="p-3">${statusBadge}</td>
                        <td class="p-3">${actionBtn}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error("Error loading pre-orders:", err);
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-red-500 font-bold">❌ حدث خطأ أثناء جلب البيانات.</td></tr>';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(document.getElementById('preOrdersBody')) {
            window.loadPreOrders();
        }
    }, 1000);
});

window.submitPreOrder = async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await window.apiFetch('/api/action/create_preorder', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert("✅ تم تسجيل الحجز بنجاح وإثبات الدفعة المقدمة محاسبياً.");
            document.getElementById('preOrderModal').classList.add('hidden');
            window.safeSystemRefresh(); 
            window.loadPreOrders();     
        }
    } catch (err) {
        console.error("Pre-order error:", err);
        alert("❌ فشل تسجيل الحجز.");
    }
};

// حل الترحيل: تقسيم بناء الأعمدة ليتطابق مع الـ Headers
window.viewPoChargesHelper = async function(poId, poName, type) {
    const isFCY = type === 'fcy';
    document.getElementById(isFCY ? 'poDdpTitle' : 'poDdpLcyTitle').innerText = `${isFCY ? 'Total Cost DDP FCY Adds for:' : 'Total Cost DDP LCY Adds for:'} ${poName}`;
    document.getElementById(isFCY ? 'poDdpChargePoId' : 'poDdpLcyChargePoId').value = poId;
    const endpoint = isFCY ? 'po_ddp_charges' : 'po_ddp_lcy_charges';
    
    try {
        const res = await window.apiFetch(`/api/table/${endpoint}?filter=${poId}`);
        const json = await res.json();
        document.getElementById(isFCY ? 'poDdpBody' : 'poDdpLcyBody').innerHTML = (json.data || []).map(d => {
            if(!d) return '';
            const dt = d.date || d.created_at;
            const formattedAmt = typeof window.formatMoney === 'function' ? window.formatMoney(d.amount) : d.amount;
            
            if (isFCY) {
                // جدول FCY يحتوي على 5 أعمدة
                return `<tr class="border-b hover:bg-slate-50 text-sm transition-colors">
                    <td class="p-3 text-center whitespace-nowrap">${dt ? new Date(dt).toLocaleDateString('en-GB') : '-'}</td>
                    <td class="p-3 text-center font-bold font-mono text-orange-600 whitespace-nowrap">${formattedAmt}</td>
                    <td class="p-3 text-center w-full">${d.description || '-'}</td>
                    <td class="p-3 text-center text-xs font-bold text-slate-500 whitespace-nowrap">${d.created_by || '-'}</td>
                    <td class="p-3 text-center whitespace-nowrap"><button type="button" onclick="deleteItem('${endpoint}', ${d.id})" class="text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-transform hover:scale-105 font-bold">🗑️ حذف</button></td>
                </tr>`;
            } else {
                // جدول LCY يحتوي على 7 أعمدة
                const formattedFcy = d.fcy_amount > 0 ? (typeof window.formatMoney === 'function' ? window.formatMoney(d.fcy_amount) : d.fcy_amount) : '-';
                const fxRate = d.fx_rate || '-';
                return `<tr class="border-b hover:bg-slate-50 text-sm transition-colors">
                    <td class="p-3 text-center whitespace-nowrap">${dt ? new Date(dt).toLocaleDateString('en-GB') : '-'}</td>
                    <td class="p-3 text-center font-bold font-mono text-emerald-600 whitespace-nowrap">${formattedAmt}</td>
                    <td class="p-3 text-center font-bold font-mono text-blue-600 whitespace-nowrap bg-blue-50/50">${formattedFcy}</td>
                    <td class="p-3 text-center font-bold font-mono text-indigo-600 whitespace-nowrap bg-indigo-50/50">${fxRate}</td>
                    <td class="p-3 text-center w-full">${d.description || '-'}</td>
                    <td class="p-3 text-center text-xs font-bold text-slate-500 whitespace-nowrap">${d.created_by || '-'}</td>
                    <td class="p-3 text-center whitespace-nowrap"><button type="button" onclick="deleteItem('${endpoint}', ${d.id})" class="text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-transform hover:scale-105 font-bold">🗑️ حذف</button></td>
                </tr>`;
            }
        }).join('') || `<tr><td colspan="${isFCY ? 5 : 7}" class="text-center p-6 text-slate-400 font-bold">لا توجد مصاريف إضافية مسجلة.</td></tr>`;
        document.getElementById(isFCY ? 'poDdpModal' : 'poDdpLcyModal').classList.remove('hidden');
    } catch(e) { console.error(e); alert("Failed to load charges."); }
};

window.viewPoDdpCharges = (id, name) => window.viewPoChargesHelper(id, name, 'fcy');
window.viewPoDdpLcyCharges = (id, name) => window.viewPoChargesHelper(id, name, 'lcy');

window.bindGenericForm = (formId, url, refreshTable, callbackFn) => {
    const form = document.getElementById(formId);
    if(form) form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const res = await window.safeApiCall({ url, body: data, refresh: [refreshTable] });
        if(res && res.success) {
            e.target.reset();
            if(callbackFn) callbackFn(data);
        }
    };
};

document.addEventListener('DOMContentLoaded', () => {
    window.bindGenericForm('poDdpForm', '/api/add/po_ddp_charges', 'purchase_orders', (d) => window.viewPoDdpCharges(d.po_id, ''));
    window.bindGenericForm('poDdpLcyForm', '/api/add/po_ddp_lcy_charges', 'purchase_orders', (d) => window.viewPoDdpLcyCharges(d.po_id, ''));
    window.bindGenericForm('partnerDepositForm', '/api/add/partner_deposits', 'partners', (d) => window.viewPartnerDeposits(d.partner_id, ''));
    window.bindGenericForm('partnerWithdrawalForm', '/api/add/partner_withdrawals', 'partners', (d) => window.viewPartnerWithdrawals(d.partner_id, ''));
});

window.updateInventorySalesDropdown = function(projName) {
    const invSelect = document.querySelector('select[name="inventory_id"]');
    if(!invSelect) return;
    const invOpts = (window.erpData.inventory || [])
        .filter(i => i.remaining_qty > 0 && (!projName || i.project_name === projName))
        .map(i => {
            const ucLcy = window.getStockUnitCostLCY(i);
            return `<option value="${i.id}" data-buy="${ucLcy}">[PO-${i.po_id||'Manual'}] ${i.name} (Spec: ${i.specification||'-'}) (Avail: ${i.remaining_qty})</option>`;
        }).join('');
    invSelect.innerHTML = `<option value="">-- Select Available Item from Inventory --</option>` + invOpts;
};

window.calcProjectProfits = function(mode) {
    const fcy = parseFloat(document.getElementById('projBudgetFCY').value) || 0;
    const fx = parseFloat(document.getElementById('projFxRate').value) || 1;
    const lcyInput = document.getElementById('projBudgetLCY');
    if (mode === 'fx') { if (fcy > 0) { lcyInput.value = (fcy * fx).toFixed(2); } }
    
    const b = parseFloat(lcyInput.value) || 0;
    if (b === 0) return;
    if (mode === 'exp_pct') { const pct = parseFloat(document.getElementById('projExpPct').value) || 0; document.getElementById('projExpAmt').value = (b * (pct / 100)).toFixed(2); } 
    else if (mode === 'exp_amt') { const amt = parseFloat(document.getElementById('projExpAmt').value) || 0; document.getElementById('projExpPct').value = ((amt / b) * 100).toFixed(2); }
    if (mode === 'act_pct') { const pct = parseFloat(document.getElementById('projActPct').value) || 0; document.getElementById('projActAmt').value = (b * (pct / 100)).toFixed(2); } 
    else if (mode === 'act_amt') { const amt = parseFloat(document.getElementById('projActAmt').value) || 0; document.getElementById('projActPct').value = ((amt / b) * 100).toFixed(2); }
    if (mode === 'budget' || mode === 'fx') { 
        const ep_pct = parseFloat(document.getElementById('projExpPct').value) || 0; 
        const ap_pct = parseFloat(document.getElementById('projActPct').value) || 0; 
        document.getElementById('projExpAmt').value = (b * (ep_pct / 100)).toFixed(2); 
        document.getElementById('projActAmt').value = (b * (ap_pct / 100)).toFixed(2); 
    }
};

window.calcDep = function() { document.getElementById('depAmountLCY').value = ((parseFloat(document.getElementById('depAmountFCY').value)||0) * (parseFloat(document.getElementById('depFxRate').value)||1)).toFixed(2); };
window.calcWith = function() { document.getElementById('withAmountLCY').value = ((parseFloat(document.getElementById('withAmountFCY').value)||0) * (parseFloat(document.getElementById('withFxRate').value)||1)).toFixed(2); };

window.calcTax = function() {
    const base = parseFloat(document.getElementById('arBaseAmount').value) || 0; const taxPct = parseFloat(document.getElementById('arTaxPercent').value) || 0;
    const taxAmt = base * (taxPct / 100); document.getElementById('arTaxAmount').value = taxAmt.toFixed(2); document.getElementById('arTotalAmount').value = (base + taxAmt).toFixed(2);
};

window.autoCalcDeductions = function() {
    const staffSelect = document.getElementById('payrollStaffSelect'); const monthSelect = document.getElementById('payrollMonthSelect');
    const deductInput = document.getElementById('payrollDeductions'); const allowInput = document.getElementById('payrollAllowances');
    if(!staffSelect || !staffSelect.value || !monthSelect || !monthSelect.value) { alert("Please select Employee and Month first."); return; }
    const staffObj = window.erpData.staff_dd.find(s => s.name === staffSelect.value); if(!staffObj) return;
    deductInput.value = 0; if(!allowInput.value) allowInput.value = 0; alert(`Auto-calculation triggered.`);
};

window.toggleModal = function() {
    const modal = document.getElementById('mainModal'); if(modal) modal.classList.toggle('hidden');
    if(modal && modal.classList.contains('hidden')) { 
        window.editingId = null; 
        const form = document.getElementById('dynamicForm'); 
        if(form) form.reset(); 
        const errBox = document.getElementById('doubleEntryError'); 
        if(errBox) errBox.classList.add('hidden'); 
    }
};

window.editItem = function(type, id) { const list = window.erpData[type] || []; const item = list.find(x => x.id === id); if(item) { window.editingId = id; window.openModal(type, item); } };

window.deleteItem = async function(type, id) { 
    const res = await window.safeApiCall({ url: `/api/delete/${type}/${id}`, method: 'DELETE', confirmMsg: "Are you sure? This action is logged.", refresh: [type] });
    if (res && res.success && type.includes('po_ddp')) {
        const pId = document.getElementById(type === 'po_ddp_charges' ? 'poDdpChargePoId' : 'poDdpLcyChargePoId').value;
        if(type === 'po_ddp_charges') window.viewPoDdpCharges(pId, ''); else window.viewPoDdpLcyCharges(pId, '');
    }
};

window.approvePO = async function(id) { 
    if (!window.hasPerm('purchase_orders', 'approve')) return alert('Access Denied');
    await window.safeApiCall({ url: `/api/update/purchase_orders/${id}`, method: 'PUT', body: { status: 'Approved' }, refresh: ['purchase_orders'] });
};

window.approveRFQ = async function(id) { 
    if (!window.hasPerm('rfq', 'approve')) return alert('Access Denied');
    await window.safeApiCall({ url: `/api/update/rfq/${id}`, method: 'PUT', body: { status: 'Approved' }, refresh: ['rfq'] });
};

window.convertRfqToPo = async function(id) { await window.safeApiCall({ url: `/api/action/rfq_to_po/${id}`, confirmMsg: "Convert this Approved RFQ to PO?", successMsg: "PO created!", refresh: ['purchase_orders'] }); };
window.receivePO = async function(id) { await window.safeApiCall({ url: `/api/action/receive_po/${id}`, confirmMsg: "Mark PO as Received?", successMsg: "PO Received & Inventory Updated!", refresh: ['purchase_orders', 'inventory'] }); };
window.rereceivePO = async function(id) { await window.safeApiCall({ url: `/api/action/rereceive_po/${id}`, confirmMsg: "Re-Receive this PO into Inventory?", successMsg: "Re-Received Successfully!", refresh: ['purchase_orders', 'inventory'] }); };

window.fulfillPreOrder = async function(preOrderId) {
    if(!confirm("هل وصلت الشحنة وترغب في تسليم العميل وإتمام عملية البيع؟")) return;

    const res = await window.safeApiCall({
        url: `/api/action/fulfill_preorder/${preOrderId}`,
        method: 'POST',
        successMsg: "✅ تم تحويل الحجز إلى مبيعات، خصم الكمية، وتحديث رصيد العميل بنجاح.",
        refresh: ['inventory_sales', 'client_consumptions']
    });

    if (res && res.success) {
        if(typeof window.loadPreOrders === 'function') {
            window.loadPreOrders(); 
        }
    }
};

window.openModal = function(type, editData = null) {
    window.updateCompaniesDatalist();
    document.getElementById('doubleEntryError')?.classList.add('hidden');
    
    const formFields = document.getElementById('formFields'); const modalTitle = document.getElementById('modalTitle'); const submitBtn = document.getElementById('submitBtn'); 
    if(!formFields || !modalTitle) return; formFields.innerHTML = ''; if(submitBtn) submitBtn.classList.remove('hidden'); 
    document.getElementById('modalRecordType').value = type;

    const glbProj = document.getElementById('globalProjectFilter')?.value || '';
    
    const pOpts = window.buildSelectOptions(window.erpData.projects_dd || window.erpData.projects, 'name', 'name', editData?.project_name || glbProj, '-- General / No Project --');
    const sOpts = window.buildSelectOptions(window.erpData.staff_dd, 'name', 'name', editData?.staff_name, '-- Select Employee --');
    const cOpts = window.buildSelectOptions(window.erpData.customers_dd, 'id', 'name', editData?.customer_id, '-- Select Customer --');
    const contOpts = window.buildSelectOptions(window.erpData.contracts_dd, 'id', c => `Contract #${c.id} - ${c.contract_type}`, editData?.contract_id, '-- Select Contract --');
    const instOpts = window.buildSelectOptions(window.erpData.installments_dd || window.erpData.installments, 'id', i => `Cont #${i.contract_id || 'N/A'} | Inst #${i.installment_no || i.id} - ${parseFloat(i.amount||0).toFixed(2)} due ${new Date(i.due_date).toLocaleDateString()}`, editData?.installment_id, '-- Select Installment --');

    const titles = { projects: "Project", gl_mappings: "GL Mapping Rule", boq: "BOQ Item", tasks: "Task", daily_reports: "Daily Report", partners: "Partner", rfq: "RFQ", purchase_orders: "Purchase Order", subcontractors: "Subcontractor", inventory: "Stock Item", inventory_transfers: "Stock Transfer", inventory_sales: "Inventory Outbound/Sale", returns: "Material Return", staff: "Employee", attendance: "Attendance Record", leaves: "Leave Record", payroll: "Payroll Record", ledger: "Journal Entry", ar_invoices: "Sales Invoice", chart_of_accounts: "Chart of Accounts (COA)", customers: "Client / Customer", property_units: "Property Unit", contracts: "Contract", installments: "Installment", payment_receipts: "Payment Receipt", client_consumptions: "Client Consumption", outstanding_settlements: "Outstanding Settlement" };
    modalTitle.innerText = editData ? `Edit ${titles[type] || 'Record'}` : `Add New ${titles[type] || 'Record'}`;

    if (window.formTemplates && window.formTemplates[type]) {
        formFields.innerHTML = window.formTemplates[type](editData || {}, window.erpData);
        if (type === 'payment_receipts') setTimeout(() => window.handleReceiptInstChange(), 100);
        window.toggleModal();
        return;
    }

    if (type === 'projects') {
        const sd = editData?.start_date ? editData.start_date.split('T')[0] : ''; const md = editData?.maturity_date ? editData.maturity_date.split('T')[0] : '';
        const bdLCY = parseFloat(editData?.budget_lcy || editData?.budget) || ''; 
        const bdFCY = parseFloat(editData?.budget_fcy) || ''; 
        const fxRate = parseFloat(editData?.fx_rate) || 1;
        const expPct = parseFloat(editData?.expected_profit_percent) || 0; const actPct = parseFloat(editData?.actual_profit_percent) || 0;
        
        const mgmtPct = parseFloat(editData?.management_pct) || 0;
        const partPct = parseFloat(editData?.partners_pct) || 100;
        
        const calcExpAmt = editData && bdLCY ? (bdLCY * (expPct / 100)).toFixed(2) : ''; 
        const calcActAmt = editData && bdLCY ? (bdLCY * (actPct / 100)).toFixed(2) : '';
        
        formFields.innerHTML = `
            <div class="col-span-full"><input name="company" placeholder="Company Name" list="projectCompaniesList" value="${editData?.company || ''}" class="w-full p-3 border rounded bg-slate-50 text-center font-bold"></div>
            <div class="col-span-full"><input name="name" placeholder="Project Name" value="${editData?.name || ''}" class="w-full p-3 border rounded bg-slate-50 text-center font-bold" required></div>
            
            <input name="budget_fcy" id="projBudgetFCY" type="number" step="0.01" min="0" placeholder="Budget FCY (Optional)" value="${bdFCY}" oninput="calcProjectProfits('fx')" class="p-3 border rounded bg-slate-50 text-center">
            <input name="fx_rate" id="projFxRate" type="number" step="0.01" min="0" placeholder="FX Rate" value="${fxRate}" oninput="calcProjectProfits('fx')" class="p-3 border rounded bg-slate-50 text-center">
            <input name="budget_lcy" id="projBudgetLCY" type="number" step="0.01" min="0" placeholder="Budget LCY (Manual or Auto)" value="${bdLCY}" oninput="calcProjectProfits('budget')" class="col-span-full p-3 border rounded bg-blue-50 text-blue-800 text-center font-bold" required>
            
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Management % (من الأرباح)</label><input name="management_pct" id="projMgmtPct" type="number" step="0.1" min="0" value="${mgmtPct}" oninput="document.getElementById('projPartPct').value = 100 - this.value;" class="p-3 border rounded bg-indigo-50 text-indigo-700 font-bold text-center"></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Partners % (من الأرباح)</label><input name="partners_pct" id="projPartPct" type="number" step="0.1" min="0" value="${partPct}" oninput="document.getElementById('projMgmtPct').value = 100 - this.value;" class="p-3 border rounded bg-emerald-50 text-emerald-700 font-bold text-center"></div>

            <input name="expected_profit_percent" id="projExpPct" type="number" step="0.1" min="0" placeholder="Exp Profit %" value="${expPct || ''}" oninput="calcProjectProfits('exp_pct')" class="w-full p-3 border rounded bg-slate-50 text-center">
            <input name="expected_profit_amount" id="projExpAmt" type="number" step="0.01" min="0" placeholder="Exp Profit Val" value="${calcExpAmt}" oninput="calcProjectProfits('exp_amt')" class="w-full p-3 border rounded bg-blue-50 text-blue-800 font-bold text-center">
            
            <input name="actual_profit_percent" id="projActPct" type="number" step="0.1" min="0" placeholder="Actual Profit %" value="${actPct || ''}" oninput="calcProjectProfits('act_pct')" class="w-full p-3 border rounded bg-slate-50 text-center">
            <input name="actual_profit_amount" id="projActAmt" type="number" step="0.01" min="0" placeholder="Actual Profit Val" value="${calcActAmt}" oninput="calcProjectProfits('act_amt')" class="w-full p-3 border rounded bg-emerald-50 text-emerald-800 font-bold text-center">
            
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Start Date</label><input name="start_date" type="date" value="${sd}" class="p-3 border rounded text-center"></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Maturity Date</label><input name="maturity_date" type="date" value="${md}" class="p-3 border rounded text-center"></div>
            <div class="col-span-full"><select name="status" class="w-full p-3 border rounded text-center"><option value="Active" ${editData?.status === 'Active' ? 'selected' : ''}>Active</option><option value="Completed" ${editData?.status === 'Completed' ? 'selected' : ''}>Completed</option></select></div>`;
    }
    else if (type === 'purchase_orders') { 
        const uc = parseFloat(editData?.estimated_cost)||0; const q = parseFloat(editData?.qty)||0;
        const fx = parseFloat(editData?.fx_rate)||1; const ddpAdded = parseFloat(editData?.ddp_added_amount)||0;
        const exWork = uc * q; const ddpFcy = exWork + ddpAdded;
        const ddpLcy = ddpFcy * fx; const ucLcy = q>0 ? (ddpLcy/q) : 0;
        
        const systemUnits = window.erpData?.system_units || ['Piece', 'm2', 'm3', 'KG', 'Ton', 'LM', 'LS'];
        const uomOpts = window.buildSelectOptions(systemUnits, null, null, editData?.uom, '-- Select UOM --');

        formFields.innerHTML = `
            <input name="item_description" placeholder="Item requested" value="${editData?.item_description||''}" class="col-span-full p-3 border rounded text-center font-bold" required>
            <input name="specification" placeholder="ITEM Specification" value="${editData?.specification||''}" class="p-3 border rounded text-center">
            <input name="supplier" placeholder="Supplier Name" list="companiesList" value="${editData?.supplier||''}" class="p-3 border rounded text-center" required>
            <div class="col-span-full"><select name="project_name" class="w-full p-3 border rounded text-center">${pOpts}</select></div>
            <select name="uom" class="p-3 border rounded text-center" required>${uomOpts}</select>
            <input name="qty" id="poQty" type="number" min="0" placeholder="PO Qty" value="${editData?.qty||''}" oninput="calcPO()" class="p-3 border rounded text-center font-bold" required>
            <input name="estimated_cost" id="poUnitCostFcy" type="number" min="0" step="0.01" placeholder="Unit Cost FCY" value="${editData?.estimated_cost||''}" oninput="calcPO()" class="p-3 border rounded text-center font-bold" required>
            <input name="fx_rate" id="poFxRate" type="number" min="0" step="0.01" placeholder="FX Rate" value="${editData?.fx_rate||'1'}" oninput="calcPO()" class="p-3 border rounded text-center">
            
            <div class="col-span-full border-t pt-2 mt-2"><h4 class="text-xs font-black text-slate-400">Calculations (Auto)</h4></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Total Ex-work Cost</label><input id="poTotalExWork" type="number" value="${exWork.toFixed(2)}" class="p-3 border rounded bg-slate-100 text-center" readonly></div>
            
            <input type="hidden" id="poDdpAddedAmount" value="${ddpAdded}">
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Total Cost DDP FCY</label><input id="poTotalDdpFcy" type="number" value="${ddpFcy.toFixed(2)}" class="p-3 border rounded bg-orange-50 text-orange-700 font-bold text-center" readonly></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Total DDP LCY</label><input id="poTotalDdpLcy" type="number" value="${ddpLcy.toFixed(2)}" class="p-3 border rounded bg-emerald-50 text-emerald-700 font-bold text-center" readonly></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Unit Cost LCY</label><input id="poUnitCostLcy" type="number" value="${ucLcy.toFixed(2)}" class="p-3 border rounded bg-blue-50 text-blue-700 font-bold text-center" readonly></div>`; 
    }
    else if (type === 'rfq') { 
        formFields.innerHTML = `
            <select name="project_name" class="p-3 border rounded text-center col-span-full">${pOpts}</select>
            <input name="item_description" placeholder="Item Description" value="${editData?.item_description||''}" class="p-3 border rounded text-center" required>
            <input name="qty" type="number" min="0" placeholder="Requested Qty" value="${editData?.qty||''}" class="p-3 border rounded text-center" required>
            <input name="vendor_1" placeholder="Vendor 1 Name" list="companiesList" value="${editData?.vendor_1||''}" class="p-3 border rounded bg-slate-50 text-center">
            <input name="price_1" type="number" min="0" step="0.01" placeholder="Vendor 1 Price" value="${editData?.price_1||''}" class="p-3 border rounded bg-slate-50 text-center">
            <input name="vendor_2" placeholder="Vendor 2 Name" list="companiesList" value="${editData?.vendor_2||''}" class="p-3 border rounded bg-slate-50 text-center">
            <input name="price_2" type="number" min="0" step="0.01" placeholder="Vendor 2 Price" value="${editData?.price_2||''}" class="p-3 border rounded bg-slate-50 text-center">
            <input name="vendor_3" placeholder="Vendor 3 Name" list="companiesList" value="${editData?.vendor_3||''}" class="p-3 border rounded bg-slate-50 text-center">
            <input name="price_3" type="number" min="0" step="0.01" placeholder="Vendor 3 Price" value="${editData?.price_3||''}" class="p-3 border rounded bg-slate-50 text-center">
            <input name="selected_vendor" placeholder="Selected Vendor Name (Decision)" list="companiesList" value="${editData?.selected_vendor||''}" class="col-span-full p-3 border rounded bg-emerald-100 font-bold border-emerald-300 text-center">`; 
    }
else if (type === 'inventory_sales') {
        const invOpts = `<option value="">-- اختر الصنف من المخزن --</option>` + (window.erpData.inventory||[]).filter(i => i.remaining_qty > 0).map(i => `<option value="${i.id}">[PO-${i.po_id||'Manual'}] ${i.name} (متاح: ${i.remaining_qty})</option>`).join('');
        const custOpts = `<option value="">-- اختر العميل --</option>` + (window.erpData.customers_dd||[]).map(c => `<option value="${c.name}" ${editData?.customer_name === c.name ? 'selected' : ''}>${c.name}</option>`).join('');

        formFields.innerHTML = `
            <div class="col-span-full"><select name="inventory_id" class="w-full p-3 border rounded text-center font-bold bg-slate-50" required>${invOpts}</select></div>
            <div class="col-span-full"><select name="customer_name" class="w-full p-3 border rounded text-center font-bold" required>${custOpts}</select></div>
            <div class="col-span-full"><select name="project_name" class="w-full p-3 border rounded text-center">${pOpts}</select></div>
            <input name="qty" type="number" step="0.01" min="0" placeholder="الكمية المباعة" value="${editData?.qty||''}" class="p-3 border rounded text-center" required>
            <input name="sell_price" type="number" step="0.01" min="0" placeholder="سعر البيع للوحدة" value="${editData?.sell_price||''}" class="p-3 border rounded text-center bg-emerald-50 text-emerald-700 font-bold" required>
            <div class="flex flex-col col-span-full"><label class="text-xs font-bold text-slate-500 mb-1">تاريخ المعاملة</label><input name="date" type="date" value="${editData?.date ? editData.date.split('T')[0] : new Date().toISOString().split('T')[0]}" class="p-3 border rounded text-center" required></div>
        `;
    }
else if (type === 'customers') { 
        formFields.innerHTML = `
            <div class="col-span-full"><input name="company_name" placeholder="Company Name" value="${editData?.company_name||''}" class="w-full p-3 border rounded text-center font-bold"></div>
            <div class="col-span-full"><input name="name" placeholder="Full Name" value="${editData?.name||''}" class="w-full p-3 border rounded text-center font-bold" required></div>
            <select name="customer_type" class="p-3 border rounded text-center font-bold"><option value="">-- Select Type --</option><option value="Individual" ${editData?.customer_type==='Individual'?'selected':''}>Individual</option><option value="Corporate" ${editData?.customer_type==='Corporate'?'selected':''}>Corporate</option></select>
            <input name="referral" placeholder="Referral Source" value="${editData?.referral||''}" class="p-3 border rounded text-center">
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Customer Since</label><input name="customer_since" type="date" value="${editData?.customer_since ? editData.customer_since.split('T')[0] : ''}" class="p-3 border rounded text-center"></div>
            <input name="product" placeholder="Product Interest" value="${editData?.product||''}" class="p-3 border rounded text-center">
            <input name="legal_id" placeholder="Legal ID" value="${editData?.legal_id||''}" class="p-3 border rounded text-center">
            <input name="phone" type="text" placeholder="Phone Number" value="${editData?.phone||''}" class="p-3 border rounded text-center" dir="ltr">
            <input name="email" type="email" placeholder="Email Address" value="${editData?.email||''}" class="col-span-full md:col-span-1 p-3 border rounded text-center">
            <div class="flex flex-col text-left col-span-full md:col-span-1">
                <label class="text-xs font-bold text-slate-500 mb-1">الحد الائتماني (Credit Limit)</label>
                <input name="credit_limit" type="number" step="0.01" min="0" placeholder="0.00 (بدون حد = 0)" value="${editData?.credit_limit||''}" class="p-3 border rounded text-center font-bold text-emerald-600 bg-emerald-50">
            </div>
            <div class="col-span-full"><textarea name="address" placeholder="Full Address" class="w-full p-3 border rounded text-center h-24 resize-none">${editData?.address||''}</textarea></div>
            <div class="col-span-full"><select name="status" class="w-full p-3 border rounded text-center font-bold"><option value="Active" ${editData?.status === 'Active' ? 'selected' : ''}>Active</option><option value="Inactive" ${editData?.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div>`; 
    }
    else if (type === 'inventory') {
        formFields.innerHTML = `
            <div class="col-span-full"><select name="project_name" class="w-full p-3 border rounded text-center font-bold">${pOpts}</select></div>
            <input name="name" placeholder="Item Name (الصنف)" value="${editData?.name||''}" class="p-3 border rounded text-center font-bold col-span-full" required>
            <input name="specification" placeholder="Specification (المواصفات)" value="${editData?.specification||''}" class="p-3 border rounded text-center">
            <input name="uom" placeholder="UOM (الوحدة)" value="${editData?.uom||''}" class="p-3 border rounded text-center">
            <input name="warehouse" placeholder="Warehouse (المخزن)" value="${editData?.warehouse||'Main Store'}" class="p-3 border rounded text-center font-bold text-indigo-700 bg-indigo-50">
            <input name="batch_no" placeholder="Batch No (رقم التشغيلة)" value="${editData?.batch_no||''}" class="p-3 border rounded text-center">
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Qty (الكمية المتاحة)</label><input name="qty" type="number" step="0.01" min="0" placeholder="Quantity" value="${editData?.qty||''}" class="p-3 border rounded text-center font-black" required></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Buy Price (سعر الشراء)</label><input name="buy_price" type="number" step="0.01" min="0" placeholder="Unit Price" value="${editData?.buy_price||''}" class="p-3 border rounded text-center font-bold text-emerald-600 bg-emerald-50"></div>
        `;
    }
    else if (type === 'client_consumptions') {
        const invOpts = `<option value="">-- Select Stock Item --</option>` + (window.erpData.inventory||[]).filter(i => i.remaining_qty > 0 || (editData && editData.inventory_id === i.id)).map(i => `<option value="${i.id}" ${editData?.inventory_id === i.id ? 'selected' : ''}>${i.name} (Avail: ${i.remaining_qty})</option>`).join('');
        const od = editData?.outstanding_date ? editData.outstanding_date.split('T')[0] : '';
        formFields.innerHTML = `
            <div class="col-span-full"><select name="client_id" class="w-full p-3 border rounded text-center font-bold" onchange="window.filterConsumptionsByClient(this.value)" required>${cOpts}</select></div>
            <div class="col-span-full"><select name="inventory_id" class="w-full p-3 border rounded text-center font-bold bg-slate-50" required>${invOpts}</select></div>
            <input name="paid_amount" type="number" step="0.01" min="0" placeholder="Paid Amount" value="${editData?.paid_amount||''}" class="p-3 border rounded text-center font-bold text-emerald-600 bg-emerald-50">
            <input name="outstanding_balance" type="number" step="0.01" min="0" placeholder="Outstanding Balance" value="${editData?.outstanding_balance||''}" class="p-3 border rounded text-center font-bold text-red-500 bg-red-50" oninput="if(this.value < 0) this.value = 0;">
            <div class="flex flex-col col-span-full"><label class="text-xs font-bold text-slate-500 mb-1">Date of Outstanding</label><input name="outstanding_date" type="date" value="${od}" class="p-3 border rounded text-center" required></div>
        `;
    }
    else if (type === 'contracts') {
        const projOptsHtml = (window.erpData.projects_dd||[]).map(p => { const pName = p.name||p; return `<option value="${pName}" ${editData?.project_name === pName ? 'selected' : ''}>${pName}</option>`; }).join('');
        formFields.innerHTML = `
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Project (المشروع)</label><select name="project_name" class="p-2 border rounded" required><option value="">-- Select Project --</option>${projOptsHtml}</select></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Customer (العميل)</label><select name="customer_id" class="p-2 border rounded" required>${cOpts}</select></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Unit No. (رقم الوحدة)</label><input name="unit_number" value="${editData?.unit_number||''}" class="p-2 border rounded" required></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Contract Type (النوع)</label><select name="contract_type" class="p-2 border rounded"><option value="Sale" ${editData?.contract_type==='Sale'?'selected':''}>Sale</option><option value="Lease" ${editData?.contract_type==='Lease'?'selected':''}>Lease</option><option value="Maintenance" ${editData?.contract_type==='Maintenance'?'selected':''}>Maintenance</option></select></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Total Value (القيمة الإجمالية)</label><input type="number" step="0.01" name="total_price" id="c_total" oninput="calcNetContract()" value="${editData?.total_price||0}" class="p-2 border rounded font-bold"></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Discount (الخصم)</label><input type="number" step="0.01" name="discount" id="c_disc" oninput="calcNetContract()" value="${editData?.discount||0}" class="p-2 border rounded"></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Net Value (الصافي)</label><input type="number" step="0.01" name="net_price" id="c_net" value="${editData?.net_price||0}" class="p-2 border rounded bg-slate-100 font-bold" readonly></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Down Payment (المقدم)</label><input type="number" step="0.01" name="down_payment" value="${editData?.down_payment||0}" class="p-2 border rounded"></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">No. of Installments (عدد الأقساط)</label><input type="number" name="installments_count" value="${editData?.installments_count||0}" class="p-2 border rounded"></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Contract Date (تاريخ العقد)</label><input type="date" name="contract_date" value="${editData?.contract_date?.split('T')[0]||''}" class="p-2 border rounded"></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Handover Date (تاريخ التسليم)</label><input type="date" name="handover_date" value="${editData?.handover_date?.split('T')[0]||''}" class="p-2 border rounded"></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Sales Rep (مسئول المبيعات)</label><select name="sales_rep" class="p-2 border rounded">${sOpts}</select></div>
            <div class="col-span-full flex flex-col"><label class="text-xs font-bold mb-1">Notes / Terms (ملاحظات وشروط)</label><textarea name="notes" class="p-2 border rounded h-16">${editData?.notes||''}</textarea></div>
            <div class="col-span-full md:col-span-1 flex flex-col"><label class="text-xs font-bold mb-1">Status (الحالة)</label><select name="status" class="p-2 border rounded font-bold"><option value="Active" ${editData?.status==='Active'?'selected':''}>Active (نشط)</option><option value="Completed" ${editData?.status==='Completed'?'selected':''}>Completed (مكتمل)</option><option value="Cancelled" ${editData?.status==='Cancelled'?'selected':''}>Cancelled (ملغي)</option></select></div>
        `;
    }
    else if (type === 'payment_receipts') {
        const rd = editData?.receipt_date ? editData.receipt_date.split('T')[0] : ''; formFields.innerHTML = `<div class="col-span-full"><select name="installment_id" class="w-full p-3 border rounded text-center font-bold" required>${instOpts}</select></div><input name="installment_no" placeholder="Installment No." value="${editData?.installment_no||''}" class="p-3 border rounded text-center"><input name="unit_number" placeholder="Unit Number" value="${editData?.unit_number||''}" class="p-3 border rounded text-center"><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Receipt Date</label><input name="receipt_date" type="date" value="${rd}" class="p-3 border rounded text-center" required></div><input name="amount" type="number" step="0.01" min="0" placeholder="Collected Amount" value="${editData?.amount||''}" class="p-3 border rounded text-center font-bold text-emerald-600 bg-emerald-50" required><select name="payment_method" class="p-3 border rounded text-center font-bold" required><option value="Bank Transfer" ${editData?.payment_method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option><option value="Cash" ${editData?.payment_method === 'Cash' ? 'selected' : ''}>Cash</option><option value="Cheque" ${editData?.payment_method === 'Cheque' ? 'selected' : ''}>Cheque</option></select><input name="reference_no" placeholder="Reference / Cheque No." value="${editData?.reference_no||''}" class="p-3 border rounded text-center"><div class="col-span-full flex items-center justify-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded"><input type="checkbox" name="waivePenalty" id="waivePenalty" value="true" class="w-5 h-5 text-red-600"><label for="waivePenalty" class="font-bold text-red-700 text-sm">إعفاء العميل من غرامة التأخير (مطلوب صلاحيات مدير)</label></div>
        <div class="col-span-full md:col-span-1 flex flex-col mt-2">
                <label class="text-xs font-bold text-red-600 mb-1">Penalty/Fine Amount (مبلغ الغرامة المطبقة)</label>
                <input type="number" step="0.01" name="penalty_amount" value="${editData?.penalty_amount||0}" class="p-2 border rounded border-red-300 bg-red-50 text-red-700 font-bold text-center" placeholder="0.00">
        </div>`;
    }
    else if (type === 'chart_of_accounts') { formFields.innerHTML = `<input name="account_code" placeholder="Account Code (e.g. 1000)" value="${editData?.account_code||''}" class="p-3 border rounded text-center" required><input name="account_name" placeholder="Account Name (e.g. Cash)" value="${editData?.account_name||''}" class="p-3 border rounded text-center" required><select name="account_type" class="p-3 border rounded text-center font-bold" required><option value="Asset" ${editData?.account_type==='Asset'?'selected':''}>Asset (Balance Sheet)</option><option value="Liability" ${editData?.account_type==='Liability'?'selected':''}>Liability (Balance Sheet)</option><option value="Equity" ${editData?.account_type==='Equity'?'selected':''}>Equity (Balance Sheet)</option><option value="Revenue" ${editData?.account_type==='Revenue'?'selected':''}>Revenue (Income Statement)</option><option value="Expense" ${editData?.account_type==='Expense'?'selected':''}>Expense (Income Statement)</option><option value="Statistical" ${editData?.account_type==='Statistical'?'selected':''}>Statistical</option></select><input name="hierarchy_level" type="number" placeholder="Level (1, 2, 3...)" value="${editData?.hierarchy_level||'1'}" class="p-3 border rounded text-center"><input name="parent_account" placeholder="Parent Account Code (Optional)" value="${editData?.parent_account||''}" class="p-3 border rounded text-center"><input name="company_entity" placeholder="Company/Entity" list="companiesList" value="${editData?.company_entity||''}" class="p-3 border rounded text-center"><input name="department" placeholder="Department/Cost Center" value="${editData?.department||''}" class="p-3 border rounded text-center"><select name="project_task" class="p-3 border rounded text-center bg-slate-50">${pOpts}</select><input name="currency" placeholder="Currency (e.g. USD)" value="${editData?.currency||'USD'}" class="p-3 border rounded text-center"><select name="manual_entry_allowed" class="p-3 border rounded text-center"><option value="true" ${editData?.manual_entry_allowed===true?'selected':''}>Manual Entry: Allowed</option><option value="false" ${editData?.manual_entry_allowed===false?'selected':''}>Manual Entry: Restricted</option></select><select name="reconciliation_flag" class="p-3 border rounded text-center"><option value="false" ${editData?.reconciliation_flag===false?'selected':''}>Reconciliation: No</option><option value="true" ${editData?.reconciliation_flag===true?'selected':''}>Reconciliation: Required</option></select><select name="status" class="p-3 border rounded text-center col-span-full bg-slate-50 font-bold"><option value="Active" ${editData?.status==='Active'?'selected':''}>Status: Active</option><option value="Inactive" ${editData?.status==='Inactive'?'selected':''}>Status: Inactive</option></select>`; }
    else if (type === 'boq') { formFields.innerHTML = `<select name="project_name" class="p-3 border rounded text-center col-span-full">${pOpts}</select><input name="item_desc" placeholder="Item Description" value="${editData?.item_desc||''}" class="p-3 border rounded text-center"><input name="unit" placeholder="Unit (m2, kg, etc.)" value="${editData?.unit||''}" class="p-3 border rounded text-center"><input name="est_qty" type="number" step="0.1" min="0" placeholder="Estimated Qty" value="${editData?.est_qty||''}" class="p-3 border rounded text-center"><input name="unit_price" type="number" step="0.01" min="0" placeholder="Unit Price" value="${editData?.unit_price||''}" class="p-3 border rounded text-center col-span-full">`; }
    else if (type === 'tasks') { const sd = editData?.start_date ? editData.start_date.split('T')[0] : ''; const ed = editData?.end_date ? editData.end_date.split('T')[0] : ''; formFields.innerHTML = `<select name="project_name" class="p-3 border rounded text-center">${pOpts}</select><input name="task_name" placeholder="Task Name" value="${editData?.task_name||''}" class="p-3 border rounded text-center"><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Start Date</label><input name="start_date" type="date" value="${sd}" class="p-3 border rounded text-center"></div><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">End Date</label><input name="end_date" type="date" value="${ed}" class="p-3 border rounded text-center"></div><input name="progress_percent" type="number" min="0" max="100" placeholder="Progress %" value="${editData?.progress_percent||''}" class="p-3 border rounded text-center"><select name="status" class="p-3 border rounded text-center"><option value="Pending" ${editData?.status === 'Pending' ? 'selected' : ''}>Pending</option><option value="In Progress" ${editData?.status === 'In Progress' ? 'selected' : ''}>In Progress</option><option value="Completed" ${editData?.status === 'Completed' ? 'selected' : ''}>Completed</option></select>`; }
    else if (type === 'daily_reports') { const dt = editData?.date ? editData.date.split('T')[0] : ''; formFields.innerHTML = `<select name="project_name" class="p-3 border rounded text-center">${pOpts}</select><input name="date" type="date" value="${dt}" class="p-3 border rounded text-center"><input name="weather" placeholder="Weather" value="${editData?.weather||''}" class="p-3 border rounded text-center"><input name="manpower_count" type="number" min="0" placeholder="Total Manpower" value="${editData?.manpower_count||''}" class="p-3 border rounded text-center"><input name="equipment_used" placeholder="Equipment Used" value="${editData?.equipment_used||''}" class="p-3 border rounded text-center col-span-full"><input name="notes" placeholder="Notes / Issues" value="${editData?.notes||''}" class="p-3 border rounded text-center col-span-full">`; }
    else if (type === 'partners') { 
        formFields.innerHTML = `
            <div class="col-span-full"><input name="name" placeholder="👤 Partner Name" list="companiesList" value="${editData?.name || ''}" class="w-full p-3 border rounded text-center font-bold" required></div>
            <div class="col-span-full"><select name="project_name" class="w-full p-3 border rounded text-center font-bold" required>${pOpts}</select></div>
            <div class="col-span-full"><select name="partner_type" class="w-full p-3 border rounded text-center font-bold text-indigo-700 bg-indigo-50" required>
                <option value="Partner" ${editData?.partner_type !== 'Management' ? 'selected' : ''}>🤝 Financial Partner (Shares Investment & Profit)</option>
                <option value="Management" ${editData?.partner_type === 'Management' ? 'selected' : ''}>💼 Management / Exec (Profit Share Only, No Investment)</option>
            </select></div>
            <input name="share_percent" type="number" step="0.01" min="0" max="100" placeholder="📊 Share % (Max 100)" value="${editData?.share_percent || ''}" oninput="if(this.value>100) this.value=100;" class="p-3 border rounded text-center font-bold bg-slate-50">
            <input name="investment_amount" type="number" step="0.01" min="0" placeholder="💰 Investment Amount" value="${editData?.investment_amount || ''}" class="p-3 border rounded text-center font-bold text-blue-600 bg-blue-50">
            <input name="expected_profit_rate" type="number" step="0.01" min="0" placeholder="📈 Expected Profit %" value="${editData?.expected_profit_rate || ''}" class="p-3 border rounded text-center font-bold">
            <input name="management_rate" type="number" step="0.01" min="0" placeholder="⚙️ Management Fee %" value="${editData?.management_rate || '0'}" class="p-3 border rounded text-center font-bold">
            <div class="col-span-full text-xs font-bold text-blue-500 text-center">Deposits and Withdrawals are updated via their links inside the Partners Accounts table.</div>
            <div class="col-span-full"><select name="status" class="w-full p-3 border rounded text-center"><option value="Active" ${editData?.status === 'Active' ? 'selected' : ''}>Active</option><option value="Inactive" ${editData?.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div>`; 
    } 
    else if (type === 'inventory_transfers') { formFields.innerHTML = `<input name="transfer_material" placeholder="Material Name (Source)" class="p-3 border rounded text-center col-span-full"><input name="transfer_qty" type="number" min="0" placeholder="Qty to Transfer" class="p-3 border rounded text-center col-span-full"><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1 text-red-500">From (Source Project)</label><select name="transfer_from" class="p-3 border rounded text-center bg-red-50">${pOpts}</select></div><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1 text-emerald-500">To (Destination Project)</label><select name="transfer_to" class="p-3 border rounded text-center bg-emerald-50">${pOpts}</select></div>`; }
    else if (type === 'staff') { 
        const hd = editData?.hiring_date ? editData.hiring_date.split('T')[0] : ''; 
        const currentProjs = editData?.project_name ? editData.project_name.split(', ') : [];
        const staffProjOpts = `<option value="All Projects" ${currentProjs.includes('All Projects') ? 'selected' : ''}>All Projects</option>` + 
            (window.erpData.projects_dd || []).map(p => { const pN = p.name||p; return `<option value="${pN}" ${currentProjs.includes(pN) ? 'selected' : ''}>${pN}</option>`; }).join('');

        formFields.innerHTML = `
            <div class="col-span-full"><input name="company" placeholder="Company Name" list="companiesList" value="${editData?.company || ''}" class="w-full p-3 border rounded text-center font-bold bg-slate-50"></div>
            <input name="name" placeholder="Full Name" value="${editData?.name||''}" class="p-3 border rounded text-center" required>
            <input name="role" placeholder="Position" value="${editData?.role||''}" class="p-3 border rounded text-center" required>
            <input name="salary" type="number" min="0" placeholder="Basic Salary" value="${editData?.salary||''}" class="p-3 border rounded text-center">
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Assign Projects (Hold Ctrl for multiple)</label>
            <select name="project_name_temp" id="staffProjectSelect" multiple class="p-3 border rounded text-center bg-slate-50 h-24 text-sm">${staffProjOpts}</select></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Hiring Date</label><input name="hiring_date" type="date" value="${hd}" class="p-3 border rounded text-center mt-auto"></div>
            <select name="status" class="p-3 border rounded text-center mt-auto col-span-full"><option value="Active" ${editData?.status === 'Active' ? 'selected' : ''}>Active</option><option value="Resigned" ${editData?.status === 'Resigned' ? 'selected' : ''}>Resigned</option></select>`; 
    }
    else if (type === 'attendance') { const dt = editData?.date ? editData.date.split('T')[0] : ''; formFields.innerHTML = `<select name="staff_name" class="p-3 border rounded text-center col-span-full">${sOpts}</select><input name="date" type="date" value="${dt}" class="p-3 border rounded text-center"><select name="status" class="p-3 border rounded text-center"><option value="Present" ${editData?.status === 'Present' ? 'selected' : ''}>Present</option><option value="Absent" ${editData?.status === 'Absent' ? 'selected' : ''}>Absent</option></select><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Check In</label><input name="check_in" type="time" value="${editData?.check_in||''}" class="p-3 border rounded text-center"></div><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Check Out</label><input name="check_out" type="time" value="${editData?.check_out||''}" class="p-3 border rounded text-center"></div>`; }
    else if (type === 'leaves') { const sd = editData?.start_date ? editData.start_date.split('T')[0] : ''; const ed = editData?.end_date ? editData.end_date.split('T')[0] : ''; formFields.innerHTML = `<select name="staff_name" class="p-3 border rounded text-center">${sOpts}</select><input name="leave_type" placeholder="Leave Type" value="${editData?.leave_type||''}" class="p-3 border rounded text-center"><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Start Date</label><input name="start_date" type="date" value="${sd}" class="p-3 border rounded text-center"></div><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">End Date</label><input name="end_date" type="date" value="${ed}" class="p-3 border rounded text-center"></div><select name="status" class="p-3 border rounded text-center col-span-full"><option value="Pending" ${editData?.status === 'Pending' ? 'selected' : ''}>Pending</option><option value="Approved" ${editData?.status === 'Approved' ? 'selected' : ''}>Approved</option><option value="Rejected" ${editData?.status === 'Rejected' ? 'selected' : ''}>Rejected</option></select>`; }
    else if (type === 'payroll') { 
        const execDate = editData?.execution_date ? editData.execution_date.split('T')[0] : new Date().toISOString().split('T')[0];
        formFields.innerHTML = `<select name="staff_name" id="payrollStaffSelect" class="p-3 border rounded text-center">${sOpts}</select><div class="flex flex-col"><label class="text-xs font-bold text-slate-500 mb-1">Execution Date</label><input name="execution_date" type="date" value="${execDate}" class="p-3 border rounded text-center" required></div><select name="month" id="payrollMonthSelect" class="p-3 border rounded text-center col-span-full"><option value="">Select Month</option><option value="January 2026">Jan 2026</option><option value="February 2026">Feb 2026</option><option value="March 2026">Mar 2026</option><option value="April 2026">Apr 2026</option></select><div class="col-span-full"><button type="button" onclick="autoCalcDeductions()" class="bg-blue-600 text-white font-bold py-2 px-4 rounded w-full hover:bg-blue-700 transition">⚙️ Auto-Calculate Deductions</button></div><input name="allowances" id="payrollAllowances" type="number" min="0" placeholder="Allowances/Bonus" class="p-3 border rounded text-center"><input name="deductions" id="payrollDeductions" type="number" min="0" placeholder="Deductions" class="p-3 border rounded text-center font-bold text-red-600">`; 
    }
    else if (type === 'ledger') { formFields.innerHTML = `<div class="col-span-full"><input name="account_name" placeholder="Account Name" value="${editData?.account_name||''}" class="w-full p-3 border rounded text-center"></div><div class="col-span-full"><select name="project_name" class="w-full p-3 border rounded text-center">${pOpts}</select></div><input name="debit" id="glDebit" type="number" min="0" placeholder="Debit amount" value="${editData?.debit||''}" class="p-3 border rounded text-center bg-emerald-50"><input name="credit" id="glCredit" type="number" min="0" placeholder="Credit amount" value="${editData?.credit||''}" class="p-3 border rounded text-center bg-red-50"><div class="col-span-full"><input name="description" placeholder="Description/Memo" value="${editData?.description||''}" class="w-full p-3 border rounded text-center"></div>`; }
    else if (type === 'ar_invoices') { formFields.innerHTML = `<input name="client_name" placeholder="Client Name" value="${editData?.client_name||''}" class="p-3 border rounded text-center col-span-full"><div class="col-span-full"><select name="project_name" class="w-full p-3 border rounded text-center">${pOpts}</select></div><input name="base_amount" id="arBaseAmount" type="number" min="0" placeholder="Base Amount" value="${editData?.base_amount||''}" onkeyup="calcTax()" onchange="calcTax()" class="p-3 border rounded text-center"><input name="tax_percent" id="arTaxPercent" type="number" min="0" step="0.1" placeholder="Tax %" value="${editData?.tax_percent||'0'}" onkeyup="calcTax()" onchange="calcTax()" class="p-3 border rounded text-center"><input name="tax_amount" id="arTaxAmount" type="number" placeholder="Tax Amount" class="p-3 border rounded text-center bg-slate-100" readonly><input name="total_amount" id="arTotalAmount" type="number" placeholder="Total Invoice Amount" class="p-3 border rounded text-center bg-blue-100 font-bold" readonly><div class="col-span-full"><select name="status" class="w-full p-3 border rounded text-center"><option value="Unpaid" ${editData?.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option><option value="Paid" ${editData?.status === 'Paid' ? 'selected' : ''}>Paid</option></select></div>`; }
    window.toggleModal();
};

document.getElementById('dynamicForm').onsubmit = async (e) => {
    e.preventDefault(); 
    const errBox = document.getElementById('doubleEntryError'); 
    if(errBox) errBox.classList.add('hidden');
    
    const formData = new FormData(e.target); 
    const data = Object.fromEntries(formData.entries()); 
    
    const type = data.form_type || document.getElementById('modalRecordType').value; 
    
    if (type === 'payment_receipts') data.waivePenalty = formData.get('waivePenalty') === 'true';
    if (type === 'staff') {
        const projSelect = document.getElementById('staffProjectSelect');
        if (projSelect) {
            const selected = Array.from(projSelect.selectedOptions).map(o => o.value).filter(v => v !== '');
            data.project_name = selected.includes('All Projects') ? 'All Projects' : selected.join(', ');
        }
    }
    if (type === 'ledger') { 
        const d = parseFloat(data.debit) || 0; 
        const c = parseFloat(data.credit) || 0; 
        if(d !== c) { if(errBox) errBox.classList.remove('hidden'); return; } 
    }
    
    if (type === 'payroll') { 
        const staffObj = window.erpData.staff_dd.find(s => s.name === data.staff_name); 
        data.basic_salary = staffObj ? staffObj.salary : 0; 
    } 
    
    const url = window.editingId ? `/api/update/${type}/${window.editingId}` : `/api/add/${type}`;
    
    const refreshTargets = type ? [type] : [];
    if (type === 'inventory_sales') refreshTargets.push('client_consumptions');

    const res = await window.safeApiCall({ 
        url, 
        method: window.editingId ? 'PUT' : 'POST', 
        body: data, 
        btnId: 'submitBtn', 
        btnLoading: "Saving...", 
        refresh: refreshTargets 
    });
    
    if(res && res.success) {
        window.toggleModal(); 
        if(window.fetchDropdownData) await window.fetchDropdownData(); 
        window.updateCompaniesDatalist();
        window.refreshAllSelects();
    }
};

window.openAttachments = async function(type, id) {
    try {
        document.getElementById('attach_record_type').value = type; document.getElementById('attach_record_id').value = id;
        document.getElementById('attachmentModal').classList.remove('hidden'); window.loadAttachments(type, id);
    } catch (e) { console.error("[FRONTEND ERROR]", e); }
};
window.closeAttachmentModal = function() { document.getElementById('attachmentModal').classList.add('hidden'); document.getElementById('uploadForm').reset(); };

window.loadAttachments = async function(type, id) {
    const list = document.getElementById('attachmentsList'); list.innerHTML = '<p class="text-slate-400 text-sm">Loading...</p>';
    try {
        const res = await window.apiFetch(`/api/attachments/${type}/${id}`); const data = await res.json();
        list.innerHTML = data.files.map(f => `<div class="flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm"><a href="${f.file_path.startsWith('http') ? f.file_path : '/' + f.file_path}" target="_blank" class="text-blue-600 font-bold hover:underline truncate mr-2">📄 ${f.file_name}</a><button type="button" onclick="deleteAttachment(${f.id}, '${type}', ${id})" class="text-red-500 bg-red-50 px-3 py-1 rounded-lg font-bold text-xs">Delete</button></div>`).join('') || '<p class="text-slate-400 text-sm text-center">No attachments found.</p>';
    } catch(e) { console.error("[FRONTEND ERROR]", e); list.innerHTML = '<p class="text-red-400 text-sm">Error loading files.</p>'; }
};

document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault(); const fileInput = document.getElementById('fileInput'); const type = document.getElementById('attach_record_type').value; const id = document.getElementById('attach_record_id').value;
    if(!fileInput.files[0]) return; const formData = new FormData(); formData.append('file', fileInput.files[0]);
    
    const res = await window.safeApiCall({ url: `/api/upload/${type}/${id}`, body: formData, isFormData: true });
    if(res && res.success) { document.getElementById('uploadForm').reset(); window.loadAttachments(type, id); }
};

window.deleteAttachment = async function(attId, type, recId) {
    const res = await window.safeApiCall({ url: `/api/delete_attachment/${attId}`, method: 'DELETE', confirmMsg: "Delete this attachment forever?" }); 
    if(res && res.success) window.loadAttachments(type, recId);
};

window.openAutoInstallmentModal = function() {
    document.getElementById('autoInstallmentModal').classList.remove('hidden');
    const contOpts = `<option value="">-- Select Contract --</option>` + (window.erpData.contracts_dd||[]).map(c => `<option value="${c.id}">Contract #${c.id} - ${c.contract_type}</option>`).join('');
    document.getElementById('autoInstContractSelect').innerHTML = contOpts;
};

window.closeAutoInstallmentModal = function() {
    document.getElementById('autoInstallmentModal').classList.add('hidden');
};

// 4- إضافة حقلي نوع الدفع والمرجع في نافذة الدفع
window.payInstallment = function(id, amt) {
    const modalHtml = `
        <div id="paymentModal" class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div class="modal-content glass-panel w-full max-w-md p-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
                <h3 class="text-lg font-bold mb-4 dark:text-white">سداد القسط / الدفعة</h3>
                <form id="paymentForm" onsubmit="window.submitInstallmentPayment(event, ${id})">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1 dark:text-slate-300">المبلغ</label>
                        <input type="number" id="pay_amount" class="p-3 w-full rounded border border-slate-300 dark:bg-slate-700 dark:text-white font-bold bg-slate-100" value="${amt}" required readonly>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1 dark:text-slate-300">نوع السداد</label>
                        <select id="payment_type" class="p-3 w-full rounded border border-slate-300 dark:bg-slate-700 dark:text-white font-bold" required>
                            <option value="cash">نقدي (Cash)</option>
                            <option value="transfer">تحويل بنكي (Transfer)</option>
                            <option value="check">شيك (Check)</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1 dark:text-slate-300">المرجع (Reference)</label>
                        <input type="text" id="reference_no" class="p-3 w-full rounded border border-slate-300 dark:bg-slate-700 dark:text-white" placeholder="رقم الشيك أو التحويل...">
                    </div>
                    <div class="flex justify-end gap-2 mt-6">
                        <button type="button" class="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded hover:bg-slate-300" onclick="document.getElementById('paymentModal').remove()">إلغاء</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-lg">تأكيد السداد</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.submitInstallmentPayment = async function(e, id) {
    e.preventDefault();
    const amount = document.getElementById('pay_amount').value;
    const type = document.getElementById('payment_type').value;
    const ref = document.getElementById('reference_no').value;

    const res = await window.safeApiCall({ 
        url: '/api/installments/pay', 
        method: 'POST', 
        body: { installmentId: id, paymentAmount: amount, waivePenalty: false, payment_type: type, reference_no: ref }, 
        successMsg: "✅ تم السداد بنجاح وإرسال التأكيد", 
        refresh: ['installments', 'ledger'] 
    });
    
    if (res && res.success) {
        document.getElementById('paymentModal').remove();
    }
};

window.addScheduleRow = function() {
    const container = document.getElementById('scheduleRowsContainer');
    if(container) {
        // 4- دعم إضافة نوع السداد والمرجع في كل صف للجدولة المعقدة إن لزم
        container.insertAdjacentHTML('beforeend', `
            <div class="flex gap-2 items-center mt-2 schedule-row flex-wrap md:flex-nowrap">
                <input type="number" step="0.01" min="0" placeholder="قيمة القسط" class="schedule-amount p-3 border rounded-xl text-center flex-1 font-bold" required>
                <input type="date" class="schedule-date p-3 border rounded-xl text-center flex-1 font-bold" required>
                <select class="schedule-method p-3 border rounded-xl text-center flex-1 font-bold">
                    <option value="Transfer">تحويل</option>
                    <option value="Cash">كاش</option>
                    <option value="Check">شيك</option>
                </select>
                <input type="text" placeholder="المرجع" class="schedule-ref p-3 border rounded-xl text-center flex-1 font-bold">
                <button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-3 hover:text-red-700 bg-red-50 rounded-xl">✕</button>
            </div>
        `);
    }
};

window.submitScheduleDebt = async function(e) {
    e.preventDefault(); 
    const clientId = document.getElementById('scheduleClientId').value;
    const inventoryId = document.getElementById('scheduleInventoryId').value;
    const totalTargetAmount = parseFloat(document.getElementById('scheduleTotalAmount')?.value || 0);
    
    const schedules = [];
    const container = document.getElementById('scheduleRowsContainer');
    const rows = container.querySelectorAll('.schedule-row'); 
    
    let currentTotal = 0;
    
    rows.forEach(row => {
        const amtInput = row.querySelector('.schedule-amount');
        const dateInput = row.querySelector('.schedule-date');
        const methodInput = row.querySelector('.schedule-method');
        const refInput = row.querySelector('.schedule-ref');

        if(amtInput && dateInput && amtInput.value && dateInput.value) {
            const amt = parseFloat(amtInput.value);
            currentTotal += amt;
            schedules.push({ 
                amount: amt, 
                date: dateInput.value, 
                method: methodInput ? methodInput.value : 'Transfer', 
                reference: refInput ? refInput.value : '' 
            });
        }
    });
    
    if(schedules.length === 0) {
        alert("الرجاء إضافة قسط واحد على الأقل وإدخال المبالغ والتواريخ.");
        return;
    }

    // 🚀 التحقق الصارم: التأكد من أن مجموع الأقساط يساوي المديونية بالضبط
    if(Math.abs(currentTotal - totalTargetAmount) > 0.01) {
        alert(`❌ فشل في الجدولة:\nإجمالي مبالغ الأقساط (${window.formatMoney ? window.formatMoney(currentTotal) : currentTotal}) لا يساوي قيمة المديونية المتبقية المطلوبة (${window.formatMoney ? window.formatMoney(totalTargetAmount) : totalTargetAmount}).\n\nبرجاء ضبط المبالغ لتتطابق تماماً.`);
        return;
    }

    const payload = { client_id: clientId, inventory_id: inventoryId || null, schedules: schedules };
    const btn = document.getElementById('btnSubmitSchedule');
    const origText = btn.innerText;
    btn.disabled = true; btn.innerText = "جاري الحفظ ⏳...";

    try {
        const res = await window.apiFetch('/api/action/schedule_debt', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            alert("✅ " + data.message);
            document.getElementById('scheduleDebtModal').classList.add('hidden');
            if (typeof window.viewClientDelayedPayments === 'function') {
                const clientNameEl = document.getElementById('delayedPaymentsTitle');
                const clientName = clientNameEl ? clientNameEl.innerText.replace("سجل المدفوعات للعميل: ", "") : '';
                window.viewClientDelayedPayments(clientId, clientName);
            }
        } else { alert("❌ خطأ: " + data.error); }
    } catch (err) {
        alert("❌ حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
        btn.disabled = false; btn.innerText = origText;
    }
};

window.calcLcyAdd = function() {
    const fcy = document.getElementById('lcyAddFcy');
    const fx = document.getElementById('lcyAddFx');
    const lcy = document.getElementById('lcyAddLcy');
    
    if (fcy && fx && lcy) {
        if (fcy.value && parseFloat(fcy.value) > 0) {
            fx.required = true;
            lcy.readOnly = true;
            lcy.value = (parseFloat(fcy.value) * parseFloat(fx.value || 1)).toFixed(2);
            lcy.classList.add('bg-slate-100');
            lcy.classList.remove('bg-emerald-50');
        } else {
            fx.required = false;
            lcy.readOnly = false;
            lcy.classList.remove('bg-slate-100');
            lcy.classList.add('bg-emerald-50');
        }
    }
};

window.viewPaymentHistory = function(historyDataStr, debtId) {
    try {
        const historyData = JSON.parse(decodeURIComponent(historyDataStr));
        document.getElementById('paymentHistoryTitle').innerText = "سجل الدفعات للمديونية رقم: " + debtId;
        
        const tbody = document.getElementById('paymentHistoryBody');
        if (!historyData || historyData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-500 font-bold">لا توجد دفعات مسجلة حتى الآن.</td></tr>';
        } else {
            tbody.innerHTML = historyData.map(h => {
                if(!h) return '';
                const payDate = new Date(h.payment_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
                return `
                <tr class="border-b hover:bg-slate-50 transition-colors">
                    <td class="p-3 text-center font-bold text-slate-700">${payDate}</td>
                    <td class="p-3 text-center font-mono text-emerald-600 font-black text-lg">${window.formatMoney ? window.formatMoney(h.amount_paid) : h.amount_paid}</td>
                </tr>
            `}).join('');
        }
        document.getElementById('paymentHistoryModal').classList.remove('hidden');
    } catch(e) {
        console.error("[FRONTEND ERROR] viewPaymentHistory:", e);
    }
};

window.showClientPaymentHistory = async function(clientId, clientName) {
    document.getElementById('historyModalClientName').innerText = `سجل مدفوعات العميل: ${clientName || ''}`;
    document.getElementById('paymentHistoryModal').style.display = 'block';

    const tbody = document.getElementById('paymentHistoryTableBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-slate-500 font-bold">جاري تحميل البيانات...</td></tr>';

    try {
        const response = await window.apiFetch(`/api/client-payment-history/${clientId}`);
        const result = await response.json();

        if (result.success) {
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-slate-500 font-bold">لا يوجد أي سجل مدفوعات لهذا العميل حتى الآن.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            let totalPaid = 0;

            result.data.forEach((record, index) => {
                totalPaid += parseFloat(record.amount_paid);
                const dateObj = new Date(record.payment_date);
                const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

                const row = `
                    <tr class="border-b hover:bg-slate-50 transition-colors">
                        <td class="p-3 text-center">${index + 1}</td>
                        <td class="p-3 text-center" style="direction: ltr;">${formattedDate}</td>
                        <td class="p-3 text-center font-bold text-emerald-600 font-mono">${window.formatMoney ? window.formatMoney(record.amount_paid) : parseFloat(record.amount_paid).toLocaleString()}</td>
                        <td class="p-3 text-center text-slate-700 font-bold">${record.item_name ? record.item_name : 'مديونية عامة'}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });

            tbody.innerHTML += `
                <tr class="bg-emerald-50 font-black border-t-2 border-emerald-200">
                    <td colspan="2" class="p-3 text-center text-emerald-800">إجمالي ما تم سداده</td>
                    <td class="p-3 text-center text-emerald-700 font-mono text-lg">${window.formatMoney ? window.formatMoney(totalPaid) : totalPaid.toLocaleString()}</td>
                    <td></td>
                </tr>
            `;
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500 font-bold">خطأ: ${result.error}</td></tr>`;
        }
    } catch (error) {
        console.error("Error fetching history:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500 font-bold">فشل في الاتصال بالخادم.</td></tr>';
    }
}

window.viewClientDelayedPayments = async function(clientId, clientName) {
    try {
        const modal = document.getElementById('clientDelayedPaymentsModal');
        const table = document.getElementById('delayedPaymentsTable');
        const titleEl = document.getElementById('delayedPaymentsTitle');
        
        if (table) {
            table.innerHTML = `
                <thead class="bg-slate-800 text-white font-bold">
                    <tr>
                        <th class="p-4 border-b whitespace-nowrap">الصنف المستهلك / البيان</th>
                        <th class="p-4 border-b whitespace-nowrap">الكمية المستهلكة</th>
                        <th class="p-4 border-b whitespace-nowrap">المبلغ الأصلي</th>
                        <th class="p-4 border-b whitespace-nowrap">المسدد والتفاصيل</th>
                        <th class="p-4 border-b whitespace-nowrap">الرصيد المتبقي</th>
                        <th class="p-4 border-b whitespace-nowrap">تاريخ الاستحقاق</th>
                        <th class="p-4 border-b whitespace-nowrap">تاريخ آخر سداد</th>
                        <th class="p-4 border-b whitespace-nowrap">الحالة</th>
                        <th class="p-4 border-b whitespace-nowrap">الإجراءات</th>
                    </tr>
                </thead>
                <tbody id="delayedPaymentsBody">
                    <tr><td colspan="9" class="text-center p-6 text-slate-500 font-bold">جاري التحميل...</td></tr>
                </tbody>
            `;
        }

        const tbody = document.getElementById('delayedPaymentsBody');

        if(titleEl) titleEl.innerText = "سجل المدفوعات المتأخرة للعميل: " + clientName;
        if(modal) modal.classList.remove('hidden');
        
        const res = await window.apiFetch(`/api/delayed-payments/${clientId}`);
        const data = await res.json();
        
        let totalRemaining = 0; 
        
        if (res.ok && Array.isArray(data) && data.length > 0) {
            let totalOriginal = 0;
            let totalPaidAll = 0;
            let totalQty = 0;

            const rows = data.map(d => {
                if (!d) return ''; 
                
                const origAmt = parseFloat(d.original_amount || d.amount || 0);
                const paidAmt = parseFloat(d.paid_amount || 0);
                const remAmt = Math.max(0, origAmt - paidAmt);
                const qty = parseFloat(d.consumed_qty || 0);
                
                totalOriginal += origAmt;
                totalPaidAll += paidAmt;
                totalRemaining += remAmt;
                totalQty += qty;

                const dueDateStr = d.due_date ? new Date(d.due_date).toLocaleDateString('ar-EG') : '-';
                const lastPayStr = d.last_payment_date ? new Date(d.last_payment_date).toLocaleDateString('ar-EG') : '<span class="text-xs text-slate-400">لم يتم الدفع</span>';
                
                let statusBadge = '';
                if (d.status === 'Paid' || remAmt <= 0) statusBadge = '<span class="px-2 py-1 rounded font-bold text-xs text-emerald-600 bg-emerald-100 border border-emerald-200">تم الدفع بالكامل</span>';
                else if (d.status === 'Partial' || paidAmt > 0) statusBadge = '<span class="px-2 py-1 rounded font-bold text-xs text-orange-600 bg-orange-100 border border-orange-200">سداد جزئي</span>';
                else statusBadge = '<span class="px-2 py-1 rounded font-bold text-xs text-red-600 bg-red-100 border border-red-200">غير مدفوع</span>';
                
                const historyEncoded = encodeURIComponent(JSON.stringify(d.payment_history || []));
                
                const historyList = d.payment_history || [];
                let historyInlineHtml = '';
                if (historyList.length > 0) {
                    historyInlineHtml = '<div class="mt-2 flex flex-col gap-1 items-center bg-slate-800 rounded p-2 border border-slate-700 min-w-[120px] mx-auto shadow-inner">';
                    historyList.forEach(h => {
                        const hDate = new Date(h.payment_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' });
                        historyInlineHtml += `<div class="text-[10px] flex justify-between w-full border-b border-slate-600 last:border-0 pb-1 last:pb-0"><span class="text-slate-400 mr-2">${hDate}</span><span class="text-emerald-400 font-black">${window.formatMoney ? window.formatMoney(h.amount_paid) : h.amount_paid}</span></div>`;
                    });
                    historyInlineHtml += '</div>';
                }

                return `<tr class="border-b hover:bg-slate-50 text-sm transition">
                    <td class="p-3 text-center font-bold text-slate-700 whitespace-nowrap">${d.inventory_name || 'تسوية رصيد'}</td>
                    <td class="p-3 text-center font-mono font-bold text-slate-600 whitespace-nowrap">${qty}</td>
                    <td class="p-3 text-center font-bold text-blue-600 font-mono whitespace-nowrap">${window.formatMoney ? window.formatMoney(origAmt) : origAmt}</td>
                    
                    <td class="p-3 text-center font-bold text-emerald-500 font-mono whitespace-nowrap">
                        <div class="text-base">${window.formatMoney ? window.formatMoney(paidAmt) : paidAmt}</div>
                        ${historyInlineHtml}
                    </td>

                    <td class="p-3 text-center font-black text-red-500 font-mono whitespace-nowrap">${window.formatMoney ? window.formatMoney(remAmt) : remAmt}</td>
                    <td class="p-3 text-center text-slate-600 whitespace-nowrap">${dueDateStr}</td>
                    <td class="p-3 text-center font-bold text-indigo-600 whitespace-nowrap">${lastPayStr}</td>
                    <td class="p-3 text-center whitespace-nowrap">${statusBadge}</td>
                    <td class="p-3 text-center flex gap-1 justify-center items-center whitespace-nowrap">
                        <button type="button" onclick="window.viewPaymentHistory('${historyEncoded}', ${d.id})" class="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-black shadow-sm hover:bg-slate-300 transition focus:ring-2 focus:ring-slate-400">السجل المنفصل</button>
                        <button type="button" onclick="window.deleteDelayedPayment(${d.id}, ${clientId}, '${clientName.replace(/'/g, "\\'")}')" class="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-black shadow-sm hover:bg-red-200 transition">حذف</button>
                    </td>
                </tr>`;
            }).join('');

            const totalsRow = `<tr class="border-t-4 border-slate-800 bg-slate-100 font-black text-sm">
                <td class="p-4 text-center text-slate-800 whitespace-nowrap">إجمالي المديونية</td>
                <td class="p-4 text-center text-slate-700 font-mono whitespace-nowrap">${totalQty.toFixed(2)}</td>
                <td class="p-4 text-center text-blue-700 font-mono whitespace-nowrap">${window.formatMoney ? window.formatMoney(totalOriginal) : totalOriginal}</td>
                <td class="p-4 text-center text-emerald-700 font-mono whitespace-nowrap">${window.formatMoney ? window.formatMoney(totalPaidAll) : totalPaidAll}</td>
                <td class="p-4 text-center text-red-700 font-mono text-lg whitespace-nowrap">${window.formatMoney ? window.formatMoney(totalRemaining) : totalRemaining}</td>
                <td colspan="4"></td>
            </tr>`;

            if(tbody) tbody.innerHTML = rows + totalsRow;
        } else {
            if(tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center p-6 text-slate-500 font-bold bg-slate-50">لا توجد مديونيات متأخرة لهذا العميل حالياً.</td></tr>';
        }

        const payOffAmountInput = document.getElementById('payOffAmount');
        if (payOffAmountInput) {
            payOffAmountInput.setAttribute('data-max-balance', totalRemaining);
            payOffAmountInput.max = totalRemaining; 
            payOffAmountInput.placeholder = `المتبقي: ${totalRemaining}`;
        }

    } catch(e) {
        console.error("[FRONTEND ERROR] viewClientDelayedPayments:", e);
        const tbody = document.getElementById('delayedPaymentsBody');
        if(tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center p-6 text-red-500 font-bold bg-red-50">حدث خطأ أثناء جلب البيانات من الخادم. برجاء فحص الـ Console.</td></tr>';
    }
};

window.deleteDelayedPayment = async function(paymentId, clientId, clientName) {
    if (!confirm("هل أنت متأكد من حذف هذه المديونية بشكل نهائي؟ (سيتم تعديل الرصيد الإجمالي للعميل)")) return;
    
    try {
        const res = await window.apiFetch(`/api/delayed-payments/${paymentId}`, { method: 'DELETE' });
        if (res.ok) {
            await window.viewClientDelayedPayments(clientId, clientName);
            await window.safeSystemRefresh('client_consumptions');
        } else {
            const result = await res.json();
            alert("خطأ: " + (result.error || "لم يتم الحذف"));
        }
    } catch (err) {
        console.error("[FRONTEND ERROR] deleteDelayedPayment:", err);
        alert("حدث خطأ أثناء الاتصال بالخادم.");
    }
};

window.payDelayedBalance = async function(clientIdOverride, amountToPayOverride) {
    const clientId = clientIdOverride || document.getElementById('delayedClientId').value;
    const amountInput = document.getElementById('payOffAmount');
    const numAmountToPay = parseFloat(amountToPayOverride || (amountInput ? amountInput.value : 0));
    
    const method = document.getElementById('payOffMethod')?.value || 'Cash';
    const ref = document.getElementById('payOffRef')?.value || '';
    const notes = document.getElementById('payOffNotes')?.value || '';
    
    if (!clientId || !numAmountToPay || numAmountToPay <= 0) {
        alert("برجاء إدخال مبلغ صحيح للسداد.");
        return;
    }

    if (amountInput && !amountToPayOverride) {
        const maxBal = parseFloat(amountInput.getAttribute('data-max-balance') || 0);
        if (maxBal > 0 && numAmountToPay > maxBal) {
            alert(`خطأ: المبلغ المدخل أكبر من المديونية المتبقية للعميل.`);
            return;
        }
    }

    if (!confirm(`تأكيد سداد مبلغ ${window.formatMoney ? window.formatMoney(numAmountToPay) : numAmountToPay} من المديونية؟\n\n(ملاحظة: سيتم تحديث جدول إيرادات المبيعات واستهلاك العميل وتوليد قيود دفتر الأستاذ)`)) return;
    
    const btn = document.getElementById('submitDelayedPaymentBtn');
    if(btn) { btn.disabled = true; btn.innerText = "جاري التنفيذ..."; }
    
    try {
        const res = await window.apiFetch('/api/pay-delayed-balance', {
            method: 'POST',
            body: JSON.stringify({ 
                client_id: clientId, 
                amount_paid: numAmountToPay,
                payment_method: method,
                reference_no: ref,
                notes: notes
            })
        });
        const result = await res.json();
        
        if (res.ok && result.success) {
            alert("تم تسجيل السداد وتحديث الجداول وتوليد القيود المحاسبية بنجاح.");
            
            const clientNameEl = document.getElementById('delayedPaymentsTitle');
            const clientName = clientNameEl ? clientNameEl.innerText.replace("سجل المدفوعات للعميل: ", "") : '';
            
            await window.viewClientDelayedPayments(clientId, clientName);
            
            if(amountInput) amountInput.value = '';
            if(document.getElementById('payOffRef')) document.getElementById('payOffRef').value = '';
            if(document.getElementById('payOffNotes')) document.getElementById('payOffNotes').value = '';

            await window.safeSystemRefresh('client_consumptions');
            
        } else {
            alert("خطأ: " + (result.error || "فشل في تسجيل السداد"));
        }
    } catch (err) {
        console.error("[FRONTEND ERROR] payDelayedBalance:", err);
        alert("حدث خطأ في الاتصال بالخادم. برجاء المحاولة مرة أخرى.");
    } finally {
        if(btn) { btn.disabled = false; btn.innerText = "تأكيد السداد ✅"; }
    }
};

window.verifySalesConsumptionsSync = async function() {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-slate-800 text-white p-4 rounded-xl shadow-2xl z-[9999] font-bold text-sm transition-all';
    toast.innerHTML = '⏳ جاري مطابقة الترحيل ومراجعة الأرصدة...';
    document.body.appendChild(toast);

    try {
        const sales = window.erpData.inventory_sales_all || window.erpData.inventory_sales || [];
        const consumptions = window.erpData.client_consumptions_all || window.erpData.client_consumptions || [];
        
        let totalSalesRev = 0;

        sales.forEach(s => { totalSalesRev += (Number(s.qty || 0) * Number(s.sell_price || 0)); });
        
        let totalConsRev = 0;
        consumptions.forEach(c => { 
            if (c.created_by !== 'System-CreditBalance' && c.created_by !== 'System-CreditNote' && c.created_by !== 'System-DelayedPayment') {
                totalConsRev += (Number(c.total_revenue) || 0); 
            }
        });
        
        const diff = Math.abs(totalSalesRev - totalConsRev);
        
        if(diff > 1) { 
            toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-xl shadow-2xl z-[9999] font-bold text-sm';
            toast.innerHTML = `⚠️ يوجد عدم تطابق بين المبيعات والأرصدة بفرق: ${window.formatMoney ? window.formatMoney(diff) : diff}`;
        } else {
            toast.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white p-4 rounded-xl shadow-2xl z-[9999] font-bold text-sm';
            toast.innerHTML = `✅ البيانات متطابقة تماماً.`;
            if(typeof window.safeSystemRefresh === 'function') window.safeSystemRefresh('inventory_sales');
        }
    } catch(e) {
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-xl shadow-2xl z-[9999] font-bold text-sm';
        toast.innerHTML = `❌ حدث خطأ أثناء المطابقة.`;
    }
    
    setTimeout(() => toast.remove(), 4000);
};

window.submitRefund = async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const amountFormatted = window.formatMoney ? window.formatMoney(data.amount) : data.amount;
    const msg = `هل أنت متأكد من صرف مبلغ ${amountFormatted} للعميل؟\n\nسيتم خصم هذا المبلغ من الرصيد الدائن للعميل، وتسجيل حركة خروج نقدية من الخزينة بالدفتر المحاسبي.`;

    const res = await window.safeApiCall({
        url: '/api/add/client_refunds',
        method: 'POST',
        body: data,
        confirmMsg: msg,
        successMsg: "✅ تم صرف الرصيد للعميل وتسجيل الحركة بالدفاتر بنجاح.",
        refresh: ['customers', 'client_consumptions', 'ledger'] 
    });

    if (res && res.success) {
        document.getElementById('refundModal').classList.add('hidden');
        e.target.reset();
    }
};

window.submitRTV = async function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const qty = parseFloat(data.qty) || 0;
    if (qty <= 0) return alert("الرجاء إدخال كمية صحيحة للإرجاع.");

    const msg = `هل أنت متأكد من إرجاع كمية (${qty}) من هذا الصنف للمورد؟\n\nسيتم خصم هذه الكمية من رصيد المخزن الحالي فوراً.`;

    const res = await window.safeApiCall({
        url: '/api/add/rtv_transactions',
        method: 'POST',
        body: data,
        confirmMsg: msg,
        successMsg: "✅ تم تسجيل الإرجاع وخصم الكمية من المخزن بنجاح.",
        refresh: ['inventory'] 
    });

    if (res && res.success) {
        document.getElementById('rtvModal').classList.add('hidden');
        e.target.reset();
    }
};

window.seedDefaultGLMappings = async function() {
    if (!confirm("هل تريد تحميل كافة قيود الربط المحاسبي الافتراضية للنظام؟ سيؤدي ذلك لضبط إعدادات التوجيه المالي آلياً.")) return;
    
    const defaultMappings = [
        { transaction_type: 'Real Estate Sale', debit_account: 'العملاء', credit_account: 'إيرادات المبيعات', cost_center_required: true },
        { transaction_type: 'PO Received', debit_account: 'المخزن الرئيسي', credit_account: 'الموردين', cost_center_required: true },
        { transaction_type: 'Material Consumption', debit_account: 'تكاليف المشروعات (WIP)', credit_account: 'المخزن الرئيسي', cost_center_required: true },
        { transaction_type: 'Subcontractor Invoice', debit_account: 'أعمال مقاولين باطن', credit_account: 'حـ/ مقاول الباطن', cost_center_required: true },
        { transaction_type: 'Payment Receipt', debit_account: 'الخزينة/البنك', credit_account: 'العملاء', cost_center_required: true },
        { transaction_type: 'Subcontractor Retention', debit_account: 'حـ/ مقاول الباطن', credit_account: 'تأمينات محتجزة للغير', cost_center_required: true }
    ];

    for (const mapping of defaultMappings) {
        await window.safeApiCall({
            url: '/api/add/gl_mappings',
            method: 'POST',
            body: mapping,
            successMsg: `تم ضبط قيد: ${mapping.transaction_type}`
        });
    }
    
    alert("✅ تم الانتهاء من حصر وبرمجة كافة القيود بنجاح.");
    if(typeof window.safeSystemRefresh === 'function') window.safeSystemRefresh('gl_mappings');
};
// =====================================================================
// --- NEW: Fix Missing Form Functions & Add Specific Debt Payment ---
// =====================================================================

// حل الخطأ الذي يظهر بعد حفظ معاملات الشركاء (السحب والإيداع وتحديث النوافذ آلياً)
window.viewPartnerWithdrawals = function(partnerId) {
    if(typeof window.fetchPartnerWithdrawals === 'function') window.fetchPartnerWithdrawals(partnerId);
    if(typeof window.fetchTablePaginated === 'function') window.fetchTablePaginated('partners');
};

window.viewPartnerDeposits = function(partnerId) {
    if(typeof window.fetchPartnerDeposits === 'function') window.fetchPartnerDeposits(partnerId);
    if(typeof window.fetchTablePaginated === 'function') window.fetchTablePaginated('partners');
};

// دالة لدعم السداد المخصص لمعاملة معينة (يتم استدعاؤها من جدول المديونيات)
window.paySpecificDebt = async function(debtId, amount) {
    const method = prompt("طريقة الدفع (Cash, Bank Transfer, Cheque):", "Cash") || "Cash";
    const ref = prompt("الرقم المرجعي (اختياري):", "") || "";
    const notes = prompt("ملاحظات (اختياري):", "") || "";
    const clientId = document.getElementById('delayedClientId').value;

    if(!confirm(`تأكيد سداد مبلغ ${window.formatMoney ? window.formatMoney(amount) : amount} لهذه المعاملة المحددة؟`)) return;

    try {
        const res = await window.apiFetch('/api/pay-delayed-balance', {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                amount_paid: amount,
                debt_id: debtId,
                payment_method: method,
                reference_no: ref,
                notes: notes
            })
        });
        if(res.ok) {
            alert("تم السداد بنجاح");
            
            if (typeof window.viewClientDelayedPayments === 'function') {
                const clientNameEl = document.getElementById('delayedPaymentsTitle');
                const clientName = clientNameEl ? clientNameEl.innerText.replace("سجل المدفوعات للعميل: ", "") : '';
                window.viewClientDelayedPayments(clientId, clientName);
            }
        } else {
            const err = await res.json();
            alert(err.error || "حدث خطأ أثناء السداد");
        }
    } catch(e) {
        alert("خطأ في الاتصال بالخادم");
    }
};