# PulseNet — Enterprise Blood Bank Management & Security System

> **Mission-Critical Regional Blood Supply Chain with Mandatory Access Control (MAC), Column-Level Discretionary Access Control (DAC), Cryptographic Audit Trails, and Real-Time WebSocket Coordination.**

---

## 📌 Overview

**PulseNet** is an enterprise-grade clinical management platform engineered for regional blood distribution networks. Unlike standard blood banking systems, PulseNet implements a multi-layered, defense-in-depth database security architecture directly inside PostgreSQL (utilizing Row-Level Security, multi-level clearances, column encryption via `pgcrypto`, and table partitioning) paired with a tamper-evident, SHA-256 hash-chained MongoDB audit trail.

> 📖 **Architecture & Design Documentation**:  
> For comprehensive database design proofs, 3NF normalizations, ER diagrams, data dictionaries, and security specifications, refer to the detailed reports in [`db/docs/`](db/docs/).

---

## 👥 Role-Based Workspaces & Permissions Matrix

PulseNet provides dedicated, customized interfaces and service boundaries for each user role. System access is governed by **PostgreSQL Session Clearances** (Bell-LaPadula MAC) and **Discretionary Column Grants (DAC)**:

| Role | DB Role | Clearance | Dedicated Responsibilities & Capabilities |
| :--- | :--- | :---: | :--- |
| **System Admin** | `bb_admin` | **3** | Staff account provisioning, hospital onboarding & verification, cold-chain expiry sweep triggers, system security oversight. *Password hashes and donor contact PII are strictly redacted by Column-Level DAC. Admin cannot provision donor accounts (least privilege).* |
| **Blood Bank Officer** | `bb_officer` | **2** | Donor intake, whole blood separation into components (RBC, Platelets, Plasma), regional stock monitoring, automated FEFO allocation, emergency donor search via Haversine distance, broadcast dispatching. *Contact PII is encrypted; access requires an explicit, audited decryption operation.* |
| **Lab Technician** | `bb_lab_tech` | **3** | Infectious disease screening (HIV, HBV, HCV, Syphilis, Malaria). Pending sample testing queue with immediate status progression: 5 negative results auto-release unit to `AVAILABLE`; any reactive test auto-discards the unit. |
| **Hospital Representative** | `bb_hospital` | **1** | Real-time requisition requests, requisition lifecycle tracking, signed clinical XML manifest export, and public aggregate stock viewing (`v_public_inventory`). *Restricted by RLS to own hospital requests; cannot modify internal unit statuses.* |
| **Voluntary Donor** | `bb_donor` | **1** | Self-registration, personal medical profile, donation eligibility tracking (90-day cooldown guard), real-time emergency alert acceptance/rejection via WebSockets. *Data isolated to own user row via PostgreSQL RLS.* |
| **Regulatory Auditor** | `bb_auditor` | **3** | Read-only compliance portal featuring 6 analytical recursive CTE & window function reports, along with real-time SHA-256 cryptographic verification of the MongoDB tamper-evident audit ledger. |

---

## 🔒 Security Architecture Highlights

- **Mandatory Access Control (MAC)**: Enforced via PostgreSQL `FORCE ROW LEVEL SECURITY`. Every database session sets `app.user_id`, `app.role`, and `app.clearance` within transaction boundaries.
- **Discretionary Access Control (DAC)**: The API connects via unprivileged user `bb_app`, assuming localized database roles (`bb_admin`, `bb_officer`, etc.) per request transaction. Sensitive columns like `password_hash` and `donor_contact` are restricted at the database catalog level.
- **Field-Level Encryption (`pgcrypto`)**: Donor phone numbers, email addresses, and residential addresses are stored as AES-256 encrypted bytea columns (`phone_enc`, `email_enc`, `address_enc`).
- **Cryptographic Audit Trail**: All security-critical events (logins, status changes, PII reveals, blood allocations) are logged into MongoDB with SHA-256 cryptographic hash chaining (`prev_hash` $\to$ `curr_hash`), verifiable for zero-tampering.
- **Stock Ledger Partitioning**: High-volume `stock_movement` records are list-partitioned by regional zones (`SUR`, `AHM`, `VAD`, `RAJ`) for optimal query isolation.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Lucide Icons, Socket.IO Client, Axios.
- **Backend API**: Node.js, Express, Socket.IO, `pg` (PostgreSQL driver), `mongodb`, Zod validation, JWT, Bcrypt.js.
- **Databases**:
  - **PostgreSQL 15+**: Relational data, RLS security policies, spatial functions (`fn_distance_km`), triggers, and stored procedures.
  - **MongoDB 6+**: Tamper-evident cryptographic audit logs.

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher) & **npm**
- **PostgreSQL** (v15 or higher) running on port `5432`
- **MongoDB Community Server** (v6.0 or higher) running on port `27017`

---

### 2. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/jayraj-chaudhari/BloodBankManagementSystem.git
cd BloodBankManagementSystem

# Install backend dependencies
npm install

# Install frontend dependencies
npm install --prefix web
```

---

### 3. Environment Configuration

Create a `.env` file in the project root directory:

```env
PORT=3000
DATABASE_URL=postgres://bb_app:app_pw@localhost:5432/bloodbank
DB_OWNER_URL=postgres://bb_owner:owner_pw@localhost:5432/bloodbank
PG_SUPERUSER_URL=postgres://postgres:postgres@localhost:5432/postgres
MONGO_URL=mongodb://localhost:27017/bloodbank_audit
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=2h
ENC_KEY=170123a6e8211eb356c55a7b1ff0f7edcba75d67bc4e46272991cb224d8deba9
CORS_ORIGIN=http://localhost:5173
```

---

### 4. Database Setup & Seeding

> 💡 **PostgreSQL Password Tip**:  
> The first command runs as the `postgres` superuser and will prompt for your local PostgreSQL password. To run it smoothly without manual prompts, set your password in your terminal session before running:
> - **PowerShell (Windows)**: `$env:PGPASSWORD="your_postgres_password"`
> - **Command Prompt (cmd)**: `set PGPASSWORD=your_postgres_password`
> - **Bash (Linux / macOS)**: `export PGPASSWORD="your_postgres_password"`
>
> *(All subsequent scripts connect as `bb_owner` using the connection string with the pre-configured password `owner_pw`).*

```bash
# 1) Initialize database and create roles (run as postgres superuser)
psql -U postgres -f db/00_init_as_superuser.sql

# 2) Run schemas, security policies, and seed data as bb_owner
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/01_types.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/02_tables.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/02b_tables_clinical.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/schema/03_indexes.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/views/30_views.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/functions/20_functions.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/functions/21_triggers.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/functions/22_procedures.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/security/50_rolesgrant.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/security/51_rls.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/seed/60_lookups.sql
psql "postgresql://bb_owner:owner_pw@localhost:5432/bloodbank" -f db/seed/seed_data.sql
```

---

### 5. Start the Services

Open two terminal sessions:

**Terminal 1 — Backend API Server:**
```bash
npm run dev
# Server runs on http://localhost:3000
# Health check: http://localhost:3000/api/v1/health
```

**Terminal 2 — Frontend Application:**
```bash
npm run dev --prefix web
# Web portal runs on http://localhost:5173
```

---

## 🔑 Default Demo Accounts

All seeded demo accounts use the standard password: `Test@1234`

| Role | Email | Clearance | Workspace Access |
| :--- | :--- | :---: | :--- |
| **System Admin** | `admin@bb.test` | Level 3 | Executive Governance & Staff Directory |
| **Blood Bank Officer** | `officer@bb.test` | Level 2 | Donor Registry, Intake & Dispatch |
| **Lab Technician** | `lab@bb.test` | Level 3 | Infectious Disease Screening Station |
| **Hospital User** | `hospital@bb.test` | Level 1 | Requisitions Portal & Inventory View |
| **Voluntary Donor** | `donor1@bb.test` | Level 1 | Donor Portal & Live Emergency Alerts |
| **Compliance Auditor** | `auditor@bb.test` | Level 3 | CTE Reports & Hash Chain Verification |

*(The login screen also features quick-fill buttons to switch between demo roles instantaneously).*

---

## 📂 Project Directory Structure

```text
├── api/                    # Express REST API & WebSocket Server
│   ├── src/
│   │   ├── db/             # PostgreSQL pool & MongoDB connection
│   │   ├── middleware/     # Auth (JWT), withContext (RLS/DAC), Error handling
│   │   ├── routes/         # Modular route controllers per domain
│   │   ├── services/       # Audit logger & WebSocket event emitters
│   │   └── validators/     # Zod runtime schema validators
├── db/                     # Database Definition & Migration Scripts
│   ├── schema/             # DDL: Types, Tables, Partitions & Indexes
│   ├── functions/          # Stored procedures, spatial math & triggers
│   ├── security/           # DAC (Role Grants) & MAC (Row-Level Security)
│   ├── seed/               # Reference lookups & sample dataset
│   └── docs/               # 3NF Proofs, ER Diagram & Technical Reports
├── web/                    # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/     # Layout, Sidebar, Modals, Badges, Metrics
│   │   ├── context/        # Auth, Theme, Toast & Socket Contexts
│   │   ├── pages/          # Domain pages & role-specific dashboards
│   │   └── services/       # Axios API client endpoints
└── README.md               # Project documentation
```

---

## 📄 License
This project was developed for educational and academic demonstration of advanced DBMS principles, multi-level database security, and modern full-stack engineering.
