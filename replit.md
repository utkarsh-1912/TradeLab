# FixLab - FIX Protocol Simulator

## Overview

FixLab is a browser-based integrated FIX protocol simulator that replicates financial trading workflows across three roles: Trader, Broker, and Custodian. The application enables multi-participant simulation of complete order-to-allocation workflows using WebSocket-based real-time communication. Users can open multiple browser tabs, each assuming different roles within a shared trading session, to simulate realistic financial message exchanges including order placement, execution reporting, and post-trade allocation processing.

## Recent Changes

### November 2025 - Modern Fintech UI & Partial Fills
- **UI Redesign**: Migrated from Bloomberg Terminal density to modern Robinhood-style fintech aesthetic with vibrant colors (blue/purple primary, green for buy, red for sell), card-based layouts, generous whitespace, and dark mode optimization
- **Partial Fills**: Complete implementation with quantity controls, quick-fill percentage buttons (25%, 50%, 75%, 100%), input validation preventing overfills, and enhanced execution log showing fill progression with color-coded status indicators
- **Database Migration**: Completed PostgreSQL integration with Drizzle ORM, replacing in-memory storage with persistent database for all session data
- **Message Export/Import**: Added JSON/CSV export functionality and JSON import capability for session messages
- **CSV Batch Upload**: Implemented bulk order upload with CSV parsing and validation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, built using Vite for development and bundling.

**UI Component System**: Radix UI primitives wrapped with shadcn/ui components following a modern fintech design system (Robinhood/Coinbase aesthetic). The design features vibrant colors (blue/purple primary, green for buy, red for sell), clean card-based layouts with generous whitespace, and clear typography hierarchy using Inter for UI elements and JetBrains Mono for financial data. Optimized for dark mode with excellent contrast.

**State Management**: React hooks for local component state, TanStack Query (React Query) for server state management with WebSocket integration for real-time updates. The application maintains separate state slices for orders, executions, allocations, and FIX messages.

**Routing**: Wouter for lightweight client-side routing with four primary routes:
- Landing page (role selection and session join)
- Trader dashboard
- Broker dashboard  
- Custodian dashboard

**Real-time Communication**: Custom WebSocket client (`wsClient.ts`) managing bidirectional communication with event-based handlers for session state, order updates, execution reports, and allocation messages.

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**WebSocket Server**: Native WebSocket implementation (`ws` library) for real-time, bidirectional communication. The server maintains a client registry mapping WebSocket connections to sessions and participant roles.

**Session Management**: In-memory session state tracking multiple participants (Traders, Brokers, Custodians) within named sessions. Sessions support both creation and joining of existing active sessions.

**FIX Message Processing**: Modular architecture with:
- **AllocationEngine**: Calculates allocations using four methods (ProRata, Percent, FixedQty, AvgPrice)
- **FIX Validation**: Message-type-specific tag validation ensuring required fields and value constraints
- **Message Routing**: Role-based message distribution through WebSocket broadcast patterns

**Storage Layer**: Abstracted storage interface (`IStorage`) with PostgreSQL database implementation (`DbStorage`) using Drizzle ORM. All session data (orders, executions, allocations, messages) persists to the database. Session replay capability allows rejoining sessions and loading complete historical state. Automatic schema migrations via `npm run db:push`.

### Data Models

**Core Entities** (defined in `shared/schema.ts`):
- **Users**: Authentication entities with username/password
- **Sessions**: Named trading sessions with active/closed status
- **Participants**: Role-specific session members (Trader/Broker/Custodian) with connection state and simulation parameters (latency, reject flags)
- **Orders**: FIX order representations with status tracking (New, PartiallyFilled, Filled, Canceled, Rejected) and partial fill support (cumQty, leavesQty, avgPx fields for tracking cumulative fills and weighted average price)
- **Executions**: Execution reports linked to orders with fill quantities (lastQty, lastPx) and running totals (cumQty, leavesQty, avgPx)
- **Allocations**: Post-trade allocation instructions with account-level breakdowns and confirmation states
- **FIX Messages**: Raw FIX protocol message storage with sender/receiver tracking

**FIX Message Types Supported**:
- D (NewOrderSingle)
- 8 (ExecutionReport)
- F (OrderCancelRequest)
- G (OrderCancelReplaceRequest)
- J (AllocationInstruction)
- AS (AllocationReport)
- AK (Confirmation)
- P (AllocationAck)

### Design Patterns

**Component Architecture**: Presentational components are separated from business logic. Dashboard pages orchestrate WebSocket communication and state management, delegating rendering to specialized components (OrderBook, ExecutionLog, MessageTimeline, AllocationWizard).

**Event-Driven Communication**: WebSocket messages use typed event handlers with a publish-subscribe pattern. The client registers handlers for specific event types, enabling decoupled real-time updates across UI components.

**Form Validation**: React Hook Form with Zod schema validation for type-safe form handling with runtime validation.

**Responsive Layout**: Mobile-first Tailwind CSS with breakpoint-aware grid layouts. The design system supports responsive transformation from single-column mobile layouts to multi-column desktop layouts.

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Headless accessible component primitives (Dialog, Dropdown, Select, Tabs, Toast, Tooltip, etc.)
- **shadcn/ui**: Pre-styled Radix UI implementations with custom theming
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Touch-friendly carousel component
- **cmdk**: Command palette interface component

### Data Management
- **TanStack Query v5**: Server state management with caching and background updates
- **React Hook Form**: Form state and validation
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting

### Styling
- **Tailwind CSS**: Utility-first CSS framework with custom configuration for FIX-specific colors (buy/sell, order status colors)
- **class-variance-authority**: Type-safe variant styling for component APIs
- **PostCSS & Autoprefixer**: CSS processing pipeline

### Database (PostgreSQL)
- **Drizzle ORM**: TypeScript ORM with PostgreSQL dialect for type-safe database operations
- **@neondatabase/serverless**: Serverless PostgreSQL client (Neon database provider)
- **drizzle-zod**: Schema-to-Zod validator generation for form validation

All application data persists to PostgreSQL: users, sessions, participants, orders, executions, allocations, and FIX messages. Database schema uses snake_case column naming conventions. Migration workflow: modify `shared/schema.ts` → run `npm run db:push` to sync changes.

### Development Tools
- **Vite**: Build tool and development server with HMR
- **TypeScript**: Type safety across frontend and backend
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Production bundling for server code

### Replit-Specific Integrations
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Code mapping plugin
- **@replit/vite-plugin-dev-banner**: Development environment banner