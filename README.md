# RMC ERP

RMC ERP is a full-stack concrete operations platform with separate frontend and backend apps:
- `frontend`: React + TypeScript + Vite web app for customers and admins
- `backend/demo`: Spring Boot + MySQL REST API for orders, inventory, quality, maintenance, finance, and notifications

## What This Project Covers
- Customer flows: registration/login, product purchase, pay-later request, quotation request, delivery tracking, billing, quality access
- Admin flows: order workflow/approval, credit approval, dispatch scheduling, user/admin approvals, inventory, finance, quotation, maintenance
- Notification and contact APIs

## Tech Stack
- Frontend: React 19, TypeScript, Vite 7, Tailwind CSS 4
- Backend: Java 17, Spring Boot 3.3.5, Spring Web, Spring Data JPA, Spring Security, Spring Mail
- Database: MySQL

## Repository Structure
```text
RMC_ERP/
  frontend/                # React client
  backend/demo/            # Spring Boot backend
  README.md
```

## Prerequisites
- Node.js 20+ and npm
- Java 17
- MySQL 8+
- Maven (or use bundled `mvnw` wrapper in `backend/demo`)

## Quick Start

### 1. Clone and install frontend dependencies
```bash
cd frontend
npm install
```

### 2. Configure backend database (MySQL)
Current backend config is in `backend/demo/src/main/resources/application.properties`:
- DB URL: `jdbc:mysql://localhost:3306/rmc_backend`
- DB user/password: currently `root/root`
- Port: `8080`

Create the database before starting backend:
```sql
CREATE DATABASE rmc_backend;
```

### 3. Start backend
From `backend/demo`:
```bash
./mvnw spring-boot:run
```
On Windows PowerShell:
```powershell
.\mvnw.cmd spring-boot:run
```

Backend runs at `http://localhost:8080`.

### 4. Start frontend
From `frontend`:
```bash
npm run dev
```
Frontend runs at `http://localhost:5173` (default Vite port).

## Frontend Configuration
`frontend/src/api/api.ts` supports:
- `VITE_API_BASE_URL` (defaults to `http://localhost:8080`)

Recommended `.env` in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:8080
```

Important note:
- Some frontend files still use hardcoded `http://localhost:8080` directly instead of `VITE_API_BASE_URL`. If you deploy to another host/port, update those calls.

## Backend Configuration
Main config file:
- `backend/demo/src/main/resources/application.properties`

Current behavior:
- `spring.jpa.hibernate.ddl-auto=update`
- CORS allows all origins (`CorsConfig`)
- Security currently permits all endpoints (`SecurityConfig`)
- Scheduling enabled (`@EnableScheduling`)

## Common Scripts

### Frontend (`frontend/package.json`)
- `npm run dev` - start dev server
- `npm run build` - build production bundle
- `npm run lint` - run ESLint
- `npm run preview` - preview production build

### Backend (`backend/demo`)
- `./mvnw spring-boot:run` - run app
- `./mvnw test` - run tests
- `./mvnw clean package` - package JAR

## API Modules (Backend)
Controllers in `backend/demo/src/main/java/com/demo/controller` include:
- `UserController` (`/api/users`) - auth, register, profile, password reset
- `OrderController` (`/api/orders`) - create/update/delete and order/payment history
- `AdminController` (`/api/admin`) - order approvals, workflow, scheduling, dispatch, admin approvals
- `InventoryController` (`/api/admin/inventory`) and product/raw-material controllers
- `QualityController` (`/api/quality`) - inspections, mix design, quality access
- `QuotationController` and `CustomerQuotationController`
- `MaintenanceController` (`/api/admin/maintenance`)
- `FinanceController` (`/api/admin/finance`)
- `NotificationController` (`/api/notifications`)
- `DeliveryTrackingController` (`/api/delivery-tracking`)
- `ContactController` (`/api/contact`)

## Frontend Routes (High Level)
Defined in `frontend/src/App.tsx`:
- Public: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/about-us`, `/contact-us`
- Customer (role-based): `/home`, `/dashboard`, `/purchaseproduct`, `/checkout-payment`, `/delivery-tracking`, `/quotation`, etc.
- Admin (role-based): `/admin`, `/admin/orders`, `/admin/credit-orders`, `/admin/schedule`, `/admin/inventory`, `/admin/finance`, `/admin/quotation`, `/admin/maintenance`, etc.

## Security and Secrets Notes
- `application.properties` currently contains email credentials in plain text.
- Move sensitive values to environment variables or external config before sharing/deploying.
- Authentication in current implementation is basic role/session handling from API response + frontend localStorage.
- Spring Security is currently configured to permit all requests.

## Troubleshooting
- Backend fails to start:
  - verify MySQL is running
  - verify DB exists (`rmc_backend`)
  - check DB credentials in `application.properties`
- Frontend cannot reach backend:
  - ensure backend is running on port `8080`
  - check hardcoded API URLs in frontend files
- CORS issues in production:
  - tighten and configure `CorsConfig` for your frontend domain

## Suggested Next Improvements
1. Replace all hardcoded frontend API URLs with `API_BASE_URL`.
2. Externalize secrets (DB/mail) using environment variables.
3. Enforce real auth/JWT checks in Spring Security.
4. Add API docs (OpenAPI/Swagger) and seed data scripts.
5. Add integration tests for critical order and payment flows.
