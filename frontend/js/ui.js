/**
 * UI & Rendering Module
 * Handles table DOM updates, colors, inline row calculations, and Advanced Dashboard Renders.
 */

// ==========================================
// --- Global Helper Utilities (New) ---
// ==========================================
window.erpData = window.erpData || {};
window.pageState = window.pageState || {};

window.safeNum = (val, fallback = 0) => Number(val) || fallback;
window.safeDateStr = (val) => val ? new Date(val).toLocaleDateString() : '-';
window.safeDateTimeStr = (val) => val ? new Date(val).toLocaleString() : '-';

window.buildProgressBar = (pct, fullColor = 'bg-emerald-500', defaultColor = 'bg-blue-500') => {
    const numPct = Number(pct) || 0;
    const color = numPct === 100 ? fullColor : defaultColor;
    return `<div class="progress-bar w-16 mx-auto bg-slate-200 dark:bg-slate-700"><div class="progress-fill ${color}" style="width: ${numPct}%;"></div></div><span class="text-xs text-${color.replace('bg-', '')} font-bold">${numPct.toFixed(1)}%</span>`;
};

window.buildActionButtons = (type, id, extraBtns = '') => {
    const canEdit = window.hasPerm ? window.hasPerm(type, 'update') : true;
    const canDelete = window.hasPerm ? window.hasPerm(type, 'delete') : true;
    const editBtn = canEdit ? `<button type="button" onclick="editItem('${type}', ${id})" class="text-blue-500 mr-2 hover:scale-110 transition-transform" title="Edit">✏️</button>` : '';
    const delBtn = canDelete ? `<button type="button" onclick="deleteItem('${type}', ${id})" class="text-red-400 hover:scale-110 transition-transform" title="Delete">🗑️</button>` : '';
    const attachBtn = `<button type="button" onclick="openAttachments('${type}', ${id})" class="text-slate-400 mr-2 hover:scale-110 transition" title="Attachments">📎</button>`;
    return `<div class="flex justify-center items-center gap-1">${extraBtns}${attachBtn}${editBtn}${delBtn}</div>`;
};

window.toggleModalUI = function(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if(modal) {
        if(show) {
            modal.classList.remove('hidden');
            modal.style.display = modalId === 'paymentHistoryModal' ? 'flex' : '';
        } else {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }
};

window.formatMoney = function(num) {
    return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseProjectNames = (val) => {
    if (!val) return 'General';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join(', ');
    return 'General';
};

window.updateCompanyHeader = function() {
    if (window.currentUser && window.currentUser.linked_company) {
        const displayEl = document.getElementById('systemCompanyNameDisplay');
        if (displayEl) displayEl.innerText = window.currentUser.linked_company;
    }
};

window.checkBulkDeleteBtn = function(type) {
    const rowCbs = document.querySelectorAll(`input.row-checkbox-${type}`);
    const masterCb = document.getElementById(`selectAll_${type}`);
    const btn = document.getElementById(`bulkDelete_${type}`);
    let allChecked = true; let anyChecked = false;
    rowCbs.forEach(cb => { if(cb.checked) anyChecked = true; else allChecked = false; });
    if(masterCb) masterCb.checked = (allChecked && rowCbs.length > 0);
    if(btn) { if(anyChecked) btn.classList.remove('hidden'); else btn.classList.add('hidden'); }
};

window.toggleAllCheckboxes = function(type) {
    const masterCb = document.getElementById(`selectAll_${type}`);
    const rowCbs = document.querySelectorAll(`input.row-checkbox-${type}`);
    let anyChecked = masterCb.checked;
    rowCbs.forEach(cb => cb.checked = anyChecked);
    const btn = document.getElementById(`bulkDelete_${type}`);
    if(btn) { if(anyChecked) btn.classList.remove('hidden'); else btn.classList.add('hidden'); }
};

// --- Main Rendering Engine ---
window.renderSpecificTable = function(type, currentPage, totalPages) {
    window.erpData = window.erpData || {};
    const data = Array.isArray(window.erpData[type]) ? window.erpData[type] : []; 
    let html = ''; 
    let summaryHTML = '';
    let bypassDomInjection = false; 

    const editBtnHtml = (id) => (window.hasPerm && window.hasPerm(type, 'update')) ? `<button type="button" onclick="editItem('${type}', ${id})" class="text-blue-500 mr-2 hover:scale-110 transition-transform" title="Edit">✏️</button>` : '';
    const delBtnHtml = (id) => (window.hasPerm && window.hasPerm(type, 'delete')) ? `<button type="button" onclick="deleteItem('${type}', ${id})" class="text-red-400 hover:scale-110 transition-transform" title="Delete">🗑️</button>` : '';
    const checkboxHtml = (id) => `<td class="text-center p-2 border-r border-slate-100 dark:border-slate-700"><input type="checkbox" class="row-checkbox-${type} w-4 h-4 cursor-pointer text-blue-600 rounded focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600" value="${id}" onclick="window.checkBulkDeleteBtn('${type}')"></td>`;

    const tableBodyIds = {
        projects: 'projectsTableBody', partners: 'partnersBody', purchase_orders: 'poBody',
        rfq: 'rfqBody', subcontractors: 'subcontractorBody', customers: 'customersBody',
        client_consumptions: 'clientConsumptionsBody', property_units: 'propertyUnitsBody',
        contracts: 'contractsBody', installments: 'installmentsBody', payment_receipts: 'receiptsBody',
        chart_of_accounts: 'coaBody', gl_mappings: 'glMappingsBody', boq: 'boqBody',
        tasks: 'tasksBody', daily_reports: 'dailyReportsBody', inventory: 'inventoryTableBody',
        inventory_sales: 'inventorySalesBody', inventory_transfers: 'transfersBody',
        returns: 'returnsBody', staff: 'hrBody', attendance: 'attendanceBody',
        leaves: 'leavesBody', payroll: 'payrollBody', ledger: 'financeBody',
        email_logs: 'emailLogsBody', audit_logs: 'auditBody', ddp_charges: 'ddpChargesBody'
    };

    try {
        const summaryData = (Array.isArray(window.erpData[type + '_all']) && window.erpData[type + '_all'].length >= data.length) ? window.erpData[type + '_all'] : data;

        if(type === 'projects') {
            let tBudgetLCY = 0, tExp = 0, tAct = 0;
            summaryData.forEach(p => {
                const budgetLcy = safeNum(p.budget); 
                tBudgetLCY += budgetLcy; 
                tExp += budgetLcy * (safeNum(p.expected_profit_percent) / 100); 
                tAct += budgetLcy * (safeNum(p.actual_profit_percent) / 100);
            });
            
            // 1. رسم عرض الكروت (التبويب الخامس - proj-cards)
            html = data.map(p => {
                const company = p.company || '-';
                const budgetFcy = safeNum(p.budget_fcy);
                const fxRate = safeNum(p.fx_rate, 1);
                const budgetLcy = safeNum(p.budget); 
                const expPct = safeNum(p.expected_profit_percent); 
                const actPct = safeNum(p.actual_profit_percent);
                const expAmt = budgetLcy * (expPct / 100); 
                const actAmt = budgetLcy * (actPct / 100);
                const isExceeded = p.maturity_date && new Date(p.maturity_date) < new Date() && p.status !== 'Completed';
                const maturityHtml = isExceeded ? `<span class="text-red-500 font-bold" title="Exceeded Maturity">⚠️ ${safeDateStr(p.maturity_date)}</span>` : safeDateStr(p.maturity_date);
                
                const safeName = (p.name || '').replace(/'/g, "\\'");
                const extraBtns = `<button type="button" onclick="viewProjectPartnersModal('${safeName}')" class="text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold hover:bg-blue-100 transition">الشركاء</button>`;

                const statusColor = p.status === 'Active' ? 'bg-emerald-500' : (p.status === 'Completed' ? 'bg-green-600' : 'bg-slate-500');
                let profHtml = actPct > 0 ? `<span class="text-emerald-600">${actPct}%</span>` : `<span class="text-red-500">${actPct}%</span>`;

                return `
                <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-slate-100 dark:border-slate-700 p-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden group text-right" dir="rtl">
                    <div class="absolute top-0 right-0 w-2 h-full ${statusColor} group-hover:w-3 transition-all"></div>
                    <div class="flex justify-between items-start mb-3 pr-3 border-b dark:border-slate-700 pb-3">
                        <div>
                            <h3 class="text-lg font-black text-slate-800 dark:text-white mb-1 hover:underline cursor-pointer flex items-center gap-1" onclick="window.viewProject360('${safeName}')" title="Open 360° Dashboard">🌟 ${p.name || '-'}</h3>
                            <span class="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2 py-1 rounded-lg">${company}</span>
                        </div>
                        <div class="flex flex-col items-end gap-2">
                            <span class="text-[10px] font-black px-2 py-1 rounded-full text-white ${statusColor} shadow-sm">${p.status || 'Active'}</span>
                            <div class="mt-1">${checkboxHtml(p.id).replace('<td', '<div').replace('</td>', '</div>')}</div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 flex-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-3">
                        <div class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                            <span class="text-slate-400 block mb-1">الميزانية (LCY)</span>
                            <span class="font-mono text-slate-800 dark:text-white text-sm">${formatMoney(budgetLcy)}</span>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                            <span class="text-slate-400 block mb-1">الميزانية (FCY) / Rate</span>
                            <span class="font-mono text-slate-800 dark:text-white">${formatMoney(budgetFcy)} <span class="text-slate-400 font-normal">/ ${fxRate}</span></span>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                            <span class="text-slate-400 block mb-1">الربح المتوقع</span>
                            <span class="font-mono text-blue-500">${expPct}% <br><span class="text-slate-500 font-normal">(${formatMoney(expAmt)})</span></span>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                            <span class="text-slate-400 block mb-1">الربح الفعلي</span>
                            <span class="font-mono text-sm">${profHtml} <br><span class="text-emerald-600 font-normal dark:text-emerald-400">(${formatMoney(actAmt)})</span></span>
                        </div>
                        
                        <div class="col-span-2 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10 p-2 rounded-lg mt-1">
                            <div class="flex flex-col">
                                <span class="text-slate-400">حصة الإدارة Mgmt:</span>
                                <span class="text-indigo-600 dark:text-indigo-400">${safeNum(p.management_pct)}%</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-slate-400">حصة الشركاء:</span>
                                <span class="text-emerald-600 dark:text-emerald-400">${safeNum(p.partners_pct, 100)}%</span>
                            </div>
                            <div class="flex flex-col text-left">
                                <span class="text-slate-400">الشركاء المسجلين:</span>
                                <span class="text-orange-600 dark:text-orange-400 font-black cursor-pointer hover:underline" onclick="viewProjectPartnersModal('${safeName}')">${p.partners_count || 0} شريك</span>
                            </div>
                        </div>

                        <div class="flex flex-col justify-center border-t dark:border-slate-700 pt-1 mt-1">
                            <span class="text-slate-400">تاريخ البداية:</span>
                            <span>${safeDateStr(p.start_date)}</span>
                        </div>
                        <div class="flex flex-col justify-center border-t dark:border-slate-700 pt-1 mt-1">
                            <span class="text-slate-400">تاريخ التسليم:</span>
                            <span>${maturityHtml}</span>
                        </div>
                    </div>
                    
                    <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-center items-center">
                        ${window.buildActionButtons('projects', p.id, extraBtns)}
                    </div>
                </div>`;
            }).join('');
            
            summaryHTML = data.length > 0 ? `<div class="col-span-full border-t-4 border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex flex-wrap justify-around gap-4 text-sm font-black mt-4"><div class="text-center"><span class="block text-slate-500 dark:text-slate-400 text-xs">إجمالي الميزانيات</span><span class="text-slate-800 dark:text-slate-200 font-mono text-lg">${formatMoney(tBudgetLCY)}</span></div><div class="text-center"><span class="block text-slate-500 dark:text-slate-400 text-xs">إجمالي الأرباح المتوقعة</span><span class="text-blue-500 font-mono text-lg">${formatMoney(tExp)}</span></div><div class="text-center"><span class="block text-slate-500 dark:text-slate-400 text-xs">إجمالي الأرباح الفعلية</span><span class="text-emerald-600 dark:text-emerald-400 font-mono text-lg">${formatMoney(tAct)}</span></div></div>` : '';

            // 2. رسم عرض الجدول للشركات (التبويب الأول - proj-companies)
            const listContainer = document.getElementById('projectsListViewBody');
            if (listContainer) {
                if (data.length === 0) {
                    listContainer.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-bold italic">لا توجد مشاريع مسجلة</td></tr>`;
                } else {
                    listContainer.innerHTML = data.map(p => {
                        const company = p.company || p.linked_company || '<span class="text-slate-400">Unlinked</span>';
                        const budgetLcy = safeNum(p.budget);
                        return `
                        <tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center dark:border-slate-700 text-sm">
                            <td class="p-3 font-black text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">${company}</td>
                            <td class="p-3 text-blue-600 dark:text-blue-400 font-black">${p.code || '-'}</td>
                            <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${p.name || '-'}</td>
                            <td class="p-3">
                                <div class="flex flex-col">
                                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">${p.manager || 'N/A'}</span>
                                    <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400">${formatMoney(budgetLcy)}</span>
                                </div>
                            </td>
                            <td class="p-3">
                                <div class="flex justify-center items-center gap-2">
                                    ${window.buildActionButtons('projects', p.id)}
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('');
                }
            }
        }
        else if (type === 'partners') { 
            html = data.map(p => `
                <tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    ${checkboxHtml(p.id)}
                    <td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">${p.company || '-'}</td>
                    <td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">👤 ${p.name}</td>
                    <td class="text-center p-3 text-blue-600 dark:text-blue-400 font-bold">${p.project_name||'General'}</td>
                    <td class="text-center p-3 font-mono font-bold">${safeNum(p.share_percent)}%</td>
                    <td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">${formatMoney(p.investment_amount)}</td>
                    <td class="text-center p-3 font-mono text-orange-500">${formatMoney(p.expected_return || 0)}</td>
                    <td class="text-center p-3 font-mono text-emerald-600">${formatMoney(p.actual_profit || 0)}</td>
                    <td class="text-center p-3 font-mono text-blue-500">${formatMoney(p.deposits || 0)}</td>
                    <td class="text-center p-3 font-mono text-red-500">${formatMoney(p.withdrawals || 0)}</td>
                    <td class="text-center p-3 font-mono font-bold text-indigo-600">${formatMoney(p.net_balance_ep || 0)}</td>
                    <td class="text-center p-3 font-mono font-bold text-indigo-600">${formatMoney(p.net_balance_ap || 0)}</td>
                    <td class="text-center p-3 font-bold ${p.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}">${p.status||'Active'}</td>
                    <td class="text-center p-3 flex justify-center items-center gap-1">
                        <button type="button" onclick="window.openPartnerDepositModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold border border-emerald-200 hover:bg-emerald-100 transition shadow-sm">إيداع 💵</button>
                        <button type="button" onclick="window.openPartnerWithdrawalModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="text-red-500 bg-red-50 px-2 py-1 rounded text-[10px] font-bold border border-red-200 hover:bg-red-100 transition shadow-sm">سحب 💸</button>
                        <button type="button" onclick="openAttachments('partners', ${p.id})" class="text-slate-400 mx-1 hover:scale-110">📎</button>
                        ${editBtnHtml(p.id)}${delBtnHtml(p.id)}
                    </td>
                </tr>
            `).join('');
        }
        else if(type === 'purchase_orders') {
            let tQty = 0, tExWork = 0, tDdpFcy = 0, tDdpLcy = 0;
            summaryData.forEach(p => {
                const ucFcy = Number(p.estimated_cost)||0; const q = Number(p.qty)||0; const fx = Number(p.fx_rate)||1;
                const exWork = ucFcy * q; const ddpFcy = exWork + Number(p.ddp_added_amount||0);
                tQty += q; tExWork += exWork; tDdpFcy += ddpFcy; tDdpLcy += (ddpFcy * fx) + Number(p.ddp_lcy_added_amount||0);
            });
            html = data.map(p => {
                const isReceived = p.status === 'Received' || p.status === 'Re-received';
                const ucFcy = Number(p.estimated_cost)||0; const q = Number(p.qty)||0; const fx = Number(p.fx_rate)||1;
                const exWork = ucFcy * q; const ddpFcy = exWork + Number(p.ddp_added_amount||0);
                const ddpLcy = (ddpFcy * fx) + Number(p.ddp_lcy_added_amount||0); 
                const ucLcy = q > 0 ? (ddpLcy / q) : 0;
                let receiveBtn = '';
                if (p.status === 'Approved' && (!window.hasPerm || window.hasPerm('inventory', 'create'))) {
                    receiveBtn = `<button type="button" onclick="receivePO(${p.id})" class="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold mr-2 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 transition" title="Add to Inventory">Receive 📦</button>`;
                } else if (isReceived && (!window.hasPerm || window.hasPerm('inventory', 'create'))) {
                    receiveBtn = `<button type="button" onclick="window.rereceivePO(${p.id})" class="text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded text-xs font-bold mr-2 border border-purple-200 dark:border-purple-700 hover:bg-purple-100 transition" title="Re-Receive into Inventory">Re-Receive 🔄</button>`;
                } else if (p.status === 'Pending' && (!window.hasPerm || window.hasPerm('purchase_orders', 'approve'))) {
                    receiveBtn = `<button type="button" onclick="approvePO(${p.id})" class="text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold mr-2 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 transition">Approve</button>`;
                }
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(p.id)}<td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">PO-${p.id}</td><td class="text-center p-3 text-xs font-bold text-slate-400">${safeDateStr(p.created_at)}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">${p.item_description}</td><td class="text-center p-3 text-xs">${p.specification||'-'}</td><td class="text-center p-3">${p.supplier}</td><td class="text-center p-3 text-xs text-slate-500">${p.project_name || '-'}</td><td class="text-center p-3 text-xs">${p.uom||'-'}</td><td class="text-center p-3 font-mono font-bold">${q}</td><td class="text-center p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(ucFcy)}</td><td class="text-center p-3 font-mono font-bold bg-slate-50 dark:bg-slate-800/50">${formatMoney(exWork)}</td><td class="text-center p-3 text-slate-500">${fx}</td><td class="text-center p-3 font-black text-orange-600 dark:text-orange-400 font-mono bg-orange-50 dark:bg-orange-900/20 cursor-pointer hover:underline" onclick="viewPoDdpCharges(${p.id}, '${(p.item_description || '').replace(/'/g, "\\'")}')">${formatMoney(ddpFcy)}</td><td class="text-center p-3 font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-900/20 cursor-pointer hover:underline" onclick="viewPoDdpLcyCharges(${p.id}, '${(p.item_description || '').replace(/'/g, "\\'")}')">${formatMoney(ddpLcy)}</td><td class="text-center p-3 font-bold text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20">${formatMoney(ucLcy)}</td><td class="text-center p-3"><span class="px-2 py-1 rounded-full text-xs font-bold ${isReceived ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : (p.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300')}">${p.status}</span></td><td class="text-center p-3 flex justify-center items-center">${receiveBtn}<button type="button" onclick="openAttachments('purchase_orders', ${p.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(p.id)}${delBtnHtml(p.id)}</td></tr>`;
            }).join('');
            summaryHTML = data.length > 0 ? `<tr class="border-t-4 border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-sm font-black"><td colspan="8" class="text-center p-3 text-slate-800 dark:text-slate-200">TOTALS</td><td class="text-center p-3 font-mono text-slate-800 dark:text-slate-200">${tQty}</td><td></td><td class="text-center p-3 font-mono">${formatMoney(tExWork)}</td><td></td><td class="text-center p-3 font-mono text-orange-600 dark:text-orange-400">${formatMoney(tDdpFcy)}</td><td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400">${formatMoney(tDdpLcy)}</td><td colspan="3"></td></tr>` : '';
        }
        else if(type === 'subcontractors') {
            let sumContractVal = 0; let sumPaidNet = 0;
            summaryData.forEach(s => { sumContractVal += safeNum(s.contract_value); sumPaidNet += safeNum(s.paid_amount); });
            html = data.map(s => {
                const isExceeded = s.end_date && new Date(s.end_date) < new Date() && s.status !== 'Closed';
                const edHtml = isExceeded ? `<span class="text-red-500 font-bold" title="Expired">⚠️ ${safeDateStr(s.end_date)}</span>` : safeDateStr(s.end_date);
                const pb = window.buildProgressBar(safeNum(s.completed_percent));
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(s.id)}<td class="text-center p-3 font-bold text-blue-700 dark:text-blue-400 cursor-pointer hover:underline flex justify-center items-center gap-1" onclick="viewSubcontractorHistory(${s.id})">👷 ${s.name}</td><td class="text-center p-3 font-bold text-slate-600 dark:text-slate-300">${s.project_name}</td><td class="text-center p-3 font-mono font-black text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50">${formatMoney(s.contract_value)}</td><td class="text-center p-3 text-xs text-slate-500">${safeDateStr(s.start_date)}</td><td class="text-center p-3 text-xs text-slate-500">${edHtml}</td><td class="text-center p-3">${pb}</td><td class="text-center p-3 font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-900/20">${formatMoney(s.paid_amount || 0)}</td><td class="text-center p-3 font-black text-orange-600 dark:text-orange-400 cursor-pointer hover:underline" onclick="viewSubcontractorHistory(${s.id})">${s.issued_invoices || 0} Apps</td><td class="text-center p-3 font-bold text-xs ${s.status === 'Closed' ? 'text-slate-400' : 'text-green-600'}">${s.status || 'Active'}</td><td class="text-center p-3 flex justify-center items-center gap-1"><button type="button" onclick="openSubcontractorItems(${s.id}, '${s.project_name}')" class="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-xs font-bold mr-1 hover:bg-indigo-100 transition" title="BOQ & Items">Items</button>${(!window.hasPerm || window.hasPerm('subcontractor_invoices', 'create')) ? `<button type="button" onclick="openNewPayAppModal(${s.id})" class="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded text-xs font-bold mr-1 hover:bg-emerald-100 transition">+ Pay App</button>` : ''}${editBtnHtml(s.id)}${delBtnHtml(s.id)}</td></tr>`;
            }).join('');
            summaryHTML = data.length > 0 ? `<tr class="border-t-4 border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-sm font-black"><td class="text-center p-3 text-slate-800 dark:text-slate-200" colspan="3">TOTALS</td><td class="text-center p-3 font-mono text-slate-800 dark:text-slate-200">${formatMoney(sumContractVal)}</td><td colspan="3"></td><td class="text-center p-3 font-mono text-emerald-600">${formatMoney(sumPaidNet)}</td><td colspan="3"></td></tr>` : '';
        }
        else if(type === 'client_consumptions') {
            let tQty = 0, tRev = 0, tPaid = 0, tOut = 0, tCredit = 0;
            summaryData.forEach(cc => {
                const paid = safeNum(cc.paid_amount); const rev = safeNum(cc.total_revenue);
                tQty += safeNum(cc.consumed_qty); tRev += rev; tPaid += paid; tOut += safeNum(cc.outstanding_balance);
                let creditBalance = paid - rev; if (creditBalance < 0) creditBalance = 0; tCredit += creditBalance;
            });
            html = data.map(cc => {
                const paid = safeNum(cc.paid_amount); const rev = safeNum(cc.total_revenue);
                const bal = safeNum(cc.outstanding_balance);
                const creditBalance = Math.max(0, paid - rev);
                const isCreditNote = (paid > 0 && rev === 0) || (cc.created_by && cc.created_by.includes('Credit'));
                const rowClass = isCreditNote ? 'bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500' : 'border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800';
                const invName = isCreditNote ? '<span class="text-emerald-700 dark:text-emerald-300 font-black">🟢 رصيد دائن للعميل (Credit)</span>' : (cc.inventory_name || '-');
                const refundBtn = creditBalance > 0 ? `<button type="button" onclick="window.openRefundModal(${cc.client_id}, '${(cc.client_name || '').replace(/'/g, "\\'")}', ${creditBalance})" class="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 px-2 py-1 rounded text-xs font-bold mr-1 hover:bg-emerald-100 transition shadow-sm" title="صرف الرصيد النقدي للعميل">صرف 💰</button>` : '';
                const statementBtn = `<button type="button" onclick="window.viewClientStatement(${cc.client_id || 'null'}, '${(cc.client_name || '').replace(/'/g, "\\'")}')" class="text-blue-600 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 px-2 py-1 rounded text-xs font-bold mr-1 hover:bg-blue-100 transition shadow-sm" title="كشف حساب عميل">كشف حساب 📄</button>`;
                return `<tr class="${rowClass} text-sm transition"><td class="text-center p-3 font-bold text-slate-800 dark:text-slate-200">${cc.client_name || '-'}</td><td class="text-center p-3 font-bold text-blue-700 dark:text-blue-400">${invName}</td><td class="text-center p-3 font-mono font-bold">${safeNum(cc.consumed_qty)}</td><td class="text-center p-3 font-mono font-bold text-blue-600 dark:text-blue-400">${window.formatMoney(rev)}</td><td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400 font-black">${window.formatMoney(paid)}</td><td class="text-center p-3 font-mono font-black text-red-500 dark:text-red-400">${window.formatMoney(bal)}</td><td class="text-center p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">${window.formatMoney(creditBalance)}</td><td class="text-center p-3 text-slate-500 text-xs">${window.safeDateStr(cc.outstanding_date)}</td><td class="text-center p-3 flex justify-center items-center gap-1 flex-wrap w-[220px]">${refundBtn}${statementBtn}<button type="button" onclick="window.printPaymentReceipt(${cc.id})" class="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs font-bold hover:bg-slate-200 transition" title="طباعة">🖨️</button><button type="button" onclick="window.openDelayedPaymentsModal(${cc.client_id || 'null'}, '${(cc.client_name || '').replace(/'/g, "\\'")}')" class="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded text-xs font-bold hover:bg-emerald-100 transition shadow-sm" title="سداد سريع">سداد 💵</button>
<button type="button" onclick="window.openScheduleDebtModal(${cc.client_id || 'null'}, ${cc.inventory_id || 'null'}, ${cc.outstanding_balance || 0})" class="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-xs font-bold hover:bg-indigo-100 transition shadow-sm" title="جدولة المديونية">جدولة 🗓️</button>
${delBtnHtml(cc.id)}</td></tr>`;
            }).join('');
            summaryHTML = data.length > 0 ? `<tr class="border-t-4 border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-sm font-black"><td colspan="2" class="text-center p-3">الإجمالي</td><td class="text-center p-3">${tQty.toFixed(2)}</td><td class="text-center p-3">${window.formatMoney(tRev)}</td><td class="text-center p-3">${window.formatMoney(tPaid)}</td><td class="text-center p-3 text-red-500 dark:text-red-400">${window.formatMoney(tOut)}</td><td class="text-center p-3 text-indigo-600 dark:text-indigo-400">${window.formatMoney(tCredit)}</td><td colspan="2"></td></tr>` : '';
        }
        else if(type === 'boq') {
            let sumEstQty = 0; let sumTotalVal = 0; let sumActQty = 0;
            summaryData.forEach(b => { sumEstQty += safeNum(b.est_qty, 1); sumTotalVal += (safeNum(b.est_qty, 1) * safeNum(b.unit_price)); sumActQty += safeNum(b.dynamic_act_qty); });
            html = data.map(b => { 
                const est = safeNum(b.est_qty, 1); const act = safeNum(b.dynamic_act_qty); const assigned = safeNum(b.assigned_qty);
                const val = est * safeNum(b.unit_price); 
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(b.id)}<td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">${b.project_name||'-'}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">${b.item_desc}</td><td class="text-center p-3"><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-xs border dark:border-slate-600">${b.unit}</span></td><td class="text-center p-3 font-mono font-bold">${est}</td><td class="text-center p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(b.unit_price)}</td><td class="text-center p-3 font-black text-orange-600 dark:text-orange-400 font-mono">${formatMoney(val)}</td><td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">${act}</td><td class="text-center p-3">${window.buildProgressBar((act/est)*100)}</td><td class="text-center p-3">${window.buildProgressBar((assigned/est)*100, 'bg-blue-500', 'bg-blue-500')}</td><td class="text-center p-3">${window.buildProgressBar(((est-assigned)/est)*100, 'bg-orange-500', 'bg-orange-500')}</td><td class="text-center p-3 flex justify-center items-center"><button type="button" onclick="viewBoqSubcontractors(${b.id}, '${b.item_desc}')" class="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-xs font-bold mr-2 hover:bg-indigo-100 transition" title="Linked Subcontractors">Subs 👷</button><button type="button" onclick="openAttachments('boq', ${b.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(b.id)}${delBtnHtml(b.id)}</td></tr>`;
            }).join('');
            summaryHTML = data.length > 0 ? `<tr class="border-t-4 border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-sm font-black"><td class="text-center p-3 text-slate-800 dark:text-slate-200" colspan="4">TOTALS</td><td class="text-center p-3 font-mono text-slate-800 dark:text-slate-200">${sumEstQty.toFixed(2)}</td><td></td><td class="text-center p-3 font-mono text-orange-600 dark:text-orange-400">${formatMoney(sumTotalVal)}</td><td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400">${sumActQty.toFixed(2)}</td><td colspan="4"></td></tr>` : '';
        }
        else if(type === 'inventory') {
            let tQty = 0, tRem = 0, tDdpLcy = 0;
            summaryData.forEach(i => {
                let ucLcy = safeNum(i.buy_price); let totalDdpLcy = 0;
                if (i.po_id) {
                    const ucFcy = safeNum(i.po_unit_cost_fcy); const q = safeNum(i.po_original_qty); const fx = safeNum(i.fx_rate, 1);
                    totalDdpLcy = (((ucFcy * q) + safeNum(i.po_ddp_added)) * fx) + safeNum(i.po_ddp_lcy_added);
                } else totalDdpLcy = safeNum(i.qty) * ucLcy;
                tQty += safeNum(i.qty); tRem += safeNum(i.remaining_qty); tDdpLcy += totalDdpLcy;
            });
            html = data.map(i => {
                let ucLcy = safeNum(i.buy_price); let totalDdpLcy = 0;
                if (i.po_id) {
                    const ucFcy = safeNum(i.po_unit_cost_fcy); const q = safeNum(i.po_original_qty); const fx = safeNum(i.fx_rate, 1);
                    totalDdpLcy = (((ucFcy * q) + safeNum(i.po_ddp_added)) * fx) + safeNum(i.po_ddp_lcy_added);
                    ucLcy = q > 0 ? (totalDdpLcy / q) : 0;
                } else totalDdpLcy = safeNum(i.qty) * ucLcy;
                const rtvBtn = `<button type="button" onclick="window.openRtvModal(${i.id}, '${(i.name || '').replace(/'/g, "\\'")}', ${i.po_id || 'null'})" class="text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded text-xs font-bold mr-2 hover:bg-red-100 transition shadow-sm" title="مرتجع للمورد (RTV)">⚠️ RTV</button>`;
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(i.id)}<td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">${i.po_id ? `PO-${i.po_id}` : 'Manual'}</td><td class="text-center p-3 font-bold text-slate-600 dark:text-slate-400">${i.project_name || 'Main Store'}</td><td class="text-center p-3 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">📦 ${i.name}</td><td class="text-center p-3 text-xs">${i.specification || '-'}</td><td class="text-center p-3 text-xs text-slate-500"><span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold">${i.uom || '-'}</span></td><td class="text-center p-3 font-bold text-indigo-600 dark:text-indigo-400">${i.warehouse || 'Main Store'}</td><td class="text-center p-3 font-mono text-slate-500">${i.batch_no || '-'}</td><td class="text-center p-3 font-black text-slate-500 font-mono">${i.qty}</td><td class="text-center p-3 font-black text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20">${i.remaining_qty}</td><td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">${formatMoney(ucLcy)}</td><td class="text-center p-3 font-bold text-orange-600 dark:text-orange-400 font-mono">${formatMoney(totalDdpLcy)}</td><td class="text-center p-3 text-xs text-slate-500 font-bold">${safeDateStr(i.buy_date || i.created_at || i.timestamp)}</td><td class="text-center p-3 flex justify-center items-center">${rtvBtn}<button type="button" onclick="openAttachments('inventory', ${i.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(i.id)}${delBtnHtml(i.id)}</td></tr>`;
            }).join('');
            summaryHTML = data.length > 0 ? `<tr class="border-t-4 border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-sm font-black"><td colspan="8" class="text-center p-3 text-slate-800 dark:text-slate-200">TOTALS</td><td class="text-center p-3 font-mono text-slate-600 dark:text-slate-400">${tQty}</td><td class="text-center p-3 font-mono text-blue-600 dark:text-blue-400">${tRem}</td><td></td><td class="text-center p-3 font-mono text-orange-600 dark:text-orange-400">${formatMoney(tDdpLcy)}</td><td colspan="2"></td></tr>` : '';
        }
        else if(type === 'inventory_sales') {
            let tRev = 0, tProf = 0, tOut = 0;
            summaryData.forEach(s => {
                let buyP = safeNum(s.buy_price);
                if (s.po_id) {
                    const poQ = safeNum(s.po_original_qty); 
                    buyP = poQ > 0 ? ((((safeNum(s.po_unit_cost_fcy) * poQ) + safeNum(s.po_ddp_added)) * safeNum(s.fx_rate, 1)) + safeNum(s.po_ddp_lcy_added)) / poQ : 0;
                }
                const rev = safeNum(s.sell_price) * safeNum(s.qty); 
                tRev += rev; tProf += (rev - (buyP * safeNum(s.qty))); tOut += (s.current_outstanding !== null && s.current_outstanding !== undefined ? Number(s.current_outstanding) : rev);
            });
            html = data.map((s, index) => {
                let buyP = safeNum(s.buy_price);
                if (s.po_id) {
                    const poQ = safeNum(s.po_original_qty); 
                    buyP = poQ > 0 ? ((((safeNum(s.po_unit_cost_fcy) * poQ) + safeNum(s.po_ddp_added)) * safeNum(s.fx_rate, 1)) + safeNum(s.po_ddp_lcy_added)) / poQ : 0;
                }
                const rev = safeNum(s.sell_price) * safeNum(s.qty); const profit = rev - (buyP * safeNum(s.qty));
                const outstanding = s.current_outstanding !== null && s.current_outstanding !== undefined ? Number(s.current_outstanding) : rev;
                const repostBtn = `<button type="button" onclick="window.repostToClientConsumptions(${s.id})" class="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 px-2 py-1 rounded text-xs font-bold mr-1 hover:bg-indigo-100 transition shadow-sm" title="إعادة الإرسال لسجل أرصدة العملاء">ترحيل 🔄</button>`;
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(s.id)}<td class="p-3 font-bold text-slate-400 text-center">${index + 1}</td><td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">${s.po_id ? 'PO-'+s.po_id : 'Manual'}</td><td class="text-center p-3 font-bold text-slate-600 dark:text-slate-300">${s.project_name || '-'}</td><td class="text-center p-3 font-bold text-slate-800 dark:text-slate-200">📦 ${s.item_name}</td><td class="text-center p-3 text-xs">${s.specification || '-'}</td><td class="text-center p-3 font-black text-slate-600 dark:text-slate-400 font-mono">${safeNum(s.qty)}</td><td class="text-center p-3 font-mono text-slate-500 dark:text-slate-400">${formatMoney(buyP)}</td><td class="text-center p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatMoney(s.sell_price)}</td><td class="text-center p-3 font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">${formatMoney(rev)}</td><td class="text-center p-3 font-mono font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20">${formatMoney(profit)}</td><td class="text-center p-3 font-mono font-black text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20">${formatMoney(outstanding)}</td><td class="text-center p-3 font-bold text-blue-700 dark:text-blue-400 cursor-pointer hover:underline" onclick="window.viewProject360('${s.customer_name}')">👤 ${s.customer_name || '-'}</td><td class="text-center p-3 text-slate-500 text-xs font-bold">${safeDateStr(s.date || s.created_at || s.timestamp)}</td><td class="text-center p-3 flex justify-center items-center">${repostBtn}<button type="button" onclick="openAttachments('inventory_sales', ${s.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(s.id)}${delBtnHtml(s.id)}</td></tr>`;
            }).join('');
            summaryHTML = data.length > 0 ? `<tr class="border-t-4 border-slate-800 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-sm font-black"><td colspan="9" class="text-center p-3 text-slate-800 dark:text-slate-200">TOTALS</td><td class="text-center p-3 font-mono text-blue-600 dark:text-blue-400">${formatMoney(tRev)}</td><td class="text-center p-3 font-mono text-orange-600 dark:text-orange-400">${formatMoney(tProf)}</td><td class="text-center p-3 font-mono text-red-500 dark:text-red-400">${formatMoney(tOut)}</td><td colspan="3"></td></tr>` : '';
        }
        else if(type === 'rfq') {
            html = data.map(r => {
                const isApproved = (r.status || '').includes('Approved');
                let poBtn = '';
                if(isApproved) {
                    if(!window.hasPerm || window.hasPerm('purchase_orders', 'create')) poBtn = `<button type="button" onclick="convertRfqToPo(${r.id})" class="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-xs font-bold mr-2 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 transition">Create PO 🛒</button>`;
                } else {
                    if(!window.hasPerm || window.hasPerm('rfq', 'approve')) poBtn = `<button type="button" onclick="approveRFQ(${r.id})" class="text-green-500 mr-2 hover:scale-110" title="Approve">✅</button>`;
                }
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(r.id)}<td class="text-center p-3 font-bold text-slate-600 dark:text-slate-400">${r.company||'-'}</td><td class="text-center p-3 font-bold">${r.project_name||'-'}</td><td class="text-center p-3">${r.item_description}</td><td class="text-center p-3 font-mono font-bold">${r.qty}</td><td class="text-center p-3 bg-slate-50 dark:bg-slate-800/50"><span class="block text-xs font-bold text-slate-400">${r.vendor_1||'-'}</span><span class="font-mono text-slate-800 dark:text-slate-200">${formatMoney(r.price_1)}</span></td><td class="text-center p-3 bg-slate-50 dark:bg-slate-800/50"><span class="block text-xs font-bold text-slate-400">${r.vendor_2||'-'}</span><span class="font-mono text-slate-800 dark:text-slate-200">${formatMoney(r.price_2)}</span></td><td class="text-center p-3 bg-slate-50 dark:bg-slate-800/50"><span class="block text-xs font-bold text-slate-400">${r.vendor_3||'-'}</span><span class="font-mono text-slate-800 dark:text-slate-200">${formatMoney(r.price_3)}</span></td><td class="text-center p-3 font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">${r.selected_vendor||'Pending'}</td><td class="text-center p-3 font-bold ${isApproved?'text-green-600':'text-orange-500'}">${r.status}</td><td class="text-center p-3 flex justify-center items-center">${poBtn}<button type="button" onclick="openAttachments('rfq', ${r.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(r.id)}${delBtnHtml(r.id)}</td></tr>`;
            }).join('');
        }
        else if(type === 'customers') {
            html = data.map(c => {
                const limitHtml = Number(c.credit_limit) > 0 ? `<span class="text-[10px] text-red-500 font-bold border border-red-200 bg-red-50 dark:bg-red-900/30 rounded px-1 ml-2">الحد الائتماني: ${formatMoney(c.credit_limit)}</span>` : '';
                const statusColor = c.status === 'Active' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-500 bg-slate-50';
                const safeName = (c.name || '').replace(/'/g, "\\'");
                
                return `
                <div class="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-slate-100 dark:border-slate-700 p-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col relative text-right" dir="rtl">
                    <div class="flex justify-between items-start mb-3 border-b dark:border-slate-700 pb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg shadow-inner cursor-pointer hover:scale-110 transition" onclick="window.viewProject360('${safeName}')" title="Open Dashboard">
                                📇
                            </div>
                            <div>
                                <h3 class="text-base font-black text-slate-800 dark:text-white truncate w-36 hover:underline cursor-pointer" title="${c.name}" onclick="window.viewProject360('${safeName}')">${c.name || '-'}</h3>
                                <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400">${c.company_name || '-'}</p>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                             <span class="text-[10px] font-black px-2 py-0.5 rounded-lg ${statusColor}">${c.status || 'Active'}</span>
                             <div class="mt-1">${checkboxHtml(c.id).replace('<td', '<div').replace('</td>', '</div>')}</div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 flex-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-3">
                        <div class="col-span-2 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                            <span class="text-sm">📞</span> <span class="font-mono" dir="ltr">${c.phone || 'لا يوجد'}</span>
                        </div>
                        <div class="col-span-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <span class="text-sm">✉️</span> <span class="truncate w-full" title="${c.email || ''}">${c.email || 'لا يوجد'}</span>
                        </div>
                        
                        <div class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg col-span-2 flex flex-col mt-1">
                            <span class="text-slate-400 mb-1">النوع / المنتج:</span>
                            <span class="text-slate-700 dark:text-slate-200">${c.customer_type || '-'} - ${c.product || '-'}</span>
                        </div>
                        
                        <div class="flex flex-col border-t dark:border-slate-700 pt-1 mt-1">
                            <span class="text-slate-400">تاريخ التسجيل:</span>
                            <span>${safeDateStr(c.customer_since)}</span>
                        </div>
                        <div class="flex flex-col border-t dark:border-slate-700 pt-1 mt-1">
                            <span class="text-slate-400">المصدر (Referral):</span>
                            <span>${c.referral || '-'}</span>
                        </div>
                        <div class="flex flex-col border-t dark:border-slate-700 pt-1 mt-1">
                            <span class="text-slate-400">الرقم القانوني:</span>
                            <span class="font-mono text-slate-500">${c.legal_id || '-'}</span>
                        </div>
                        <div class="flex flex-col border-t dark:border-slate-700 pt-1 mt-1">
                            <span class="text-slate-400">الحد الائتماني:</span>
                            <span>${limitHtml || 'غير محدد'}</span>
                        </div>
                        <div class="col-span-2 flex flex-col border-t dark:border-slate-700 pt-1 mt-1">
                            <span class="text-slate-400">العنوان:</span>
                            <span class="truncate text-slate-500 text-[10px]" title="${c.address || ''}">${c.address || '-'}</span>
                        </div>
                    </div>
                    <div class="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-center items-center">
                        ${window.buildActionButtons('customers', c.id)}
                    </div>
                </div>`;
            }).join('');
        }
        
        else if(type === 'property_units') {
            html = data.map(u => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(u.id)}<td class="text-center p-3 font-bold text-slate-600 dark:text-slate-400">${u.project_name}</td><td class="text-center p-3 font-bold text-slate-800 dark:text-slate-200">${u.building_no||'-'}</td><td class="text-center p-3 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1">🚪 ${u.unit_number}</td><td class="text-center p-3">${u.unit_type}</td><td class="text-center p-3 font-mono">${u.area_sqm}</td><td class="text-center p-3 font-mono font-bold text-blue-600">${formatMoney(u.price)}</td><td class="text-center p-3 font-bold ${u.status==='Available'?'text-emerald-600':(u.status==='Hold'?'text-orange-500':'text-slate-400')}">${u.status}</td><td class="text-center p-3">${editBtnHtml(u.id)}${delBtnHtml(u.id)}</td></tr>`).join('');
        }
        else if(type === 'contracts') {
            html = data.map(c => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(c.id)}<td class="text-center p-3 font-bold text-slate-800 dark:text-slate-200">#${c.id}</td><td class="text-center p-3 font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer" title="View Customer Profile">👤 ${c.customer_name}</td><td class="text-center p-3 font-bold">${c.project_name} - ${c.unit_number}</td><td class="text-center p-3 text-xs">${c.contract_type}</td><td class="text-center p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">${formatMoney(c.total_value)}</td><td class="text-center p-3 font-mono text-slate-600 dark:text-slate-400">${formatMoney(c.down_payment)}</td><td class="text-center p-3 text-slate-500 text-xs">${safeDateStr(c.start_date)}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">${c.duration_years || '-'} Yrs</td><td class="text-center p-3 font-bold text-indigo-600 dark:text-indigo-400">${c.payment_frequency || '-'}</td><td class="text-center p-3 font-bold text-orange-600">${c.grace_period_days || 0} Days</td><td class="text-center p-3 font-bold text-red-500">${c.penalty_rate ? (Number(c.penalty_rate)*100).toFixed(0)+'%' : '0%'}</td><td class="text-center p-3 font-bold ${c.status==='Active'?'text-emerald-600':'text-slate-400'}">${c.status}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('contracts', ${c.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(c.id)}${delBtnHtml(c.id)}</td></tr>`).join('');
        }
        else if(type === 'installments') {
            html = data.map(i => {
                const currentStatus = i.dynamic_status || i.status;
                let statusColor = currentStatus === 'Paid' ? 'text-emerald-600' : currentStatus === 'Partial' ? 'text-blue-500' : currentStatus === 'Due' ? 'text-red-500' : 'text-orange-500';
                const dtHtml = currentStatus === 'Due' ? `<span class="text-red-500 font-bold animate-pulse">⚠️ ${safeDateStr(i.due_date)}</span>` : safeDateStr(i.due_date);
                const penaltyHtml = i.penalty_rate ? `<span class="text-xs text-red-500 dark:text-red-400 font-bold block bg-red-50 dark:bg-red-900/20 rounded px-1 mt-1 border border-red-100 dark:border-red-800">غرامة: ${Number(i.penalty_rate) * 100}%</span>` : '';
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(i.id)}<td class="text-center p-3 font-bold text-slate-600 dark:text-slate-400" title="Contract ID: ${i.contract_id}">Cont #${i.contract_id}</td><td class="text-center p-3 font-bold text-blue-700 dark:text-blue-400">${i.customer_name||'-'}</td><td class="text-center p-3 font-bold text-slate-600 dark:text-slate-300">${i.project_name||'-'}</td><td class="text-center p-3 font-bold">#${i.installment_no||'-'}</td><td class="text-center p-3 font-bold">${i.unit_number||'-'}</td><td class="text-center p-3 text-slate-500">${dtHtml}</td><td class="text-center p-3 font-mono font-black text-orange-600 dark:text-orange-400">${formatMoney(i.amount)}<br>${penaltyHtml}</td><td class="text-center p-3 font-bold ${statusColor}"><span class="px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm">${currentStatus}</span></td><td class="text-center p-3">${editBtnHtml(i.id)}${delBtnHtml(i.id)}</td></tr>`;
            }).join('');
        }
        else if(type === 'payment_receipts') {
            html = data.map(pr => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">${checkboxHtml(pr.id)}<td class="text-center p-3 text-slate-500 text-xs font-bold">${safeDateStr(pr.receipt_date)}</td><td class="text-center p-3 font-bold">#${pr.orig_inst_no || pr.installment_no || '-'}</td><td class="text-center p-3 font-bold">${pr.orig_unit_no || pr.unit_number || '-'}</td><td class="text-center p-3 font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">${formatMoney(pr.amount)}</td><td class="text-center p-3 font-mono font-black text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20">${formatMoney(pr.penalty_amount)}</td><td class="text-center p-3 font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-800/30">${formatMoney(safeNum(pr.amount) + safeNum(pr.penalty_amount))}</td><td class="text-center p-3 font-mono font-black text-orange-500 dark:text-orange-400">${formatMoney(Math.max(0, safeNum(pr.outstanding_amount)))}</td><td class="text-center p-3 text-xs"><span class="px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-800">${pr.payment_method}</span></td><td class="text-center p-3 text-slate-500 text-xs">${pr.reference_no||'-'}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('payment_receipts', ${pr.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(pr.id)}${delBtnHtml(pr.id)}</td></tr>`).join('');
        }
        else if(type === 'chart_of_accounts') {
            html = data.map(c => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 font-mono font-black text-slate-800 dark:text-slate-200">${c.account_code}</td><td class="text-center p-3 font-bold text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1">🏦 ${c.account_name}</td><td class="text-center p-3 text-slate-500">${c.company_entity||'-'} / ${c.department||'-'}</td><td class="text-center p-3 font-bold text-slate-600 dark:text-slate-400">L${c.hierarchy_level}</td><td class="text-center p-3 text-slate-400 font-mono">${c.parent_account||'-'}</td><td class="text-center p-3 font-bold ${(c.account_type || '').includes('Asset')||(c.account_type || '').includes('Revenue')?'text-emerald-600 dark:text-emerald-400':'text-orange-600 dark:text-orange-400'}">${c.account_type}</td><td class="text-center p-3 text-slate-500 font-bold">${c.currency}</td><td class="text-center p-3 text-xs ${c.manual_entry_allowed?'text-green-600 dark:text-green-400':'text-red-500 dark:text-red-400'}">${c.manual_entry_allowed?'Yes':'No'}</td><td class="text-center p-3 font-bold ${c.status==='Active'?'text-green-600':'text-slate-400'}">${c.status}</td><td class="text-center p-3">${editBtnHtml(c.id)}${delBtnHtml(c.id)}</td></tr>`).join('');
        }
        else if(type === 'gl_mappings') {
            html = data.map(m => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 font-bold text-purple-700 dark:text-purple-400 flex justify-center items-center gap-2">🔄 ${m.transaction_type}</td><td class="text-center p-3 font-bold text-emerald-600 dark:text-emerald-400">↑ ${m.debit_account}</td><td class="text-center p-3 font-bold text-red-500 dark:text-red-400">↓ ${m.credit_account}</td><td class="text-center p-3 font-bold ${m.cost_center_required ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded' : 'text-slate-400'}">${m.cost_center_required ? 'Yes (Required)' : 'No'}</td><td class="text-center p-3 flex justify-center gap-2">${editBtnHtml(m.id)}${delBtnHtml(m.id)}</td></tr>`).join('');
            if(!html) html = '<tr><td colspan="5" class="p-4 text-center text-slate-400 font-bold italic">No GL Mappings Found. Add rules to automate journal entries.</td></tr>';
        }
        else if(type === 'tasks') {
            html = data.map(t => {
                const dt = t.end_date || t.created_at || t.timestamp;
                const isExceeded = t.end_date && new Date(t.end_date) < new Date() && t.status !== 'Completed';
                const dateHtml = isExceeded ? `<span class="text-red-500 font-bold" title="Expired">⚠️ ${safeDateStr(dt)}</span>` : safeDateStr(dt);
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">${t.project_name||'-'}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">🎯 ${t.task_name}</td><td class="text-center p-3 text-xs">${safeDateStr(t.start_date)}</td><td class="text-center p-3 text-xs">${dateHtml}</td><td class="text-center p-3">${window.buildProgressBar(t.progress_percent)}</td><td class="text-center p-3 font-bold ${t.status==='Completed'?'text-emerald-600 dark:text-emerald-400':'text-orange-500'}">${t.status}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('tasks', ${t.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(t.id)}${delBtnHtml(t.id)}</td></tr>`;
            }).join('');
        }
        else if(type === 'daily_reports') {
            html = data.map(d => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">${d.project_name||'-'}</td><td class="text-center p-3 text-blue-600 dark:text-blue-400 font-mono font-bold">${safeDateStr(d.date || d.created_at || d.timestamp)}</td><td class="text-center p-3">${d.weather}</td><td class="text-center p-3 font-black text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">${d.manpower_count}</td><td class="text-center p-3 text-slate-600 dark:text-slate-400">${d.equipment_used}</td><td class="text-center p-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title="${d.notes}">${d.notes}</td><td class="text-center p-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded">${d.created_by}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('daily_reports', ${d.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(d.id)}${delBtnHtml(d.id)}</td></tr>`).join('');
        }
        else if(type === 'inventory_transfers') {
            html = data.map(t => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 text-slate-500 text-xs font-bold">${safeDateStr(t.date || t.created_at || t.timestamp)}</td><td class="text-center p-3 font-bold flex items-center justify-center gap-1">📦 ${t.material}</td><td class="text-center p-3 font-black text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20">${t.qty}</td><td class="text-center p-3 font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20">📤 ${t.from_project || 'Main Store'}</td><td class="text-center p-3 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">📥 ${t.to_project || 'Main Store'}</td><td class="text-center p-3 text-xs bg-slate-50 dark:bg-slate-800 rounded font-bold border dark:border-slate-700">${t.created_by}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('inventory_transfers', ${t.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${delBtnHtml(t.id)}</td></tr>`).join('');
        }
        else if(type === 'returns') {
            html = data.map(r => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 text-slate-500 text-xs font-bold">${safeDateStr(r.date || r.created_at || r.timestamp)}</td><td class="text-center p-3 font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20">📤 ${r.project_name||'-'}</td><td class="text-center p-3 font-bold text-slate-800 dark:text-slate-200">📦 ${r.material}</td><td class="text-center p-3 font-mono font-black">${r.qty}</td><td class="text-center p-3 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">📥 ${r.return_to||'Main Store'}</td><td class="text-center p-3 text-xs font-bold">${r.created_by}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('returns', ${r.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${delBtnHtml(r.id)}</td></tr>`).join('');
        }
        else if(type === 'staff') {
            html = data.map(s => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 font-bold text-slate-500 dark:text-slate-400">${s.company||'-'}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">${parseProjectNames(s.project_name)}</td><td class="text-center p-3 font-bold text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1">👨‍💼 ${s.name}</td><td class="text-center p-3"><span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold border dark:border-slate-700">${s.role}</span></td><td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 font-bold">${formatMoney(s.salary)}</td><td class="text-center p-3 text-xs text-slate-500 font-bold">${safeDateStr(s.hiring_date)}</td><td class="text-center p-3 font-bold ${s.status==='Active'?'text-emerald-600':'text-red-500'}">${s.status}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('staff', ${s.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(s.id)}${delBtnHtml(s.id)}</td></tr>`).join('');
        }
        else if(type === 'attendance') {
            html = data.map(a => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 text-slate-500 text-xs font-bold">${safeDateStr(a.date)}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">${a.staff_name}</td><td class="text-center p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${a.check_in||'-'}</td><td class="text-center p-3 font-mono font-bold text-orange-500">${a.check_out||'-'}</td><td class="text-center p-3 font-bold ${a.status==='Present'?'text-emerald-600':'text-red-500'}"><span class="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border dark:border-slate-600 shadow-sm">${a.status}</span></td><td class="text-center p-3"><button type="button" onclick="openAttachments('attendance', ${a.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(a.id)}${delBtnHtml(a.id)}</td></tr>`).join('');
        }
        else if(type === 'leaves') {
            html = data.map(l => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">${l.staff_name}</td><td class="text-center p-3"><span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold border dark:border-slate-700">${l.leave_type}</span></td><td class="text-center p-3 text-xs font-bold text-slate-500">${safeDateStr(l.start_date)}</td><td class="text-center p-3 text-xs font-bold text-slate-500">${safeDateStr(l.end_date)}</td><td class="text-center p-3 font-bold ${l.status==='Approved'?'text-emerald-600 dark:text-emerald-400':(l.status==='Rejected'?'text-red-500':'text-orange-500')}"><span class="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border dark:border-slate-600 shadow-sm">${l.status}</span></td><td class="text-center p-3"><button type="button" onclick="openAttachments('leaves', ${l.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(l.id)}${delBtnHtml(l.id)}</td></tr>`).join('');
        }
        else if(type === 'payroll') {
            html = data.map(p => {
                const b = safeNum(p.basic_salary); const a = safeNum(p.allowances); const d = safeNum(p.deductions); const net = b + a - d;
                return `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">💰 ${p.staff_name}</td><td class="text-center p-3 text-xs font-bold text-slate-500">${safeDateStr(p.execution_date)}</td><td class="text-center p-3 font-bold text-blue-600 dark:text-blue-400">${p.month}</td><td class="text-center p-3 font-mono">${formatMoney(b)}</td><td class="text-center p-3 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">+${formatMoney(a)}</td><td class="text-center p-3 font-mono text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20">-${formatMoney(d)}</td><td class="text-center p-3 font-mono font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30">${formatMoney(net)}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('payroll', ${p.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(p.id)}${delBtnHtml(p.id)}</td></tr>`;
            }).join('');
        }
        else if(type === 'ledger') {
            html = data.map(l => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 text-slate-500 text-xs font-bold">${safeDateStr(l.date || l.created_at || l.timestamp)}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1">🧾 ${l.account_name}</td><td class="text-center p-3 font-bold text-blue-600 dark:text-blue-400">${l.project_name||'General'}</td><td class="text-center p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">${formatMoney(l.debit)}</td><td class="text-center p-3 font-mono font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20">${formatMoney(l.credit)}</td><td class="text-center p-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title="${l.description}">${l.description}</td><td class="text-center p-3 text-xs font-bold bg-slate-50 dark:bg-slate-800 rounded">${l.created_by}</td><td class="text-center p-3"><button type="button" onclick="openAttachments('ledger', ${l.id})" class="text-slate-400 mr-2 hover:scale-110">📎</button>${editBtnHtml(l.id)}</td></tr>`).join('');
        }
        else if(type === 'email_logs') {
            html = data.map(e => `<tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"><td class="text-center p-3 text-slate-500 text-xs font-mono font-bold">${safeDateTimeStr(e.sent_at || e.created_at || e.timestamp)}</td><td class="text-center p-3 font-bold text-blue-600 dark:text-blue-400">📧 ${e.to_email}</td><td class="text-center p-3 font-bold text-slate-700 dark:text-slate-300">${e.subject}</td><td class="text-center p-3 text-slate-500 text-xs max-w-xs truncate" title="${e.body}">${e.body || '-'}</td><td class="text-center p-3 font-bold text-slate-600 dark:text-slate-400 text-xs">${e.sent_by || 'System Alert'}</td><td class="text-center p-3 font-bold ${e.status==='Sent'?'text-emerald-600 dark:text-emerald-400':'text-red-500'}"><span class="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 shadow-sm border dark:border-slate-600">${e.status}</span></td></tr>`).join('');
        }
        else if(type === 'audit_logs') {
            if (window.hasPerm && !window.hasPerm('audit_logs', 'audit')) {
                html = '<tr><td colspan="5" class="p-4 text-red-500 font-bold text-center">Access Denied: You do not have permission to view Audit Logs.</td></tr>';
                bypassDomInjection = false; 
            } else {
                html = data.map(l => `<tr class="border-b border-slate-700 text-xs font-mono hover:bg-slate-800 transition"><td class="text-center p-2 text-slate-400">${window.safeDateTimeStr(l.date || l.timestamp || l.created_at || Date.now())}</td><td class="text-center p-2 font-bold text-blue-400 flex items-center justify-center gap-1">🛡️ ${l.username}</td><td class="text-center p-2 ${(l.action||'').includes('DELETE') ? 'text-red-500 font-bold' : 'text-slate-300 font-bold'}">${l.action}</td><td class="text-center p-2 text-emerald-400">${l.table_name} (#${l.record_id || '-'})</td><td class="text-center p-2 text-slate-400 max-w-xs truncate" title="${l.details || ''}">${l.details || '-'}</td></tr>`).join('');
            }
        }
        else if(type === 'ddp_charges') {
            let tFcy = 0, tLcy = 0;
            summaryData.forEach(d => { tFcy += safeNum(d.fcy_amount); tLcy += safeNum(d.amount); });
            html = data.map(d => `
                <tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <td class="text-center p-3 text-slate-500 font-bold text-xs">${safeDateStr(d.date)}</td>
                    <td class="text-center p-3 font-bold text-blue-600">PO-${d.po_id||'-'}</td>
                    <td class="text-center p-3 font-bold text-slate-700">${d.project_name||'-'}</td>
                    <td class="text-center p-3 text-slate-600 max-w-[150px] truncate" title="${d.item_description}">${d.item_description||'-'}</td>
                    <td class="text-center p-3 font-bold">${d.charge_type||d.description||'-'}</td>
                    <td class="text-center p-3 text-xs"><span class="px-2 py-1 bg-slate-100 rounded border">${d.payment_method||'-'}</span></td>
                    <td class="text-center p-3 text-xs font-mono">${d.reference_no||'-'}</td>
                    <td class="text-center p-3 font-mono text-blue-600 bg-blue-50">${formatMoney(d.fcy_amount)}</td>
                    <td class="text-center p-3 font-mono text-indigo-600">${safeNum(d.fx_rate, 1)}</td>
                    <td class="text-center p-3 font-mono font-black text-emerald-600 bg-emerald-50">${formatMoney(d.amount)}</td>
                    <td class="text-center p-3 text-xs text-slate-500">${d.provider_name||d.created_by||'-'}</td>
                </tr>
            `).join('');
            summaryHTML = data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 font-black"><td colspan="7" class="text-center p-3">الإجمالي (Totals)</td><td class="text-center p-3 font-mono text-blue-600">${formatMoney(tFcy)}</td><td></td><td class="text-center p-3 font-mono text-emerald-600">${formatMoney(tLcy)}</td><td></td></tr>` : '';
        }
    } catch(err) {
        console.error(`Error rendering table ${type}:`, err);
        html = `<tr><td colspan="20" class="p-4 text-center text-red-500 dark:text-red-400 font-bold">حدث خطأ أثناء معالجة البيانات: ${err.message}</td></tr>`;
    }

    // --- Unified DOM Injection & Cards System ---
    if (!bypassDomInjection) {
        const targetEl = document.getElementById(tableBodyIds[type] || `${type}Body`);
        if (targetEl) {
            const tableEl = targetEl.closest('table');
            let cardsContainer = document.getElementById(`cardsContainer_${type}`);
            
            if (tableEl && !cardsContainer) {
                cardsContainer = document.createElement('div');
                cardsContainer.id = `cardsContainer_${type}`;
                cardsContainer.className = 'cards-grid hidden mt-4';
                tableEl.parentNode.insertBefore(cardsContainer, tableEl.nextSibling);
            }

            if (tableEl && !document.getElementById(`toggleViewBtn_${type}`)) {
                const btnHtml = `<div class="flex justify-end mb-3 w-full"><button id="toggleViewBtn_${type}" type="button" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold text-sm transition flex items-center gap-2" onclick="window.toggleViewMode('${type}')"><span class="text-xl">🔀</span> عرض الكروت</button></div>`;
                tableEl.parentNode.insertBefore(document.createRange().createContextualFragment(btnHtml), tableEl);
            }

            if (window.viewMode && window.viewMode[type] === 'cards') {
                if(tableEl) tableEl.classList.add('hidden');
                if(cardsContainer) {
                    cardsContainer.classList.remove('hidden');
                    let cardsHtml = data.map((row, idx) => {
                        let content = '';
                        let keys = Object.keys(row).filter(k => k !== 'id' && !k.includes('password') && !k.includes('token') && !k.includes('created_at')).slice(0, 8);
                        for(let key of keys) {
                            content += `<div class="flex justify-between border-b dark:border-slate-700 py-2"><span class="text-[10px] text-slate-400 font-black uppercase">${key.replace(/_/g, ' ')}</span><span class="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[150px] truncate block text-left" title="${row[key]}">${row[key] !== null ? row[key] : '-'}</span></div>`;
                        }
                        return `<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col hover:shadow-xl hover:-translate-y-1 transition duration-300 relative">
                            <div class="absolute top-0 right-0 w-2 h-full bg-indigo-500 rounded-r-2xl"></div>
                            <div class="text-indigo-600 font-black mb-3 border-b dark:border-slate-600 pb-2">سجل #${row.id || idx+1}</div>
                            <div class="flex-1 mb-3">${content}</div>
                            <div class="pt-3 border-t dark:border-slate-700 flex justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">${window.buildActionButtons(type, row.id)}</div>
                        </div>`;
                    }).join('');
                    
                    cardsContainer.innerHTML = cardsHtml || `<div class="col-span-full text-center p-8 text-slate-500 font-bold bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700">لا توجد بيانات مسجلة (No Data)</div>`;
                    if (summaryHTML) {
                         cardsContainer.innerHTML += `<div class="col-span-full mt-4 w-full overflow-x-auto rounded-xl shadow-sm"><table class="w-full"><tbody>${summaryHTML}</tbody></table></div>`;
                    }
                }
            } else {
                if(tableEl) tableEl.classList.remove('hidden');
                if(cardsContainer) cardsContainer.classList.add('hidden');
                targetEl.innerHTML = html + summaryHTML || `<tr><td colspan="20" class="p-4 text-center text-slate-400 font-bold italic">لا توجد بيانات مسجلة (No Data Found)</td></tr>`;
            }
        }
    }
    
    const pgEl = document.getElementById(`pg-${type}`);
    if (pgEl) pgEl.innerHTML = window.buildPaginationHTML(type, currentPage, totalPages);
};

// --- Pagination ---
window.buildPaginationHTML = function(type, currentPage, totalPages) {
    if (totalPages <= 1) return '';
    let html = '<div class="flex justify-center items-center gap-2 mt-4 pb-4">';
    if (currentPage > 1) html += `<button type="button" onclick="window.changePage('${type}', ${currentPage - 1})" class="px-3 py-1 border dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition shadow-sm">&laquo; Prev</button>`;
    html += `<span class="px-3 py-1 text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded border dark:border-slate-600 shadow-inner">Page ${currentPage} of ${totalPages}</span>`;
    if (currentPage < totalPages) html += `<button type="button" onclick="window.changePage('${type}', ${currentPage + 1})" class="px-3 py-1 border dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition shadow-sm">Next &raquo;</button>`;
    html += '</div>';
    return html;
};

window.changePage = function(type, newPage) {
    if (window.pageState[type]) {
        window.pageState[type].page = newPage;
        if(window.loadTableData) window.loadTableData(type);
    }
};

window.openUserForm = function(editId = null) {
    document.getElementById('userFormModal').classList.remove('hidden');
    document.getElementById('userForm').reset();
    document.getElementById('userIdInput').value = editId || '';
    document.getElementById('userFormTitle').innerText = editId ? "Edit User Permissions" : "Create New User";
    
    const crudBody = document.getElementById('crudMatrixBody');
    if(crudBody && crudBody.innerHTML === '') {
        const tables = ['projects','partners','boq','tasks','daily_reports','rfq','purchase_orders','subcontractors','inventory','inventory_transfers','returns','staff','attendance','leaves','payroll','ledger','ar_invoices','chart_of_accounts','customers','property_units','contracts','installments','payment_receipts','client_consumptions','inventory_sales'];
        crudBody.innerHTML = tables.map(t => {
            const pretty = t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<tr><td class="text-left font-bold p-2 border dark:border-slate-600 sticky left-0 bg-white dark:bg-slate-800 z-10 text-slate-800 dark:text-white">${pretty}</td><td class="p-2 border dark:border-slate-600"><input type="checkbox" class="crud-cb w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-600" data-table="${t}" data-action="read"></td><td class="p-2 border dark:border-slate-600"><input type="checkbox" class="crud-cb w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-600" data-table="${t}" data-action="create"></td><td class="p-2 border dark:border-slate-600"><input type="checkbox" class="crud-cb w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-600" data-table="${t}" data-action="update"></td><td class="p-2 border dark:border-slate-600"><input type="checkbox" class="crud-cb w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-600" data-table="${t}" data-action="delete"></td><td class="p-2 border dark:border-slate-600"><input type="checkbox" class="crud-cb w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-600" data-table="${t}" data-action="approve"></td><td class="p-2 border dark:border-slate-600 bg-slate-50 dark:bg-slate-900"><input type="checkbox" disabled class="w-4 h-4 opacity-50 cursor-not-allowed"></td><td class="p-2 border dark:border-slate-600 bg-slate-50 dark:bg-slate-900"><input type="checkbox" disabled class="w-4 h-4 opacity-50 cursor-not-allowed"></td><td class="p-2 border dark:border-slate-600 bg-slate-50 dark:bg-slate-900"><input type="checkbox" disabled class="w-4 h-4 opacity-50 cursor-not-allowed"></td><td class="p-2 border dark:border-slate-600 bg-slate-50 dark:bg-slate-900"><input type="checkbox" class="crud-cb w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer dark:bg-slate-800 dark:border-slate-600" data-table="audit_logs" data-action="audit" ${t==='projects'?'':'disabled'}></td></tr>`;
        }).join('');
    }

    const projOptsList = window.erpData?.projects_dd || [];
    const projSelect = document.getElementById('userProjectsSelect');
    if(projSelect) projSelect.innerHTML = projOptsList.map(p => `<option value="${p.name || p}">${p.name || p}</option>`).join('');

    if (editId) {
        const u = (window.erpData.usersList || []).find(x => x.id === editId);
        if (u) {
            document.getElementById('userNameInput').value = u.username;
            document.getElementById('userEmailInput').value = u.email || '';
            document.getElementById('userRoleInput').value = u.role;
            document.getElementById('userStatusInput').value = u.status;
            
            const linkedCompanySelect = document.getElementById('userCompanyInput');
            if(linkedCompanySelect) linkedCompanySelect.value = u.linked_company || '';

            const p = u.permissions || {};
            document.querySelectorAll('.rbac-checkbox').forEach(cb => cb.checked = (p.screens && p.screens.includes(cb.value)));
            document.querySelectorAll('.rbac-notif-cb').forEach(cb => cb.checked = (p.notifications && p.notifications.includes(cb.value)));
            if(projSelect && p.allowed_projects) Array.from(projSelect.options).forEach(opt => opt.selected = p.allowed_projects.includes(opt.value));
            document.querySelectorAll('.crud-cb').forEach(cb => cb.checked = p.tables && p.tables[cb.dataset.table] && p.tables[cb.dataset.table][cb.dataset.action] === true);
        }
    } else {
        document.querySelectorAll('.rbac-checkbox').forEach(cb => cb.checked = true);
        document.querySelectorAll('.rbac-notif-cb').forEach(cb => cb.checked = false);
        if(projSelect) Array.from(projSelect.options).forEach(opt => opt.selected = false);
        document.querySelectorAll('.crud-cb').forEach(cb => cb.checked = cb.dataset.action === 'read');
    }
};

// =====================================================================
// --- Dynamic Form Templates Registry (Refactored) ---
// =====================================================================
const baseInputCls = "p-3 border dark:border-slate-600 rounded text-center dark:bg-slate-800 dark:text-white";
const baseSelectCls = "w-full p-3 border dark:border-slate-600 rounded text-center font-bold dark:bg-slate-800 dark:text-white";

window.formTemplates = {
    property_units: (data, erp) => {
        const pOpts = `<option value="">-- General / No Project --</option>` + 
            (erp.projects_dd || []).map(p => {
                const pName = p.name || p;
                return `<option value="${pName}" ${data.project_name === pName ? 'selected' : ''}>${pName}</option>`;
            }).join('');
            
        const unitTypes = ['Apartment', 'Villa', 'Office', 'Retail', 'Land']
            .map(opt => `<option value="${opt}" ${data.unit_type === opt ? 'selected' : ''}>${opt}</option>`).join('');
            
        const statuses = ['Available', 'Sold/Leased', 'Hold']
            .map(opt => `<option value="${opt}" ${data.status === opt ? 'selected' : ''}>${opt}</option>`).join('');

        return `
            <div class="col-span-full"><select name="project_name" class="${baseSelectCls}" required>${pOpts}</select></div>
            <input name="building_no" placeholder="Building No (e.g. B-12)" value="${data.building_no||''}" class="${baseInputCls}">
            <input name="unit_number" placeholder="Unit Number (e.g. A-101)" value="${data.unit_number||''}" class="${baseInputCls}" required>
            <select name="unit_type" class="${baseSelectCls} w-full">${unitTypes}</select>
            <input name="area_sqm" type="number" step="0.01" min="0" placeholder="Area (sqm)" value="${data.area_sqm||''}" class="${baseInputCls}">
            <input name="price" type="number" step="0.01" min="0" placeholder="Price" value="${data.price||''}" class="${baseInputCls} font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300">
            <div class="col-span-full"><select name="status" class="${baseSelectCls}">${statuses}</select></div>
        `;
    },

    installments: (data, erp) => {
        const contOpts = `<option value="">-- Select Contract --</option>` + 
            (erp.contracts_dd || []).map(c => `<option value="${c.id}" ${data.contract_id === c.id ? 'selected' : ''}>Contract #${c.id} - ${c.contract_type}</option>`).join('');
        
        const dd = data.due_date ? String(data.due_date).split('T')[0] : '';
        const statuses = [
            { val: 'Pending', text: 'Pending (Unpaid)' }, { val: 'Paid', text: 'Paid' }, { val: 'Defaulted', text: 'Defaulted' }
        ].map(opt => `<option value="${opt.val}" ${data.status === opt.val ? 'selected' : ''}>${opt.text}</option>`).join('');

        return `
            <div class="col-span-full"><select name="contract_id" class="${baseSelectCls}" required>${contOpts}</select></div>
            <input name="installment_no" placeholder="Installment No. (e.g. 1)" value="${data.installment_no||''}" class="${baseInputCls}">
            <input name="unit_number" placeholder="Unit Number" value="${data.unit_number||''}" class="${baseInputCls}">
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Due Date</label><input name="due_date" type="date" value="${dd}" class="${baseInputCls}" required></div>
            <input name="amount" type="number" step="0.01" min="0" placeholder="Installment Amount" value="${data.amount||''}" class="${baseInputCls} font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300" required>
            <div class="col-span-full"><select name="status" class="${baseSelectCls}">${statuses}</select></div>
        `;
    },

    payment_receipts: (data, erp) => {
        const allInsts = erp.installments_dd || erp.installments || [];
        const unpaidInsts = allInsts.filter(i => i.status !== 'Paid' && i.dynamic_status !== 'Paid');
        
        const instOpts = `<option value="">-- Select Installment --</option>` + unpaidInsts.map(i => {
            const remAmt = Math.max(0, parseFloat(i.amount||0) - parseFloat(i.total_paid||0));
            return `<option value="${i.id}" data-instno="${i.installment_no||''}" data-unit="${i.unit_number||''}" data-max="${remAmt}" ${data.installment_id === i.id ? 'selected' : ''}>Cont #${i.contract_id || 'N/A'} | Inst #${i.installment_no || i.id} - Rem: ${remAmt.toFixed(2)} [${i.dynamic_status || i.status}]</option>`;
        }).join('');
        
        const rd = data.receipt_date ? String(data.receipt_date).split('T')[0] : '';
        const paymentMethods = ['Bank Transfer', 'Cash', 'Cheque']
            .map(opt => `<option value="${opt}" ${data.payment_method === opt ? 'selected' : ''}>${opt}</option>`).join('');

        return `
            <div class="col-span-full"><select name="installment_id" id="receiptInstSelect" class="${baseSelectCls}" onchange="window.handleReceiptInstChange()" required>${instOpts}</select></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Installment No.</label><input name="installment_no" id="receiptInstNo" value="${data.orig_inst_no || data.installment_no||''}" class="${baseInputCls} bg-slate-100 dark:bg-slate-700" readonly></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Unit Number</label><input name="unit_number" id="receiptUnitNo" value="${data.orig_unit_no || data.unit_number||''}" class="${baseInputCls} bg-slate-100 dark:bg-slate-700" readonly></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Receipt Date</label><input name="receipt_date" type="date" value="${rd}" class="${baseInputCls}" required></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Collected Amount (Auto Filled)</label><input name="amount" id="receiptCollectedAmt" type="number" step="0.01" min="0.01" placeholder="Collected Amount" value="${data.amount||''}" class="${baseInputCls} border-emerald-300 dark:border-emerald-700 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 cursor-not-allowed" readonly required></div>
            <select name="payment_method" class="${baseSelectCls} mt-auto w-full" required>${paymentMethods}</select>
            <input name="reference_no" placeholder="Reference / Cheque No." value="${data.reference_no||''}" class="${baseInputCls} mt-auto">
        `;
    },

    inventory_sales: (data, erp) => {
        const invOpts = (erp.inventory || []).filter(i => i.remaining_qty > 0 || data.inventory_id === i.id)
            .map(i => `<option value="${i.id}" data-buy="${i.buy_price||0}" ${data.inventory_id === i.id ? 'selected' : ''}>[PO-${i.po_id||'Manual'}] ${i.name} (Spec: ${i.specification||'-'}) (Avail: ${i.remaining_qty})</option>`).join('');
            
        const custDropdownOpts = `<option value="">-- Select Customer --</option>` + 
            (erp.customers_dd||[]).map(c => `<option value="${c.name}" ${data.customer_name === c.name ? 'selected' : ''}>${c.name}</option>`).join('');
            
        const pOpts = `<option value="">-- General / No Project --</option>` + 
            (erp.projects_dd || []).map(p => `<option value="${p.name || p}" ${data.project_name === (p.name || p) ? 'selected' : ''}>${p.name || p}</option>`).join('');

        return `
            <div class="col-span-full"><select name="customer_name" class="${baseSelectCls}" required>${custDropdownOpts}</select></div>
            <div class="col-span-full"><select name="project_name" class="${baseSelectCls}" onchange="window.updateInventorySalesDropdown(this.value)" required>${pOpts}</select></div>
            <div class="col-span-full"><select name="inventory_id" class="${baseSelectCls} bg-slate-50 dark:bg-slate-700" onchange="document.getElementById('displayBuyPrice').value = this.options[this.selectedIndex].getAttribute('data-buy') || '';" required><option value="" data-buy="">-- Select Available Item from Inventory --</option>${invOpts}</select></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Buy Price (PO Cost)</label><input id="displayBuyPrice" type="number" placeholder="Auto fetched from PO" value="${data.buy_price||''}" class="${baseInputCls} bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" readonly></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Withdraw Date</label><input name="date" type="date" value="${data.date ? String(data.date).split('T')[0] : ''}" class="${baseInputCls}" required></div>
            <input name="qty" type="number" step="0.01" min="0" placeholder="Quantity to Sell/Withdraw" value="${data.qty||''}" class="${baseInputCls}" required>
            <input name="sell_price" type="number" step="0.01" min="0" placeholder="Selling Price (Unit)" value="${data.sell_price||''}" class="${baseInputCls} col-span-full font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300" required>
        `;
    },

     gl_mappings: (data, erp) => {
        const buildCoaOpts = (selectedValue) => {
            return `<option value="">-- Select Account --</option>` + 
                (erp.accounts_dd||[]).map(a => `<option value="${a}" ${selectedValue === a ? 'selected' : ''}>${a}</option>`).join('');
        };

        const sysTransactions = [
            { group: 'المبيعات والعقود (Sales & Real Estate)', opts: ['Real Estate Sale (بيع عقار)', 'Payment Receipt (تحصيل دفعة/قسط)', 'Client Refund (صرف رصيد نقدية لعميل)'] },
            { group: 'المشتريات والمخازن (Procurement & Inventory)', opts: ['Pre-order Advance (مقدم حجز بضاعة)', 'PO Received (استلام أمر شراء)', 'PO DDP Charge (إضافة مصاريف شحن/تخليص)', 'RTV - Return to Vendor (مرتجع لمورد)', 'Inventory Sale (مبيعات مخزنية خروج)', 'Material Consumption (استهلاك خامات بالمشروع)', 'Material Return (مرتجع خامات من الموقع)'] },
            { group: 'المقاولين والتشغيل (Subcontractors & Ops)', opts: ['Subcontractor Invoice (مستخلص مقاول باطن)', 'Subcontractor Retention (استقطاع تأمين مقاول)', 'Advance Payment Recovery (استرداد دفعة مقدمة مقاول)'] },
            { group: 'الموارد البشرية (HR & Payroll)', opts: ['Payroll Execution (إصدار الرواتب)'] },
            { group: 'الشركاء وحركة الأموال (Partners & Finance)', opts: ['Partner Deposit (إيداع شريك)', 'Partner Withdrawal (مسحوبات شريك)', 'Manual Journal Entry (قيد يدوي)'] }
        ];

        const transOptsHtml = `<option value="">-- اختر نوع المعاملة الآلية --</option>` + 
            sysTransactions.map(g => `<optgroup label="${g.group}">` + 
                g.opts.map(opt => `<option value="${opt}" ${data.transaction_type === opt ? 'selected' : ''}>${opt}</option>`).join('') + 
            `</optgroup>`).join('');

        return `
            <div class="col-span-full flex flex-col mb-4">
                <label class="text-xs font-black text-blue-600 dark:text-blue-400 mb-2 text-right" dir="rtl">📌 نوع المعاملة المربوطة (Transaction Trigger)</label>
                <select name="transaction_type" class="${baseSelectCls} bg-blue-50 dark:bg-blue-900/20 text-blue-800 border-blue-300" required dir="rtl">
                    ${transOptsHtml}
                </select>
            </div>
            
            <div class="flex flex-col"><label class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 text-left">Debit Account (الطرف المدين)</label><select name="debit_account" class="${baseSelectCls}" required>${buildCoaOpts(data.debit_account)}</select></div>
            <div class="flex flex-col"><label class="text-xs font-bold text-red-500 dark:text-red-400 mb-1 text-left">Credit Account (الطرف الدائن)</label><select name="credit_account" class="${baseSelectCls}" required>${buildCoaOpts(data.credit_account)}</select></div>
            
            <div class="col-span-full flex flex-col p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl mt-4" dir="rtl">
                <label class="text-sm font-black text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
                    <span>⚠️</span> <span>هل تتطلب المعاملة التوجيه لمركز تكلفة (مشروع) محدد؟</span>
                </label>
                <select name="cost_center_required" class="${baseSelectCls} border-orange-300 dark:border-orange-700" required>
                    <option value="true" ${data.cost_center_required === true || data.cost_center_required === 'true' || data.cost_center_required === undefined ? 'selected' : ''}>نعم - ربط القيد آلياً بحسابات المشروع (Project Specific)</option>
                    <option value="false" ${data.cost_center_required === false || data.cost_center_required === 'false' ? 'selected' : ''}>لا - قيد عام ولا يتطلب مشروع (General Ledger)</option>
                </select>
                <p class="text-[11px] text-slate-600 dark:text-slate-400 mt-3 font-bold leading-relaxed text-right">
                    ملاحظة: عند اختيار (نعم)، سيقوم النظام تلقائياً بقراءة اسم المشروع من المستند (مثل أمر الشراء، المبيعات، المستخلص) وتمريره للقيود لضمان صحة الميزانية لكل مشروع بشكل مستقل.
                </p>
            </div>
        `;
    }
};

// =====================================================================
// --- Dynamic Modal Engine ---
// =====================================================================
const originalOpenModalUi = window.openModal;
window.openModal = function(type, editData = null) {
    if (originalOpenModalUi) originalOpenModalUi(type, editData);
    
    if (type === 'projects') {
        const compInput = document.querySelector('#formFields input[name="company"]');
        if (compInput) compInput.setAttribute('list', 'projectCompaniesList');
    }

    const formFields = document.getElementById('formFields');
    if (!formFields) return;

    if (window.formTemplates[type]) {
        const safeData = editData || {};
        const safeErp = window.erpData || {};
        
        formFields.innerHTML = window.formTemplates[type](safeData, safeErp);

        if (type === 'payment_receipts') {
            setTimeout(() => window.handleReceiptInstChange(), 100);
        }
    }
};

window.exportDataToExcel = function(type, filename) {
    const data = window.erpData[type + '_all'] || window.erpData[type + '_backup'] || window.erpData[type] || [];
    if (data.length === 0) { alert("لا توجد بيانات لاستخراجها."); return; }
    
    let csv = [];
    const headers = Object.keys(data[0]);
    csv.push(headers.map(h => `"${h}"`).join(','));
    data.forEach(row => {
        let rowData = headers.map(header => `"${(row[header] === null || row[header] === undefined ? "" : String(row[header])).replace(/"/g, '""')}"`);
        csv.push(rowData.join(','));
    });
    const csvFile = new Blob(["\uFEFF" + csv.join('\n')], {type: 'text/csv;charset=utf-8;'});
    const downloadLink = document.createElement('a');
    downloadLink.download = filename + '.csv';
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink);
};

window.filterSpecificTable = function(inputId, tableType) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const filter = input.value.toLowerCase();
    if (!window.erpData[tableType + '_backup']) window.erpData[tableType + '_backup'] = [...(window.erpData[tableType] || [])];
    
    if (filter === "") {
        window.erpData[tableType] = [...window.erpData[tableType + '_backup']];
    } else {
        window.erpData[tableType] = window.erpData[tableType + '_backup'].filter(row => Object.values(row).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(filter)));
    }
    
    let totalPages = 1;
    if (window.pageState && window.pageState[tableType]) {
        window.pageState[tableType].page = 1;
        totalPages = Math.ceil(window.erpData[tableType].length / (window.pageState[tableType].limit || 10));
    }
    if(typeof window.renderSpecificTable === 'function') window.renderSpecificTable(tableType, 1, totalPages);
};

window.handleReceiptInstChange = function() {
    const select = document.getElementById('receiptInstSelect');
    const instNoInput = document.getElementById('receiptInstNo');
    const unitNoInput = document.getElementById('receiptUnitNo');
    const amountInput = document.getElementById('receiptCollectedAmt');
    
    if(select && select.selectedIndex > 0) {
        const option = select.options[select.selectedIndex];
        instNoInput.value = option.getAttribute('data-instno') || '';
        unitNoInput.value = option.getAttribute('data-unit') || '';
        const maxAmt = parseFloat(option.getAttribute('data-max'));
        amountInput.value = maxAmt.toFixed(2);
        amountInput.max = maxAmt; amountInput.readOnly = true; 
        amountInput.title = `Maximum allowed: ${maxAmt.toFixed(2)}`;
    } else {
        if(instNoInput) instNoInput.value = '';
        if(unitNoInput) unitNoInput.value = '';
        if(amountInput) { amountInput.value = ''; amountInput.readOnly = true; }
    }
};

window.printPaymentReceipt = function(ccId) {
    const row = window.erpData.client_consumptions.find(c => c.id === ccId);
    if(!row) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Payment Receipt</title><style>body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; } .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; } .title { font-size: 24px; font-weight: bold; color: #1e293b; margin: 0; } .row { display: flex; justify-content: space-between; border-bottom: 1px dashed #eee; padding: 10px 0; } .label { font-weight: bold; color: #64748b; } .val { font-weight: bold; color: #0f172a; } .total { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: right; font-size: 18px; margin-top: 20px; }</style></head><body><div class="header"><h1 class="title">Client Payment Receipt</h1><p>Receipt ID: CC-${row.id} | Date: ${new Date().toLocaleDateString()}</p></div><div class="details"><div class="row"><span class="label">Client Name:</span> <span class="val">${row.client_name}</span></div><div class="row"><span class="label">Stock Item Consumed:</span> <span class="val">${row.inventory_name}</span></div><div class="row"><span class="label">Quantity Consumed:</span> <span class="val">${row.consumed_qty}</span></div><div class="row"><span class="label">Outstanding Date:</span> <span class="val">${safeDateStr(row.outstanding_date)}</span></div></div><div class="total"><div><span class="label">Total Amount:</span> <span class="val" style="color: #2563eb;">${window.formatMoney(row.total_revenue)}</span></div><div><span class="label">Amount Paid:</span> <span class="val" style="color: #10b981;">${window.formatMoney(row.paid_amount)}</span></div><div style="margin-top: 10px; border-top: 1px solid #cbd5e1; padding-top: 10px;"><span class="label">Remaining Balance:</span> <span class="val" style="color: #ef4444;">${window.formatMoney(row.outstanding_balance)}</span></div></div><div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px;"><p>This is a system generated receipt and does not require a physical signature.</p></div></body></html>`);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};

// ================== Modals Management ==================
window.openDelayedPaymentsModal = function(clientId, clientName) {
    const titleEl = document.getElementById('delayedPaymentsTitle');
    const modalIdEl = document.getElementById('delayedClientId');
    let cName = clientName && clientName !== 'undefined' ? clientName : 'غير معروف';

    if(titleEl) titleEl.innerHTML = `سجل المدفوعات للعميل: <span class="text-blue-600 dark:text-blue-400">${cName}</span>`;
    if(modalIdEl) modalIdEl.value = clientId;
    
    const payOffInput = document.getElementById('payOffAmount');
    if(payOffInput) payOffInput.value = '';

    window.toggleModalUI('clientDelayedPaymentsModal', true);
    if (typeof window.viewClientDelayedPayments === 'function') window.viewClientDelayedPayments(clientId, cName);
};

window.closeDelayedPaymentsModal = () => window.toggleModalUI('clientDelayedPaymentsModal', false);

window.showClientPaymentHistory = async function(clientId, clientName) {
    const titleEl = document.getElementById('historyModalClientName');
    let cName = clientName && clientName !== 'undefined' ? clientName : 'غير معروف';
    if(titleEl) titleEl.innerHTML = `سجل مدفوعات العميل: <span class="text-emerald-600">${cName}</span>`;
    
    window.toggleModalUI('paymentHistoryModal', true);
    if(typeof window.fetchClientPaymentHistory === 'function') window.fetchClientPaymentHistory(clientId);
};

window.closeClientPaymentHistory = () => window.toggleModalUI('paymentHistoryModal', false);

// ================== API & Specific Actions ==================
window.rereceivePO = async function(id) {
    if(!confirm('هل أنت متأكد من إعادة استلام أمر الشراء في المخزن؟ (Re-receive PO)')) return;
    try {
        const res = await window.apiFetch(`/api/action/rereceive_po/${id}`, { method: 'POST' }); 
        if(res.ok) {
            alert('تم إعادة الاستلام بنجاح');
            if(window.loadTableData) { window.loadTableData('purchase_orders'); window.loadTableData('inventory'); }
        } else {
            const data = await res.json(); alert('Error: ' + (data.error || 'Failed to re-receive'));
        }
    } catch(err) { console.error(err); alert('حدث خطأ أثناء محاولة إعادة الاستلام'); }
};

window.repostToClientConsumptions = async function(saleId) {
    if(!confirm('هل أنت متأكد من إعادة إرسال هذه المعاملة إلى سجل استهلاكات وأرصدة العملاء؟')) return;
    try {
        const res = await window.apiFetch(`/api/action/repost_to_client/${saleId}`, { method: 'POST' });
        if(res.ok) {
            alert('تم إعادة الترحيل بنجاح! 🔄');
            if(window.loadTableData) { window.loadTableData('inventory_sales'); window.loadTableData('client_consumptions'); }
        } else {
            const data = await res.json(); alert('خطأ: ' + (data.error || 'حدث خطأ أثناء الترحيل'));
        }
    } catch (err) { console.error(err); alert('حدث خطأ أثناء الاتصال بالخادم.'); }
};

window.refreshAfterPayment = function() {
    if(typeof window.loadTableData === 'function') { window.loadTableData('client_consumptions'); window.loadTableData('payment_receipts'); }
    if(typeof window.closeDelayedPaymentsModal === 'function') window.closeDelayedPaymentsModal();
};

window.openScheduleDebtModal = function(clientId, inventoryId, totalAmount) {
    document.getElementById('scheduleClientId').value = clientId;
    document.getElementById('scheduleInventoryId').value = inventoryId || '';
    document.getElementById('scheduleTotalAmount').value = totalAmount;
    document.getElementById('scheduleRowsContainer').innerHTML = ''; 
    window.toggleModalUI('scheduleDebtModal', true);
};

window.addScheduleRow = function() {
    const container = document.getElementById('scheduleRowsContainer');
    if(container) {
        container.insertAdjacentHTML('beforeend', `<div class="flex gap-2 items-center animate-fade-in"><input type="number" name="sch_amount[]" step="0.01" min="0.01" placeholder="المبلغ" class="p-2 border border-indigo-200 dark:border-indigo-700 rounded-xl flex-1 text-center font-bold text-indigo-700 dark:text-indigo-300 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500" required><input type="date" name="sch_date[]" class="p-2 border border-slate-200 dark:border-slate-600 rounded-xl flex-1 text-center font-bold dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500" required><button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-3 hover:text-white text-xl hover:bg-red-500 rounded-xl transition shadow-sm">✕</button></div>`);
    }
};

window.applyRBAC = function(user) {
    if (!user) return;
    
    const role = user.role; 
    
    const allNavBtns = document.querySelectorAll('.nav-btn');
    allNavBtns.forEach(btn => btn.style.display = 'none');

    let allowedTabs = [];
    
    switch(role) {
        case 'Admin':
        case 'CEO': 
            allowedTabs = ['ceoTab', 'projectsTab', 'operationsTab', 'realestateTab', 'customersTab', 'partnersTab', 'procurementTab', 'inventoryTab', 'usageTab', 'hrTab', 'financeTab', 'auditTab'];
            break;
            
        case 'Accountant': 
            allowedTabs = ['financeTab', 'partnersTab', 'customersTab', 'hrTab'];
            break;
            
        case 'Engineer': 
            allowedTabs = ['operationsTab', 'procurementTab', 'inventoryTab'];
            break;
            
        case 'Sales': 
            allowedTabs = ['realestateTab', 'customersTab'];
            break;
            
        case 'Storekeeper': 
            allowedTabs = ['inventoryTab', 'procurementTab', 'usageTab'];
            break;
            
        default: 
            allowedTabs = user.permissions?.screens || [];
    }

    allowedTabs.forEach(tabId => {
        const btn = document.getElementById(`btn-${tabId}`);
        if(btn) btn.style.display = 'block';
    });

    if (role !== 'Admin' && role !== 'CEO' && role !== 'Accountant') {
        document.querySelectorAll('.rbac-admin, .rbac-delete').forEach(el => el.remove());
    }
};

window.searchAllInstallments = async function() {
    const searchVal = document.getElementById('instGlobalSearch').value;
    if(!window.pageState['installments']) return;
    window.pageState['installments'].search = searchVal;
    window.pageState['installments'].page = 1;
    await window.fetchTablePaginated('installments');
};

window.filterDelayedTable = function() {
    const filter = document.getElementById('delayedFilterInput').value.toLowerCase();
    document.querySelectorAll('#delayedPaymentsBody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
};

window.printDelayedTable = function(isFilteredOnly) {
    const clientNameText = document.getElementById('delayedPaymentsTitle') ? document.getElementById('delayedPaymentsTitle').innerText : 'تقرير مديونية العميل';
    const tableHeader = document.querySelector('#delayedPaymentsTable thead').outerHTML;
    let rowsHtml = '';
    document.querySelectorAll('#delayedPaymentsBody tr').forEach(row => {
        if (!isFilteredOnly || row.style.display !== 'none') {
            let rowClone = row.cloneNode(true);
            if(rowClone.lastElementChild) rowClone.removeChild(rowClone.lastElementChild);
            rowsHtml += rowClone.outerHTML;
        }
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>تقرير مديونية</title><style>body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ccc; padding: 10px; text-align: center; } th { background: #eee; } .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }</style></head><body><div class="header"><h2>${clientNameText}</h2><p style="color: #64748b;">تاريخ التقرير: ${new Date().toLocaleDateString()}</p></div><table>${tableHeader}<tbody>${rowsHtml}</tbody></table></body></html>`);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
};

// =====================================================================
// --- ERP Upgrade Modals (Refund, Statement & RTV) ---
// =====================================================================
window.openRefundModal = function(clientId, clientName, maxAmount) {
    const modal = document.getElementById('refundModal');
    if(modal) {
        modal.classList.remove('hidden');
        document.getElementById('refund_client_id').value = clientId || '';
        document.getElementById('refund_client_name').value = clientName || '';
        const form = document.getElementById('refundForm');
        if(form) form.reset();
        
        const amtInput = document.querySelector('#refundForm input[name="amount"]');
        if(amtInput) {
            amtInput.max = maxAmount || '';
            amtInput.value = maxAmount || ''; 
        }
    }
};

window.openRtvModal = function(inventoryId, itemName, poId) {
    const modal = document.getElementById('rtvModal');
    if(modal) {
        modal.classList.remove('hidden');
        document.getElementById('rtv_inventory_id').value = inventoryId || '';
        document.getElementById('rtv_item_name').value = itemName || '';
        document.getElementById('rtv_po_id').value = poId && poId !== 'null' ? poId : '';
        const form = document.getElementById('rtvForm');
        if(form) form.reset();
    }
};

window.viewClientStatement = async function(clientId, clientName) {
    const tbody = document.getElementById('clientStatementBody');
    try {
        const modal = document.getElementById('clientStatementModal');
        const titleEl = document.getElementById('clientStatementTitle');

        if(titleEl) titleEl.innerText = "كشف حساب عميل: " + (clientName || '');
        if(modal) modal.classList.remove('hidden');
        
        if (!clientId || clientId === 'null') {
            if(tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center p-6 text-slate-500 font-bold bg-slate-50">بيانات العميل غير مكتملة أو لم يتم تحديده.</td></tr>';
            return;
        }

        if(tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center p-6 text-slate-500 font-bold bg-slate-50">⏳ جاري تحميل كشف الحساب...</td></tr>';
        
        const res = await window.apiFetch(`/api/delayed-payments/${clientId}`);
        if (!res.ok) throw new Error("فشل في جلب البيانات");
        const delayedData = await res.json();
        
        let refundsData = [];
        try {
            const refRes = await window.apiFetch(`/api/table/client_refunds?filter=${clientId}`);
            if (refRes.ok) refundsData = (await refRes.json()).data || [];
        } catch(e) { console.warn("Refund fetch error:", e); }

        let combinedList = [];

        if (Array.isArray(delayedData)) {
            delayedData.forEach(d => {
                combinedList.push({
                    type: 'payment', date: d.due_date || d.created_at, pay_date: d.last_payment_date,
                    item: d.inventory_name || 'تسوية رصيد / مبيعات', qty: parseFloat(d.consumed_qty || 0),
                    origAmt: parseFloat(d.original_amount || d.amount || 0), paidAmt: parseFloat(d.paid_amount || 0), status: d.status
                });
            });
        }

        refundsData.forEach(r => {
            combinedList.push({
                type: 'refund', date: r.date || r.created_at, pay_date: r.date || r.created_at,
                item: `صرف رصيد نقدي (${r.method || 'نقدي'})`, qty: 0, origAmt: 0,
                paidAmt: parseFloat(r.amount || 0), status: 'Refunded'
            });
        });

        combinedList.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (combinedList.length > 0) {
            let totalOriginal = 0; let totalPaidAll = 0; let totalRemaining = 0; let totalQty = 0;

            const rows = combinedList.map(d => {
                let remAmt = 0; let paidTo = ''; let statusBadge = '';
                
                if (d.type === 'payment') {
                    remAmt = Math.max(0, d.origAmt - d.paidAmt);
                    totalOriginal += d.origAmt; totalPaidAll += d.paidAmt; totalRemaining += remAmt; totalQty += d.qty;
                    paidTo = '<span class="text-blue-600 font-bold">الشركة (سداد مديونية)</span>';
                    
                    if (d.status === 'Paid' || remAmt <= 0) statusBadge = '<span class="px-2 py-1 rounded font-bold text-xs text-emerald-600 bg-emerald-100">تم الدفع</span>';
                    else if (d.status === 'Partial' || d.paidAmt > 0) statusBadge = '<span class="px-2 py-1 rounded font-bold text-xs text-orange-600 bg-orange-100">سداد جزئي</span>';
                    else statusBadge = '<span class="px-2 py-1 rounded font-bold text-xs text-red-600 bg-red-100">رصيد مدين</span>';
                } else {
                    totalPaidAll -= d.paidAmt; 
                    paidTo = '<span class="text-emerald-600 font-bold">العميل (استرداد نقدية)</span>';
                    statusBadge = '<span class="px-2 py-1 rounded font-bold text-xs text-indigo-600 bg-indigo-100">تم الصرف</span>';
                }

                const transDateStr = d.date ? new Date(d.date).toLocaleDateString('ar-EG') : '-';
                const payDateStr = d.pay_date ? new Date(d.pay_date).toLocaleDateString('ar-EG') : '-';

                return `<tr class="border-b hover:bg-slate-50 text-sm transition">
                    <td class="p-3 text-center font-bold text-slate-700">${d.item}</td>
                    <td class="p-3 text-center text-slate-600">${transDateStr}</td>
                    <td class="p-3 text-center text-slate-600">${payDateStr}</td>
                    <td class="p-3 text-center font-mono font-bold text-slate-600">${d.qty > 0 ? d.qty : '-'}</td>
                    <td class="p-3 text-center font-bold text-blue-600 font-mono">${d.origAmt > 0 ? window.formatMoney(d.origAmt) : '-'}</td>
                    <td class="p-3 text-center font-bold text-emerald-500 font-mono">${d.paidAmt > 0 ? window.formatMoney(d.paidAmt) : window.formatMoney(d.paidAmt)}</td>
                    <td class="p-3 text-center font-black text-red-500 font-mono">${remAmt > 0 ? window.formatMoney(remAmt) : '-'}</td>
                    <td class="p-3 text-center">${paidTo}</td>
                    <td class="p-3 text-center">${statusBadge}</td>
                </tr>`;
            }).join('');

            const totalsRow = `<tr class="border-t-4 border-slate-800 bg-slate-100 font-black text-sm">
                <td class="p-4 text-center text-slate-800" colspan="3">إجمالي الحساب</td>
                <td class="p-4 text-center text-slate-700 font-mono">${totalQty.toFixed(2)}</td>
                <td class="p-4 text-center text-blue-700 font-mono">${window.formatMoney(totalOriginal)}</td>
                <td class="p-4 text-center text-emerald-700 font-mono">${window.formatMoney(totalPaidAll)}</td>
                <td class="p-4 text-center text-red-700 font-mono text-lg">${window.formatMoney(totalRemaining)}</td>
                <td colspan="2"></td>
            </tr>`;
            if(tbody) tbody.innerHTML = rows + totalsRow;
        } else {
            if(tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center p-6 text-slate-500 font-bold bg-slate-50">لا توجد حركات مسجلة لهذا العميل حالياً.</td></tr>';
        }
    } catch(e) {
        console.error("Statement Error:", e);
        if(tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center p-6 text-red-500 font-bold bg-red-50">❌ حدث خطأ: ${e.message}</td></tr>`;
    }
};

window.filterStatementTable = function() {
    const filter = document.getElementById('statementFilterInput').value.toLowerCase();
    document.querySelectorAll('#clientStatementBody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
};

window.printStatementTable = function() {
    const titleEl = document.getElementById('clientStatementTitle');
    const clientNameText = titleEl ? titleEl.innerText : 'كشف حساب عميل';
    
    const theadEl = document.querySelector('#clientStatementTable thead');
    const tableHeader = theadEl ? theadEl.outerHTML : '<thead style="background:#1e293b;color:white;font-weight:bold;"><tr><th>البيانات</th></tr></thead>';
    
    let rowsHtml = '';
    const tbodyRows = document.querySelectorAll('#clientStatementBody tr');
    
    if (tbodyRows.length > 0) {
        tbodyRows.forEach(row => {
            if (row.style.display !== 'none') {
                rowsHtml += row.outerHTML;
            }
        });
    } else {
        rowsHtml = '<tr><td colspan="9" style="text-align:center; padding:20px;">لا توجد بيانات للطباعة</td></tr>';
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>كشف حساب</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 20px; color: #334155; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
                th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: center; }
                th { background-color: #1e293b !important; color: white !important; font-weight: bold; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }
                .header h2 { margin: 0 0 10px 0; color: #1e293b; }
                .header p { margin: 0; color: #64748b; font-weight: bold; }
                @media print {
                    th { background-color: #1e293b !important; color: white !important; -webkit-print-color-adjust: exact; }
                    tr:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>${clientNameText}</h2>
                <p>تاريخ استخراج التقرير: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <table>
                ${tableHeader}
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </body>
        </html>
    `);
    
    printWindow.document.close(); 
    printWindow.focus();
    
    setTimeout(() => { 
        printWindow.print(); 
        printWindow.close(); 
    }, 500);
};

// =====================================================================
// --- Partner Financials Alignment Fix ---
// =====================================================================
window.renderPartnerProfitMatrix = async function(projName) {
    try {
        const res = await window.apiFetch(`/api/reports/dashboard_stats?project=${projName||''}`);
        if(!res.ok) return;
        const data = await res.json();
        const partners = data.partners_breakdown || [];
        const tbody = document.getElementById('partnerProfitMatrixBody');
        
        if(tbody) {
            tbody.innerHTML = partners.map(p => `
                <tr class="border-b dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center">
                    <td class="p-3 font-bold text-slate-700 dark:text-slate-300">${p.partner_name}</td>
                    <td class="p-3 font-mono text-blue-600">${window.safeNum(p.share_percent).toFixed(2)}%</td>
                    <td class="p-3 font-mono">${window.formatMoney(p.investment_amount)}</td>
                    <td class="p-3 font-mono text-orange-500">${window.formatMoney(p.expected_return)}</td>
                    <td class="p-3 font-mono text-emerald-600">${window.formatMoney(p.actual_profit)}</td>
                    <td class="p-3 font-mono text-indigo-600 font-black bg-indigo-50 dark:bg-indigo-900/20">${window.formatMoney(p.net_balance)}</td>
                    <td class="p-3 font-bold"><span class="px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-800">${p.status || 'Active'}</span></td>
                </tr>
            `).join('') || `<tr><td colspan="7" class="p-4 text-center text-slate-500">لا يوجد شركاء مسجلين (No Partners Found)</td></tr>`;
        }
    } catch(e) { console.error("Error fixing Partner Matrix:", e); }
};

// =====================================================================
// --- NEW: Partner Financial Modals Openers ---
// =====================================================================
window.openPartnerDepositModal = function(id, name) {
    const modal = document.getElementById('partnerDepositModal');
    if(!modal) return;
    document.getElementById('depositPartnerIdInput').value = id;
    document.getElementById('partnerDepositTitle').innerText = `إيداع شريك: ${name}`;
    document.getElementById('partnerDepositForm').reset();
    modal.classList.remove('hidden');
    if(typeof window.fetchPartnerDeposits === 'function') window.fetchPartnerDeposits(id);
};

window.openPartnerWithdrawalModal = function(id, name) {
    const modal = document.getElementById('partnerWithdrawalModal');
    if(!modal) return;
    document.getElementById('withdrawalPartnerIdInput').value = id;
    document.getElementById('partnerWithdrawalTitle').innerText = `سحب شريك: ${name}`;
    document.getElementById('partnerWithdrawalForm').reset();
    modal.classList.remove('hidden');
    if(typeof window.fetchPartnerWithdrawals === 'function') window.fetchPartnerWithdrawals(id);
};

// =====================================================================
// --- PO DDP LCY Charges Table Fix & Upgrades ---
// =====================================================================
window.renderPoDdpLcyChargesTable = function(data, fxRate) {
    const tbody = document.getElementById('poDdpLcyBody'); 
    if(!tbody) return;
    
    let totalLcy = 0;
    let totalFcy = 0;
    
    const html = data.map(row => {
        const amtLcy = window.safeNum(row.amount);
        const amtFcy = window.safeNum(row.fcy_amount);
        const rate = window.safeNum(row.fx_rate, 1);
        
        totalLcy += amtLcy;
        totalFcy += amtFcy;
        
        return `
            <tr class="border-b dark:border-slate-700 text-sm text-center transition hover:bg-slate-50 dark:hover:bg-slate-800">
                <td class="p-2 text-xs text-slate-500 font-bold">${window.safeDateStr(row.date)}</td>
                <td class="p-2 font-bold">${row.charge_type || row.description || '-'}</td>
                <td class="p-2 text-xs"><span class="px-2 py-1 bg-slate-100 rounded">${row.payment_method || '-'}</span></td>
                <td class="p-2 text-xs font-mono">${row.reference_no || '-'}</td>
                <td class="p-2 font-mono text-blue-600 bg-blue-50">${window.formatMoney(amtFcy)}</td>
                <td class="p-2 font-mono text-indigo-600">${rate}</td>
                <td class="p-2 font-mono font-black text-emerald-600 bg-emerald-50">${window.formatMoney(amtLcy)}</td>
                <td class="p-2 text-xs text-slate-500">${row.provider_name || row.created_by || '-'}</td>
                <td class="p-2 text-center flex justify-center gap-1">
                    <button type="button" onclick='window.editDdpCharge(${JSON.stringify(row).replace(/'/g, "&#39;")})' class="text-blue-500 bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold shadow-sm border border-blue-200 hover:bg-blue-100 transition" title="تعديل">✏️</button>
                    ${window.buildActionButtons('po_ddp_lcy_charges', row.id)}
                </td>
            </tr>
        `;
    }).join('');
    
    // ضمان التطابق الدقيق مع 9 أعمدة في الرأس
    const summaryHtml = `
        <tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black text-center">
            <td colspan="4" class="p-3">الإجمالي (Totals)</td>
            <td class="p-3 text-blue-600 font-mono">${window.formatMoney(totalFcy)}</td>
            <td class="p-3"></td>
            <td class="p-3 text-emerald-600 font-mono">${window.formatMoney(totalLcy)}</td>
            <td colspan="2" class="p-3"></td>
        </tr>
    `;
    
    tbody.innerHTML = html + summaryHtml;
};

window.editDdpCharge = function(row) {
    document.getElementById('lcyAddChargeId').value = row.id;
    document.querySelector('#poDdpLcyForm input[name="date"]').value = row.date ? row.date.split('T')[0] : '';
    document.getElementById('lcyAddFcy').value = row.fcy_amount || '';
    document.getElementById('lcyAddFx').value = row.fx_rate || 1;
    document.getElementById('lcyAddLcy').value = row.amount || '';
    document.getElementById('lcyAddDesc').value = row.charge_type || row.description || '';
    document.getElementById('lcyAddMethod').value = row.payment_method || 'Cash';
    document.getElementById('lcyAddRef').value = row.reference_no || '';
    
    // إبراز الفورم للمستخدم
    const form = document.getElementById('poDdpLcyForm');
    form.classList.add('ring-2', 'ring-emerald-500');
    setTimeout(() => form.classList.remove('ring-2', 'ring-emerald-500'), 1500);
};

window.printDdpTable = function() {
    const thead = document.querySelector('#ddpChargesTable thead').outerHTML;
    const tbody = document.querySelector('#ddpChargesBody').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>مصروفات الشحن والتخليص</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; } 
                table { width: 100%; border-collapse: collapse; margin-top:20px; font-size:12px; } 
                th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; } 
                th { background-color: #1e293b !important; color: white !important; font-weight: bold; }
                tr:nth-child(even) { background-color: #f8fafc; }
                h2 { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom:10px; color:#1e293b; }
            </style>
        </head>
        <body>
            <h2>سجل مصروفات الشحن والتخليص (DDP)</h2>
            <p>تاريخ استخراج التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
            <table>${thead}<tbody>${tbody}</tbody></table>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};
// =====================================================================
// --- NEW: Fix Missing Form Functions & Add Specific Debt Payment ---
// =====================================================================
window.viewPartnerWithdrawals = function(id) {
    if(typeof window.fetchTablePaginated === 'function') window.fetchTablePaginated('partners');
};
window.viewPartnerDeposits = function(id) {
    if(typeof window.fetchTablePaginated === 'function') window.fetchTablePaginated('partners');
};

window.paySpecificDebt = async function(debtId, amount) {
    const method = prompt("طريقة الدفع (Cash, Bank Transfer, Cheque):", "Cash") || "Cash";
    const ref = prompt("الرقم المرجعي (اختياري):", "") || "";
    const notes = prompt("ملاحظات (اختياري):", "") || "";
    const clientId = document.getElementById('delayedClientId').value;

    if(!confirm(`تأكيد سداد مبلغ ${window.formatMoney(amount)} لهذه المعاملة المحددة؟`)) return;

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
            if(typeof window.showToast === 'function') window.showToast("تم السداد بنجاح", "success");
            if (typeof window.viewClientDelayedPayments === 'function') window.viewClientDelayedPayments(clientId);
        } else {
            const err = await res.json();
            if(typeof window.showToast === 'function') window.showToast(err.error || "حدث خطأ أثناء السداد", "error");
        }
    } catch(e) {
        if(typeof window.showToast === 'function') window.showToast("خطأ في الاتصال بالخادم", "error");
    }
};
// =====================================================================
// --- NEW: Partner Deposits & Withdrawals Fetchers ---
// =====================================================================
window.fetchPartnerDeposits = async function(partnerId) {
    const tbody = document.getElementById('partnerDepositBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500 font-bold">جاري تحميل الإيداعات...⏳</td></tr>';
    try {
        const res = await window.apiFetch(`/api/table/partner_deposits?filter=${partnerId}`);
        if(res.ok) {
            const json = await res.json();
            const data = json.data || [];
            if(data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500 font-bold italic">لا توجد إيداعات مسجلة لهذا الشريك.</td></tr>';
            } else {
                let totalLcy = 0;
                let totalFcy = 0;
                const rowsHtml = data.map(d => {
                    totalLcy += parseFloat(d.amount || 0);
                    totalFcy += parseFloat(d.amount_fcy || 0);
                    return `
                    <tr class="border-b dark:border-slate-700 text-sm text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <td class="p-3 text-slate-500 font-bold">${window.safeDateStr(d.date || d.created_at)}</td>
                        <td class="p-3 font-mono text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/30">${window.formatMoney(d.amount)}</td>
                        <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${window.formatMoney(d.amount_fcy || 0)}</td>
                        <td class="p-3 font-mono text-slate-500">${d.fx_rate || 1}</td>
                        <td class="p-3 text-slate-700 dark:text-slate-300 font-bold">${d.description || '-'}</td>
                        <td class="p-3 text-xs text-slate-400 font-bold">${d.created_by || '-'}</td>
                    </tr>
                `}).join('');
                
                const summaryHtml = `
                    <tr class="border-t-4 border-slate-800 bg-slate-100 dark:bg-slate-800 text-sm font-black text-center">
                        <td class="p-3 text-slate-800 dark:text-slate-200">الإجمالي</td>
                        <td class="p-3 text-blue-600 font-mono">${window.formatMoney(totalLcy)}</td>
                        <td class="p-3 text-slate-600 font-mono">${window.formatMoney(totalFcy)}</td>
                        <td colspan="3"></td>
                    </tr>
                `;
                tbody.innerHTML = rowsHtml + summaryHtml;
            }
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500 font-bold">حدث خطأ في تحميل البيانات ❌</td></tr>';
    }
};

window.fetchPartnerWithdrawals = async function(partnerId) {
    const tbody = document.getElementById('partnerWithdrawalBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500 font-bold">جاري تحميل المسحوبات...⏳</td></tr>';
    try {
        const res = await window.apiFetch(`/api/table/partner_withdrawals?filter=${partnerId}`);
        if(res.ok) {
            const json = await res.json();
            const data = json.data || [];
            if(data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500 font-bold italic">لا توجد مسحوبات مسجلة لهذا الشريك.</td></tr>';
            } else {
                let totalLcy = 0;
                let totalFcy = 0;
                const rowsHtml = data.map(d => {
                    totalLcy += parseFloat(d.amount || 0);
                    totalFcy += parseFloat(d.amount_fcy || 0);
                    return `
                    <tr class="border-b dark:border-slate-700 text-sm text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <td class="p-3 text-slate-500 font-bold">${window.safeDateStr(d.date || d.created_at)}</td>
                        <td class="p-3 font-mono text-red-600 font-bold bg-red-50 dark:bg-red-900/30">${window.formatMoney(d.amount)}</td>
                        <td class="p-3 font-mono text-slate-600 dark:text-slate-400">${window.formatMoney(d.amount_fcy || 0)}</td>
                        <td class="p-3 font-mono text-slate-500">${d.fx_rate || 1}</td>
                        <td class="p-3 text-slate-700 dark:text-slate-300 font-bold">${d.description || '-'}</td>
                        <td class="p-3 text-xs text-slate-400 font-bold">${d.created_by || '-'}</td>
                    </tr>
                `}).join('');
                
                const summaryHtml = `
                    <tr class="border-t-4 border-slate-800 bg-slate-100 dark:bg-slate-800 text-sm font-black text-center">
                        <td class="p-3 text-slate-800 dark:text-slate-200">الإجمالي</td>
                        <td class="p-3 text-red-600 font-mono">${window.formatMoney(totalLcy)}</td>
                        <td class="p-3 text-slate-600 font-mono">${window.formatMoney(totalFcy)}</td>
                        <td colspan="3"></td>
                    </tr>
                `;
                tbody.innerHTML = rowsHtml + summaryHtml;
            }
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500 font-bold">حدث خطأ في تحميل البيانات ❌</td></tr>';
    }
};