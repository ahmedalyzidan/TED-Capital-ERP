import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function FinancialTransactions({ embedded = false, projectId = '' }) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [activeTab, setActiveTab] = useState('collections'); // 'collections' | 'payments'
  
  // Loading & Data States
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [subInvoices, setSubInvoices] = useState([]);
  const [coaAccounts, setCoaAccounts] = useState([]);
  
  // History Logs
  const [collectionsLog, setCollectionsLog] = useState([]);
  const [paymentsLog, setPaymentsLog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Collections Form State
  const [colForm, setColForm] = useState({
    client_id: '',
    project_id: '',
    valuation_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'نقداً',
    reference_no: '',
    source_account: 'صندوق نقدية - تيد كابيتال',
    notes: ''
  });

  // Payments Form State
  const [payForm, setPayForm] = useState({
    subcontractor_id: '',
    project_name: '',
    invoice_id: '',
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    reference_no: '',
    source_account: 'نقدية بالبنوك والصندوق',
    notes: ''
  });

  // Alerts
  const [alert, setAlert] = useState({ type: '', msg: '' });

  // Fetch Master Data
  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const [resClients, resSubs, resProjs, resClientInvs, resSubInvs, resCoa] = await Promise.all([
        api.get('/dynamic/table/customers?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractors?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/projects?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/ar_invoices?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractor_invoices?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/chart_of_accounts?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);

      // Load local projects from localStorage
      let localProjects = [];
      const savedProjsStr = localStorage.getItem('contractor_projects');
      if (savedProjsStr) {
        try {
          localProjects = JSON.parse(savedProjsStr);
        } catch (e) {
          console.error('Error loading local projects:', e);
        }
      }

      // Map DB projects to standard format
      const dbProjects = resProjs.data?.data || [];
      const mappedDbProjects = dbProjects.map(p => ({
        id: String(p.id),
        name: p.name,
        clientName: p.client_name || p.client || 'عميل عام',
        company: p.company || 'TED CAPITAL',
        company_id: p.company_id || null,
        projectManager: p.project_manager || p.manager || '',
        startDate: p.start_date ? p.start_date.split('T')[0] : ''
      }));

      // Combine database projects and local projects
      const allCombinedProjects = [...localProjects];
      mappedDbProjects.forEach(mp => {
        if (!allCombinedProjects.some(p => String(p.id) === String(mp.id))) {
          allCombinedProjects.push(mp);
        }
      });
      setProjects(allCombinedProjects);

      // Handle clients (database customers + unique clients from projects)
      const dbClients = resClients.data?.data || [];
      const combinedClients = [...dbClients];
      allCombinedProjects.forEach(proj => {
        const pClientName = proj.clientName || proj.client_name || proj.client || '';
        if (pClientName && pClientName !== 'عميل عام') {
          const exists = combinedClients.some(c => c.name && c.name.toLowerCase().trim() === pClientName.toLowerCase().trim());
          if (!exists) {
            combinedClients.push({
              id: `pseudo-client-${pClientName.replace(/\s+/g, '-')}`,
              name: pClientName,
              isPseudo: true
            });
          }
        }
      });
      setClients(combinedClients);

      setSubcontractors(resSubs.data?.data || []);

      // Load local client valuations
      let localClientValuations = [];
      const savedValsStr = localStorage.getItem('contractor_valuations');
      if (savedValsStr) {
        try {
          const parsedVals = JSON.parse(savedValsStr);
          localClientValuations = parsedVals.filter(v => !v.isContractor);
        } catch (e) {
          console.error('Error loading local client valuations:', e);
        }
      }

      // Map local valuations to invoice format
      const mappedLocalInvoices = localClientValuations.map(v => {
        const projObj = allCombinedProjects.find(p => String(p.id) === String(v.projectId));
        const projName = projObj ? projObj.name : 'عام';
        const clientName = projObj ? (projObj.clientName || projObj.client_name || projObj.client || 'عميل عام') : 'عميل عام';
        return {
          id: v.id,
          project_id: v.projectId,
          project_name: projName,
          client_name: clientName,
          total_amount: v.totalFinal || v.totalCurrent || 0,
          status: v.status || 'issued'
        };
      });

      // Combine database client invoices with local client valuations
      const dbInvoices = resClientInvs.data?.data || [];
      const allCombinedInvoices = [...dbInvoices];
      mappedLocalInvoices.forEach(li => {
        if (!allCombinedInvoices.some(inv => String(inv.id) === String(li.id))) {
          allCombinedInvoices.push(li);
        }
      });
      setClientInvoices(allCombinedInvoices);

      // Load local subcontractor valuations
      let localSubValuations = [];
      if (savedValsStr) {
        try {
          const parsedVals = JSON.parse(savedValsStr);
          localSubValuations = parsedVals.filter(v => v.isContractor);
        } catch (e) {
          console.error('Error loading local subcontractor valuations:', e);
        }
      }

      const mappedLocalSubInvoices = localSubValuations.map(v => {
        const projObj = allCombinedProjects.find(p => String(p.id) === String(v.projectId));
        const projName = projObj ? projObj.name : 'عام';
        const matchedSub = (resSubs.data?.data || []).find(s => 
          (s.name || '').trim().toLowerCase() === (v.lines?.[0]?.contractorName || '').trim().toLowerCase()
        );
        return {
          id: v.id,
          subcontractor_id: matchedSub ? matchedSub.id : null,
          subcontractor_name: v.lines?.[0]?.contractorName || 'مقاول عام',
          project_id: v.projectId,
          project_name: projName,
          amount: v.totalFinal || v.totalCurrent || 0,
          net_amount: v.totalFinal || v.totalCurrent || 0,
          status: v.status || 'issued',
          description: v.lines?.[0]?.description || `مستخلص مقاول رقم ${v.claimNo}`
        };
      });

      const dbSubInvoices = resSubInvs.data?.data || [];
      const mappedDbSubInvoices = dbSubInvoices.map(inv => {
        const projObj = allCombinedProjects.find(p => String(p.id) === String(inv.project_id));
        return {
          ...inv,
          project_name: inv.project_name || (projObj ? projObj.name : '')
        };
      });
      
      const allCombinedSubInvoices = [...mappedDbSubInvoices];
      mappedLocalSubInvoices.forEach(li => {
        const normLiId = String(li.id).replace('db-sub-inv-', '');
        const exists = allCombinedSubInvoices.some(inv => {
          const normInvId = String(inv.id).replace('db-sub-inv-', '');
          return normInvId === normLiId;
        });
        if (!exists) {
          allCombinedSubInvoices.push(li);
        }
      });
      setSubInvoices(allCombinedSubInvoices);

      const allCoa = resCoa.data?.data || [];
      const filteredCoa = allCoa.filter(acc => {
        const code = acc.account_code || '';
        return (code.startsWith('110') || code.startsWith('111')) && code !== '1100' && code !== '1110';
      });
      setCoaAccounts(filteredCoa);
    } catch (err) {
      triggerAlert('danger', ar ? 'خطأ في جلب البيانات الأساسية' : 'Error fetching metadata');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const [resCols, resPays] = await Promise.all([
        api.get('/dynamic/table/client_payment_history?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractor_statements?limit=2000').catch(() => ({ data: { data: [] } }))
      ]);
      setCollectionsLog(resCols.data?.data || []);
      setPaymentsLog(resPays.data?.data || []);
    } catch (err) {
      triggerAlert('danger', ar ? 'خطأ في جلب سجل المعاملات' : 'Error fetching transaction logs');
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchLogs();
  }, []);

  // Theme helper
  const getThemeClass = (lightClass, darkClass) => {
    return embedded ? darkClass : lightClass;
  };

  // Auto-scoping and selection when embedded in a project
  useEffect(() => {
    if (embedded && projectId && projects.length > 0) {
      const foundProj = projects.find(p => String(p.id) === String(projectId));
      if (foundProj) {
        // Find matching client
        const clientNameStr = foundProj.clientName || foundProj.client_name || '';
        if (clientNameStr) {
          const foundClient = clients.find(c => c.name && c.name.toLowerCase().trim() === clientNameStr.toLowerCase().trim());
          if (foundClient) {
            setColForm(prev => ({
              ...prev,
              project_id: String(foundProj.id),
              client_id: String(foundClient.id)
            }));
          } else {
            setColForm(prev => ({
              ...prev,
              project_id: String(foundProj.id),
              client_id: ''
            }));
          }
        } else {
          setColForm(prev => ({
            ...prev,
            project_id: String(foundProj.id),
            client_id: ''
          }));
        }

        // Prefill project_name in payForm
        setPayForm(prev => ({
          ...prev,
          project_name: foundProj.name
        }));
      }
    }
  }, [embedded, projectId, projects, clients]);

  const triggerAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: '', msg: '' }), 5000);
  };

  // Handle Collection Submit
  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    if (!colForm.client_id) {
      triggerAlert('warning', ar ? 'يرجى اختيار العميل أولاً' : 'Please select a client');
      return;
    }
    if (!colForm.amount || parseFloat(colForm.amount) <= 0) {
      triggerAlert('warning', ar ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }
    
    try {
      setLoading(true);
      
      let resolvedClientId = colForm.client_id;
      const isPseudoClient = String(colForm.client_id).startsWith('pseudo-client-');
      
      if (isPseudoClient) {
        const pseudoClientObj = clients.find(c => String(c.id) === String(colForm.client_id));
        if (pseudoClientObj) {
          const clientName = pseudoClientObj.name;
          const checkRes = await api.get('/dynamic/table/customers?limit=2000').catch(() => ({ data: { data: [] } }));
          const existingCust = (checkRes.data?.data || []).find(c => c.name && c.name.toLowerCase().trim() === clientName.toLowerCase().trim());
          if (existingCust) {
            resolvedClientId = String(existingCust.id);
          } else {
            // Dynamically determine the company and company_id for this customer
            let targetCompany = '';
            let targetCompanyId = null;

            // 1. Try selected project in form
            const formProj = projects.find(p => String(p.id) === String(colForm.project_id));
            if (formProj) {
              targetCompany = formProj.company;
              targetCompanyId = formProj.company_id || formProj.companyId;
            }

            // 2. Try embedded project ID
            if (!targetCompany && embedded && projectId) {
              const embProj = projects.find(p => String(p.id) === String(projectId));
              if (embProj) {
                targetCompany = embProj.company;
                targetCompanyId = embProj.company_id || embProj.companyId;
              }
            }

            // 3. Try finding any project matching the client name
            if (!targetCompany) {
              const matchedProj = projects.find(p => {
                const pClientName = (p.clientName || p.client_name || p.client || '').toLowerCase().trim();
                return pClientName === clientName.toLowerCase().trim();
              });
              if (matchedProj) {
                targetCompany = matchedProj.company;
                targetCompanyId = matchedProj.company_id || matchedProj.companyId;
              }
            }

            // 4. Try localStorage active company
            if (!targetCompany) {
              targetCompany = localStorage.getItem('active_company');
            }

            // Normalize "All Companies" or null to TED CAPITAL
            if (!targetCompany || ['all', 'كل الشركات', 'all companies', 'all_companies'].includes(targetCompany.toLowerCase())) {
              targetCompany = 'TED CAPITAL';
            }

            // Resolve company_id from name mapping if not present
            if (!targetCompanyId) {
              const companyNameToIdMap = {
                'ted capital': 1,
                'ted_capital': 1,
                'design concept': 2,
                'design_concept': 2,
                'master builder': 3,
                'master_builder': 3,
                'primemed pharma': 4,
                'primemed_pharma': 4
              };
              targetCompanyId = companyNameToIdMap[targetCompany.toLowerCase().trim()] || null;
            }

            let autoCustType = 'Contractor';
            if (targetCompany && (targetCompany.toLowerCase().includes('prime') || targetCompany.toLowerCase().includes('pharma') || targetCompany.toLowerCase().includes('بريم') || targetCompany.toLowerCase().includes('فارما'))) {
              autoCustType = 'Pharma';
            } else if (targetCompany && (targetCompany.toLowerCase().includes('design') || targetCompany.toLowerCase().includes('ديزاين') || targetCompany.toLowerCase().includes('ted') || targetCompany.toLowerCase().includes('تيد') || targetCompany.toLowerCase().includes('عقار'))) {
              autoCustType = 'Real Estate';
            }

            // Dynamically create database customer record
            const createRes = await api.post('/dynamic/add/customers', {
              name: clientName,
              company: targetCompany,
              company_id: targetCompanyId,
              customer_type: autoCustType
            });
            const newCustId = createRes.data?.data?.id || createRes.data?.id;
            if (newCustId) {
              resolvedClientId = String(newCustId);
            }
          }
        }
      }

      const isLocalVal = String(colForm.valuation_id).startsWith('val-');
      const resolvedProjId = colForm.project_id && !isNaN(parseInt(colForm.project_id)) ? parseInt(colForm.project_id) : null;

      const payload = {
        client_id: resolvedClientId && !isNaN(parseInt(resolvedClientId)) ? parseInt(resolvedClientId) : null,
        project_id: resolvedProjId,
        valuation_id: colForm.valuation_id || null,
        amount: parseFloat(colForm.amount),
        payment_date: colForm.payment_date,
        payment_method: colForm.payment_method,
        reference_no: colForm.reference_no,
        source_account: colForm.source_account,
        notes: colForm.notes
      };

      const response = await api.post('/projects/record_collection', payload);
      const paymentId = response.data?.paymentId || response.data?.id;

      // Add record to contractor_installments in localStorage
      if (colForm.project_id) {
        const savedInstsStr = localStorage.getItem('contractor_installments');
        try {
          const insts = savedInstsStr ? JSON.parse(savedInstsStr) : [];
          const maxId = insts.reduce((max, item) => (typeof item.id === 'number' && item.id > max ? item.id : max), 0);
          const newInstId = maxId + 1;
          const newInst = {
            id: newInstId,
            projectId: String(colForm.project_id),
            amount: parseFloat(colForm.amount),
            date: colForm.payment_date || new Date().toISOString().split('T')[0],
            notes: colForm.notes || (colForm.valuation_id ? `سداد دفعة للمستخلص رقم ${colForm.valuation_id}` : `تحصيل دفعة لمشروع`),
            valuationId: colForm.valuation_id || '',
            paymentMethod: colForm.payment_method || 'نقداً',
            referenceNo: colForm.reference_no || '',
            paymentId: paymentId
          };
          const updatedInsts = [...insts, newInst];
          localStorage.setItem('contractor_installments', JSON.stringify(updatedInsts));
          window.dispatchEvent(new Event('storage'));
        } catch (storageErr) {
          console.error('Failed to add local installment:', storageErr);
        }
      }
      
      // Update local valuation status
      if (isLocalVal) {
        const savedValsStr = localStorage.getItem('contractor_valuations');
        if (savedValsStr) {
          try {
            const vals = JSON.parse(savedValsStr);
            const valObj = vals.find(v => v.id === colForm.valuation_id);
            if (valObj) {
              const totalValAmount = parseFloat(valObj.totalFinal || valObj.totalCurrent || 0);
              const existingPaid = collectionsLog
                .filter(c => {
                  const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {});
                  return String(meta.valuation_id) === String(colForm.valuation_id);
                })
                .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
              
              const newTotalPaid = existingPaid + parseFloat(colForm.amount);
              const newStatus = newTotalPaid >= totalValAmount ? 'Paid' : 'Partially Paid';
              const updated = vals.map(v => v.id === colForm.valuation_id ? { ...v, status: newStatus } : v);
              localStorage.setItem('contractor_valuations', JSON.stringify(updated));
              window.dispatchEvent(new Event('storage'));
            }
          } catch (storageErr) {
            console.error('Failed to update local valuation status:', storageErr);
          }
        }
      }

      triggerAlert('success', ar ? 'تم تسجيل التحصيل وقيد الدفعة بنجاح' : 'Collection registered successfully');
      setColForm({
        client_id: '',
        project_id: '',
        valuation_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'نقداً',
        reference_no: '',
        source_account: 'صندوق نقدية - تيد كابيتال',
        notes: ''
      });
      fetchMasterData();
      fetchLogs();
    } catch (err) {
      triggerAlert('danger', err.response?.data?.error || (ar ? 'فشل تسجيل التحصيل' : 'Failed to record collection'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Payment Submit
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payForm.subcontractor_id) {
      triggerAlert('warning', ar ? 'يرجى اختيار المقاول أولاً' : 'Please select a subcontractor');
      return;
    }
    if (!payForm.amount_paid || parseFloat(payForm.amount_paid) <= 0) {
      triggerAlert('warning', ar ? 'يرجى إدخال مبلغ سداد صحيح' : 'Please enter a valid payment amount');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        subcontractor_id: parseInt(payForm.subcontractor_id),
        project_name: payForm.project_name || null,
        invoice_id: payForm.invoice_id ? parseInt(payForm.invoice_id) : null,
        amount_paid: parseFloat(payForm.amount_paid),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        reference_no: payForm.reference_no,
        source_account: payForm.source_account,
        notes: payForm.notes
      };

      await api.post('/subcontractors/record_payment', payload);
      triggerAlert('success', ar ? 'تم تسجيل سداد المقاول وقيد المحاسبة بنجاح' : 'Subcontractor payment recorded successfully');
      setPayForm({
        subcontractor_id: '',
        project_name: '',
        invoice_id: '',
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        reference_no: '',
        source_account: 'نقدية بالبنوك والصندوق',
        notes: ''
      });
      fetchMasterData();
      fetchLogs();
    } catch (err) {
      triggerAlert('danger', err.response?.data?.error || (ar ? 'فشل تسجيل السداد' : 'Failed to record payment'));
    } finally {
      setLoading(false);
    }
  };

  // Delete Log Record (Reversal)
  const handleDeleteRecord = async (type, id) => {
    if (!window.confirm(ar ? 'هل أنت متأكد من إلغاء/عكس هذه المعاملة؟' : 'Are you sure you want to reverse this transaction?')) return;
    try {
      setLoading(true);
      await api.delete(`/dynamic/delete/${type}/${id}`);
      
      if (type === 'client_payment_history') {
        const deletedRecord = collectionsLog.find(c => c.id === id);
        if (deletedRecord) {
          // Revert local installment
          const savedInstsStr = localStorage.getItem('contractor_installments');
          if (savedInstsStr) {
            try {
              const insts = JSON.parse(savedInstsStr);
              const updatedInsts = insts.filter(inst => {
                if (inst.paymentId && Number(inst.paymentId) === Number(id)) return false;
                const isMatch = 
                  String(inst.projectId) === String(deletedRecord.project_id) &&
                  parseFloat(inst.amount) === parseFloat(deletedRecord.amount_paid) &&
                  String(inst.date) === String(deletedRecord.payment_date).split('T')[0];
                return !isMatch;
              });
              localStorage.setItem('contractor_installments', JSON.stringify(updatedInsts));
              window.dispatchEvent(new Event('storage'));
            } catch (err) {
              console.error('Failed to remove local installment:', err);
            }
          }

          const meta = typeof deletedRecord.metadata === 'string' ? JSON.parse(deletedRecord.metadata) : (deletedRecord.metadata || {});
          const valId = meta.valuation_id;
          if (valId && String(valId).startsWith('val-')) {
            const savedValsStr = localStorage.getItem('contractor_valuations');
            if (savedValsStr) {
              try {
                const vals = JSON.parse(savedValsStr);
                const valObj = vals.find(v => v.id === valId);
                if (valObj) {
                  const totalValAmount = parseFloat(valObj.totalFinal || valObj.totalCurrent || 0);
                  const remainingPaid = collectionsLog
                    .filter(c => c.id !== id)
                    .filter(c => {
                      const m = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {});
                      return String(m.valuation_id) === String(valId);
                    })
                    .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
                  
                  const newStatus = remainingPaid >= totalValAmount ? 'Paid' : (remainingPaid > 0 ? 'Partially Paid' : 'Draft');
                  const updated = vals.map(v => v.id === valId ? { ...v, status: newStatus } : v);
                  localStorage.setItem('contractor_valuations', JSON.stringify(updated));
                  window.dispatchEvent(new Event('storage'));
                }
              } catch (err) {
                console.error('Failed to revert local valuation status:', err);
              }
            }
          }
        }
      }
      
      triggerAlert('success', ar ? 'تم عكس المعاملة وإلغاء القيود بنجاح' : 'Transaction reversed successfully');
      fetchMasterData();
      fetchLogs();
    } catch (err) {
      triggerAlert('danger', err.response?.data?.error || (ar ? 'فشل إلغاء المعاملة' : 'Failed to reverse transaction'));
    } finally {
      setLoading(false);
    }
  };

  // Dynamic dropdown filters
  const selectedClientObj = clients.find(c => String(c.id) === String(colForm.client_id));
  const filteredProjects = colForm.client_id
    ? projects.filter(p => {
        const pClientName = (p.clientName || p.client_name || p.client || 'عميل عام').toLowerCase().trim();
        return selectedClientObj && pClientName === selectedClientObj.name.toLowerCase().trim();
      })
    : projects;

  const getInvoiceRemainingAmount = (inv) => {
    const paymentsForVal = collectionsLog.filter(c => {
      const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {});
      return String(meta.valuation_id) === String(inv.id);
    });
    const totalPaid = paymentsForVal.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const remaining = parseFloat(inv.total_amount || 0) - totalPaid;
    return remaining > 0 ? remaining : 0;
  };

  const getInvoiceStatus = (inv) => {
    if (!String(inv.id).startsWith('val-')) {
      return inv.status || 'Unpaid';
    }
    const paymentsForVal = collectionsLog.filter(c => {
      const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {});
      return String(meta.valuation_id) === String(inv.id);
    });
    const totalPaid = paymentsForVal.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
    const totalValAmount = parseFloat(inv.total_amount || 0);
    if (totalPaid >= totalValAmount) {
      return 'Paid';
    } else if (totalPaid > 0) {
      return 'Partially Paid';
    }
    return inv.status || 'Unpaid';
  };

  const selectedProjObj = projects.find(p => String(p.id) === String(colForm.project_id));
  const filteredClientInvoices = colForm.project_id
    ? clientInvoices.filter(inv => {
        const isPaid = (getInvoiceStatus(inv)).toLowerCase() === 'paid';
        if (isPaid) return false;
        if (inv.project_id && String(inv.project_id) === String(colForm.project_id)) return true;
        if (inv.project_name && selectedProjObj && inv.project_name.toLowerCase().trim() === selectedProjObj.name.toLowerCase().trim()) return true;
        return false;
      })
    : colForm.client_id
    ? clientInvoices.filter(inv => {
        const isPaid = (getInvoiceStatus(inv)).toLowerCase() === 'paid';
        if (isPaid) return false;
        const invClientName = (inv.client_name || '').toLowerCase().trim();
        const clientName = selectedClientObj ? selectedClientObj.name.toLowerCase().trim() : '';
        return invClientName === clientName;
      })
    : clientInvoices.filter(inv => (getInvoiceStatus(inv)).toLowerCase() !== 'paid');

  const selectedSubObj = subcontractors.find(s => s.id === parseInt(payForm.subcontractor_id));
  const selectedPayProjObj = projects.find(p => String(p.name).toLowerCase().trim() === String(payForm.project_name).toLowerCase().trim());
  const filteredSubInvoices = subInvoices.filter(inv => {
    if (inv.status === 'Paid') return false;
    if (payForm.project_name) {
      const invProjName = inv.project_name || '';
      const invProjId = inv.project_id || '';
      const selectedProjId = selectedPayProjObj ? selectedPayProjObj.id : '';
      
      const isMatch = 
        (invProjName && invProjName.toLowerCase().trim() === payForm.project_name.toLowerCase().trim()) ||
        (invProjId && selectedProjId && String(invProjId) === String(selectedProjId));
        
      if (!isMatch) return false;
    } else {
      if (payForm.subcontractor_id && inv.subcontractor_id !== parseInt(payForm.subcontractor_id)) {
        return false;
      }
    }
    return true;
  });

  // Filter logs by search and active project if embedded
  const filteredCollections = collectionsLog.filter(c => {
    if (embedded && projectId) {
      const isNum = !isNaN(parseInt(projectId));
      if (isNum) {
        if (Number(c.project_id) !== Number(projectId)) return false;
      } else {
        const foundProj = projects.find(p => String(p.id) === String(projectId));
        const pName = foundProj ? foundProj.name : '';
        const matchName = (c.project_name || '').toLowerCase().trim() === pName.toLowerCase().trim();
        if (!matchName) return false;
      }
    }
    const q = searchQuery.toLowerCase();
    return (
      (c.client_name || '').toLowerCase().includes(q) ||
      (c.project_name || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q) ||
      (c.reference_no || '').toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  const filteredPayments = paymentsLog.filter(p => {
    const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
    if (embedded && projectId) {
      const foundProj = projects.find(p => String(p.id) === String(projectId));
      const activeProjName = foundProj ? foundProj.name : '';
      if (!activeProjName || (meta.project_name || '').toLowerCase().trim() !== activeProjName.toLowerCase().trim()) {
        return false;
      }
    }
    const q = searchQuery.toLowerCase();
    return (
      (p.sub_name || '').toLowerCase().includes(q) ||
      (meta.project_name || '').toLowerCase().includes(q) ||
      (p.details || '').toLowerCase().includes(q) ||
      (meta.reference_no || '').toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  // Calculate totals (dynamic based on view scope)
  const displayCollections = (embedded && projectId) ? filteredCollections : collectionsLog;
  const displayPayments = (embedded && projectId) ? filteredPayments : paymentsLog;
  const totalCollections = displayCollections.reduce((sum, item) => sum + parseFloat(item.amount_paid || 0), 0);
  const totalPayments = displayPayments.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className={getThemeClass("container-fluid p-6 max-w-7xl mx-auto space-y-6", "container-fluid p-0 max-w-7xl mx-auto space-y-6")} style={{ direction: 'rtl' }}>
      
      {/* Premium Header */}
      {!embedded && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-emerald-800 to-cyan-900 text-white p-6 rounded-2xl shadow-xl space-y-4 md:space-y-0 transition duration-300">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">
              {ar ? 'التحصيلات والمدفوعات المالية' : 'Collections & Subcontractor Payments'}
            </h1>
            <p className="text-emerald-100 text-xs">
              {ar ? 'إدارة تحصيل دفعات العملاء وسداد مقاولي الباطن مع ربط مرن بالمشاريع والمستخلصات وتوليد القيود الآلية' : 'Manage general and linked transactions cleanly'}
            </p>
          </div>
          <div className="flex space-x-2 space-x-reverse">
            <button 
              onClick={() => { fetchMasterData(); fetchLogs(); }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center transition duration-200"
            >
              🔄 {ar ? 'تحديث البيانات' : 'Refresh Data'}
            </button>
          </div>
        </div>
      )}

      {/* Alert Banner */}
      {alert.msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold shadow-md border ${
          alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          alert.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        } transition-all duration-300`}>
          {alert.msg}
        </div>
      )}

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className={getThemeClass("bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 space-x-reverse", "bg-[#131b2e] p-5 rounded-2xl border border-slate-800/60 shadow-sm flex items-center space-x-4 space-x-reverse")}>
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xl">📥</div>
          <div>
            <p className={getThemeClass("text-gray-400 text-xs font-semibold", "text-slate-450 text-xs font-semibold")}>{ar ? 'إجمالي التحصيلات (العملاء)' : 'Total Client Collections'}</p>
            <h3 className={getThemeClass("text-xl font-bold text-gray-800 mt-1", "text-xl font-bold text-slate-100 mt-1")}>{totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-500">{ar ? 'جنيه' : 'EGP'}</span></h3>
          </div>
        </div>
        <div className={getThemeClass("bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 space-x-reverse", "bg-[#131b2e] p-5 rounded-2xl border border-slate-800/60 shadow-sm flex items-center space-x-4 space-x-reverse")}>
          <div className="p-3 bg-cyan-100 text-cyan-800 rounded-xl text-xl">📤</div>
          <div>
            <p className={getThemeClass("text-gray-400 text-xs font-semibold", "text-slate-450 text-xs font-semibold")}>{ar ? 'إجمالي المدفوعات (المقاولين)' : 'Total Payments to Subs'}</p>
            <h3 className={getThemeClass("text-xl font-bold text-gray-800 mt-1", "text-xl font-bold text-slate-100 mt-1")}>{totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-500">{ar ? 'جنيه' : 'EGP'}</span></h3>
          </div>
        </div>
        <div className={getThemeClass("bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 space-x-reverse md:col-span-2 lg:col-span-1", "bg-[#131b2e] p-5 rounded-2xl border border-slate-800/60 shadow-sm flex items-center space-x-4 space-x-reverse md:col-span-2 lg:col-span-1")}>
          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl text-xl">⚖️</div>
          <div>
            <p className={getThemeClass("text-gray-400 text-xs font-semibold", "text-slate-450 text-xs font-semibold")}>{ar ? 'صافي التدفق النقدي الداخلي' : 'Net Inflow Balance'}</p>
            <h3 className={getThemeClass("text-xl font-bold text-gray-800 mt-1", "text-xl font-bold text-slate-100 mt-1")}>{(totalCollections - totalPayments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-500">{ar ? 'جنيه' : 'EGP'}</span></h3>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className={getThemeClass("flex border-b border-gray-200 bg-white p-1.5 rounded-xl", "flex border-b border-slate-800 bg-[#131b2e] p-1.5 rounded-xl")}>
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'collections'
              ? 'bg-gradient-to-r from-emerald-800 to-cyan-900 text-white shadow'
              : getThemeClass('text-gray-500 hover:text-gray-800 hover:bg-gray-50', 'text-slate-400 hover:text-slate-200 hover:bg-[#090d16]')
          }`}
        >
          📥 {ar ? 'تحصيل دفعات العملاء' : 'Client Collections'}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'payments'
              ? 'bg-gradient-to-r from-emerald-800 to-cyan-900 text-white shadow'
              : getThemeClass('text-gray-500 hover:text-gray-800 hover:bg-gray-50', 'text-slate-400 hover:text-slate-200 hover:bg-[#090d16]')
          }`}
        >
          📤 {ar ? 'سداد مستحقات المقاولين' : 'Subcontractor Payments'}
        </button>
      </div>

      {/* TAB CONTENT: COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Collection Form (1/3 width) */}
          <div className={getThemeClass("lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4", "lg:col-span-1 bg-[#131b2e] p-6 rounded-2xl border border-slate-800/60 shadow-sm space-y-4")}>
            <h2 className={getThemeClass("text-sm font-bold text-gray-800 border-b pb-2 flex items-center", "text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center")}>
              💰 {ar ? 'سجل تحصيل دفعة جديدة' : 'Record Client Collection'}
            </h2>

            {embedded && projectId && !projects.some(p => String(p.id) === String(projectId) && !isNaN(parseInt(p.id))) && (
              <div className="p-3 rounded-xl text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 leading-relaxed font-semibold">
                ⚠️ {ar ? 'تنبيه: هذا المشروع محلي (Seed) وغير مسجل بقاعدة البيانات. لتتمكن من تسجيل القيود والتحصيلات، يرجى اختيار أو تأسيس مشروع مسجل.' : 'Note: This project is local (seed) and not registered in the database yet.'}
              </div>
            )}

            <form onSubmit={handleCollectionSubmit} className="space-y-3.5">
              
              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'العميل' : 'Client'} *</label>
                <select
                  value={colForm.client_id}
                  onChange={(e) => setColForm({ ...colForm, client_id: e.target.value, project_id: '', valuation_id: '' })}
                  required
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- اختر العميل --' : '-- Select Client --'}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'المشروع (اختياري)' : 'Project (Optional)'}</label>
                <select
                  value={colForm.project_id}
                  onChange={(e) => {
                    const projId = e.target.value;
                    const selectedProj = projects.find(p => String(p.id) === String(projId));
                    let defaultSource = colForm.source_account;
                    if (selectedProj && selectedProj.company) {
                      const matchingAcc = coaAccounts.find(acc => 
                        acc.company_entity === selectedProj.company && 
                        acc.account_code.startsWith('110')
                      );
                      if (matchingAcc) {
                        defaultSource = matchingAcc.account_name;
                      }
                    }
                    
                    // Prefill client if selectedProj has one
                    let matchedClientId = colForm.client_id;
                    if (selectedProj) {
                      const pClientName = (selectedProj.clientName || selectedProj.client_name || selectedProj.client || '').toLowerCase().trim();
                      if (pClientName) {
                        const foundClient = clients.find(c => c.name && c.name.toLowerCase().trim() === pClientName);
                        if (foundClient) {
                          matchedClientId = String(foundClient.id);
                        }
                      }
                    }

                    setColForm(prev => ({
                      ...prev,
                      project_id: projId,
                      client_id: matchedClientId,
                      source_account: defaultSource,
                      valuation_id: ''
                    }));
                  }}
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- دفعة عامة (بدون مشروع) --' : '-- General Payment (No Project) --'}</option>
                  {filteredProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'المستخلص / الفاتورة (اختياري)' : 'Valuation / Invoice (Optional)'}</label>
                <select
                  value={colForm.valuation_id}
                  onChange={(e) => setColForm({ ...colForm, valuation_id: e.target.value })}
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- غير مرتبطة بمستخلص --' : '-- Not Linked to a Valuation --'}</option>
                  {filteredClientInvoices.map(inv => {
                    const remaining = getInvoiceRemainingAmount(inv);
                    const totalAmtStr = parseFloat(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const remainingStr = remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    return (
                      <option key={inv.id} value={inv.id}>
                        {ar 
                          ? `مستخلص رقم ${inv.id} - بقيمة ${totalAmtStr} جنيه (المتبقي: ${remainingStr} جنيه)` 
                          : `Valuation #${inv.id} - ${totalAmtStr} EGP (Remaining: ${remainingStr} EGP)`
                        }
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'المبلغ المحصل' : 'Amount'} *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={colForm.amount}
                    onChange={(e) => setColForm({ ...colForm, amount: e.target.value })}
                    required
                    placeholder="0.00"
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  />
                </div>
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'تاريخ الاستلام' : 'Date'}</label>
                  <input
                    type="date"
                    value={colForm.payment_date}
                    onChange={(e) => setColForm({ ...colForm, payment_date: e.target.value })}
                    required
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select
                    value={colForm.payment_method}
                    onChange={(e) => setColForm({ ...colForm, payment_method: e.target.value })}
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  >
                    <option value="نقداً">{ar ? 'نقداً' : 'Cash'}</option>
                    <option value="بنك">{ar ? 'بنك' : 'Bank'}</option>
                    <option value="شيك">{ar ? 'شيك' : 'Check'}</option>
                    <option value="تحويل بنكي">{ar ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  </select>
                </div>
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'الرقم المرجعي' : 'Ref No'}</label>
                  <input
                    type="text"
                    value={colForm.reference_no}
                    onChange={(e) => setColForm({ ...colForm, reference_no: e.target.value })}
                    placeholder={ar ? 'رقم الشيك أو التحويل' : 'Check / Transfer No.'}
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  />
                </div>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'الحساب المودع فيه' : 'Source Account'} *</label>
                <select
                  value={colForm.source_account}
                  onChange={(e) => setColForm({ ...colForm, source_account: e.target.value })}
                  required
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-850", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- اختر حساب التحصيل --' : '-- Select Source Account --'}</option>
                  {coaAccounts.map(acc => (
                    <option key={acc.id} value={acc.account_name}>
                      {acc.account_name} ({acc.account_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'ملاحظات / البيان الهندسي' : 'Notes'}</label>
                <textarea
                  value={colForm.notes}
                  onChange={(e) => setColForm({ ...colForm, notes: e.target.value })}
                  placeholder={ar ? 'أدخل تفاصيل إضافية أو وصف الدفعة...' : 'Enter details here...'}
                  rows="2"
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-emerald-600 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-800 to-cyan-900 hover:from-emerald-700 hover:to-cyan-800 text-white py-3 rounded-lg text-xs font-bold transition shadow-md duration-200 flex justify-center items-center"
              >
                {loading ? '...' : `🟢 ${ar ? 'تسجيل وقيد الدفعة بنجاح' : 'Register Collection'}`}
              </button>
            </form>
          </div>

          {/* Collection Logs (2/3 width) */}
          <div className={getThemeClass("lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4", "lg:col-span-2 bg-[#131b2e] p-6 rounded-2xl border border-slate-800/60 shadow-sm space-y-4")}>
            <div className={getThemeClass("flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 border-b pb-2", "flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 border-b border-slate-800 pb-2")}>
              <h2 className={getThemeClass("text-sm font-bold text-gray-800 flex items-center", "text-sm font-bold text-cyan-400 flex items-center")}>
                📋 {ar ? 'سجل تحصيلات دفعات العملاء' : 'Customer Collections History Log'}
              </h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ar ? 'بحث باسم العميل أو المشروع...' : 'Search by client or project...'}
                className={getThemeClass(
                  "text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:border-emerald-600 w-full sm:w-64 bg-gray-50/50 text-gray-850",
                  "text-xs px-3 py-1.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 w-full sm:w-64 bg-[#090d16] text-slate-200"
                )}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className={getThemeClass("bg-gray-50 text-gray-500 font-bold border-b border-gray-200", "bg-[#090d16] text-slate-400 font-bold border-b border-slate-800")}>
                    <th className="p-3 text-center">ID</th>
                    <th className="p-3">{ar ? 'العميل' : 'Client'}</th>
                    <th className="p-3">{ar ? 'المشروع' : 'Project'}</th>
                    <th className="p-3">{ar ? 'المستخلص' : 'Valuation'}</th>
                    <th className="p-3 text-center">{ar ? 'المبلغ' : 'Amount'}</th>
                    <th className="p-3 text-center">{ar ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3 text-center">{ar ? 'طريقة الدفع' : 'Method'}</th>
                    <th className="p-3 text-center">{ar ? 'المرجع' : 'Ref No'}</th>
                    <th className="p-3">{ar ? 'البيان' : 'Notes'}</th>
                    <th className="p-3 text-center">{ar ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className={getThemeClass("divide-y divide-gray-100", "divide-y divide-slate-800/60")}>
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-6 text-center text-gray-400">
                        {ar ? 'لا توجد تحصيلات مسجلة مطابقة للبحث.' : 'No collections recorded.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map(c => {
                      const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {});
                      return (
                        <tr key={c.id} className={getThemeClass("hover:bg-gray-50/80 transition duration-150", "hover:bg-slate-800/30 transition duration-150 text-slate-300 border-b border-slate-800/40")}>
                          <td className="p-3 text-center text-gray-450 font-mono">#{c.id}</td>
                          <td className={getThemeClass("p-3 font-semibold text-gray-700", "p-3 font-semibold text-slate-200")}>{c.client_name || (ar ? 'عميل عام' : 'General Client')}</td>
                          <td className={getThemeClass("p-3 text-emerald-800 font-medium", "p-3 text-emerald-400 font-medium")}>{c.project_name || meta.project_name || (ar ? 'دفعة عامة' : 'General')}</td>
                          <td className="p-3 font-medium">
                            {meta.valuation_id ? (
                              <span className={getThemeClass("bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded-full text-[10px]", "bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-2 py-0.5 rounded-full text-[10px]")}>
                                {ar ? 'مستخلص' : 'Valuation'} #{meta.valuation_id}
                              </span>
                            ) : (
                              <span className={getThemeClass("text-gray-400 font-mono", "text-slate-500 font-mono")}>-</span>
                            )}
                          </td>
                          <td className={getThemeClass("p-3 text-center font-bold text-emerald-700", "p-3 text-center font-bold text-emerald-400")}>
                            {parseFloat(c.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={getThemeClass("p-3 text-center text-gray-500 font-mono", "p-3 text-center text-slate-400 font-mono")}>
                            {new Date(c.payment_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className={getThemeClass("p-3 text-center text-gray-600", "p-3 text-center text-slate-300")}>{c.payment_method}</td>
                          <td className={getThemeClass("p-3 text-center font-mono text-gray-500", "p-3 text-center font-mono text-slate-450")}>{c.reference_no || '-'}</td>
                          <td className={getThemeClass("p-3 text-gray-600 max-w-[150px] truncate", "p-3 text-slate-350 max-w-[150px] truncate")} title={c.notes}>{c.notes || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord('client_payment_history', c.id)}
                              className={getThemeClass(
                                "text-rose-600 hover:text-rose-900 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-semibold transition",
                                "text-rose-455 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded text-[10px] font-semibold transition"
                              )}
                            >
                              {ar ? 'عكس القيد' : 'Reverse'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Payment Form (1/3 width) */}
          <div className={getThemeClass("lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4", "lg:col-span-1 bg-[#131b2e] p-6 rounded-2xl border border-slate-800/60 shadow-sm space-y-4")}>
            <h2 className={getThemeClass("text-sm font-bold text-gray-800 border-b pb-2 flex items-center", "text-sm font-bold text-cyan-400 border-b border-slate-800 pb-2 flex items-center")}>
              👷 {ar ? 'سجل سداد دفعة للمقاول' : 'Record Subcontractor Payment'}
            </h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              
              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'المقاول' : 'Subcontractor'} *</label>
                <select
                  value={payForm.subcontractor_id}
                  onChange={(e) => setPayForm({ ...payForm, subcontractor_id: e.target.value, invoice_id: '' })}
                  required
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- اختر المقاول --' : '-- Select Subcontractor --'}</option>
                  {subcontractors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'المشروع (اختياري)' : 'Project Name (Optional)'}</label>
                <select
                  value={payForm.project_name}
                  onChange={(e) => {
                    const projName = e.target.value;
                    const selectedProj = projects.find(p => String(p.name).toLowerCase().trim() === String(projName).toLowerCase().trim());
                    let defaultSource = payForm.source_account;
                    if (selectedProj && selectedProj.company) {
                      const matchingAcc = coaAccounts.find(acc => 
                        acc.company_entity === selectedProj.company && 
                        acc.account_code.startsWith('110')
                      );
                      if (matchingAcc) {
                        defaultSource = matchingAcc.account_name;
                      }
                    }
                    setPayForm(prev => ({
                      ...prev,
                      project_name: projName,
                      source_account: defaultSource
                    }));
                  }}
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- سداد عام (بدون مشروع محدد) --' : '-- General Payment (No Project) --'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'مستخلص المقاول (اختياري)' : 'Subcontractor Invoice (Optional)'}</label>
                <select
                  value={payForm.invoice_id}
                  onChange={(e) => {
                    const invId = e.target.value;
                    const selectedInv = filteredSubInvoices.find(inv => String(inv.id) === String(invId));
                    setPayForm(prev => ({
                      ...prev,
                      invoice_id: invId,
                      subcontractor_id: selectedInv ? String(selectedInv.subcontractor_id) : prev.subcontractor_id,
                      amount_paid: selectedInv ? String(selectedInv.remaining_amount !== undefined ? selectedInv.remaining_amount : selectedInv.net_amount) : '',
                      project_name: selectedInv && selectedInv.project_name ? selectedInv.project_name : prev.project_name
                    }));
                  }}
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-655 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- غير مرتبط بمستخلص مقاول --' : '-- Not Linked to Sub Invoice --'}</option>
                  {filteredSubInvoices.map(inv => {
                    const remaining = inv.remaining_amount !== undefined ? inv.remaining_amount : inv.net_amount;
                    const subObj = subcontractors.find(s => s.id === inv.subcontractor_id);
                    const subName = subObj ? subObj.name : '';
                    return (
                      <option key={inv.id} value={inv.id}>
                        {ar 
                          ? `مستخلص #${inv.id} - المقاول: ${subName || 'عام'} - المتبقي: ${parseFloat(remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه (من أصل ${parseFloat(inv.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` 
                          : `Invoice #${inv.id} - Sub: ${subName || 'General'} - Bal: ${parseFloat(remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP (of ${parseFloat(inv.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'المبلغ المدفوع' : 'Amount'} *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payForm.amount_paid}
                    onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })}
                    required
                    placeholder="0.00"
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  />
                </div>
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'تاريخ السداد' : 'Date'}</label>
                  <input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    required
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'طريقة السداد' : 'Payment Method'}</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  >
                    <option value="Cash">{ar ? 'نقداً' : 'Cash'}</option>
                    <option value="Bank Transfer">{ar ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    <option value="Check">{ar ? 'شيك' : 'Check'}</option>
                  </select>
                </div>
                <div>
                  <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'الرقم المرجعي' : 'Ref No'}</label>
                  <input
                    type="text"
                    value={payForm.reference_no}
                    onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })}
                    placeholder={ar ? 'رقم الشيك أو التحويل' : 'Check / Transfer No.'}
                    className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                  />
                </div>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'الحساب الدائن / مصدر الصرف' : 'Source Account'} *</label>
                <select
                  value={payForm.source_account}
                  onChange={(e) => setPayForm({ ...payForm, source_account: e.target.value })}
                  required
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-855", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                >
                  <option value="">{ar ? '-- اختر حساب الصرف --' : '-- Select Source Account --'}</option>
                  {coaAccounts.map(acc => (
                    <option key={acc.id} value={acc.account_name}>
                      {acc.account_name} ({acc.account_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={getThemeClass("block text-gray-500 text-xs font-bold mb-1.5", "block text-slate-400 text-xs font-bold mb-1.5")}>{ar ? 'ملاحظات / تفاصيل المعاملة' : 'Notes'}</label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder={ar ? 'أدخل تفاصيل إضافية أو رقم الدفعة...' : 'Enter details here...'}
                  rows="2"
                  className={getThemeClass("w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:border-cyan-650 bg-gray-50/50 text-gray-800", "w-full text-xs p-2.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 bg-[#090d16] text-slate-200")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-900 to-emerald-800 hover:from-cyan-800 hover:to-emerald-700 text-white py-3 rounded-lg text-xs font-bold transition shadow-md duration-200 flex justify-center items-center"
              >
                {loading ? '...' : `🟢 ${ar ? 'تسجيل وقيد السداد بنجاح' : 'Record Payment'}`}
              </button>
            </form>
          </div>

          {/* Payment Logs (2/3 width) */}
          <div className={getThemeClass("lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4", "lg:col-span-2 bg-[#131b2e] p-6 rounded-2xl border border-slate-800/60 shadow-sm space-y-4")}>
            <div className={getThemeClass("flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 border-b pb-2", "flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 border-b border-slate-800 pb-2")}>
              <h2 className={getThemeClass("text-sm font-bold text-gray-800 flex items-center", "text-sm font-bold text-cyan-400 flex items-center")}>
                📋 {ar ? 'سجل مدفوعات مقاولي الباطن' : 'Subcontractor Payments history Ledger'}
              </h2>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ar ? 'بحث باسم المقاول أو التفاصيل...' : 'Search by contractor or details...'}
                className={getThemeClass(
                  "text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:border-cyan-600 w-full sm:w-64 bg-gray-50/50 text-gray-850",
                  "text-xs px-3 py-1.5 border border-slate-800 rounded-lg focus:outline-none focus:border-cyan-500 w-full sm:w-64 bg-[#090d16] text-slate-200"
                )}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className={getThemeClass("bg-gray-50 text-gray-500 font-bold border-b border-gray-200", "bg-[#090d16] text-slate-400 font-bold border-b border-slate-800")}>
                    <th className="p-3 text-center">ID</th>
                    <th className="p-3">{ar ? 'المقاول' : 'Subcontractor'}</th>
                    <th className="p-3">{ar ? 'المشروع' : 'Project'}</th>
                    <th className="p-3">{ar ? 'المستخلص' : 'Invoice/Valuation'}</th>
                    <th className="p-3 text-center">{ar ? 'المبلغ' : 'Amount'}</th>
                    <th className="p-3 text-center">{ar ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3 text-center">{ar ? 'طريقة السداد' : 'Method'}</th>
                    <th className="p-3 text-center">{ar ? 'المرجع' : 'Ref No'}</th>
                    <th className="p-3">{ar ? 'البيان' : 'Notes'}</th>
                    <th className="p-3 text-center">{ar ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className={getThemeClass("divide-y divide-gray-100", "divide-y divide-slate-800/60")}>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-6 text-center text-gray-400">
                        {ar ? 'لا توجد مدفوعات مسجلة مطابقة للبحث.' : 'No subcontractor statements.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(p => {
                      const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
                      return (
                        <tr key={p.id} className={getThemeClass("hover:bg-gray-50/80 transition duration-150", "hover:bg-slate-800/30 transition duration-150 text-slate-300 border-b border-slate-800/40")}>
                          <td className="p-3 text-center text-gray-450 font-mono">#{p.id}</td>
                          <td className={getThemeClass("p-3 font-semibold text-gray-700", "p-3 font-semibold text-slate-200")}>{p.sub_name || (ar ? 'مقاول عام' : 'Subcontractor')}</td>
                          <td className={getThemeClass("p-3 text-emerald-800 font-medium", "p-3 text-emerald-400 font-medium")}>{meta.project_name || (ar ? 'سداد عام' : 'General')}</td>
                          <td className="p-3 font-medium">
                            {meta.invoice_id ? (
                              <span className={getThemeClass("bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded-full text-[10px]", "bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-2 py-0.5 rounded-full text-[10px]")}>
                                {ar ? 'مستخلص' : 'Valuation'} #{meta.invoice_id}
                              </span>
                            ) : (
                              <span className={getThemeClass("text-gray-400 font-mono", "text-slate-500 font-mono")}>-</span>
                            )}
                          </td>
                          <td className={getThemeClass("p-3 text-center font-bold text-rose-700", "p-3 text-center font-bold text-rose-400")}>
                            {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={getThemeClass("p-3 text-center text-gray-500 font-mono", "p-3 text-center text-slate-400 font-mono")}>
                            {new Date(p.created_at || p.payment_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className={getThemeClass("p-3 text-center text-gray-600", "p-3 text-center text-slate-300")}>{meta.payment_method || p.type}</td>
                          <td className={getThemeClass("p-3 text-center font-mono text-gray-500", "p-3 text-center font-mono text-slate-455")}>{meta.reference_no || '-'}</td>
                          <td className={getThemeClass("p-3 text-gray-600 max-w-[150px] truncate", "p-3 text-slate-350 max-w-[150px] truncate")} title={p.details}>{p.details || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord('subcontractor_statements', p.id)}
                              className={getThemeClass(
                                "text-rose-600 hover:text-rose-900 hover:bg-rose-50 px-2 py-1 rounded text-[10px] font-semibold transition",
                                "text-rose-455 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded text-[10px] font-semibold transition"
                              )}
                            >
                              {ar ? 'إلغاء المعاملة' : 'Reverse'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
