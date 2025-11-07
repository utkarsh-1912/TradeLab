# FixLab Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based - Robinhood/Coinbase Modern Fintech Aesthetic

**Justification:** FixLab transforms traditional financial trading interfaces into an accessible, modern fintech application. Drawing inspiration from:
- Robinhood for clean, card-based layouts and vibrant buy/sell interactions
- Coinbase for data-dense yet scannable trading interfaces
- Webull for professional charting and real-time updates
- Linear for typography hierarchy and polished micro-interactions

**Core Design Principles:**
1. Clarity through whitespace - generous padding between information clusters
2. Instant visual feedback with smooth animations and color-coded states
3. Card-based architecture for modular, scannable content
4. Dark mode first - optimized contrast for extended trading sessions
5. Accessible professionalism - powerful yet approachable

## Typography System

**Font Families:**
- Primary: 'Inter' (400, 500, 600, 700) via Google Fonts CDN
- Monospace: 'JetBrains Mono' (400, 500) for financial data, FIX messages, order IDs

**Hierarchy:**
- Page Headers: text-3xl font-bold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card Headers: text-lg font-semibold (18px)
- Body Text: text-base font-medium (16px)
- Labels/Captions: text-sm font-medium (14px)
- Data Tables: text-sm font-normal (14px)
- Metadata: text-xs font-normal (12px)
- Financial Data: text-sm font-mono (14px monospace)

## Layout System

**Spacing Primitives:** Tailwind units of 3, 4, 6, 8, 12
- Card internal padding: p-6
- Section spacing: gap-6, mb-8
- Component gaps: gap-4
- Micro spacing: gap-3, p-3
- Major breaks: mb-12, py-12

**Containers:**
- Dashboard max-width: max-w-7xl mx-auto px-4
- Card grid: grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6
- Full-width tables: w-full with internal max-w-7xl

## Component Library

### Core UI Elements

**Buttons:**
- Primary CTA: rounded-xl px-6 py-3 font-semibold text-base, gradient treatment
- Buy Action: Vibrant green fill, rounded-xl px-6 py-3
- Sell Action: Vibrant red fill, rounded-xl px-6 py-3
- Secondary: Outlined with rounded-xl px-6 py-3
- Icon buttons: rounded-lg p-3 for quick actions
- Ghost buttons: Minimal styling for tertiary actions

**Cards:**
- Base card: rounded-2xl shadow-lg backdrop-blur with subtle border
- Elevated cards: shadow-xl for focus states
- Nested cards: rounded-xl shadow-md
- Internal padding: p-6 for standard, p-4 for compact
- Header section: pb-4 border-b within card

**Input Fields:**
- Modern style: rounded-xl px-4 py-3 text-base with subtle border
- Focus state: ring-2 with blue/purple accent
- Numerical inputs: Monospace font (JetBrains Mono)
- Symbol search: Autocomplete dropdown with icon prefix
- Dropdowns: Full rounded-xl with chevron, smooth slide-in options

**Badges & Status Indicators:**
- Order status: rounded-full px-4 py-1.5 text-sm font-semibold
- Live indicators: Animated pulse dot + text (green for active)
- Message type tags: rounded-lg px-3 py-1 text-xs uppercase font-mono
- Buy/Sell pills: Vibrant colors, rounded-full px-3 py-1

### Navigation

**Top Navigation:**
- Sticky header: h-16 backdrop-blur shadow-sm
- Left: FixLab logo + wordmark
- Center: Session selector dropdown + role badge
- Right: Connection status (animated pulse) + settings icon + user avatar
- Bottom border with subtle gradient

**Session Controls:**
- Floating control panel: Fixed bottom-right, rounded-2xl shadow-2xl
- Toggle switches for latency simulation, reject modes
- Collapse/expand with smooth animation
- Badge counters for active messages

### Forms & Wizards

**Order Entry (Trader):**
- Floating sidebar card: w-96 rounded-2xl shadow-xl
- Symbol input: Large text-lg with autocomplete
- Buy/Sell toggle: Pill-style segmented control with vibrant colors
- Quantity: Large monospace input with step controls
- Order type: Segmented control (Market/Limit/Stop)
- Price: Conditional, monospace with currency prefix
- Submit: Full-width gradient button text-lg font-bold
- Quick actions: One-click market buy/sell shortcuts

**Allocation Wizard:**
- Full-screen overlay with centered max-w-4xl card
- Progress steps: Circles with connecting lines, gradient on active
- Step 1: Method selector - 4 large cards (16rem each) in grid-cols-2 gap-6
- Step 2: Dynamic account rows with smooth add/remove animations
- Live computation sidebar: Sticky right panel showing totals
- Step 3: Summary table with expandable rows
- Action bar: Fixed bottom with Back/Next gradient buttons

### Data Displays

**Order Cards:**
- Individual order cards in vertical stack, gap-4
- Card header: Symbol (text-xl font-bold) + Status badge + Timestamp
- Body: Two-column grid showing Order ID, Side, Qty, Price (all monospace)
- Footer: Action buttons (Cancel/Modify) right-aligned
- Hover: Lift effect with shadow-2xl
- Active orders: Subtle animated border pulse

**Execution Log:**
- Timeline layout with left line connector
- Each execution: Compact card with rounded-xl
- Time indicator: Absolute positioned, text-xs
- Symbol + Side as header with color-coded pill
- Price x Qty prominently displayed (text-lg font-mono)
- Status badge + expand chevron
- Expanded: Full FIX message with tabbed Raw/Parsed view

**Message Timeline:**
- Dual-column: Incoming (left) / Outgoing (right)
- Message cards: rounded-xl with direction indicator
- Color coding: Green tint for successful, red for rejects, blue for pending
- Timestamp: text-xs at card top
- Message type: Monospace badge (35=D, 35=8)
- Content: Syntax-highlighted JSON with expand/collapse
- Connection lines: Animated paths linking related messages

**Data Tables:**
- Sticky header with sorting indicators
- Row height: h-12 for comfortable scanning
- Hover: Smooth background transition
- Selected: Gradient left border accent
- Monospace columns: Order ID, Quantities, Prices
- Status column: Badge components
- Actions: Icon buttons that appear on row hover

### Overlays

**Modals:**
- Backdrop: Dark overlay with blur effect
- Modal: max-w-2xl rounded-3xl shadow-2xl centered
- Header: px-8 py-6 border-b with close button
- Body: px-8 py-6 max-h-96 overflow-auto
- Footer: px-8 py-6 border-t, actions right-aligned gap-3

**Toast Notifications:**
- Fixed top-right, stacked gap-3
- Card style: rounded-xl px-6 py-4 shadow-xl
- Icon + Message + Close button
- Color-coded: Green (success), Red (error), Yellow (warning), Blue (info)
- Slide-in animation from right, auto-dismiss 5s

## Dashboard Layouts

### Trader Dashboard
- Main grid: 70% left / 30% right
- Left: Order entry floating card (top-left) + Active orders grid below
- Right: Execution log timeline
- Bottom: Full-width message timeline (collapsible)

### Broker Dashboard  
- Three-row layout with equal heights
- Row 1: Incoming orders - horizontal scroll of order cards
- Row 2: Execution blotter table - sticky header
- Row 3: Allocation management - card grid with quick actions

### Session Launcher
- Full-screen centered card (max-w-lg)
- FixLab logo + gradient tagline
- Username input (rounded-xl, large)
- Role selector: 3 large cards with icons and descriptions (grid-cols-3 gap-4)
- Session dropdown or "New Session" prominent button
- "Start Trading" gradient button (text-xl)

## Animations

**Micro-interactions:**
- Button hover: Subtle scale(1.02) + shadow increase
- Card hover: Lift with translateY(-2px) + shadow-2xl
- Status changes: Smooth color transitions (300ms)
- Loading states: Skeleton shimmer effect
- Success actions: Green checkmark animation
- Connection pulse: 2s infinite opacity animation

## Data Visualization

**Real-time Indicators:**
- Connection: Animated green pulse dot + "Connected" text
- Message counter: Badge with slide-in number increment
- Order status: Multi-step progress indicator
- Price updates: Flash animation on change (green up, red down)

**Empty States:**
- Centered illustration icon
- Heading + description text
- Prominent CTA button to add first item
- Subtle background pattern for depth

## Accessibility

- Minimum 44px touch targets
- Visible focus rings: ring-2 ring-offset-2
- Keyboard navigation: Full table/card support
- Modal focus trap with ESC close
- Color contrast: WCAG AAA for dark mode
- Screen reader announcements for status changes

## Images

No hero images required. FixLab is a utility application focused on trading interfaces. All visual elements use cards, data displays, and functional UI components without marketing imagery.