# Sovra UI Polish & Hardening Sprint — Design Document

**Date:** 2026-04-13
**Context:** Sovra v1.0 has all 6 functional phases complete and a 52-file design token elevation committed. This sprint addresses the remaining gaps to make the boilerplate genuinely production-ready for the open-source developer community.

**Goal:** Transform Sovra from "functionally complete" to "the gold standard AI SaaS boilerplate" — zero rough edges, perfect accessibility, premium interactions, and bulletproof infrastructure.

---

## Track 1: Critical Infrastructure Fixes

### 1.1 Dark Mode Toggle + ThemeProvider
- Install `next-themes` (the Next.js standard)
- Create `ThemeProvider` wrapper in root layout
- Add `class="dark"` default on `<html>` (dark-first)
- Add theme toggle button in sidebar footer and landing page header
- Persist preference to localStorage

### 1.2 Inter → Geist Font Fix
- Root layout imports `Inter` from `next/font/google` which overrides Geist
- Replace with `next/font/local` loading Geist from `/public/fonts/` or switch to `geist` npm package
- Ensure font variables cascade correctly through the token system

### 1.3 Remaining Hardcoded Colors (3 files)
- `app/(tenant)/t/[slug]/settings/api-keys/page.tsx` — zinc references
- `app/(tenant)/t/[slug]/agents/[agentId]/chat/loading.tsx` — zinc references
- `components/tenant/invite-form.tsx` — `text-[#22C55E]` → `text-status-online`

### 1.4 prefers-reduced-motion
- Add `@media (prefers-reduced-motion: reduce)` block in globals.css
- Disable: `animate-float`, `animate-gradient-shift`, `animate-glow-pulse`, `agent-status-running`
- Reduce all Framer Motion transitions to `duration: 0` via a motion config provider

### 1.5 Middleware Security Audit
- Verify `middleware.ts` handles: unauthenticated redirects, expired sessions, tenant slug validation, admin route protection
- Add security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Verify CSRF protection on mutating API routes

---

## Track 2: 21st Magic Premium Components

### 2.1 Landing Page Hero Upgrade
- Use 21st-ui MCP to generate an animated hero with gradient mesh or particle effect
- Integrate typing animation for the headline
- Must use existing design tokens (surface-*, glow-*, primary)

### 2.2 Feature Bento Grid
- Replace the 3-column card grid with a modern bento-style layout
- Mixed card sizes: 2 large + 4 small or similar asymmetric grid
- Each card uses the `glass` variant with hover-lift

### 2.3 Pricing Cards
- Premium tier cards for the billing page
- Current plan highlight with glow, enterprise card with `plan-enterprise-glow`
- Feature comparison checklist with green checkmarks

### 2.4 Social Proof / Stats Section
- GitHub stars counter (or placeholder), "Built by developers, for developers"
- Tech stack logos section with hover effects
- Community stats or testimonial slots

### 2.5 Landing Footer
- Proper multi-column footer with: Product, Resources, Community, Legal sections
- GitHub link, docs link, Discord/community link
- "Built with Sovra" attribution for downstream forks

---

## Track 3: Accessibility Hardening (WCAG 2.1 AA)

### 3.1 Skip-to-Content Link
- Hidden link in root layout, visible on focus
- Targets `<main>` element in tenant and admin layouts

### 3.2 Focus Ring Audit
- Verify all interactive elements have `focus-visible:ring-*` styles
- Custom buttons, dropdown triggers, card links, form controls
- Add missing focus styles where needed

### 3.3 ARIA Live Regions
- Toast container: `aria-live="polite"` + `role="status"`
- Chat message list: `aria-live="polite"` for new messages
- Workspace activity feed: `aria-live="polite"`
- Socket status indicator: `aria-live="assertive"` for disconnections

### 3.4 Color Contrast Audit
- Verify all `text-muted-foreground` on `bg-surface-*` combos meet 4.5:1
- Check status colors (online/warning/error) on their respective backgrounds
- Fix any failing combinations

### 3.5 Keyboard Navigation
- Verify tab order in sidebar matches visual order
- Ensure Escape closes all dialogs/sheets
- Arrow key navigation in dropdown menus (Radix handles this)
- Chat input: Shift+Enter for newline, Enter for send (already works)

### 3.6 Screen Reader Labels
- Audit all icon-only buttons for `aria-label`
- Add `aria-label` to stat cards, status badges, progress bars
- Ensure form fields have associated labels

---

## Track 4: Micro-Interaction Polish

### 4.1 Page Transitions
- Wrap route content in `AnimatePresence` with `VARIANTS.pageEnter`
- Smooth fade/slide on navigation between tenant pages

### 4.2 Skeleton Loading States
- Create a reusable `PageSkeleton` component
- Apply to: agent list, workspace list, workspace detail, members, billing, API keys, admin pages
- Use `VARIANTS.fadeUp` on content reveal after loading

### 4.3 Hover-Lift on Cards
- Add `whileHover={{ y: -2 }}` with spring physics to: agent cards, workspace cards, plan cards, admin stat cards
- Use the `VARIANTS.hoverLift` defined in Phase 1

### 4.4 Scroll-Triggered Animations
- Landing page sections: fade-in-up on scroll using `useInView` from Framer Motion
- Stagger children in feature grid and "What's Included" section

### 4.5 Tab Content Transitions
- Agent form tabs: smooth content fade/slide between tab panels
- Workspace settings tabs: same treatment
- Use `AnimatePresence mode="wait"` with fade transition

### 4.6 Button Loading States
- Audit all async buttons for loading spinner + disabled state
- Create a `LoadingButton` wrapper or ensure `Button` component handles it
- Apply to: create agent, create workspace, invite member, save settings, billing portal

---

## Track 5: Functional Hardening

### 5.1 API Route Audit
- `POST /api/chat` — verify auth, rate limiting, error responses
- `POST /api/documents/embed` — verify auth, file size limits
- `POST /api/documents/search` — verify auth, tenant scoping
- `POST /api/billing/webhook` — verify Stripe signature validation
- `GET/POST /api/keys` — verify auth, rate limiting
- All routes return proper HTTP status codes and error shapes

### 5.2 Middleware Hardening
- Add Content-Security-Policy header
- Add Strict-Transport-Security header
- Rate limiting on auth routes (login, signup, forgot-password)
- Verify tenant slug extraction handles edge cases

### 5.3 Environment Variable Validation
- Create `lib/env.ts` with Zod schema for all required env vars
- Import and validate at app startup
- Helpful error messages: "Missing SUPABASE_URL. Get it from your Supabase project settings."
- Document all vars in `.env.example` with descriptions

### 5.4 Error Boundaries
- Create `error.tsx` for tenant routes
- Create `error.tsx` for admin routes
- Create `global-error.tsx` for the root (also fixes the Sentry warning)
- Styled error pages that match the design system

### 5.5 Docker Compose Verification
- Verify `docker-compose up` boots all services
- Add health check endpoints for each service
- Verify Supabase migrations run on first boot

### 5.6 README Overhaul
- Quick-start (clone → env → docker-compose up → open browser)
- Architecture diagram (Next.js ↔ Supabase ↔ Go Worker)
- Feature list with screenshots
- Contributing guide
- License section

---

## Execution Strategy

**Approach:** Full Sprint with parallel subagents (max 3 concurrent per rules).

**Order:**
1. Track 1 first (unblocks everything, especially dark mode toggle)
2. Tracks 2-4 in parallel (UI, accessibility, interactions are independent)
3. Track 5 last (functional hardening, may need manual Docker testing)

**Verification:** Each track ends with `tsc --noEmit` + `npm test` + `npm run build`.

**Ship:** One commit per track, push after all pass.
