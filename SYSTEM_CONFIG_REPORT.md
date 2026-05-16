# TED CAPITAL ERP - System Configuration & Infrastructure Report (v2.1)

This document provides a comprehensive overview of the configurations, architecture, and synchronization protocols implemented across all environments of the **TED CAPITAL ERP** system.

---

## 1. Environment Topology

| Feature | Local Development | Staging (Cloud-Test) | Production (Cloud-Live) |
| :--- | :--- | :--- | :--- |
| **Public URL** | `http://localhost:5173` | `http://46.224.144.166:8080` | `http://46.224.144.166` |
| **API Endpoint** | `http://localhost:5000` | `http://46.224.144.166:8080/api` | `http://46.224.144.166/api` |
| **Database** | Local/Docker Postgres | Docker (erp-db-staging) | Docker (erp-db) |
| **DB Name** | `erp_db` | `erp_db_staging` | `erp_db` |
| **Nginx Config** | `N/A` | `nginx.staging.conf` | `nginx.conf` |
| **Docker Compose** | `N/A (Standard Run)` | `docker-compose.staging.yml` | `docker-compose.yml` |
| **Deployment** | `Manual` | `deploy-staging.sh` | `deploy.sh` |

---

## 2. Infrastructure & Safety Protocols

### 🛡️ Resilience & Auto-Healing (Critical)
*   **Granular Schema Sync:** Every backend startup triggers a resilient schema synchronization process that verifies the existence of **all** required tables and columns individually. If one operation fails, the system continues to initialize other components.
*   **Optional Chaining Mandatory:** All frontend components fetching data from the API use optional chaining (`?.`) to prevent runtime crashes during state hydration.
*   **Database Parity:** Staging environment is initialized using the `production_init.sql` master schema to ensure 100% structural parity with Production.

### ⚙️ System Hardening (Hetzner Cloud)
*   **Firewall (UFW):** Ports 80 (Prod), 8080 (Staging), 443 (SSL), and 22 (SSH) are explicitly whitelisted.
*   **Stability (Swap):** 2GB swap memory is configured on the host server to handle peak build-time loads and Docker container orchestration.
*   **Isolated Databases:** Production and Staging use separate Docker containers and separate data volumes to prevent any accidental data contamination.

---

## 3. Deployment Workflow

### 🏗️ Staging Deployment (`deploy-staging.sh`)
*   **Trigger:** Manual execution via SSH.
*   **Logic:** 
    1. Git Pull (Main branch).
    2. Docker Compose rebuild using `docker-compose.staging.yml`.
    3. Exposure on Port **8080**.

### 🚀 Production Deployment (`update-erp.sh`)
*   **Logic:**
    1. Git Push (Local to Origin).
    2. SSH Connection to Live Server.
    3. Git Pull + Docker Compose Rebuild.
    4. Exposure on Port **80**.

---

## 4. Coding & Data Policies

### 💾 Data Integrity (Soft Deletion)
*   **Mandate:** Core records (Users, Projects, Transactions) are **NEVER** permanently deleted. 
*   **Implementation:** All tables include `is_deleted` (BOOLEAN), `deleted_at` (TIMESTAMP), and `deleted_by` (VARCHAR) columns.
*   **Audit Logging:** Every critical DML operation is logged in the `audit_logs` table for traceability.

### 🤖 Local AI Infrastructure
*   **Ollama:** Running `qwen2.5-coder:32b` locally.
*   **Proxy:** LiteLLM running on Port **4040** to provide an OpenAI-compatible API layer for coding assistance.

---

## 5. Directory & File Mapping

*   **Backend Path:** `/root/backend` (Cloud) | `Ted ERP/backend` (Local)
*   **Frontend Path:** `/root/frontend` (Cloud) | `Ted ERP/frontend` (Local)
*   **Uploads:** Persistent volume mapped to `/app/uploads` across all environments.

---

**Last Updated:** 2026-05-11
**Status:** Stable - Staging/Production Parity Verified.
