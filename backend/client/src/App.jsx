import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SecurityProvider } from './hooks/useSecurity';

// Screens
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectWorkspace from './pages/ProjectWorkspace';
import Finance from './pages/Finance';
import Clients from './pages/Clients';
import Inventory from './pages/Inventory';
import DirectStockIssue from './pages/DirectStockIssue';
import StockTransfers from './pages/StockTransfers';
import StockReconciliation from './pages/StockReconciliation';
import BatchExpiryMatrix from './pages/BatchExpiryMatrix';
import SmartReorder from './pages/SmartReorder';
import PharmaInventory from './pages/PharmaInventory';
import AdvancedStockControl from './pages/AdvancedStockControl';
import PharmaSupplyChain from './pages/PharmaSupplyChain';
import Invoices from './pages/Invoices';
import InterCompany from './pages/InterCompany';
import Expenses from './pages/Expenses';
import RealEstate from './pages/RealEstate';
import Partners from './pages/Partners';
import ContractorSuite from './pages/ContractorSuite';
import HR from './pages/HR';
import Attendance from './pages/Attendance';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import EmployeePortal from './pages/EmployeePortal';
import SubcontractorPortal from './components/SubcontractorPortal';
import FixedAssets from './pages/FixedAssets';
import ClientSOA from './pages/ClientSOA';
import ARDueList from './pages/ARDueList';
import APDueList from './pages/APDueList';
import InventoryValuation from './pages/InventoryValuation';
import CashBalances from './pages/CashBalances';
import Corporate from './pages/Corporate';
import RBACMatrix from './pages/RBACMatrix';
import ApprovalInbox from './pages/ApprovalInbox';
import StrategicCommandCenter from './pages/StrategicCommandCenter';
import Accountant360 from './pages/Accountant360';
import Portal360 from './pages/Portal360';
import { RBACProtectedRoute } from './components/RBAC';

// Route Protection
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <LanguageProvider>
      <SecurityProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/portal/subcontractor" element={<SubcontractorPortal />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectWorkspace />} />
              <Route path="/inventory" element={<RBACProtectedRoute resource="INVENTORY" action="READ"><Inventory /></RBACProtectedRoute>} />
              <Route path="/inventory/direct-issue" element={<DirectStockIssue />} />
              <Route path="/inventory/transfers" element={<Navigate to="/inventory/pharma?tab=transfers" replace />} />
              <Route path="/inventory/reconciliation" element={<Navigate to="/inventory/pharma?tab=reconciliation" replace />} />
              <Route path="/inventory/batch-matrix" element={<Navigate to="/inventory/pharma?tab=expiry" replace />} />
              <Route path="/inventory/reorder" element={<Navigate to="/inventory/pharma?tab=reorder" replace />} />
              <Route path="/inventory/pharma" element={<PharmaInventory />} />
              <Route path="/inventory/master-stock" element={<AdvancedStockControl />} />
              <Route path="/inventory/supply-chain" element={<PharmaSupplyChain />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/finance" element={<RBACProtectedRoute resource="FINANCE" action="READ"><Finance /></RBACProtectedRoute>} />
              <Route path="/finance/ar-due" element={<ARDueList />} />
              <Route path="/finance/ap-due" element={<APDueList />} />
              <Route path="/finance/inventory-valuation" element={<InventoryValuation />} />
              <Route path="/finance/cash-balances" element={<CashBalances />} />
              <Route path="/finance/360" element={<Accountant360 />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/inter-company" element={<InterCompany />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/real-estate" element={<RealEstate />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/subcontractors" element={<ContractorSuite />} />
              <Route path="/hr" element={<RBACProtectedRoute resource="HR" action="READ"><HR /></RBACProtectedRoute>} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/users" element={<RBACProtectedRoute resource="USERS" action="READ"><Users /></RBACProtectedRoute>} />
              <Route path="/iam/matrix" element={<RBACProtectedRoute resource="USERS" action="UPDATE"><RBACMatrix /></RBACProtectedRoute>} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/me" element={<EmployeePortal />} />
              <Route path="/fixed-assets" element={<FixedAssets />} />
              <Route path="/corporate" element={<Corporate />} />
              <Route path="/approval-inbox" element={<ApprovalInbox />} />
              <Route path="/360" element={<Portal360 />} />
              <Route path="/approvals" element={<Navigate to="/approval-inbox" replace />} />
              <Route path="/notifications" element={<StrategicCommandCenter />} />
              <Route path="/clients/:id/soa" element={<ClientSOA />} />
            </Route>
          </Routes>
        </Router>
      </SecurityProvider>
    </LanguageProvider>
  );
}

export default App;