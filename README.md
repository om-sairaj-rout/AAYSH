# AAYSH Express — Logistics & Order Management Platform

A full-stack logistics management system for **Aaysh Express**, built for sellers, operations teams, and platform administrators. The platform covers the complete shipment lifecycle: order creation, bulk Excel uploads, AWB assignment, pickup scheduling, courier management, label/invoice generation, rate calculation, tracking, and support ticketing.

**Live:** [aaysh.vercel.app](https://aaysh.vercel.app) · [aayshexpress.com](https://www.aayshexpress.com)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [User Roles & Permissions](#user-roles--permissions)
- [Core Workflows](#core-workflows)
- [Order ID System](#order-id-system)
- [Rate Management](#rate-management)
- [API Overview](#api-overview)
- [Utility Scripts](#utility-scripts)
- [Development Notes](#development-notes)

---

## Overview

AAYSH is a monorepo with two applications:

| App | Path | Description |
|-----|------|-------------|
| **Frontend** | `frontend/` | React SPA (Vite) — customer portal, seller dashboard, admin tools |
| **Backend** | `backend/` | Express REST API — business logic, MongoDB, file storage, PDF generation |

The frontend communicates with the backend over HTTPS using cookie-based JWT authentication. Public pages (homepage, AWB tracking) work without login.

---

## Features

### Orders & Shipments

- Create orders manually or via **bulk Excel upload**
- Atomic **Order + Shipping** creation with rollback on failure
- **Global unique order IDs** — numeric (`100001`) or alphanumeric (`ORD100001`) sequences
- Manual or auto-generated order IDs with duplicate detection
- Assign AWB numbers to shipments (manual or courier-integrated)
- Cancel orders and shipments
- Update pickup/delivery addresses after creation
- Attach supporting documents (invoices, KYC, high-value proofs) — stored on AWS S3
- Product catalog for reusable line items
- Order reports filtered by date, company, and status
- All-orders view with document downloads and detailed order modal

### Pickup Management

- Schedule forward pickups (date, time, location, box count, service type)
- **Multi-order pickup completion** — complete one pickup schedule into 1–20 separate orders, each with its own AWB
- Admin and user pickup views with company filtering
- Reschedule and cancel pickups
- Reverse pickup requests (separate workflow)

### Courier & AWB

- Courier master management
- AWB pool upload and assignment
- **Serviceability** management (pincode coverage per courier)
- **Courier priority** rules for automatic courier selection
- Select courier page for manual assignment

### Labels & Documents

- Generate shipping labels (PDF)
- Generate invoices (PDF)
- Generate manifests (PDF)
- Barcode generation via `bwip-js`

### Rate Management

- Admin-configurable rate structures for **SUR (Surface)**, **AIR**, and **PRIME**
- Dynamic weight slabs with per-zone pricing (Local NCR, North Zone, Metro, Rest of India, North East)
- Pincode-to-zone lookup
- User-facing **Rate Calculator** with chargeable weight logic

### Tracking & Customer Portal

- Public AWB tracking on homepage (`/`) and dedicated page (`/track/:awbNumber`)
- Shipment status timeline
- WhatsApp notifications for key shipping events (optional)

### User & Company Management

- Multi-tenant: multiple users per company
- Company roles: **Owner**, **Manager**, **Operator**, **Viewer**
- Platform admin role with full or delegated permissions
- Team management — invite/edit/remove company users
- Registration overview and company detail pages for admins

### Support & Communication

- Support ticket system with attachments and threaded messages
- Unread ticket counts in sidebar
- Contact form
- Email via Resend (password reset, ticket notifications)
- WhatsApp Business API integration (optional)

### Dashboard & Reports

- Operations dashboard with key metrics
- Excel export of orders (per user or per company)
- Bulk status update via Excel upload
- Upload history with delete support

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool & dev server |
| React Router 7 | Client-side routing |
| Redux Toolkit | Auth state management |
| Tailwind CSS 4 | Styling |
| Axios | HTTP client |
| Lucide React / React Icons | Icons |
| xlsx | Client-side Excel handling |
| react-hot-toast | Notifications |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose 9 | Database & ODM |
| JWT + cookie-parser | Authentication |
| bcrypt | Password hashing |
| Multer | File upload handling |
| AWS SDK (S3) | Document & attachment storage |
| PDFKit | PDF generation |
| bwip-js | Barcode rendering |
| xlsx | Server-side Excel parsing |
| Resend | Transactional email |
| node-cron | Scheduled jobs (pickup cron — optional) |
| EJS | Email/HTML templates |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Vite)                    │
│  HomePage · Dashboard · Orders · Pickup · Admin Tools       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + cookies (JWT)
┌──────────────────────────▼──────────────────────────────────┐
│                   Backend (Express :3000)                    │
│  Routes → Controllers → Utils → Models                        │
│  Auth middleware · Permission checks · File upload           │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
  MongoDB            AWS S3            External APIs
  (orders, users,    (documents,        (WhatsApp,
   companies, etc.)   attachments)       Resend email)
```

**Key design patterns:**

- **Permission-gated routes** — every protected endpoint checks `read`/`write` per section
- **Atomic order creation** — `createOrderWithShipping` creates Order + Shipping together; rolls back on document upload or shipping failure
- **Global order ID counter** — shared sequence across companies with collision skip logic
- **Company-scoped data** — regular users see only their company's data; admins see all

---

## Project Structure

```
AAYSH/
├── backend/
│   ├── app.js                 # Express entry point
│   ├── config/
│   │   └── db.js              # MongoDB connection + index sync
│   ├── constants/
│   │   ├── orderIdSequences.js
│   │   ├── permissions.js
│   │   └── rateZones.js
│   ├── controllers/           # Route handlers (auth, orders, pickup, rates, etc.)
│   ├── cron/                  # Scheduled jobs
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── upload.middleware.js
│   ├── models/                # Mongoose schemas
│   ├── routes/                # Express routers
│   ├── scripts/               # One-off maintenance & test scripts
│   ├── uploads/               # Local upload fallback
│   └── utils/                 # Shared business logic
│
├── frontend/
│   ├── src/
│   │   ├── api/               # API client modules
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   ├── store/             # Redux store & slices
│   │   ├── utils/             # Helpers (permissions, dates, etc.)
│   │   ├── App.jsx
│   │   └── RootWrapper.jsx    # Router configuration
│   ├── index.html
│   ├── vite.config.js
│   └── vercel.json            # SPA rewrite rules
│
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** or **yarn**
- **MongoDB** instance (local or Atlas)
- **AWS S3** bucket (for document storage)
- Optional: Resend account, WhatsApp Business API credentials

---

## Environment Variables

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/aaysh
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=7d
NODE_ENV=development

# AWS S3 (required for document uploads)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name

# Frontend URL (used in tracking links, emails)
FRONTEND_URL=http://localhost:5173

# Email (Resend) — optional but needed for password reset
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
CONTACT_EMAIL=support@aayshexpress.com

# WhatsApp Business API — optional
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_VERSION=v21.0
WHATSAPP_TEMPLATE_SHIPPED=order_shipped
WHATSAPP_TEMPLATE_OUT_FOR_DELIVERY=order_out_for_delivery
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

> In production, `VITE_API_URL` should point to your deployed backend API (e.g. `https://api.aayshexpress.com/api`).

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd AAYSH
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure environment

Copy the example variables above into `backend/.env` and `frontend/.env`, then fill in your values.

### 4. Start the backend

```bash
cd backend
npm run dev    # nodemon — hot reload
# or
npm start      # production mode
```

The API runs on **http://localhost:3000**.

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

The app runs on **http://localhost:5173**.

### 6. Build for production

```bash
# Frontend
cd frontend
npm run build
npm run preview   # preview production build locally

# Backend — no build step; deploy app.js directly
```

---

## Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | `vercel.json` handles SPA rewrites; set `VITE_API_URL` in Vercel env |
| Backend | Any Node host | Runs on port 3000; ensure CORS origins include your frontend URL |
| Database | MongoDB Atlas | Connection string in `MONGODB_URI` |
| Files | AWS S3 | Bucket + IAM credentials |

**CORS allowed origins** (configured in `backend/app.js`):

- `http://localhost:5173`
- `https://aaysh.vercel.app`
- `https://www.aayshexpress.com`

Add new production domains to this list when deploying elsewhere.

---

## User Roles & Permissions

### Platform roles

| Role | Access |
|------|--------|
| `user` | Company-scoped access based on `companyRole` and `permissions` |
| `admin` (unrestricted) | Full platform access — all companies, all admin sections |
| `admin` (delegated, `permissionsManaged: true`) | Admin with configurable per-section read/write |

### Company roles

| Role | Typical access |
|------|----------------|
| **Owner** | Full read/write on all company sections |
| **Manager** | Read everywhere; write on dashboard, upload, orders, shipments, pickup, team |
| **Operator** | Write on operational sections; no team/admin access |
| **Viewer** | Read-only across company sections |

### Permission sections

| Section | Routes / Features |
|---------|-------------------|
| `dashboard` | Dashboard |
| `upload` | Excel upload, templates, status updates |
| `orders` | All orders, reports, rate calculator, product catalog, AWB pages |
| `shipments` | Shipment reports, label/invoice/manifest PDFs |
| `pickup` | Forward pickup scheduling & completion |
| `reversePickup` | Reverse pickup requests |
| `team` | Company team management |
| `update` | AWB, serviceability, courier priority, rates, order updates (admin) |
| `settings` | User account CRUD (admin) |
| `tickets` | Admin ticket management |
| `companies` | Registration overview, company details (admin) |
| `support` | Support & complaints |

Frontend route guards live in `frontend/src/PathPermissionRoute.jsx` and `frontend/src/utils/permissions.js`. Backend enforcement is in `backend/middlewares/auth.middleware.js`.

---

## Core Workflows

### Create an order

1. User opens **All Orders** or uses the create-order dialog
2. Fills consignor/consignee details, weight, boxes, invoice info
3. Chooses **auto** or **manual** order ID
4. Backend calls `createOrderWithShipping`:
   - Resolves/generates `externalOrderId`
   - Creates `Order` document
   - Creates linked `Shipping` document with unique `shipmentId`
   - Uploads attached documents to S3
   - Rolls back the order if any step fails

### Bulk Excel upload

1. Download template from **Upload → Excel Template**
2. Fill rows and upload via **Upload Report**
3. Backend parses Excel, validates each row, syncs order ID counter from manual IDs
4. Creates orders in batch with upload history tracking

### Schedule & complete pickup

1. User schedules pickup (date, location, box count, service type)
2. Admin/user sees pickup in **Pickup Management**
3. On completion, user specifies how many orders to create (1–20)
4. Fills a separate form per order (prefilled with company consignor details)
5. Backend creates all orders + AWBs atomically; marks schedule as `completed`

### Assign AWB

1. Orders without AWB appear in courier selection
2. System uses courier priority + serviceability to suggest courier
3. AWB is assigned from courier's pool or entered manually
4. Label and invoice can then be generated

### Public tracking

- Customer enters AWB on homepage or visits `/track/:awbNumber`
- `GET /api/public/orders/awb/:awbNumber` returns order + shipment status (no auth required)

---

## Order ID System

Order IDs are **globally unique** across all companies.

### Sequence types

| Type | Format | Example |
|------|--------|---------|
| `numeric` | Plain number starting at 100001 | `100001`, `100002` |
| `alphanumeric` | `ORD` + 6-digit padded number | `ORD100001` |

### Behavior

- **First auto order** for a company locks it to the chosen sequence type
- **Auto mode**: increments global counter, skips IDs that already exist (up to 50 retries)
- **Manual mode**: validates format (if sequence locked) and rejects duplicates
- **Excel import**: `syncOrderIdCounterFromExternalIds` bumps counter past manually entered IDs
- **DB constraint**: unique index on `orders.externalOrderId`

Key files: `backend/utils/generateOrderId.js`, `backend/constants/orderIdSequences.js`, `backend/models/orderIdCounter.model.js`

---

## Rate Management

### Services

- **SUR** (Surface) — `surface`
- **AIR** — `air`
- **PRIME** — `prime`

### Zones

Local NCR · North Zone · Metro · Rest of India · North East

### Slab pricing

Each service has configurable weight slabs. Each slab defines:

- `minWeight` / `maxWeight` range
- `baseWeight`, `baseRate`, `incrementStep`, `incrementRate` per zone
- Chargeable weight calculated from actual vs volumetric weight

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rates/calculate` | Calculate shipping rate |
| `GET` | `/api/rates/pincode/:pincode` | Lookup zone for pincode |
| `GET` | `/api/rates` | List all rate structures |
| `GET` | `/api/rates/:service` | Get rate structure for a service |
| `PUT` | `/api/rates/:service` | Update rate structure (admin) |

Key files: `backend/utils/rateCalculator.js`, `backend/models/rateStructure.model.js`, `frontend/src/pages/RateManagementPage.jsx`, `frontend/src/pages/RateCalculator.jsx`

---

## API Overview

All authenticated routes are prefixed with `/api`. Auth token is sent via HTTP cookie.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user/register` | Register new user |
| `POST` | `/api/user/login` | Login |
| `POST` | `/api/user/logout` | Logout |
| `GET` | `/api/auth/check` | Verify session |
| `POST` | `/api/forgot-password` | Request password reset |
| `POST` | `/api/reset-password/:token` | Reset password |

### Orders

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/external/orders` | List orders |
| `GET` | `/api/external/orders/:orderId` | Get order detail |
| `POST` | `/api/external/orders/create-order` | Create order |
| `POST` | `/api/external/orders/cancel-order` | Cancel order |
| `GET` | `/api/external/orders/next-order-id` | Preview next order ID |
| `GET` | `/api/public/orders/awb/:awbNumber` | Public AWB lookup |

### Pickup schedules

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pickup-schedules` | Schedule pickup |
| `GET` | `/api/pickup-schedules` | List schedules |
| `PUT` | `/api/pickup-schedules/:id/cancel` | Cancel |
| `PUT` | `/api/pickup-schedules/:id/reschedule` | Reschedule |
| `POST` | `/api/pickup-schedules/:id/complete` | Complete with orders |

### Other route modules

| Router file | Domain |
|-------------|--------|
| `company.routes.js` | Company & team CRUD |
| `upload.routes.js` | Excel upload, download, status update |
| `shipment.routes.js` | Shipment operations |
| `tracking.routes.js` | Tracking events |
| `courier.routes.js` | Courier & AWB pool management |
| `assignAwb.routes.js` | AWB assignment |
| `labelGeneration.routes.js` | PDF labels, invoices, manifests |
| `pickupRoute.controllers.js` | Legacy pickup routes |
| `reversePickup.routes.js` | Reverse pickup |
| `product.routes.js` | Product catalog |
| `ticket.routes.js` | Support tickets |
| `dashboard.routes.js` | Dashboard metrics |
| `contact.routes.js` | Contact form |
| `rate.routes.js` | Rate calculator & management |

---

## Utility Scripts

Located in `backend/scripts/`. Run from the `backend/` directory with Node:

```bash
node scripts/<script-name>.js
```

| Script | Purpose |
|--------|---------|
| `test-order-id-sequence.js` | Test order ID generation logic |
| `cleanup-test-companies.js` | Remove test companies from DB |
| `backfillCompanyIds.js` | Backfill company IDs on legacy data |
| `migrateLegacyCompanies.js` | Migrate legacy company records |
| `audit-user-data.js` | Audit user data integrity |
| `delete-user-data.js` | Delete user data (destructive) |
| `sync-cancelled-pickup-status.js` | Sync cancelled pickup statuses |

> Scripts that modify production data should be run with caution. Always back up the database first.

---

## Development Notes

### Linting

```bash
cd frontend
npm run lint
```

### Database indexes

On startup, `backend/config/db.js` automatically:

- Drops legacy indexes (per-company order ID uniqueness, etc.)
- Syncs current indexes on User, Company, and Order collections
- Syncs company ID counter

### File uploads

- Multer handles multipart uploads
- Documents are persisted to **AWS S3** via `backend/utils/s3.js`
- Local `backend/uploads/` serves as static fallback for legacy files

### Testing

Backend has ad-hoc test scripts in `backend/scripts/` but no formal test runner configured (`npm test` is a placeholder).

### Adding a new frontend route

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/RootWrapper.jsx` with `guard()` wrapper
3. Map path to permission section in `frontend/src/utils/permissions.js`
4. Add sidebar entry in `frontend/src/components/SideBar.jsx` (if needed)
5. Add backend route with `checkAuth` + `checkPermission` middleware

### Adding a new API endpoint

1. Create controller in `backend/controllers/`
2. Register route in appropriate `backend/routes/*.js` file
3. Mount router in `backend/app.js` (if new router file)
4. Add frontend API client in `frontend/src/api/`

---

## License

Proprietary — Aaysh Express. All rights reserved.
