import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const TabButton = ({ active, onClick, label, icon }) => {
  return (
    <button 
      onClick={onClick} 
      className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
        active 
          ? 'bg-white text-slate-900 shadow-md border border-slate-200' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
      }`}
    >
      {icon && <span>{icon}</span>} {label}
    </button>
  );
};

export default function HR() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('staff'); 
  const [loading, setLoading] = useState(false);

  const translations = {
    ar: {
      title: "القيادة الشاملة للموارد البشرية (HRMS)",
      subtitle: "رواتب، سلف، حضور جغرافي، وقيود آلية",
      tabs: {
        staff: "الموظفين",
        archive: "الأرشيف",
        payrollSheet: "مسير الرواتب",
        advances: "السلف",
        gps: "الحضور (GPS)",
        qr: "QR الحضور",
        batch: "رفع مجمع",
        logs: "سجل الدوام"
      },
      staffTable: {
        title: "قاعدة بيانات الموظفين",
        addAdvance: "صرف سلفة",
        addStaff: "تعيين موظف",
        id: "ID",
        name: "الاسم",
        company: "الشركة / القطاع",
        salary: "الأساسي",
        loading: "جاري تحميل سجل الموظفين...",
        empty: "لا يوجد موظفين مسجلين."
      },
      payrollSheet: {
        period: "فترة الرواتب:",
        update: "تحديث البيانات",
        note: "يتم سحب الحضور والعمولات والسلف آلياً 🤖",
        employee: "الموظف",
        jobTitle: "المسمى الوظيفي",
        basic: "الأساسي",
        absence: "الغياب (GPS)",
        advanceDeduction: "أقساط السلف",
        autoCommissions: "عمولات آلية",
        netSalary: "الصافي المتوقع",
        action: "الإجراء",
        review: "مراجعة واصدار"
      },
      advances: {
        title: "سجل سلف العاملين والذمم المفتوحة",
        addNew: "صرف سلفة جديدة",
        employee: "الموظف",
        date: "تاريخ الصرف",
        method: "طريقة السداد",
        total: "إجمالي المبلغ",
        monthly: "القسط الشهري",
        remaining: "الرصيد المتبقي",
        status: "الحالة",
        open: "مفتوحة",
        paid: "مسددة",
        payrollDeduction: "خصم من الراتب"
      },
      archive: {
        title: "سجل الرواتب والمفردات المصدرة",
        addPayroll: "إصدار راتب (Payslip)",
        id: "رقم الحركة",
        employee: "الموظف",
        month: "شهر",
        project: "المركز المحمل",
        net: "الصافي المنصرف",
        loading: "جاري التحميل...",
        empty: "لا توجد سجلات رواتب."
      },
      gps: {
        title: "تسجيل الدوام الجغرافي",
        locationLabel: "تحديد الموقع / المشروع *",
        selectLocation: "-- اختر موقع العمل --",
        mainOffice: "المقر الرئيسي (الإدارة)",
        getGps: "تحديد موقعي الحالي (GPS)",
        gpsSuccess: "تم التقاط الإحداثيات بدقة عالية",
        gpsError: "يجب السماح بالموقع!",
        checkIn: "تسجيل الدخول",
        checkOut: "تسجيل الانصراف"
      },
      qr: {
        title: "بوابة الحضور السريعة QR",
        success: "تم تسجيل الحضور بنجاح",
        scan: "امسح الكود عبر التطبيق للهاتف المحمول",
        refresh: "يتغير الكود كل 10 ثوانٍ تلقائياً"
      },
      batch: {
        title: "رفع مجمع لملفات الحضور والرواتب",
        downloadTemplate: "تحميل قالب CSV للموظفين",
        selectFile: "اختر ملف CSV للرفع *",
        upload: "بدء رفع الملف وتحديث السيرفر",
        selectLocProject: "يجب اختيار الموقع أولاً!",
        success: "تم الرفع والتثبيت بنجاح!",
        uploadSuccess: "تم معالجة الملف وتعيين الموظفين!"
      },
      modals: {
        advance: {
          title: "صرف سلفة لموظف",
          selectStaff: "-- اختر الموظف --",
          staff: "الموظف *",
          amount: "إجمالي السلفة *",
          monthly: "القسط المخصوم شهرياً *",
          save: "حفظ واعتماد السلفة"
        },
        staff: {
          title: "إضافة موظف جديد",
          name: "اسم الموظف *",
          salary: "الراتب الأساسي *",
          jobTitle: "المسمى الوظيفي",
          joiningDate: "تاريخ التعيين",
          idNumber: "رقم الهوية",
          company: "الشركة المسجل عليها *",
          selectCompany: "-- اختر الشركة --",
          save: "حفظ بيانات الموظف"
        },
        payroll: {
          title: "إصدار مفردات الراتب (Payslip)",
          selectStaff: "-- اختر الموظف --",
          staff: "اختر الموظف *",
          month: "عن شهر *",
          basic: "الراتب الأساسي",
          incentives: "حوافز",
          commissions: "عمولات إضافية (يدوي)",
          deductions: "خصومات (جزاءات) 🤖",
          advance: "قسط سلفة 🤖",
          costDist: "توزيع التكلفة المحاسبي على المشاريع",
          total: "الإجمالي:",
          note: "🤖 الحقول المظللة بالأحمر يتم حسابها وسحبها آلياً.",
          general: "عام / إداري (General)",
          addProject: "+ إضافة مشروع للتحميل المالي",
          submit: "اعتماد الصرف وتوليد القيود"
        }
      },
      alerts: {
        advanceSuccess: "تم تسجيل السلفة بنجاح كمديونية على الموظف.",
        advanceError: "حدث خطأ أثناء تسجيل السلفة.",
        error: "حدث خطأ.",
        percentError: "يجب أن يكون مجموع التوزيع 100% بالضبط.",
        payrollSuccess: "تم صرف الراتب وخصم السلف وتوليد القيود بنجاح!",
        gpsError: "متصفحك لا يدعم تحديد الموقع.",
        selectLocProject: "حدد الموقع والمشروع أولاً!",
        success: "بنجاح!",
        csvError: "اختر ملف CSV.",
        uploadSuccess: "تم رفع الملف بنجاح!"
      }
    },
    en: {
      title: "Comprehensive HR & Resource Management (HRMS)",
      subtitle: "Integrated Payroll, Advances, GPS Verification & Ledger Sync",
      tabs: {
        staff: "Staff Database",
        archive: "Payroll Archive",
        payrollSheet: "Payroll Sheet",
        advances: "Advances Ledger",
        gps: "GPS Attendance",
        qr: "QR Portal",
        batch: "Batch Upload",
        logs: "Shift Logs"
      },
      staffTable: {
        title: "Employee Directory",
        addAdvance: "Issue Advance",
        addStaff: "Hire Employee",
        id: "ID",
        name: "Full Name",
        company: "Company",
        salary: "Basic Salary",
        loading: "Fetching personnel files...",
        empty: "No employees registered yet."
      },
      payrollSheet: {
        period: "Payroll Month:",
        update: "Recompute Sheet",
        note: "Absence, advances & commissions are pulled automatically 🤖",
        employee: "Employee",
        jobTitle: "Role",
        basic: "Basic",
        absence: "Absences",
        advanceDeduction: "Advances",
        autoCommissions: "Commissions",
        netSalary: "Expected Net",
        action: "Action",
        review: "Review & Issue"
      },
      advances: {
        title: "Advances & Balances",
        addNew: "New Advance",
        employee: "Employee",
        date: "Date",
        method: "Method",
        total: "Total",
        monthly: "Monthly",
        remaining: "Remaining",
        status: "Status",
        open: "Open",
        paid: "Paid",
        payrollDeduction: "Payroll Deduction"
      },
      archive: {
        title: "Payroll Archive",
        addPayroll: "Issue Payslip",
        id: "Trans ID",
        employee: "Employee",
        month: "Month",
        project: "Cost Center",
        net: "Net Paid",
        loading: "Loading...",
        empty: "No payroll records found."
      },
      gps: {
        title: "GPS Attendance Tracking",
        locationLabel: "Select Site *",
        selectLocation: "-- Select Site --",
        mainOffice: "Main HQ",
        getGps: "Capture Location (GPS)",
        gpsSuccess: "Coordinates captured",
        gpsError: "Location required!",
        checkIn: "Check-In",
        checkOut: "Check-Out"
      },
      qr: {
        title: "Scan QR for Attendance",
        note: "Refreshes automatically every 10 seconds."
      },
      batch: {
        title: "Batch Upload (CSV)",
        required: "Columns:",
        note: "Ensure date format matches system.",
        uploadBtn: "Process File"
      },
      modals: {
        advance: {
          title: "Issue Staff Advance",
          selectStaff: "-- Select Staff --",
          staff: "Employee *",
          amount: "Total Advance *",
          monthly: "Monthly *",
          save: "Save & Authorize"
        },
        staff: {
          title: "Add New Employee",
          name: "Full Name *",
          salary: "Basic Salary *",
          jobTitle: "Job Title",
          joiningDate: "Joining Date",
          idNumber: "ID / Passport No.",
          company: "Company *",
          selectCompany: "-- Select Company --",
          save: "Save Employee Data"
        },
        payroll: {
          title: "Issue Payslip",
          selectStaff: "-- Select Employee --",
          staff: "Employee *",
          month: "Month *",
          basic: "Basic",
          incentives: "Incentives",
          commissions: "Manual Comms",
          deductions: "Deductions 🤖",
          advance: "Advance 🤖",
          costDist: "Cost Distribution",
          total: "Total:",
          note: "🤖 Automated fields are highlighted.",
          general: "General / Admin",
          addProject: "+ Add Project",
          submit: "Authorize & Generate"
        }
      },
      alerts: {
        advanceSuccess: "Advance registered successfully.",
        advanceError: "Error recording advance.",
        error: "An error occurred.",
        percentError: "Total must be exactly 100%.",
        payrollSuccess: "Payroll issued successfully!",
        gpsError: "GPS not supported.",
        selectLocProject: "Select site first!",
        success: "Success!",
        csvError: "Select CSV file.",
        uploadSuccess: "File uploaded successfully!"
      }
    }
  };

  const t = translations[language] || translations['ar'];

  // States
  const [staffList, setStaffList] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [projectsList, setProjectsList] = useState([]); 
  const [jobTitlesList, setJobTitlesList] = useState([]);
  const [projectCompaniesList, setProjectCompaniesList] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);

  const handleEditStaff = (s) => {
    setEditingStaffId(s.id);
    setStaffForm({
      name: s.name || '',
      salary: s.salary || '',
      company: s.company || '',
      job_title: s.job_title || s.jobTitle || '',
      department: s.department || '',
      id_number: s.id_number || '',
      joining_date: s.joining_date ? new Date(s.joining_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaff = async (id) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الموظف؟' : 'Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/delete/staff/${id}`);
        fetchData();
      } catch (error) {
        alert(t.alerts.error);
      }
    }
  };
  
const boqCategories = [
  "مصروفات أخرى",
  "أعمال صحي",
  "أعمال عزل",
  "أعمال كهرباء",
  "أعمال تأسيس تكييف",
  "أعمال توريد وتركيب تكييف - HVAC",
  "أعمال تركيب تكييف",
  "أعمال بياض محاره",
  "أعمال دهانات",
  "أعمال دهانات MICRO CEMENT",
  "أعمال دهانات إيبوكسي",
  "أعمال دهانات أستر",
  "أعمال توريد وتركيب أبواب داخلية",
  "أعمال توريد وتركيب باب مصفح",
  "أعمال ألوميتال",
  "أعمال شيش حصره ( SHUTTER )",
  "أعمال سيراميك حوائط",
  "أعمال بورسلين أرضيات",
  "أعمال بورسلين طاولات",
  "أعمال رخام أرضيات",
  "أعمال رخام حوائط",
  "أعمال رخام درج",
  "أعمال رخام طاولات",
  "أعمال جيرانيت درج",
  "أعمال جيرانيت طاولات",
  "أعمال جيرانيت أرضيات",
  "أعمال جيرانيت حوائط",
  "أعمال توريد وتركيب حجر مايكا حوائط",
  "أعمال باركيه أرضيات",
  "أعمال إتش دي إف أرضيات",
  "أعمال ورق حائط جدران",
  "أعمال فوم حوائط",
  "أعمال ستيل جدران",
  "أعمال مرايات جدران",
  "أعمال زجاج سيكوريت",
  "أعمال جبسون بورد أسقف",
  "أعمال بانوهات جدران",
  "أعمال بديل رخام جدران",
  "أعمال بديل خشب جدران",
  "أعمال توريد وتركيب حديد فورفورجيه حماية شبابيك وبلكونات وباب شقة",
  "أعمال سلك شريط ناموس رول حماية",
  "أعمال نجارة باب وشباك",
  "أعمال زجاج دبل جلاس عازل للصوت والحرارة",
  "أعمال توريد وتركيب قرميد أسقف ومظلات وبرجولات خشيبية وحديدية وبلاستيك",
  "أعمال لاند سكيب",
  "أعمال شبكات ري",
  "أعمال إضاءة لاند سكيب"
];

  const [staffForm, setStaffForm] = useState({ name: '', salary: '', company: '', job_title: '', department: '', id_number: '', joining_date: new Date().toISOString().split('T')[0] });
  const [advanceForm, setAdvanceForm] = useState({ staff_id: '', amount: '', deduction_per_month: '', request_date: new Date().toISOString().split('T')[0], repayment_method: 'Payroll Deduction' });
  const [advancesList, setAdvancesList] = useState([]);
  const [payrollForm, setPayrollForm] = useState({
    staffId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    projects: [{ project_name: 'General', percent: 100 }],
    basic_salary: 0, incentives: 0, commissions: 0, expenses: 0, profit_share: 0, deductions: 0, advance_deduction: 0,
    category: 'مصاريف المرتبات والأجور'
  });

  const [payrollSheet, setPayrollSheet] = useState([]);
  const [sheetPeriod, setSheetPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const [location, setLocation] = useState({ lat: null, lng: null });
  const [locError, setLocError] = useState('');
  const [selectedAttProject, setSelectedAttProject] = useState('');
  const [dynamicQR, setDynamicQR] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchData();
    if (activeTab === 'qr') {
      generateQR();
      const interval = setInterval(generateQR, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (payrollForm.staffId && payrollForm.month && payrollForm.year) {
      fetchAutoDeductions(payrollForm.staffId, payrollForm.month, payrollForm.year);
    }
  }, [payrollForm.staffId, payrollForm.month, payrollForm.year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ddRes = await api.get('/dropdowns');
      setProjectsList(ddRes.data.projects || []);
      setJobTitlesList(ddRes.data.job_titles_dd || []);
      setProjectCompaniesList(ddRes.data.project_companies_dd || []);

      if (activeTab === 'staff') {
        const res = await api.get('/table/staff?limit=100');
        setStaffList(res.data.data || []);
      } else if (activeTab === 'payroll') {
        const res = await api.get('/table/payroll?limit=500');
        setPayrollHistory(res.data.data || []);
      } else if (activeTab === 'payroll_sheet') {
        const res = await api.get(`/staff/payroll-summary/${sheetPeriod.month}/${sheetPeriod.year}`);
        setPayrollSheet(res.data || []);
      } else if (activeTab === 'advances_list') {
        const res = await api.get('/table/staff_advances?limit=100');
        setAdvancesList(res.data.data || []);
      } else if (activeTab === 'log') {
        const res = await api.get('/table/attendance?limit=100');
        setAttendanceLogs(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoDeductions = async (staffId, month, year) => {
    try {
      const attRes = await api.get(`/staff/attendance-summary/${staffId}/${month}/${year}`);
      const advRes = await api.get(`/staff/advance-due/${staffId}`);
      const staff = staffList.find(s => s.id.toString() === staffId.toString());
      
      setPayrollForm(prev => ({
        ...prev,
        basic_salary: staff ? staff.salary : 0,
        deductions: 0,
        advance_deduction: advRes.data.due_amount || 0
      }));
    } catch (error) {
      console.error("Auto Fetch Error", error);
    }
  };

  const handleStaffChange = (e) => setStaffForm({ ...staffForm, [e.target.name]: e.target.value });
  const calculateTotalPercent = () => payrollForm.projects.reduce((sum, p) => sum + (Number(p.percent) || 0), 0);

  const handleProjectPercentChange = (index, field, value) => {
    const updatedProjects = [...payrollForm.projects];
    updatedProjects[index][field] = field === 'percent' ? Number(value) : value;
    setPayrollForm({ ...payrollForm, projects: updatedProjects });
  };

  const submitAdvance = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/staff/advance', advanceForm);
      alert(t.alerts.advanceSuccess);
      setIsAdvanceModalOpen(false);
      setAdvanceForm({ staff_id: '', amount: '', deduction_per_month: '', request_date: new Date().toISOString().split('T')[0], repayment_method: 'Payroll Deduction' });
      fetchData();
    } catch (error) {
      alert(t.alerts.advanceError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitStaff = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingStaffId) {
        await api.put(`/update/staff/${editingStaffId}`, { ...staffForm, salary: Number(staffForm.salary) });
      } else {
        await api.post('/add/staff', { ...staffForm, salary: Number(staffForm.salary) });
      }
      setIsStaffModalOpen(false);
      setEditingStaffId(null);
      setStaffForm({ name: '', salary: '', company: '', job_title: '', department: '', id_number: '', joining_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      alert(t.alerts.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPayroll = async (e) => {
    e.preventDefault();
    const totalPercent = calculateTotalPercent();
    if (totalPercent !== 100) return alert(t.alerts.percentError);
    
    setIsSubmitting(true);
    try {
      await api.post('/staff/payroll', payrollForm);
      alert(t.alerts.payrollSuccess);
      setIsPayrollModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || t.alerts.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateQR = () => setDynamicQR(btoa(Date.now().toString() + "_TED_ERP").substring(0, 15));
  
  const getLocation = () => {
    if (!navigator.geolocation) return setLocError(t.alerts.gpsError);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocError(''); },
      () => setLocError(t.gps.gpsError), { enableHighAccuracy: true }
    );
  };

  const handleSelfService = async (type) => {
    if (!location.lat || !selectedAttProject) return alert(t.alerts.selectLocProject);
    try {
      await api.post('/attendance/check', { type, lat: location.lat, lng: location.lng, project_name: selectedAttProject });
      alert(`${type} ${t.alerts.success}`);
    } catch (error) { alert(`🛑 ${error.response?.data?.error || t.alerts.error}`); }
  };

  const submitBatchFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert(t.alerts.csvError);
    const formData = new FormData();
    formData.append('file', selectedFile);
    setLoading(true);
    try {
      const res = await api.post('/attendance/batch-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(`${t.alerts.uploadSuccess} (${res.data.insertedRows || 0})`);
      setSelectedFile(null); 
      e.target.reset();
    } catch (error) {
      alert(error.response?.data?.error || t.alerts.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-fade-in">
      {/* Header Section --- */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-slate-900/20">
                👥
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {t.title}
                </h1>
                <p className="text-slate-400 font-medium text-xs mt-1 uppercase tracking-widest">
                  {t.subtitle}
                </p>
              </div>
            </div>

            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto max-w-full">
              <TabButton active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} label={t.tabs.staff} icon="👤" />
              <TabButton active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} label={t.tabs.archive} icon="📜" />
              <TabButton active={activeTab === 'payroll_sheet'} onClick={() => setActiveTab('payroll_sheet')} label={t.tabs.payrollSheet} icon="📊" />
              <TabButton active={activeTab === 'advances_list'} onClick={() => setActiveTab('advances_list')} label={t.tabs.advances} icon="💸" />
              <div className="w-px h-6 bg-slate-200 mx-2 self-center"></div>
              <TabButton active={activeTab === 'self_service'} onClick={() => setActiveTab('self_service')} label={t.tabs.gps} icon="📍" />
              <TabButton active={activeTab === 'qr'} onClick={() => setActiveTab('qr')} label={t.tabs.qr} icon="📱" />
              <TabButton active={activeTab === 'batch'} onClick={() => setActiveTab('batch')} label={t.tabs.batch} icon="📁" />
              <TabButton active={activeTab === 'log'} onClick={() => setActiveTab('log')} label={t.tabs.logs} icon="🕒" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-10 space-y-10">
        {/* Content Area --- */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in min-h-[600px]">
          
          {/* TAB: STAFF --- */}
          {activeTab === 'staff' && (
            <>
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-white">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.staffTable.title}</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Personnel and resource management</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsAdvanceModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                  >
                    <span>💸</span> {t.staffTable.addAdvance}
                  </button>
                  <button 
                    onClick={() => setIsStaffModalOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"
                  >
                    <span>+</span> {t.staffTable.addStaff}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest">
                      <th className="px-6 py-4 font-bold">{t.staffTable.id}</th>
                      <th className="px-6 py-4 font-bold">{t.staffTable.name}</th>
                      <th className="px-6 py-4 font-bold">{t.staffTable.company}</th>
                      <th className={`px-6 py-4 font-bold ${language === 'ar' ? 'text-left' : 'text-right'}`}>{t.staffTable.salary}</th>
                      <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan="5" className="p-24 text-center text-slate-300 font-bold animate-pulse italic">Syncing records...</td></tr>
                    ) : filteredStaffList.length === 0 ? (
                      <tr><td colSpan="5" className="p-24 text-center text-slate-400 font-bold italic">{t.staffTable.empty}</td></tr>
                    ) : filteredStaffList.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                        <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">EMP-{s.id}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900 text-base">{s.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-500 text-sm">{s.company || '-'}</span>
                        </td>
                        <td className={`px-6 py-4 font-mono font-bold text-slate-900 text-lg ${language === 'ar' ? 'text-left' : 'text-right'} bg-slate-50/50`}>
                          {Number(s.salary).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center space-x-2">
                          <button 
                            onClick={() => handleEditStaff(s)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all inline-flex items-center gap-1"
                          >
                            ✏️ {language === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                          <button 
                            onClick={() => handleDeleteStaff(s.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all inline-flex items-center gap-1"
                          >
                            🗑️ {language === 'ar' ? 'حذف' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: PAYROLL SHEET --- */}
          {activeTab === 'payroll_sheet' && (
            <div className="p-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                 <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t.payrollSheet.period}</h3>
                    <div className="flex items-center gap-2">
                      <input type="number" value={sheetPeriod.month} onChange={(e) => setSheetPeriod({...sheetPeriod, month: e.target.value})} className="w-16 px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold text-slate-900 focus:border-slate-900 outline-none text-center" min="1" max="12" />
                      <input type="number" value={sheetPeriod.year} onChange={(e) => setSheetPeriod({...sheetPeriod, year: e.target.value})} className="w-24 px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold text-slate-900 focus:border-slate-900 outline-none text-center" />
                    </div>
                    <button onClick={fetchData} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">{t.payrollSheet.update}</button>
                 </div>
                 <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 uppercase tracking-widest">{t.payrollSheet.note}</div>
              </div>
              <div className="overflow-x-auto -mx-8">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">{t.payrollSheet.employee}</th>
                      <th className="px-6 py-4 text-center">{t.payrollSheet.basic}</th>
                      <th className="px-6 py-4 text-center text-rose-500">{t.payrollSheet.absence}</th>
                      <th className="px-6 py-4 text-center text-rose-500">{t.payrollSheet.advanceDeduction}</th>
                      <th className="px-6 py-4 text-center text-emerald-600">{t.payrollSheet.autoCommissions}</th>
                      <th className="px-6 py-4 text-center bg-emerald-50 text-emerald-900">{t.payrollSheet.netSalary}</th>
                      <th className="px-6 py-4 text-center">{t.payrollSheet.action}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredPayrollSheet.map(item => (
                       <tr key={item.staff_id} className="hover:bg-slate-50 transition-all group">
                         <td className="px-6 py-4">
                           <div className="flex flex-col">
                             <span className="font-bold text-slate-900 text-sm tracking-tight">{item.name}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.job_title || '-'}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-center font-mono font-bold text-slate-900 text-sm">{Number(item.basic_salary).toLocaleString()}</td>
                         <td className="px-6 py-4 text-center font-mono font-bold text-rose-500 text-sm">-{Number(item.suggested_deduction).toLocaleString()}</td>
                         <td className="px-6 py-4 text-center font-mono font-bold text-rose-500 text-sm">-{Number(item.advance_deduction).toLocaleString()}</td>
                         <td className="px-6 py-4 text-center font-mono font-bold text-emerald-600 text-sm">+{Number(item.auto_commissions).toLocaleString()}</td>
                         <td className="px-6 py-4 text-center font-mono font-bold text-emerald-700 bg-emerald-50 text-base">{Number(item.net_salary).toLocaleString()}</td>
                         <td className="px-6 py-4 text-center">
                           <button onClick={() => {
                             setPayrollForm({
                               ...payrollForm,
                               staffId: item.staff_id,
                               basic_salary: item.basic_salary,
                               deductions: 0,
                               advance_deduction: item.advance_deduction,
                               commissions: 0 
                             });
                             setIsPayrollModalOpen(true);
                           }} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-md hover:bg-indigo-600 transition-all">{t.payrollSheet.review}</button>
                         </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ADVANCES LIST --- */}
          {activeTab === 'advances_list' && (
            <>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.advances.title}</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Staff credit and liability tracking</p>
                </div>
                <button 
                  onClick={() => setIsAdvanceModalOpen(true)} 
                  className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <span>+</span> {t.advances.addNew}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">{t.advances.employee}</th>
                      <th className="px-6 py-4">{t.advances.date}</th>
                      <th className="px-6 py-4">{t.advances.method}</th>
                      <th className="px-6 py-4 text-center">{t.advances.total}</th>
                      <th className="px-6 py-4 text-center">{t.advances.monthly}</th>
                      <th className="px-6 py-4 text-center">{t.advances.remaining}</th>
                      <th className="px-6 py-4 text-center">{t.advances.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAdvancesList.map(adv => (
                      <tr key={adv.id} className="hover:bg-slate-50 transition-all group">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">EMP-{adv.staff_id}</td>
                        <td className="px-6 py-4 font-bold text-slate-500 text-xs">{new Date(adv.request_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                        <td className="px-6 py-4 font-bold text-slate-500 text-xs">{adv.repayment_method === 'Payroll Deduction' ? t.advances.payrollDeduction : adv.repayment_method}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-900 text-sm">{Number(adv.amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-rose-500 text-sm">-{Number(adv.deduction_per_month).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-emerald-700 text-sm bg-slate-50/50">{Number(adv.remaining_balance).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest border ${adv.remaining_balance > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {adv.remaining_balance > 0 ? t.advances.open : t.advances.paid}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: ARCHIVE --- */}
          {activeTab === 'payroll' && (
            <>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.archive.title}</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Historical payroll records and disbursements</p>
                </div>
                <button 
                  onClick={() => setIsPayrollModalOpen(true)} 
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"
                >
                  <span>+</span> {t.archive.addPayroll}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                      <th className="px-6 py-4">{t.archive.id}</th>
                      <th className="px-6 py-4">{t.archive.employee}</th>
                      <th className="px-6 py-4 text-center">{t.archive.month}</th>
                      <th className="px-6 py-4 text-center">{t.archive.project}</th>
                      <th className={`px-6 py-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{t.archive.net}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan="5" className="p-24 text-center text-slate-300 font-bold animate-pulse italic">Loading history...</td></tr>
                    ) : filteredPayrollHistory.length === 0 ? (
                      <tr><td colSpan="5" className="p-24 text-center text-slate-400 font-bold italic">{t.archive.empty}</td></tr>
                    ) : filteredPayrollHistory.map(pr => (
                      <tr key={pr.id} className="hover:bg-slate-50 transition-all group">
                        <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">PAY-{pr.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 text-sm">{pr.staff_name || pr.staff_id}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-500 text-xs">{pr.period}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-bold border border-indigo-100 uppercase tracking-widest">{pr.project_name || 'General'}</span>
                        </td>
                        <td className={`px-6 py-4 font-mono font-bold text-emerald-600 text-lg ${language === 'ar' ? 'text-left' : 'text-right'} bg-slate-50/50`}>
                          {Number(pr.amount || pr.net_salary).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB: GPS ATTENDANCE --- */}
          {activeTab === 'self_service' && (
            <div className="p-16 max-w-2xl mx-auto space-y-12 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm border border-blue-100 mb-6">📍</div>
                <h3 className="text-2xl font-bold text-slate-900">{t.gps.title}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{language === 'ar' ? 'تسجيل الحضور الجغرافي الذكي' : 'Smart Geofenced Attendance Verification'}</p>
              </div>

              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl space-y-8 relative overflow-hidden">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.gps.locationLabel}</label>
                  <select value={selectedAttProject} onChange={(e) => setSelectedAttProject(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none">
                    <option value="">{t.gps.selectLocation}</option>
                    <option value="General">{t.gps.mainOffice}</option>
                    {projectsList.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {!location.lat ? (
                  <button onClick={getLocation} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-3">
                    <span className="text-lg">🛰️</span> {t.gps.getGps}
                  </button>
                ) : (
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Latitude</p>
                        <p className="font-mono font-bold text-emerald-900 text-sm">{location.lat.toFixed(6)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Longitude</p>
                        <p className="font-mono font-bold text-emerald-900 text-sm">{location.lng.toFixed(6)}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-emerald-100 flex items-center gap-2 text-emerald-700 font-bold text-[10px] uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {t.gps.gpsSuccess}
                    </div>
                  </div>
                )}
                
                {locError && <p className="text-rose-500 font-bold text-xs text-center animate-shake">⚠️ {locError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <button 
                  disabled={loading || !location.lat} 
                  onClick={() => handleSelfService('Check-In')} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-40"
                >
                  {t.gps.checkIn}
                </button>
                <button 
                  disabled={loading || !location.lat} 
                  onClick={() => handleSelfService('Check-Out')} 
                  className="bg-rose-600 hover:bg-rose-700 text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 active:scale-[0.98] disabled:opacity-40"
                >
                  {t.gps.checkOut}
                </button>
              </div>
            </div>
          )}

          {/* TAB: QR ATTENDANCE --- */}
          {activeTab === 'qr' && (
            <div className="p-16 flex flex-col items-center justify-center min-h-[600px] space-y-10 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm border border-indigo-100 mb-6">📱</div>
                <h3 className="text-2xl font-bold text-slate-900">{t.qr.title}</h3>
                <p className="text-rose-500 font-bold text-[10px] uppercase tracking-widest bg-rose-50 px-6 py-2 rounded-full border border-rose-100">{t.qr.note}</p>
              </div>
              <div className="bg-white p-12 rounded-[2rem] shadow-2xl border border-slate-100 relative group">
                <div className="absolute inset-0 bg-slate-900 rounded-[2rem] opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"></div>
                <p className="font-mono font-bold text-5xl tracking-[0.5em] text-slate-900 select-all">{dynamicQR}</p>
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">Syncing Encrypted Auth...</p>
            </div>
          )}

          {/* TAB: BATCH UPLOAD --- */}
          {activeTab === 'batch' && (
            <div className="p-16 max-w-3xl mx-auto space-y-12 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm border border-emerald-100 mb-6">📁</div>
                <h3 className="text-2xl font-bold text-slate-900">{t.batch.title}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Process bulk movements via CSV orchestration</p>
              </div>

              <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 space-y-4">
                <h4 className="font-bold text-amber-800 text-sm flex items-center gap-2"><span>ℹ️</span> {language === 'ar' ? 'متطلبات الملف' : 'File Integrity Requirements'}</h4>
                <ul className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest space-y-2">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> {t.batch.required} <code className="bg-white px-2 py-0.5 rounded text-amber-900 border border-amber-200">staff_id, project_name, check_in, check_out</code></li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> {t.batch.note}</li>
                </ul>
              </div>

              <form onSubmit={submitBatchFile} className="space-y-8">
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center hover:bg-slate-50 hover:border-slate-400 transition-all group cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setSelectedFile(e.target.files[0])} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-4 pointer-events-none">
                    <div className="text-4xl group-hover:scale-110 transition-transform">📤</div>
                    <p className="text-sm font-bold text-slate-600">{selectedFile ? selectedFile.name : (language === 'ar' ? 'اسحب الملف هنا أو اضغط للاختيار' : 'Drop CSV here or click to browse')}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Supports .csv standard encoding</p>
                  </div>
                </div>
                <button type="submit" disabled={loading || !selectedFile} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-40">
                  {t.batch.uploadBtn}
                </button>
              </form>
            </div>
          )}

          {/* TAB: LOGS --- */}
          {activeTab === 'log' && (
            <div className="overflow-x-auto">
               <div className="p-8 border-b border-slate-100 bg-white">
                  <h3 className="text-xl font-bold text-slate-900">{language === 'ar' ? 'سجل الحضور التفصيلي' : 'Atomic Attendance Logs'}</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Real-time check-in/out telemetry</p>
                </div>
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                    <th className="px-6 py-4">{t.payrollSheet.employee}</th>
                    <th className="px-6 py-4">{t.archive.project}</th>
                    <th className="px-6 py-4 text-center">{language === 'ar' ? 'الدخول' : 'Inbound'}</th>
                    <th className="px-6 py-4 text-center">{language === 'ar' ? 'الانصراف' : 'Outbound'}</th>
                    <th className="px-6 py-4 text-center">{t.advances.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="p-24 text-center text-slate-300 font-bold animate-pulse italic">Syncing telemetry...</td></tr>
                  ) : attendanceLogs.length === 0 ? (
                    <tr><td colSpan="5" className="p-24 text-center text-slate-400 font-bold italic">{t.archive.empty}</td></tr>
                  ) : attendanceLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-6 py-4 font-mono font-bold text-slate-400 text-xs">EMP-{l.staff_id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-sm">{l.project_name}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-emerald-600 text-xs italic">{new Date(l.check_in).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-rose-500 text-xs italic">{l.check_out ? new Date(l.check_out).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') : 'ACTIVE'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest border bg-slate-50 text-slate-400 border-slate-100">
                          {l.status || (language === 'ar' ? 'مسجل' : 'Logged')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: STAFF REGISTRATION --- */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 transform transition-all scale-100">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {editingStaffId 
                    ? (language === 'ar' ? "تعديل بيانات موظف" : "Edit Employee Data") 
                    : t.modals.staff.title}
                </h3>
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Human Resource Record Creation</p>
              </div>
              <button onClick={() => { setIsStaffModalOpen(false); setEditingStaffId(null); setStaffForm({ name: '', salary: '', company: '', job_title: '', department: '', id_number: '', joining_date: new Date().toISOString().split('T')[0] }); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
            </div>
            <form onSubmit={submitStaff} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.staff.name}</label>
                  <input type="text" name="name" value={staffForm.name} onChange={handleStaffChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.staff.salary}</label>
                  <input type="number" name="salary" value={staffForm.salary} onChange={handleStaffChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 font-mono focus:bg-white focus:border-slate-900 transition-all outline-none text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.staff.jobTitle}</label>
                  <select name="job_title" value={staffForm.job_title} onChange={handleStaffChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none">
                    <option value="">{language === 'ar' ? '-- اختر المسمى --' : '-- Select Title --'}</option>
                    {jobTitlesList.map(title => <option key={title} value={title}>{title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.staff.joiningDate}</label>
                  <input type="date" name="joining_date" value={staffForm.joining_date} onChange={handleStaffChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.staff.idNumber}</label>
                  <input type="text" name="id_number" value={staffForm.id_number} onChange={handleStaffChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none" />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.staff.company}</label>
                  <select name="company" value={staffForm.company} onChange={handleStaffChange} required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none">
                    <option value="">{t.modals.staff.selectCompany}</option>
                    {projectCompaniesList.map(comp => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50">
                {isSubmitting 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                  : (editingStaffId 
                      ? (language === 'ar' ? "حفظ التعديلات" : "Save Changes") 
                      : t.modals.staff.save)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADVANCE DISBURSEMENT --- */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 transform transition-all scale-100">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{t.modals.advance.title}</h3>
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Financial Assistance Protocol</p>
              </div>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
            </div>
            <form onSubmit={submitAdvance} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.advance.staff}</label>
                <select value={advanceForm.staff_id} onChange={(e) => setAdvanceForm({...advanceForm, staff_id: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-amber-500 transition-all outline-none">
                  <option value="">{t.modals.advance.selectStaff}</option>
                  {filteredStaffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.advance.amount}</label>
                  <input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm({...advanceForm, amount: e.target.value})} required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-900 font-mono focus:bg-white focus:border-amber-500 transition-all outline-none text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.advance.monthly}</label>
                  <input type="number" value={advanceForm.deduction_per_month} onChange={(e) => setAdvanceForm({...advanceForm, deduction_per_month: e.target.value})} required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-900 font-mono focus:bg-white focus:border-amber-500 transition-all outline-none text-center" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 text-white py-5 rounded-xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50">
                {isSubmitting ? (language === 'ar' ? 'جاري المعالجة...' : 'Authorizing...') : t.modals.advance.save}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAYROLL ISSUANCE --- */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 transform transition-all scale-100">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{t.modals.payroll.title}</h3>
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Smart Payroll Reconciliation and GL Generation</p>
              </div>
              <button onClick={() => setIsPayrollModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
            </div>
            <form onSubmit={submitPayroll} className="p-10 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.payroll.staff}</label>
                  <select name="staffId" value={payrollForm.staffId} onChange={(e) => setPayrollForm({...payrollForm, staffId: e.target.value})} required className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:border-blue-500 transition-all outline-none">
                    <option value="">{t.modals.payroll.selectStaff}</option>
                    {filteredStaffList.map(s => <option key={s.id} value={s.id}>{s.name} - ({t.modals.payroll.basic}: {Number(s.salary).toLocaleString()})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.payroll.month}</label>
                  <input type="number" value={payrollForm.month} onChange={(e) => setPayrollForm({...payrollForm, month: e.target.value})} required min="1" max="12" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 font-mono focus:bg-white text-center" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.payroll.basic}</label>
                  <input type="number" value={payrollForm.basic_salary} onChange={(e) => setPayrollForm({...payrollForm, basic_salary: e.target.value})} className="w-full px-4 py-4 bg-emerald-50/50 border border-emerald-100 rounded-xl font-mono font-bold text-emerald-700 text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.payroll.incentives}</label>
                  <input type="number" value={payrollForm.incentives} onChange={(e) => setPayrollForm({...payrollForm, incentives: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-center focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.payroll.commissions}</label>
                  <input type="number" value={payrollForm.commissions} onChange={(e) => setPayrollForm({...payrollForm, commissions: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-center focus:bg-white" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest ml-1">{t.modals.payroll.deductions}</label>
                  <input type="number" value={payrollForm.deductions} onChange={(e) => setPayrollForm({...payrollForm, deductions: e.target.value})} className="w-full px-4 py-4 bg-rose-50 border border-rose-100 rounded-xl font-mono font-bold text-rose-700 text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest ml-1">{t.modals.payroll.advance}</label>
                  <input type="number" value={payrollForm.advance_deduction} onChange={(e) => setPayrollForm({...payrollForm, advance_deduction: e.target.value})} className="w-full px-4 py-4 bg-rose-50 border border-rose-100 rounded-xl font-mono font-bold text-rose-700 text-center" />
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-inner space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><span>📊</span> {t.modals.payroll.costDist}</h4>
                  <span className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono border ${calculateTotalPercent() === 100 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{t.modals.payroll.total} {calculateTotalPercent()}%</span>
                </div>
                
                <div className="space-y-4">
                  {payrollForm.projects.map((proj, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm animate-fade-in">
                      <select value={proj.project_name} onChange={(e) => handleProjectPercentChange(idx, 'project_name', e.target.value)} required className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white outline-none">
                        <option value="General">{t.modals.payroll.general}</option>
                        {projectsList.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div className="flex items-center gap-2">
                        <input type="number" value={proj.percent} onChange={(e) => handleProjectPercentChange(idx, 'percent', e.target.value)} required min="1" max="100" className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-center" />
                        <span className="font-bold text-slate-400 text-lg">%</span>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPayrollForm({...payrollForm, projects: [...payrollForm.projects, {project_name: 'General', percent: 0}]})} className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 font-bold rounded-2xl hover:bg-white hover:text-slate-900 hover:border-slate-400 transition-all text-[10px] uppercase tracking-widest mt-4">{t.modals.payroll.addProject}</button>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100">
                <button type="submit" disabled={isSubmitting || calculateTotalPercent() !== 100} className="w-full bg-slate-900 text-white py-5 rounded-xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-40">
                  {isSubmitting ? (language === 'ar' ? 'جاري المعالجة...' : 'Authorizing...') : t.modals.payroll.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}