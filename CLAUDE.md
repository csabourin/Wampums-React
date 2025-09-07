# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev`: Start development server (Vite)
- `npm run build`: Build production bundle
- `npm run preview`: Preview production build

## Architecture Overview

Provide Lightweight, Performant, Clean architectural code.
You should always work with clearly separated, minimal and targeted solutions that prioritize clean architecture over feature complexity.
Focus on synchronous, deterministic operations for production stability rather than introducing async frameworks that add unnecessary complexity and potential failure points.
Maintain strict separation of concerns across modules, ensuring each component has a single, well-defined responsibility.
Work with modular project layout and centralized main module, SoC is critical for project flexibility.
Important to recognize when separation of concerns would harm rather than help the architecture.
Each project should include a benchmarking suite that links directly to projects modules for real testing during development to catch improvements/regressions in real-time.
Benchmarking suite must include generalized output to .json with collected data (component: result).
Apply optimizations only to proven bottlenecks with measurable impact, avoiding premature optimization that clutters the codebase (eg.: Regressions after a change).
Favor robust error handling without over-engineering - implement what's necessary for production reliability, not every possible edge case.
Choose based on performance characteristics that match the workload requirements, not popular trends.
Preserve code readability and maintainability as primary concerns, ensuring that any performance improvements don't sacrifice code clarity.
Resist feature bloat and complexity creep by consistently asking whether each addition truly serves the core purpose.
Multiple languages don't violate the principles when each serves a specific, measurable purpose. The complexity is then justified by concrete performance gains and leveraging each language's strengths.
Prioritize deterministic behavior and long-runtime stability over cutting-edge patterns that may introduce unpredictability.
Design with cross-platform considerations and real-world deployment constraints in mind, not just development environment convenience.
When sharing code, you should always contain the code to its own artifact with clear path labeling.
Files should never exceed 150 lines, if it were to exceed, the file must be split into 2 or 3 clearly separated concerned files that fit into the minimal and modular architecture.
When dealing with edge-cases, provide information about the edge-case and make a suggestion that helps guide the next steps, refrain from introducing the edge-case code until a plan is devised mutually.
Utilize the existing configurations, follow project architecture deterministically, surgical modification, minimal targeted implementations.
Reuse any functions already defined, do not create redundant code.
Ensure naming conventions are retained for existing code.
Avoid using comments in code, the code must be self-explanatory.
Ensure KISS and DRY principles are expertly followed.
You believe in architectural minimalism with deterministic reliability - every line of code must earn its place through measurable value, not feature-rich design patterns.
You build systems that work predictably in production, not demonstrations of architectural sophistication.
Your approach is surgical: target the exact problem with minimal code, reuse existing components rather than building new ones, and resist feature bloat by consistently evaluating whether each addition truly serves the core purpose.
Before any refactor, explicitly document where each component will relocate, and what functions require cleanup.
When refactor details cannot be accurately determined, request project documentation rather than proceeding with incomplete planning.

This is a React-based scouts management application (Wampums) with the following key architectural components:

### Multi-tenant Organization System
- The app supports multiple organizations through organization ID context
- Organization ID is fetched dynamically on app initialization via `organizationService.fetchOrganizationId()`
- All API requests include organization context through headers

### Authentication & Authorization
- Role-based authentication with three roles: `admin`, `animation`, and `parent`
- JWT token-based authentication with automatic token expiration checking
- Authentication state managed through `AuthContext` (`src/contexts/AuthContext.jsx`)
- Route protection based on user roles through `ProtectedRoute` component
- Automatic dashboard routing based on user role (parents go to `/parent-dashboard`, others to `/dashboard`)

### Offline-First Data Management
- IndexedDB integration via Dexie for offline data storage and caching (`src/lib/indexedDBService.jsx`)
- Service worker registration for PWA capabilities
- Online/offline status monitoring with fallback functionality
- Data caching with configurable expiration times (default 2 hours)

### Internationalization
- i18next setup with French as fallback language
- Language detection from localStorage and browser
- Translation files located in `/locales/[lang]/translation.json`
- Language toggle component available

### API Services Structure
All API services follow consistent patterns:
- Base URL: Environment variable `REACT_APP_API_URL` or fallback to 'https://wampums-api.replit.app'
- Organization ID header (`x-organization-id`) included in authenticated requests
- JWT Bearer token authentication
- Services: `authService`, `organizationService`, `participantService`, `meetingService`

### Component Organization
- Common components in `src/components/common/` (LoadingSpinner, Notification, LanguageToggle)
- Page components in `src/pages/` with role-based access
- Services in `src/api/` with consistent error handling patterns

### Key Features
- Meeting attendance tracking
- Points and honors management for scouts
- Parent dashboards for viewing child progress
- Form-based inscription system
- Admin panel for organization management

### Development Environment
- Configured for Replit with Vite bundler
- TypeScript support configured but currently using JSX files
- DDEV configuration present for potential PHP backend integration
- Service worker enabled by default for PWA functionality

## Important Notes
- The app initializes by fetching organization settings before rendering
- All authenticated API calls automatically include organization context
- Authentication tokens are validated for expiration on each check
- The app gracefully handles offline scenarios with local data caching