import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSecurity } from '../hooks/useSecurity';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const { logout, user } = useAuth();
  const context = useLanguage();
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get('tab') || '';

  const language = context?.language || 'ar';
  const theme = context?.theme || 'light';
  const updatePreferences = context?.updatePreferences || (() => { });

  const { hasPermission, loading: securityLoading } = useSecurity();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  const translations = {
    ar: {
      enterprise: "نظام المؤسسات",
      searchPlaceholder: "بحث ذكي...",
      identityCheck: "جاري التحقق...",
      logout: "خروج",
      workspace: "بيئة العمل",
      connected: "متصل",
      noResults: "لا توجد نتائج.",
      searching: "جاري البحث...",
      results: "نتائج البحث",
      notifsTitle: "التنبيهات",
      noNotifs: "لا توجد تنبيهات.",
      admin: "مدير النظام 🛡️",
      user: "مستخدم معتمد ✅",
      menuGroups: {
        core: "الأساسية",
        ops: "العمليات",
        relations: "العملاء",
        admin: "الإدارة",
        personal: "بوابتي"
      },
      menu: {
        dashboard: "لوحة القيادة",
        reports: "التقارير",
        command: "مركز القيادة",
        approvals: "الاعتمادات",
        projects: "المشاريع",
        finance: "المالية",
        assets: "الأصول",
        realEstate: "العقارات",
        partners: "الشركاء",
        crm: "العملاء",
        inventory: "المخازن",
        directIssue: "الصرف المباشر 🚚",
        transfers: "التحويلات 🔄",
        reconciliation: "الجرد والتسويات ⚖️",
        batchMatrix: "تتبع الباتشات 📦",
        reorder: "إعادة الطلب 🚨",
        pharma: "صيدليات وأدوية 💊",
        masterStock: "إدارة الاستوك 📦",
        supplyChain: "سلاسل الإمداد 🚛",
        invoices: "المستخلصات",
        subcontractors: "المقاولين",
        transactions: "التحصيلات والمدفوعات 💸",
        hr: "الموارد البشرية",
        corporate: "الحوكمة",
        hcm: "بوابتي",
        users: "المستخدمين",
        expenses: "المصروفات",
        accountant360: "المحاسب 360 ⚡",
        portal360: "بوابة 360 الموحدة 🌀",
        settings: "الإعدادات",
        userPreferences: "تفضيلات المستخدمين",
        interCompany: "المعاملات بين الشركات 🏢",
        attendance: "سجل الحضور 📅",
        rbacMatrix: "مصفوفة الصلاحيات 🛡️",
        arDue: "المدفوعات المستحقة (AR) 📈",
        apDue: "المستحقات للدفع (AP) 📉",
        inventoryValuation: "تقييم المخزون 📊",
        cashBalances: "أرصدة النقدية 💵",
        custody: "إدارة العهد النقدية 💼",
        salesHistory: "6. سجل المبيعات والصرف 🛒",
        constructionStore: "مستودع الإنشاءات 🧱",
        crmModule: "إدارة CRM",
        salesModule: "المبيعات"
      }
    },
    en: {
      enterprise: "Enterprise System",
      searchPlaceholder: "Search...",
      identityCheck: "Verifying...",
      logout: "Logout",
      workspace: "Workspace",
      connected: "Connected",
      noResults: "No results.",
      searching: "Searching...",
      results: "Search Results",
      notifsTitle: "Alerts",
      noNotifs: "No alerts.",
      admin: "System Admin 🛡️",
      user: "Verified User ✅",
      menuGroups: {
        core: "Core",
        ops: "Operations",
        relations: "CRM",
        admin: "Admin",
        personal: "My Portal"
      },
      menu: {
        dashboard: "Dashboard",
        reports: "Reports",
        command: "Command Center",
        approvals: "Approvals",
        projects: "Projects",
        finance: "Finance",
        assets: "Assets",
        realEstate: "Real Estate",
        partners: "Partners",
        crm: "Clients",
        inventory: "Inventory",
        directIssue: "Direct Stock Issue 🚚",
        transfers: "Transfers 🔄",
        reconciliation: "Stock Count ⚖️",
        batchMatrix: "Batch Matrix 📦",
        reorder: "Smart Reorder 🚨",
        pharma: "Pharma Stores 💊",
        masterStock: "Master Stock 📦",
        supplyChain: "Supply Chain 🚛",
        invoices: "Certificates",
        subcontractors: "Subcontractors",
        transactions: "Collections & Payments 💸",
        hr: "HR",
        corporate: "Governance",
        hcm: "My Portal",
        users: "IAM",
        expenses: "Expenses",
        accountant360: "Accountant 360 ⚡",
        portal360: "Unified 360 Portal 🌀",
        settings: "Settings",
        userPreferences: "User Preferences",
        interCompany: "Inter-Company 🏢",
        attendance: "Attendance 📅",
        rbacMatrix: "RBAC Matrix 🛡️",
        arDue: "AR Due List 📈",
        apDue: "AP Due List 📉",
        inventoryValuation: "Inventory Valuation 📊",
        cashBalances: "Cash Balances 💵",
        custody: "Custody Management 💼",
        salesHistory: "6. Sales & Dispense History 🛒",
        constructionStore: "Construction Store 🧱",
        crmModule: "CRM Module",
        salesModule: "Sales"
      }
    }
  };

  const t = translations[language] || translations['ar'];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [navigate]);

  useEffect(() => {
    if (pathname) {
      menuGroups.forEach(group => {
        group.items.forEach(item => {
          if (item.children) {
            const isMatch = item.children.some(child => {
              try {
                const childUrl = new URL(child.path, window.location.origin);
                const pathMatch = childUrl.pathname === pathname;
                const childTab = childUrl.searchParams.get('tab') || '';
                const tabMatch = childTab === tab;
                return pathMatch && tabMatch;
              } catch (e) {
                return false;
              }
            });
            if (isMatch) {
              setExpandedMenus(prev => ({
                ...prev,
                [item.path]: true
              }));
            }
          }
        });
      });
    }
  }, [pathname, tab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(prev => !prev); }
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/search/global?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data.results || []);
      } catch (err) { console.error(err); }
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const menuGroups = [
    {
      title: t.menuGroups.core,
      items: [
        { path: '/', icon: '📊', label: t.menu.dashboard },
        { path: '/360', icon: '🌀', label: t.menu.portal360 },
        { path: '/reports', icon: '📈', label: t.menu.reports, perm: 'FIN_VIEW_LEDGER' },
        { path: '/notifications', icon: '🛰️', label: t.menu.command, badgeKey: 'command' },
        { path: '/approval-inbox', icon: '⚡', label: t.menu.approvals, badgeKey: 'approvals' },
      ]
    },
    {
      title: t.menuGroups.ops,
      items: [
        { path: '/projects', icon: '🏗️', label: t.menu.projects, perm: 'INV_MANAGE_STOCK' },
        { path: '/sales', icon: '🚚', label: t.menu.directIssue, perm: 'INV_MANAGE_STOCK' },
        {
          path: '/inventory/master-stock',
          icon: '🧱',
          label: t.menu.constructionStore,
          perm: 'INV_MANAGE_STOCK',
          children: [
            { path: '/inventory/master-stock', icon: '🗃️', label: t.menu.masterStock, perm: 'INV_MANAGE_STOCK' }
          ]
        },
        {
          path: '/inventory/pharma?tab=store',
          icon: '💊',
          label: t.menu.pharma,
          perm: 'INV_MANAGE_STOCK',
          children: [
            { path: '/inventory/pharma?tab=transfers', icon: '🔄', label: t.menu.transfers, perm: 'INV_MANAGE_STOCK' },
            { path: '/inventory/pharma?tab=expiry', icon: '📦', label: t.menu.batchMatrix, perm: 'INV_MANAGE_STOCK' },
            { path: '/inventory/pharma?tab=reorder', icon: '🚨', label: t.menu.reorder, perm: 'INV_MANAGE_STOCK' },
            { path: '/inventory/pharma?tab=sales', icon: '🛒', label: t.menu.salesHistory, perm: 'INV_MANAGE_STOCK' },
          ]
        },
        { path: '/inventory/supply-chain', icon: '🚛', label: t.menu.supplyChain, perm: 'INV_MANAGE_STOCK' },
        { path: '/fixed-assets', icon: '🏗️', label: t.menu.assets, perm: 'FIN_VIEW_LEDGER' },
        { path: '/subcontractors', icon: '👷', label: t.menu.subcontractors, perm: 'INV_MANAGE_STOCK' },
        { path: '/real-estate', icon: '🏢', label: t.menu.realEstate, perm: 'INV_MANAGE_STOCK' },
      ]
    },
    {
      title: t.menuGroups.relations,
      items: [
        { path: '/partners', icon: '🤝', label: t.menu.partners, perm: 'FIN_VIEW_LEDGER' },
        { path: '/clients', icon: '🤝', label: t.menu.crm, perm: 'INV_MANAGE_STOCK' },
        { path: '/crm', icon: '📇', label: t.menu.crmModule, perm: 'INV_MANAGE_STOCK' },
        { path: '/sales', icon: '💰', label: t.menu.salesModule, perm: 'FIN_VIEW_LEDGER' },
      ]
    },
    {
      title: t.menuGroups.admin,
      items: [
        {
          path: '/finance',
          icon: '💰',
          label: t.menu.finance,
          perm: 'FIN_VIEW_LEDGER',
          badgeKey: 'finance',
          children: [
            { path: '/finance/360', icon: '⚡', label: t.menu.accountant360, perm: 'FIN_VIEW_LEDGER' },
            { path: '/finance/custody', icon: '💼', label: t.menu.custody, perm: 'FIN_VIEW_LEDGER' },
            { path: '/finance/ar-due', icon: '📈', label: t.menu.arDue, perm: 'FIN_VIEW_LEDGER' },
            { path: '/finance/ap-due', icon: '📉', label: t.menu.apDue, perm: 'FIN_VIEW_LEDGER' },
            { path: '/finance/inventory-valuation', icon: '📊', label: t.menu.inventoryValuation, perm: 'FIN_VIEW_LEDGER' },
            { path: '/finance/cash-balances', icon: '💵', label: t.menu.cashBalances, perm: 'FIN_VIEW_LEDGER' },
            { path: '/inter-company', icon: '🏢', label: t.menu.interCompany, perm: 'FIN_VIEW_LEDGER' },
            { path: '/expenses', icon: '💸', label: t.menu.expenses, perm: 'FIN_VIEW_LEDGER' },
            { path: '/invoices', icon: '🧾', label: t.menu.invoices, perm: 'FIN_POST_ENTRY' },
            { path: '/finance/transactions', icon: '💸', label: t.menu.transactions, perm: 'FIN_VIEW_LEDGER' },
          ]
        },
        {
          path: '/hr',
          icon: '👥',
          label: t.menu.hr,
          perm: 'HR_VIEW_STAFF',
          children: [
            { path: '/attendance', icon: '📅', label: t.menu.attendance, perm: 'HR_VIEW_STAFF' },
            { path: '/corporate', icon: '🏛️', label: t.menu.corporate, perm: 'HR_VIEW_STAFF' },
          ]
        },
        {
          path: '/users',
          icon: '🔐',
          label: t.menu.users,
          perm: 'IAM_MANAGE_ROLES',
          children: [
            { path: '/iam/matrix', icon: '🛡️', label: t.menu.rbacMatrix, perm: 'IAM_MANAGE_ROLES' },
            { path: '/settings/preferences', icon: '⚙️', label: t.menu.userPreferences, perm: 'IAM_MANAGE_ROLES' },
          ]
        },
        { path: '/settings', icon: '⚙️', label: t.menu.settings, perm: 'IAM_MANAGE_ROLES' },
      ]
    },
    {
      title: t.menuGroups.personal,
      items: [
        { path: '/me', icon: '👤', label: t.menu.hcm },
      ]
    }
  ];

  const isMtayem = (user?.username || '').toUpperCase() === 'MTAYEM';
  const usernameUpper = (user?.username || '').toUpperCase();
  const isAdminOrAbzidan = usernameUpper === 'ADMIN' || usernameUpper === 'ABZIDAN' || usernameUpper === 'AHZIDAN';

  const activeCompany = user?.selectedCompany || localStorage.getItem('active_company') || 'كل الشركات';
  const activeCompLower = activeCompany.toLowerCase();
  
  const isPharma = activeCompLower.includes('prime') || activeCompLower.includes('pharma') || activeCompLower.includes('بريم') || activeCompLower.includes('فارما');
  const isDesign = activeCompLower.includes('design') || activeCompLower.includes('ديزاين');
  const isTed = activeCompLower.includes('ted') || activeCompLower.includes('تيد');

  const getFilteredMenu = () => {
    if (isAdminOrAbzidan) {
      return menuGroups;
    }
    const filterItem = (item) => {
      const basePath = item.path ? item.path.split('?')[0] : '';
      if (isPharma) {
        const forbiddenPharmaPaths = [
          '/projects',
          '/subcontractors',
          '/real-estate',
          '/partners',
          '/finance/360',
          '/fixed-assets',
          '/invoices',
          '/corporate'
        ];
        if (forbiddenPharmaPaths.includes(basePath)) return null;
      } else {
        const isLocalServer = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalServer) {
          const forbiddenNonPharmaPaths = [
            '/inventory/pharma',
            '/inventory/supply-chain',
            '/inventory/transfers',
            '/inventory/reconciliation',
            '/inventory/batch-matrix',
            '/inventory/reorder'
          ];
          if (forbiddenNonPharmaPaths.includes(basePath)) return null;
        }
      }

      if (isDesign) {
        const forbiddenDesignPaths = [
          '/real-estate',
          '/partners',
          '/finance/360',
          '/fixed-assets',
          '/invoices',
          '/corporate'
        ];
        if (forbiddenDesignPaths.includes(basePath)) return null;
      }

      if (item.children) {
        const filteredChildren = item.children
          .map(child => filterItem(child))
          .filter(child => child !== null);
        return { ...item, children: filteredChildren };
      }

      return item;
    };

    if (activeCompLower === 'كل الشركات' || activeCompLower === 'all' || activeCompLower === 'all companies') {
      return menuGroups;
    }

    return menuGroups.map(group => {
      const filteredItems = group.items
        .map(item => filterItem(item))
        .filter(item => item !== null);
      return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);
  };

  const activeMenuGroups = getFilteredMenu();

  const [sidebarStats, setSidebarStats] = useState({ approvals: 0, inventory: 0, command: 0, finance: 0 });

  const fetchSidebarStats = async () => {
    try {
      const { data } = await api.get('/system/sidebar-stats');
      if (data.success) setSidebarStats(data.stats);
    } catch (err) { console.error("Sidebar Stats Error:", err); }
  };

  useEffect(() => {
    fetchSidebarStats();
    const interval = setInterval(fetchSidebarStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleItemClick = (item, e) => {
    if (item.children && item.children.length > 0) {
      setExpandedMenus(prev => ({
        ...prev,
        [item.path]: !prev[item.path]
      }));
    }
  };

  if (securityLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-slate-900 animate-pulse tracking-widest text-xs uppercase">{t.identityCheck}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''} bg-white relative`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
        flex flex-col transition-all duration-500 ease-in-out
        ${isSidebarCollapsed ? 'w-[7.5rem]' : 'w-[22.5rem]'} 
        ${language === 'ar' ? 'border-l' : 'border-r'} print:hidden
        fixed inset-y-0 z-40 lg:relative
        ${isMobileMenuOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}
      `}
        style={{ zoom: '0.8', backgroundColor: theme === 'dark' ? '#171920' : '#f8fafc', borderColor: theme === 'dark' ? '#2e323d' : '#e2e8f0' }}>
        <div className={`p-8 flex items-center justify-between min-h-[100px] relative overflow-hidden`}
          style={theme === 'dark' ? { borderBottom: '1px solid #2e323d' } : {}}>
          {theme === 'dark' && (
            <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ background: 'linear-gradient(135deg, #d9a77015 0%, transparent 60%)' }}></div>
          )}
          <div className={`flex items-center gap-4 transition-all duration-500 relative z-10 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-2xl`}
              style={theme === 'dark' ? { background: 'linear-gradient(135deg, #29384e 0%, #1d2026 100%)', color: '#d9a770', border: '1.5px solid #d9a770' } : { backgroundColor: '#0f172a', color: 'white' }}>
              {(user?.selectedCompany || localStorage.getItem('active_company') || 'ERP').charAt(0).toUpperCase()}
            </div>
            <div className="whitespace-nowrap">
              <h1 className={`text-xl font-extrabold tracking-tight leading-none`}
                style={theme === 'dark' ? { color: '#f1f5f9' } : { color: '#0f172a' }}>
                {user?.selectedCompany || localStorage.getItem('active_company') || 'كل الشركات'}
              </h1>
              <p className={`text-[11px] font-extrabold uppercase tracking-[0.25em] mt-2`}
                style={theme === 'dark' ? { color: '#d9a770', opacity: 0.9 } : { color: '#94a3b8', opacity: 0.8 }}>{t.enterprise}</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`
              w-10 h-10 rounded-xl border transition-all shadow-lg cursor-pointer hidden lg:flex items-center justify-center z-50
              ${theme === 'dark'
                ? 'hover:text-white'
                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white'}
              ${isSidebarCollapsed ? 'mx-auto' : ''}
            `}
            style={theme === 'dark' ? { backgroundColor: '#272a33', border: '1px solid #3e4452', color: '#94a3b8' } : {}}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-500 ${isSidebarCollapsed ? (language === 'ar' ? 'rotate-180' : 'rotate-0') : (language === 'ar' ? 'rotate-0' : 'rotate-180')}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth px-4">
          <div className="py-8 space-y-12">
            {activeMenuGroups
              .map(group => {
                const pathTableMap = {
                  '/reports': 'ledger',
                  '/projects': 'projects',
                  '/sales': 'inventory_sales',
                  '/inventory/master-stock': 'inventory',
                  '/inventory/pharma': 'inventory',
                  '/fixed-assets': 'fixed_assets',
                  '/subcontractors': 'subcontractors',
                  '/real-estate': 'real_estate_projects',
                  '/partners': 'partners',
                  '/clients': 'customers',
                  '/crm': 'customers',
                  '/finance/360': 'ledger',
                  '/finance/custody': 'custody',
                  '/finance/ar-due': 'ar_invoices',
                  '/finance/ap-due': 'ledger',
                  '/finance/inventory-valuation': 'inventory',
                  '/finance/cash-balances': 'ledger',
                  '/inter-company': 'intercompany_transactions',
                  '/expenses': 'expenses',
                  '/invoices': 'subcontractor_invoices',
                  '/finance/transactions': 'ledger',
                  '/attendance': 'attendance',
                  '/corporate': 'staff',
                  '/users': 'users',
                  '/settings': 'system_parameters'
                };

                const pathModuleMap = {
                  '/reports': 'Finance',
                  '/projects': 'Projects',
                  '/sales': 'Inventory',
                  '/inventory/master-stock': 'Inventory',
                  '/inventory/pharma': 'Inventory',
                  '/fixed-assets': 'Finance',
                  '/subcontractors': 'Projects',
                  '/real-estate': 'CRM',
                  '/partners': 'Finance',
                  '/clients': 'CRM',
                  '/crm': 'CRM',
                  '/finance/360': 'Finance',
                  '/finance/custody': 'Finance',
                  '/finance/ar-due': 'Finance',
                  '/finance/ap-due': 'Finance',
                  '/finance/inventory-valuation': 'Finance',
                  '/finance/cash-balances': 'Finance',
                  '/inter-company': 'Finance',
                  '/expenses': 'Finance',
                  '/invoices': 'Finance',
                  '/finance/transactions': 'Finance',
                  '/attendance': 'HCM',
                  '/corporate': 'HCM',
                  '/users': 'Settings',
                  '/settings': 'Settings'
                };

                const visibleItems = group.items
                  .filter(item => {
                    const itemBasePath = item.path ? item.path.split('?')[0] : '';
                    if (isMtayem) {
                      const allowedMtayemPaths = [
                        '/',
                        '/projects',
                        '/inventory',
                        '/inventory/direct-issue',
                        '/sales',
                        '/inventory/pharma',
                        '/inventory/supply-chain',
                        '/subcontractors',
                        '/real-estate',
                        '/clients',
                        '/finance',
                        '/hr',
                        '/me'
                      ];
                      return allowedMtayemPaths.includes(itemBasePath) || (item.children && item.children.some(child => {
                        const childBasePath = child.path ? child.path.split('?')[0] : '';
                        return allowedMtayemPaths.includes(childBasePath);
                      }));
                    }
                    const hasRbac = isAdminOrAbzidan || !item.perm || hasPermission(item.perm);
                    if (!hasRbac) return false;

                    // Check custom user matrix permissions
                    if (user && user.permissions && !isAdminOrAbzidan) {
                      const userPerms = user.permissions;
                      if (userPerms.tables && Object.keys(userPerms.tables).length > 0) {
                        const table = pathTableMap[itemBasePath];
                        if (table) {
                          const tableActions = userPerms.tables[table] || [];
                          const hasTableRead = userPerms.tables['ALL'] || tableActions.includes('read');
                          if (!hasTableRead) return false;
                        }
                      }
                      if (userPerms.modules && userPerms.modules.length > 0) {
                        const module = pathModuleMap[itemBasePath];
                        if (module && !userPerms.modules.includes(module)) return false;
                      }
                    }
                    return true;
                  })
                  .map(item => {
                    if (item.children) {
                      const visibleChildren = item.children.filter(child => {
                        if (isMtayem) {
                          const allowedMtayemPaths = [
                            '/inventory/direct-issue',
                            '/sales',
                            '/inventory/pharma',
                            '/inventory/supply-chain'
                          ];
                          const childBasePath = child.path ? child.path.split('?')[0] : '';
                          return allowedMtayemPaths.includes(childBasePath);
                        }
                        const hasRbac = isAdminOrAbzidan || !child.perm || hasPermission(child.perm);
                        if (!hasRbac) return false;

                        // Check custom user matrix permissions for children
                        if (user && user.permissions && !isAdminOrAbzidan) {
                          const userPerms = user.permissions;
                          const childBasePath = child.path ? child.path.split('?')[0] : '';
                          if (userPerms.tables && Object.keys(userPerms.tables).length > 0) {
                            const table = pathTableMap[childBasePath];
                            if (table) {
                              const tableActions = userPerms.tables[table] || [];
                              const hasTableRead = userPerms.tables['ALL'] || tableActions.includes('read');
                              if (!hasTableRead) return false;
                            }
                          }
                          if (userPerms.modules && userPerms.modules.length > 0) {
                            const module = pathModuleMap[childBasePath];
                            if (module && !userPerms.modules.includes(module)) return false;
                          }
                        }
                        return true;
                      });
                      return { ...item, children: visibleChildren };
                    }
                    return item;
                  });
                return { ...group, items: visibleItems };
              })
              .filter(group => group.items.length > 0)
              .map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  <h3 className={`px-5 text-[13px] font-bold uppercase tracking-[0.2em] ${isSidebarCollapsed ? 'text-center' : ''}`}
                    style={theme === 'dark' ? { color: '#d9a770', opacity: 0.7, letterSpacing: '0.2em' } : { color: '#94a3b8' }}>
                    {isSidebarCollapsed ? '••' : group.title}
                  </h3>
                  <div className="space-y-1.5">
                    {group.items.map((item, iIdx) => {
                      const isItemActive = (() => {
                        try {
                          const itemUrl = new URL(item.path, window.location.origin);
                          const pathMatch = itemUrl.pathname === pathname;
                          const itemTab = itemUrl.searchParams.get('tab') || '';
                          const tabMatch = itemTab === tab;
                          return pathMatch && tabMatch;
                        } catch (e) {
                          return item.path === pathname;
                        }
                      })();
                      const isChildActive = item.children && item.children.some(child => {
                        try {
                          const childUrl = new URL(child.path, window.location.origin);
                          const pathMatch = childUrl.pathname === pathname;
                          const childTab = childUrl.searchParams.get('tab') || '';
                          const tabMatch = childTab === tab;
                          return pathMatch && tabMatch;
                        } catch (e) {
                          return false;
                        }
                      });
                      const isReallyActive = isItemActive || isChildActive;

                      return (
                        <div key={iIdx} className="space-y-1">
                          <NavLink
                            to={item.path}
                            onClick={(e) => handleItemClick(item, e)}
                            className={`
                              flex items-center gap-6 px-6 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden w-full text-left
                              ${!isReallyActive && theme !== 'dark' ? 'text-slate-800 font-semibold hover:bg-slate-100 hover:text-slate-950' : ''}
                              ${!isReallyActive && theme === 'dark' ? 'font-semibold drop-shadow-sm' : ''}
                              ${isSidebarCollapsed ? 'justify-center px-0' : ''}
                            `}
                            style={theme === 'dark' ? {
                              backgroundColor: isReallyActive ? '#29384e' : 'transparent',
                              border: isReallyActive ? '1.5px solid rgba(217,167,112,0.5)' : '1.5px solid transparent',
                              color: isReallyActive ? '#d9a770' : '#cbd5e1',
                              boxShadow: isReallyActive ? '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                              fontWeight: isReallyActive ? 700 : 600,
                            } : {
                              backgroundColor: isReallyActive ? '#0f172a' : 'transparent',
                              color: isReallyActive ? 'white' : undefined,
                              fontWeight: isReallyActive ? 700 : 600,
                            }}
                          >
                            <>
                              {isReallyActive && (
                                <div className={`absolute top-0 bottom-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-1.5`}
                                  style={theme === 'dark' ? { backgroundColor: '#d9a770', boxShadow: '0 0 15px rgba(217,167,112,0.8)' } : { backgroundColor: 'white' }}></div>
                              )}
                              <span className={`text-2xl transition-all duration-500 ${isReallyActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'group-hover:scale-110 opacity-90 group-hover:opacity-100'}`}>
                                {item.icon}
                              </span>
                              {!isSidebarCollapsed && (
                                <span className={`font-bold text-[17px] tracking-normal transition-all duration-300 ${
                                  isReallyActive && theme !== 'dark' ? 'translate-x-1 text-white drop-shadow-md font-extrabold' : ''
                                }`}
                                  style={theme === 'dark' ? {
                                    color: isReallyActive ? '#d9a770' : '#cbd5e1',
                                    fontWeight: isReallyActive ? 700 : 600,
                                  } : {}}>
                                  {item.label}
                                </span>
                              )}
                              {item.badgeKey && sidebarStats[item.badgeKey] > 0 && (
                                <div className={`absolute ${isSidebarCollapsed ? 'top-2 right-2' : 'right-4'} min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center text-[11px] font-black animate-pulse border-2 
                                  ${theme === 'dark' 
                                    ? 'bg-[#d9a770] text-[#171920] border-[#171920] shadow-[0_0_10px_rgba(217,167,112,0.4)]' 
                                    : 'bg-rose-500 text-white border-white shadow-lg shadow-rose-500/40'}`}>
                                  {sidebarStats[item.badgeKey]}
                                </div>
                              )}
                              {!isSidebarCollapsed && item.children && item.children.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedMenus(prev => ({ ...prev, [item.path]: !prev[item.path] }));
                                  }}
                                  className={`p-1.5 rounded-lg transition-all duration-300 hover:bg-white/10 text-xs ${language === 'ar' ? 'mr-auto' : 'ml-auto'}`}
                                >
                                  <svg
                                    className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedMenus[item.path] ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              )}
                            </>
                          </NavLink>

                          {/* SUBMENU ITEMS */}
                          {expandedMenus[item.path] && !isSidebarCollapsed && item.children && item.children.length > 0 && (
                            <div className={`mt-2.5 space-y-1.5 border-slate-200/50 dark:border-white/10 ${language === 'ar' ? 'mr-12 border-r pr-4' : 'ml-12 border-l pl-4'}`}>
                              {item.children.map((child, cIdx) => {
                                const isChildReallyActive = (() => {
                                  try {
                                    const childUrl = new URL(child.path, window.location.origin);
                                    const childTab = childUrl.searchParams.get('tab') || '';
                                    return childUrl.pathname === pathname && childTab === tab;
                                  } catch (e) {
                                    return child.path === pathname;
                                  }
                                })();

                                return (
                                  <NavLink
                                    key={cIdx}
                                    to={child.path}
                                    className={`
                                      flex items-center gap-4 px-5 py-3 rounded-xl transition-all duration-300 font-bold text-[14px] w-full text-left
                                      ${!isChildReallyActive && theme !== 'dark' ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80' : ''}
                                      ${isChildReallyActive && theme !== 'dark' ? 'bg-slate-200/60 text-slate-950 font-extrabold shadow-sm' : ''}
                                    `}
                                    style={theme === 'dark' ? {
                                      backgroundColor: isChildReallyActive ? 'rgba(41,56,78,0.7)' : 'transparent',
                                      color: isChildReallyActive ? '#d9a770' : '#94a3b8',
                                      border: isChildReallyActive ? '1px solid rgba(217,167,112,0.3)' : '1px solid transparent',
                                      fontWeight: isChildReallyActive ? 700 : 500,
                                    } : {}}
                                  >
                                    <span className="text-lg">{child.icon}</span>
                                    <span>{child.label}</span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </nav>

        <div className={`p-6 mt-auto transition-all duration-300 ${isSidebarCollapsed ? 'items-center' : ''}`}>
          <div className={`p-5 rounded-[1.5rem] border backdrop-blur-md space-y-5 ${isSidebarCollapsed ? 'p-2' : ''} ${theme !== 'dark' ? 'bg-white border-slate-200 shadow-sm' : ''}`}
            style={theme === 'dark' ? { backgroundColor: '#272a33', border: '1px solid #3e4452' } : {}}>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-xl overflow-hidden`}
                  style={theme === 'dark'
                    ? { background: 'linear-gradient(135deg, #29384e 0%, #1d2026 100%)', color: '#d9a770', border: '1.5px solid rgba(217,167,112,0.5)' }
                    : { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }}>
                  {user?.photo || user?.avatar_url ? (
                    <img 
                      src={(user.photo || user.avatar_url).startsWith('/') && !(user.photo || user.avatar_url).startsWith('//') 
                        ? `${window.location.origin.includes('localhost') ? 'http://localhost:4000' : 'http://46.224.144.166'}${user.photo || user.avatar_url}` 
                        : (user.photo || user.avatar_url)
                      } 
                      alt={user?.username} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <img 
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'User'}&backgroundColor=171920`} 
                      alt={user?.username} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className={`text-[15px] font-bold truncate`}
                    style={theme === 'dark' ? { color: '#f1f5f9' } : { color: '#0f172a' }}>{user?.username || 'User'}</p>
                  <p className={`text-[11px] font-bold uppercase tracking-widest mt-1`}
                    style={theme === 'dark' ? { color: '#d9a770', opacity: 0.8 } : { color: '#94a3b8', opacity: 0.7 }}>{(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super admin') ? t.admin : t.user}</p>
                </div>
              </div>
            )}

            <div className={`flex ${isSidebarCollapsed ? 'flex-col gap-3 items-center' : 'gap-3'} transition-all`}>
              <button
                onClick={() => updatePreferences({ theme: theme === 'dark' ? 'light' : 'dark' })}
                className={`flex-1 h-10 flex items-center justify-center rounded-xl border transition-all ${theme !== 'dark' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : ''} ${isSidebarCollapsed ? 'w-12 h-12' : ''}`}
                style={theme === 'dark' ? { backgroundColor: '#22252e', border: '1px solid #3e4452', color: '#94a3b8' } : {}}
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => updatePreferences({ language: language === 'ar' ? 'en' : 'ar' })}
                className={`flex-1 h-10 flex items-center justify-center rounded-xl border transition-all text-[11px] font-bold ${theme !== 'dark' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : ''} ${isSidebarCollapsed ? 'w-12 h-12' : ''}`}
                style={theme === 'dark' ? { backgroundColor: '#22252e', border: '1px solid #3e4452', color: '#94a3b8' } : {}}
              >
                {language === 'ar' ? 'EN' : 'AR'}
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className={`h-10 flex items-center justify-center rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest border ${theme !== 'dark' ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white' : ''} ${isSidebarCollapsed ? 'w-12 h-12' : 'flex-[2]'}`}
                style={theme === 'dark' ? { backgroundColor: 'rgba(217,167,112,0.1)', color: '#d9a770', border: '1px solid rgba(217,167,112,0.3)' } : {}}
              >
                {isSidebarCollapsed ? '🚪' : t.logout}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-colors duration-300 ${theme !== 'dark' ? 'bg-white text-slate-900' : ''}`}
        style={theme === 'dark' ? { backgroundColor: '#1d2026', color: '#f1f5f9' } : {}}>
        <header className={`h-20 border-b flex items-center justify-between px-4 lg:px-10 z-50 print:hidden ${theme !== 'dark' ? 'bg-white border-slate-100 text-slate-900' : ''}`}
          style={theme === 'dark' ? { backgroundColor: '#171920', borderColor: '#2e323d', color: '#f1f5f9' } : {}}>
          <div className="flex items-center gap-4 lg:gap-8 flex-1">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden w-10 h-10 flex items-center justify-center rounded-xl border shadow-sm ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="relative w-full max-w-xl group">
              <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-slate-400`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                placeholder={t.searchPlaceholder}
                className={`
                    w-full border outline-none transition-all py-2.5 lg:py-3 rounded-xl lg:rounded-2xl text-[12px] lg:text-[13px] font-bold placeholder:text-slate-400 placeholder:font-medium
                    ${language === 'ar' ? 'pr-10 lg:pr-12 pl-4 lg:pl-16' : 'pl-10 lg:pl-12 pr-4 lg:pr-16'} 
                    ${theme === 'dark' 
                      ? 'bg-white/5 border-white/10 text-white focus:bg-white/10 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50' 
                      : 'bg-slate-50 border-slate-100 text-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300'}
                   `}
              />
              {isSearchOpen && (searchQuery.length >= 2) && (
                <div className={`absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${theme === 'dark' ? 'bg-[#1a1f2c] border-white/10' : 'bg-white border-slate-100'}`}>
                  {isSearching ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-500">{language === 'ar' ? 'جاري البحث...' : 'Searching...'}</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-[70vh] overflow-y-auto p-2 custom-scrollbar">
                      <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                        {language === 'ar' ? 'نتائج البحث' : 'Search Results'}
                      </div>
                      {searchResults.map((item, idx) => (
                        <div
                          key={`${item.category}-${item.id}-${idx}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setIsSearchOpen(false);
                            setSearchQuery('');
                            if (item.path) navigate(item.path);
                          }}
                          className="flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-all group/item border-b border-slate-50/50 last:border-0"
                        >
                          <span className="text-2xl p-2 bg-slate-50 group-hover/item:bg-white rounded-xl shadow-sm border border-slate-100/80 transition-all">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-black text-slate-900 truncate group-hover/item:text-blue-600 transition-colors">{item.title}</span>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200/60">{item.category}</span>
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] font-semibold text-slate-500 truncate">{item.subtitle}</div>
                            )}
                          </div>
                          <svg className={`w-4 h-4 text-slate-300 group-hover/item:text-slate-600 transition-colors ${language === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <svg className="w-8 h-8 mb-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs font-bold text-slate-600">{language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results found'}</span>
                      <span className="text-[10px] font-medium text-slate-400">{language === 'ar' ? 'جرب البحث بكلمات مفتاحية أخرى' : 'Try searching with different keywords'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-8">
            <NotificationCenter />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">{t.workspace}</span>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border`}
                style={theme === 'dark'
                  ? { backgroundColor: 'rgba(41,56,78,0.5)', border: '1px solid rgba(217,167,112,0.3)' }
                  : { backgroundColor: '#f0fdf4', border: '1px solid #d1fae5' }}>
                <span className={`text-[9px] font-black uppercase tracking-tighter`}
                  style={theme === 'dark' ? { color: '#d9a770' } : { color: '#065f46' }}>{t.connected}</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: theme === 'dark' ? '#d9a770' : '#34d399' }}></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ backgroundColor: theme === 'dark' ? '#d9a770' : '#10b981' }}></span>
                </span>
              </div>
            </div>
          </div>
        </header>
        <div className={`flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar print:p-0 print:overflow-visible transition-colors duration-300 ${theme !== 'dark' ? 'bg-slate-50/50' : ''}`}
          style={theme === 'dark' ? { backgroundColor: '#1d2026' } : {}}>
          <div className="max-w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}