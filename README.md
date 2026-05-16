# TED Capital ERP System

An enterprise-grade ERP (Enterprise Resource Planning) system built for multi-entity financial consolidation, real-time analytics, and advanced business management.

## 🚀 Features
- **Global Financial Consolidation**: Manage multiple subsidiaries and eliminate inter-company entries.
- **Smart Finance & Accounting**: Full Chart of Accounts, Journal Vouchers (JV), and IFRS-compliant reporting.
- **AI Strategic Advisor**: Integrated AI-driven insights for executive decision-making.
- **Project & Inventory Management**: Track projects, resource allocation, and real-time stock levels.
- **IAM & RBAC**: Robust Identity and Access Management with granular role-based permissions.
- **Modern UI/UX**: Premium, high-fidelity responsive interface with Dark Mode support.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS 4, Axios.
- **Backend**: Node.js (Express), PostgreSQL.
- **Testing**: Playwright (E2E Suite).
- **Environment**: Local AI integration via Ollama/LiteLLM.

## 📦 Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v16+)
- Git

### 2. Clone the Repository
```bash
git clone https://github.com/ahmedalyzidan/TED-Capital-ERP.git
cd TED-Capital-ERP
```

### 3. Environment Configuration
Copy the template and fill in your local credentials:
```bash
cp .env.example .env
```

### 4. Backend Setup
```bash
cd backend
npm install
node server.js
```

### 5. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 6. Admin Setup
Run the initialization script to create the root admin:
```bash
node createAdmin.js
```
*Default Credentials: `admin` / `admin123`*

## 🛡️ Security Note
This project uses environment variables (`.env`) for sensitive data. Never commit your `.env` file to the repository. See `.env.example` for the required keys.

## 📜 License
Private / Proprietary - TED Capital 2026.
