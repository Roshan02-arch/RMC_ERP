# Copilot Instructions for RMC_ERP

## Project Overview

RMC_ERP is a full-stack Enterprise Resource Planning system for a Ready Mix Concrete business. It manages the complete order lifecycle including customer orders, production scheduling, delivery tracking, quality control, inventory, maintenance, and billing.

There are two user roles: **CUSTOMER** (places and tracks orders) and **ADMIN** (manages operations, users, scheduling, inventory, finance, and quality control).

## Tech Stack

### Frontend

- **React 19** with **TypeScript** (~5.9) and **Vite** (~7.3)
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin (not PostCSS)
- **React Router DOM 7** for client-side routing
- **Axios** for HTTP requests to the backend API at `http://localhost:8080`
- **React Icons** for iconography
- **Three.js** for 3D animated login page
- **jsPDF** and **html2canvas** for PDF export

### Backend

- **Spring Boot 3.3.5** with **Java 17**
- **Spring Data JPA** (Hibernate) with **MySQL 8.0+**
- **Spring Security 6** with custom JWT-based auth (JJWT 0.11.5)
- **Spring Mail** for OTP-based password reset (Gmail SMTP)
- **Lombok** for reducing entity boilerplate
- **Maven** for build management

## Project Structure

```
RMC_ERP/
├── frontend/                       # React + TypeScript + Vite
│   ├── src/
│   │   ├── Pages/
│   │   │   ├── admin/              # Admin dashboard pages
│   │   │   ├── customer/           # Customer-facing pages
│   │   │   └── auth/               # Login, Register, Password reset
│   │   ├── components/             # Navbar, Layout, Footer, ProtectedRoute
│   │   ├── api/                    # Axios instance (api.ts)
│   │   ├── context/                # NotificationContext (polling-based)
│   │   ├── hooks/                  # Custom hooks (useCenteredDialog)
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── utils/                  # Auth utilities (role normalization)
│   │   ├── App.tsx                 # Route definitions
│   │   ├── main.tsx                # React entry point
│   │   └── index.css               # Tailwind CSS import
│   ├── vite.config.ts
│   ├── tailwind.config.ts          # Custom keyframes and animations
│   ├── tsconfig.app.json           # Strict TypeScript config
│   └── eslint.config.js            # ESLint flat config
│
├── backend/
│   └── demo/                       # Spring Boot application
│       ├── src/main/java/com/demo/
│       │   ├── controller/         # REST API controllers
│       │   ├── service/            # Business logic (interface + impl)
│       │   ├── entity/             # JPA entity classes
│       │   ├── repository/         # Spring Data JPA repositories
│       │   ├── dto/                # Request/Response DTOs
│       │   └── config/             # CORS and Security config
│       └── src/main/resources/
│           └── application.properties
```

## Frontend Conventions

### TypeScript

- Strict mode is enabled with `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`.
- Use `import type` for type-only imports (required by `verbatimModuleSyntax`).
- Target ES2022 with bundler module resolution.
- Use TypeScript interfaces for component props and data shapes.

### Components

- Use functional components with React hooks (`useState`, `useEffect`, `useCallback`).
- Page components live in `src/Pages/` organized by role: `admin/`, `customer/`, `auth/`.
- Shared components live in `src/components/`.
- Wrap protected routes with the `ProtectedRoute` component, passing the required `role` prop.

### Styling

- Use Tailwind CSS utility classes for all styling; no separate CSS modules.
- Tailwind CSS v4 is integrated via the `@tailwindcss/vite` plugin in `vite.config.ts`.
- Custom animations (fadeIn, slideDown, shake, etc.) are defined in `tailwind.config.ts`.
- The `index.css` file uses `@import "tailwindcss"` (v4 syntax).

### State Management

- Local state with `useState` for component-level data.
- `NotificationContext` (in `src/context/`) provides global notification state with polling every 15 seconds.
- Authentication data (role, userId, name, email) is stored in `localStorage`.

### API Calls

- Use the shared Axios instance from `src/api/api.ts` (base URL: `http://localhost:8080`).
- All API endpoints are prefixed with `/api/`.
- Wrap async API calls in try-catch blocks with user-friendly error handling.

### Routing

- Routes are defined in `App.tsx` using React Router DOM v7 (`BrowserRouter`, `Routes`, `Route`).
- Customer pages are nested inside a `CustomerLayout` route wrapped with `ProtectedRoute`.
- Admin pages each have their own `ProtectedRoute` wrapper.

### Imports

- Order: React/hooks first, then third-party libraries, then local modules.
- Use named imports for icons from `react-icons`.

## Backend Conventions

### Controllers

- Annotate with `@RestController`, `@RequestMapping("/api/...")`, and `@CrossOrigin("*")`.
- Return `ResponseEntity<?>` with appropriate HTTP status codes.
- Use `@Autowired` for dependency injection.
- Handle errors with try-catch, returning 400/404/403 status codes as appropriate.

### Services

- Follow the interface + implementation pattern (e.g., `UserService` interface, `UserServiceImpl` class).
- Annotate implementations with `@Service`.
- Throw `RuntimeException` for business logic errors.

### Entities

- Use JPA annotations (`@Entity`, `@Table`, `@Id`, `@GeneratedValue`).
- Use `GenerationType.IDENTITY` for primary key generation.
- Use `@JsonIgnore` to prevent circular serialization on bidirectional relationships.
- Use Lombok annotations (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`) to reduce boilerplate.

### Repositories

- Extend `JpaRepository<Entity, Long>`.
- Use Spring Data JPA derived query methods for custom queries.

### DTOs

- Create separate request/response DTO classes in the `dto/` package.
- Use DTOs for API request bodies rather than exposing entities directly.

### Naming

- PascalCase for classes (suffix with Controller, Service, ServiceImpl, Repository, etc.).
- camelCase for methods and fields.
- Entity classes map to database tables.

## Build & Development Commands

### Frontend

```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript check + Vite production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend

```bash
cd backend/demo
mvn clean install        # Build the project
mvn spring-boot:run      # Run the Spring Boot application on port 8080
```

## Key API Endpoints

- `/api/users/*` — User registration, login, profile, password reset
- `/api/orders/*` — Order CRUD and lifecycle management
- `/api/notifications/*` — Notification polling and read status
- `/api/admin/*` — Admin-specific operations
- `/api/quality/*` — Quality control inspections
- `/api/maintenance/*` — Equipment maintenance scheduling
- `/api/delivery/*` — Delivery tracking updates
- `/api/inventory/*` — Inventory and stock management

## Authentication Flow

1. Users register via `/api/users/register`; customers are auto-approved, admins require manual approval.
2. Login via `/api/users/login` returns user data (role, userId, name, email) stored in `localStorage`.
3. Password reset uses an OTP flow: forgot-password → verify-otp → reset-password.
4. Frontend `ProtectedRoute` checks `localStorage` role to guard routes.
