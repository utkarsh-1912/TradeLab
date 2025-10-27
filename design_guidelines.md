# FixLab Design Guidelines

## Design Approach

**Selected Approach:** Design System - Material Design influenced with Bloomberg Terminal density patterns

**Justification:** FixLab is a utility-focused, information-dense financial trading application where efficiency, data clarity, and learnability are paramount. The design draws from:
- Material Design for consistent component patterns and elevation system
- Bloomberg Terminal for information density and professional financial UI conventions
- Linear for clean typography hierarchy and modern data presentation
- Robinhood for accessible financial interfaces that don't intimidate

**Core Design Principles:**
1. Information density without clutter - maximize data visibility while maintaining scanability
2. Instant visual feedback for all state changes (orders, executions, allocations)
3. Professional credibility - instill confidence in a financial simulation tool
4. Role-based visual clarity - clear differentiation between Trader/Broker/Custodian interfaces

## Typography System

**Font Families:**
- Primary: 'Inter' - UI text, labels, buttons (400, 500, 600, 700 weights)
- Monospace: 'JetBrains Mono' - FIX message raw text, order IDs, timestamps, numerical data

**Hierarchy:**
- Dashboard Headers: text-2xl font-semibold (24px)
- Section Headers: text-lg font-semibold (18px)
- Card Titles: text-base font-medium (16px)
- Body/Form Labels: text-sm font-medium (14px)
- Table Data: text-sm font-normal (14px)
- Timestamps/Meta: text-xs font-normal (12px)
- FIX Messages: text-xs font-mono (12px monospace)

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Micro spacing (gaps, padding): p-2, gap-2 (8px)
- Standard spacing (cards, sections): p-4, gap-4 (16px)
- Section spacing: p-6, gap-6 (24px)
- Major section breaks: p-8, mb-8 (32px)

**Grid Structure:**
- Dashboard containers: max-w-7xl mx-auto
- Two-column layouts: grid grid-cols-1 lg:grid-cols-2 gap-6
- Three-column data: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Order books/blotters: Full-width tables with fixed headers

## Component Library

### Core UI Elements

**Buttons:**
- Primary: Solid fill, rounded-lg, px-4 py-2, font-medium text-sm
- Secondary: Border outline, rounded-lg, px-4 py-2
- Icon buttons: p-2, rounded-lg for toolbar actions
- Danger actions (Cancel/Reject): Distinct treatment
- Success actions (Fill/Confirm): Distinct treatment

**Input Fields:**
- Standard: rounded-lg, px-3 py-2, border, text-sm
- Numerical inputs: Monospace font for precision
- Dropdowns: Full-width with chevron indicator
- Multi-select: Pill-based tag selection for account allocation

**Cards:**
- Base: rounded-xl, border, shadow-sm
- Elevated: shadow-md for active/focused states
- Dashboard sections: p-6 internal padding
- Nested cards: p-4 for sub-components

**Badges/Tags:**
- Order status: rounded-full, px-3 py-1, text-xs font-medium
- Role indicators: rounded-md, px-2 py-0.5, text-xs uppercase
- Message direction: Inline tags for IN/OUT

### Navigation

**Top Navigation Bar:**
- Fixed header: h-16, border-b, shadow-sm
- Left: Logo + Session name
- Center: Role indicator + connection status (live pulse animation)
- Right: User dropdown, settings icon, notifications

**Session Control Bar:**
- Secondary bar below main nav: h-12
- Role selector, session dropdown, latency toggle, reject simulation toggle
- Connection status indicator with visual pulse for active connection

### Forms

**Order Entry Form (Trader):**
- Vertical layout in sidebar card (w-80 to w-96)
- Symbol input (autocomplete dropdown)
- Side selector (Buy/Sell radio buttons with distinct visual treatment)
- Quantity input (numerical, monospace)
- Order type dropdown (Market/Limit/Stop)
- Price input (conditional on order type, monospace)
- Submit button (full-width, prominent)
- Clear/Reset link (text-sm, right-aligned)

**Allocation Wizard (Multi-step):**
- Step indicator at top (circles with connecting lines)
- Step 1: Allocation method selector (4 large radio cards - Pro-rata, Percent, Fixed Qty, Average Price)
- Step 2: Account entry with dynamic add/remove
  - Account input + quantity/percent input pairs
  - Live computation display showing total allocation
  - Visual indicator when allocation sums to 100% or target quantity
- Step 3: Review summary table with computed values
- Bottom action bar: Back, Next/Submit buttons

### Data Displays

**Order Book/Blotter Tables:**
- Sticky header with column sorting
- Row height: h-10 for comfortable scanning
- Alternating row treatment for readability
- Monospace for all numerical columns (Order ID, Qty, Price)
- Status column: Badge component
- Action column: Icon buttons for Cancel/Modify
- Hover state: Entire row highlight
- Selected row: Persistent highlight with border-l accent

**Message Timeline:**
- Vertical timeline with alternating left/right layout
- Incoming messages: Left-aligned
- Outgoing messages: Right-aligned
- Each message card:
  - Timestamp header (text-xs, sticky to card top)
  - Message type badge (35=D, 35=8, etc.)
  - Tabbed view: Parsed JSON (default) | Raw FIX text (monospace)
  - Expand/collapse for details
- Visual connector line between related messages (New Order → Execution Report)

**Execution Log:**
- Chronological list, most recent first
- Each execution card (compact):
  - Symbol + Side in header
  - Qty @ Price (monospace, emphasized)
  - Status badge + timestamp
  - Expand for full FIX message details

### Overlays

**Modal Dialogs:**
- Backdrop: Semi-transparent overlay
- Modal: max-w-2xl, rounded-2xl, shadow-2xl, centered
- Header: border-b, px-6 py-4, flex justify-between
- Body: px-6 py-4, scrollable if needed
- Footer: border-t, px-6 py-4, action buttons right-aligned

**Toast Notifications:**
- Fixed position: top-right, stacked with gap-2
- Success: Order filled, allocation confirmed
- Warning: Partial fill, allocation pending
- Error: Order rejected, allocation failed
- Auto-dismiss: 5 seconds, slide-in/out animation

**Session Selector Overlay (Initial):**
- Full-screen centered card (max-w-md)
- Logo at top
- Username input (simple mock auth)
- Role selection: 3 large cards (Trader, Broker, Custodian) with icons and descriptions
- Session dropdown or "Create New Session" button
- Prominent "Join Session" button

## Dashboard-Specific Patterns

### Trader Dashboard
**Layout:** Two-column with sidebar
- Left sidebar (w-80): Order entry form (fixed)
- Main area: 
  - Top row: Active orders table (50% height)
  - Bottom row: Execution log (50% height)
- Right panel (collapsible): Message timeline

### Broker Dashboard
**Layout:** Full-width data-centric
- Top section: Incoming orders queue (h-1/3 viewport)
  - Each order as expandable card with quick Fill/Reject actions
- Middle section: Execution blotter table (h-1/3 viewport)
- Bottom section: Allocation management panel (h-1/3 viewport)
  - Incoming allocation instructions with Accept/Reject

### Allocation Desk (Specialized View)
**Layout:** Wizard-style full-screen
- Progress stepper at top
- Main content area changes per step
- Summary sidebar (right, w-96): Shows running totals, accounts, computed allocations
- Fixed action bar at bottom

## Data Visualization

**Real-time Status Indicators:**
- Connection status: Pulsing green dot for connected
- Message count badges: Live update counter
- Order status progression: Visual stepper (New → Partially Filled → Filled)

**Numerical Emphasis:**
- All quantities, prices, and IDs: JetBrains Mono font
- Positive values (fills, confirmations): Success treatment
- Negative values (cancels, rejects): Danger treatment
- Pending states: Warning treatment

**Empty States:**
- No orders: Centered icon + "No active orders" + CTA to create first order
- No messages: Timeline placeholder with sample message structure
- No allocations: Illustration + "Create allocation instruction" guide

## Accessibility

- All interactive elements: Minimum 44x44px touch target
- Form inputs: Visible focus rings (ring-2 ring-offset-2)
- Tables: Keyboard navigation with focus indicators
- Modals: Trap focus, ESC to close
- Status changes: Toast notifications + screen reader announcements
- Numerical inputs: Step controls for precision

This design system ensures FixLab presents as a professional, efficient financial trading simulator with clear information hierarchy, instant feedback, and role-appropriate interfaces that instill user confidence in complex allocation workflows.