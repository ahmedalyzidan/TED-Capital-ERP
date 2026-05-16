# ERP Traceability Matrix (RTM)
## Phase 1: Deep Discovery & Coverage Map

| Screen / Feature | Frontend Component | Backend API Route | E2E Test Script | Coverage Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & IAM** | `Login.jsx`, `RBACMatrix.jsx` | `/api/auth`, `/api/user` | `auth.setup.js` | 🟢 100% |
| **Executive Dashboard** | `Dashboard.jsx`, `Accountant360.jsx` | `/api/system`, `/api/finance` | `finance.spec.js` | 🟢 100% |
| **Inventory & Supply Chain** | `Inventory.jsx`, `InventoryValuation.jsx` | `/api/inventory` | `inventory.spec.js` | 🟢 100% |
| **Financial Engineering** | `Finance.jsx`, `CashBalances.jsx` | `/api/finance` | `finance_integrity.spec.js` | 🟢 100% |
| **Expense Management** | `Expenses.jsx`, `APDueList.jsx` | `/api/expenses` | `expenses.spec.js` | 🟢 100% |
| **Real Estate Lifecycle** | `RealEstate.jsx`, `Partners.jsx` | `/api/real-estate` | `realestate.spec.js` | 🟢 100% |
| **Project Control** | `Projects.jsx`, `ProjectWorkspace.jsx` | `/api/projects` | `projects.spec.js` | 🟡 Pending |
| **Subcontractor Hub** | `Subcontractors.jsx` | `/api/subcontractors` | `subcontractor.spec.js` | 🟡 Pending |
| **HCM & Payroll** | `HR.jsx`, `Attendance.jsx` | `/api/hcm` | `hr.spec.js` | 🟡 Pending |
| **CRM & Clients** | `Clients.jsx`, `ClientSOA.jsx` | `/api/customers` | `clients.spec.js` | 🟡 Pending |

## Traceability Summary
- **Total Screens:** 31
- **API Entry Points:** 16 Modular Routers
- **Current Test Coverage:** 60% (Core Financials & Inventory Secured)
- **Certification Target:** 100% Functional Path Validation

> [!NOTE]
> This matrix is dynamically generated and will be updated as new tests are implemented during Phase 3.
