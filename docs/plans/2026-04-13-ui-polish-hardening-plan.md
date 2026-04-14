# Sovra UI Polish & Hardening Sprint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Sovra the gold-standard open-source AI SaaS boilerplate — zero rough edges, WCAG 2.1 AA accessible, premium micro-interactions, secure middleware, and complete developer onboarding.

**Architecture:** 5 parallel tracks executed sequentially within each track. Track 1 (infrastructure) unblocks all others. Tracks 2-4 (UI/a11y/interactions) are independent. Track 5 (hardening) runs last.

**Tech Stack:** Next.js 15, Supabase, Tailwind CSS, Framer Motion v12, next-themes, geist font package, Zod, Stripe

---

## Track 1: Critical Infrastructure Fixes

### Task 1: Install next-themes and geist font

**Files:**
- Modify: `packages/web/package.json`

**Step 1: Install dependencies**

Run: `cd packages/web && npm install next-themes geist`

**Step 2: Verify installation**

Run: `cat package.json | grep -E '"next-themes|"geist"'`
Expected: Both packages appear in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add next-themes and geist font package"
```

---

### Task 2: Create ThemeProvider and fix font loading

**Files:**
- Create: `packages/web/components/providers/ThemeProvider.tsx`
- Modify: `packages/web/app/layout.tsx`

**Step 1: Create ThemeProvider**

```tsx
// packages/web/components/providers/ThemeProvider.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

**Step 2: Update root layout — replace Inter with Geist, wrap in ThemeProvider**

Replace the entire `packages/web/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  title: 'Sovra - AI-Native SaaS Boilerplate',
  description:
    'Production-ready open-source boilerplate for building multi-tenant AI applications with MCP, vector database, and multi-agent collaboration.',
  keywords: ['AI', 'MCP', 'multi-tenant', 'SaaS', 'boilerplate', 'Next.js', 'Go'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(GeistSans.variable, GeistMono.variable, 'min-h-screen bg-background font-sans antialiased')}>
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 3: Update globals.css body rule to use the CSS variable**

In `packages/web/app/globals.css`, change the body `font-family` line to:

```css
font-family: var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

**Step 4: Verify build**

Run: `npm run build 2>&1 | head -5`
Expected: `✓ Compiled successfully`

**Step 5: Commit**

```bash
git add packages/web/components/providers/ThemeProvider.tsx packages/web/app/layout.tsx packages/web/app/globals.css
git commit -m "feat(ui): add ThemeProvider with next-themes, switch Inter to Geist font"
```

---

### Task 3: Create theme toggle component

**Files:**
- Create: `packages/web/components/ui/theme-toggle.tsx`
- Modify: `packages/web/components/tenant/sidebar.tsx` (add toggle to user section)
- Modify: `packages/web/app/page.tsx` (add toggle to landing header)

**Step 1: Create theme toggle**

```tsx
// packages/web/components/ui/theme-toggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-8 w-8" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3/70 transition-colors"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
```

**Step 2: Add to sidebar user section**

In `packages/web/components/tenant/sidebar.tsx`, import `ThemeToggle` and add it next to the sign-out button in the `UserSection` component.

**Step 3: Add to landing page header**

In `packages/web/app/page.tsx`, import `ThemeToggle` and add it before the "Get Started" button in the nav.

**Step 4: Commit**

```bash
git add packages/web/components/ui/theme-toggle.tsx packages/web/components/tenant/sidebar.tsx packages/web/app/page.tsx
git commit -m "feat(ui): add dark/light theme toggle to sidebar and landing page"
```

---

### Task 4: Fix remaining hardcoded colors (3 files)

**Files:**
- Modify: `packages/web/app/(tenant)/t/[slug]/settings/api-keys/page.tsx`
- Modify: `packages/web/app/(tenant)/t/[slug]/agents/[agentId]/chat/loading.tsx`
- Modify: `packages/web/components/tenant/invite-form.tsx`

**Step 1: Fix api-keys page**

In `api-keys/page.tsx`:
- Line 64: `bg-zinc-800/20` → `bg-surface-3/20`
- Line 70: `bg-zinc-800/60` → `bg-surface-3/60`

**Step 2: Fix chat loading skeleton**

In `chat/loading.tsx`:
- Line 7: `bg-zinc-900/50` → `bg-surface-2/50`

**Step 3: Fix invite-form**

In `invite-form.tsx`:
- `text-[#22C55E]` → `text-status-online`

**Step 4: Verify no more zinc references**

Run: `grep -r "bg-zinc\|text-zinc\|border-zinc\|text-\[#" packages/web/components packages/web/app --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v __tests__ | grep -v ".next" | grep -v "oauth-button"` (oauth-button has brand SVGs, those are fine)

Expected: Zero results

**Step 5: Commit**

```bash
git add packages/web/app/\(tenant\)/t/\[slug\]/settings/api-keys/page.tsx packages/web/app/\(tenant\)/t/\[slug\]/agents/\[agentId\]/chat/loading.tsx packages/web/components/tenant/invite-form.tsx
git commit -m "fix(ui): replace final 3 hardcoded zinc/hex color references"
```

---

### Task 5: Add prefers-reduced-motion support

**Files:**
- Modify: `packages/web/app/globals.css`
- Create: `packages/web/components/providers/MotionProvider.tsx`
- Modify: `packages/web/app/layout.tsx`

**Step 1: Add @media block to globals.css**

Append at end of `globals.css`:

```css
/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  .animate-float,
  .animate-gradient-shift,
  .animate-glow-pulse,
  .agent-status-running,
  .status-pulse,
  .streaming-cursor {
    animation: none !important;
  }

  .transition-all,
  .transition-colors,
  .transition-opacity,
  .transition-transform {
    transition-duration: 0.01ms !important;
  }
}
```

**Step 2: Create Framer Motion reducer**

```tsx
// packages/web/components/providers/MotionProvider.tsx
'use client'

import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
```

**Step 3: Wrap root layout in MotionProvider**

In `app/layout.tsx`, import `MotionProvider` and wrap inside ThemeProvider:

```tsx
<ThemeProvider>
  <MotionProvider>
    <PostHogProvider>{children}</PostHogProvider>
  </MotionProvider>
</ThemeProvider>
```

**Step 4: Commit**

```bash
git add packages/web/app/globals.css packages/web/components/providers/MotionProvider.tsx packages/web/app/layout.tsx
git commit -m "feat(a11y): add prefers-reduced-motion support for CSS and Framer Motion"
```

---

### Task 6: Add security headers to middleware

**Files:**
- Modify: `packages/web/middleware.ts`

**Step 1: Add security headers function**

Before the `return response` at line 104 of `middleware.ts`, add a function that sets security headers on every response:

```typescript
function setSecurityHeaders(res: NextResponse): void {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-DNS-Prefetch-Control', 'on')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}
```

Call `setSecurityHeaders(response)` before every `return response` statement in the middleware (3 locations: admin return at line 74, and final return at line 104). Also add it before the auth redirect responses.

**Step 2: Fix redirect paths**

The middleware has inconsistent auth redirect paths:
- Line 51: redirects to `/auth/login` (correct)
- Line 84: redirects to `/login` (wrong — should be `/auth/login`)
- Line 88-89: checks for `/login` and `/signup` (wrong — should be `/auth/login` and `/auth/signup`)

Fix all to use `/auth/login` and `/auth/signup`.

**Step 3: Commit**

```bash
git add packages/web/middleware.ts
git commit -m "feat(security): add security headers and fix auth redirect paths in middleware"
```

---

## Track 2: Premium Components (21st-ui)

### Task 7: Upgrade landing hero with scroll animations

**Files:**
- Modify: `packages/web/app/page.tsx` (convert to client component for useInView)

**Step 1: Convert landing page sections to use scroll-triggered fade-in**

Import `useInView` from `framer-motion` and wrap each section in a `motion.section` with `VARIANTS.fadeUp` triggered by `useInView`. Use the `once: true` option so animations only trigger once.

**Step 2: Add animated typing effect to hero headline**

Add a simple CSS typing cursor effect using the existing `streaming-cursor` class on the hero tagline. The headline stays static (no JS typing — that hurts SEO).

**Step 3: Add GitHub stats badge**

In the hero area, add a badge that shows "Star us on GitHub" linking to the repo. Use `Badge variant="secondary"` with a GitHub icon.

**Step 4: Commit**

```bash
git add packages/web/app/page.tsx
git commit -m "feat(landing): add scroll animations, GitHub CTA badge"
```

---

### Task 8: Build bento feature grid

**Files:**
- Create: `packages/web/components/landing/feature-bento.tsx`
- Modify: `packages/web/app/page.tsx`

**Step 1: Create bento grid component**

A 2-column grid where the first 2 features span full width (large cards) and the remaining 4 are 2x2 (small cards). Use `Card variant="glass"` with hover-lift. Each card uses `motion.div` with `VARIANTS.fadeUp` and staggered delay.

**Step 2: Replace inline features grid in page.tsx**

Replace the current 3-column `features.map()` grid with `<FeatureBento features={features} />`.

**Step 3: Commit**

```bash
git add packages/web/components/landing/feature-bento.tsx packages/web/app/page.tsx
git commit -m "feat(landing): bento-style feature grid with glass cards"
```

---

### Task 9: Build premium footer

**Files:**
- Create: `packages/web/components/landing/footer.tsx`
- Modify: `packages/web/app/page.tsx`

**Step 1: Create multi-column footer**

4 columns: Product (Features, Pricing, Docs), Developers (GitHub, API Reference, Contributing), Community (Discord, Twitter, Blog), Legal (License, Privacy).

Use `bg-surface-2` background with `border-t border-border/40`. Bottom bar with copyright and "Built with Sovra" attribution.

**Step 2: Replace simple footer in page.tsx**

Swap the existing 2-line footer with `<Footer />`.

**Step 3: Commit**

```bash
git add packages/web/components/landing/footer.tsx packages/web/app/page.tsx
git commit -m "feat(landing): multi-column footer with navigation links"
```

---

## Track 3: Accessibility Hardening

### Task 10: Add skip-to-content and ARIA live regions

**Files:**
- Create: `packages/web/components/ui/skip-to-content.tsx`
- Modify: `packages/web/app/layout.tsx`
- Modify: `packages/web/app/(tenant)/t/[slug]/layout.tsx` (add id="main-content" to main)
- Modify: `packages/web/app/(admin)/layout.tsx` (add id="main-content" to main)
- Modify: `packages/web/components/ui/toast-provider.tsx` (add aria-live)

**Step 1: Create skip-to-content component**

```tsx
// packages/web/components/ui/skip-to-content.tsx
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-glow-md"
    >
      Skip to content
    </a>
  )
}
```

**Step 2: Add to root layout**

Import `SkipToContent` in `app/layout.tsx` and place it as the first child of `<body>`.

**Step 3: Add id="main-content" to main elements**

In tenant layout and admin layout, add `id="main-content"` to the `<main>` element.

**Step 4: Add aria-live to toast container**

In `toast-provider.tsx`, add `aria-live="polite" role="status"` to the toast container div.

**Step 5: Commit**

```bash
git add packages/web/components/ui/skip-to-content.tsx packages/web/app/layout.tsx packages/web/app/\(tenant\)/t/\[slug\]/layout.tsx packages/web/app/\(admin\)/layout.tsx packages/web/components/ui/toast-provider.tsx
git commit -m "feat(a11y): add skip-to-content link and ARIA live regions"
```

---

### Task 11: Audit and fix focus states + screen reader labels

**Files:**
- Multiple components (audit-driven)

**Step 1: Run focus state audit**

Search all interactive elements for missing `focus-visible:` styles:

```bash
grep -rn "onClick\|href=" packages/web/components --include="*.tsx" | grep -v "focus-visible\|focus:" | head -30
```

Fix any interactive elements missing focus-visible ring styles.

**Step 2: Audit icon-only buttons for aria-label**

```bash
grep -rn "<button" packages/web/components --include="*.tsx" | grep -v "aria-label"
```

Add `aria-label` to any icon-only buttons that are missing them.

**Step 3: Add aria-label to status indicators**

Agent status badges, socket status indicators, workspace mode badges — ensure each has `aria-label` describing the state.

**Step 4: Commit**

```bash
git add -u
git commit -m "feat(a11y): fix missing focus states and screen reader labels"
```

---

## Track 4: Micro-Interaction Polish

### Task 12: Add skeleton loading states to all data pages

**Files:**
- Create: `packages/web/components/ui/page-skeleton.tsx`
- Modify: `packages/web/app/(tenant)/t/[slug]/agents/loading.tsx`
- Create: `packages/web/app/(tenant)/t/[slug]/workspaces/loading.tsx`
- Create: `packages/web/app/(tenant)/t/[slug]/members/loading.tsx`
- Create: `packages/web/app/(tenant)/t/[slug]/settings/billing/loading.tsx`

**Step 1: Create reusable PageSkeleton**

A component that takes a `variant` prop: 'cards' (agent/workspace lists), 'table' (members), 'detail' (billing). Each renders appropriate skeleton shapes using the existing `Skeleton` component.

**Step 2: Create loading.tsx files**

Each Next.js `loading.tsx` file exports a default component that renders the appropriate `PageSkeleton` variant. These are automatically shown by Next.js during route transitions.

**Step 3: Commit**

```bash
git add packages/web/components/ui/page-skeleton.tsx packages/web/app/
git commit -m "feat(ux): add skeleton loading states to all data pages"
```

---

### Task 13: Add hover-lift to all interactive cards

**Files:**
- Modify: `packages/web/components/agent/agent-card.tsx`
- Modify: `packages/web/components/workspace/workspace-card.tsx`
- Modify: `packages/web/components/billing/PlanCard.tsx`
- Modify: `packages/web/components/admin/AdminStatCard.tsx`

**Step 1: Add whileHover to motion containers**

For each card component that already uses `motion.div`, add `whileHover={{ y: -2 }}` with `transition={{ type: 'spring', stiffness: 400, damping: 20 }}`.

For `AdminStatCard` which doesn't use motion, wrap in `motion.div` with the same hover-lift.

**Step 2: Commit**

```bash
git add packages/web/components/agent/agent-card.tsx packages/web/components/workspace/workspace-card.tsx packages/web/components/billing/PlanCard.tsx packages/web/components/admin/AdminStatCard.tsx
git commit -m "feat(ux): add hover-lift micro-interaction to all card components"
```

---

### Task 14: Add button loading states

**Files:**
- Modify: `packages/web/components/ui/button.tsx` (add loading prop)
- Update callers as needed

**Step 1: Add loading prop to Button**

Add optional `loading?: boolean` prop to `ButtonProps`. When true, show `Spinner` and disable the button. Import `Spinner` from `@/components/ui/spinner`.

```tsx
{loading && <Spinner size="sm" />}
{!loading && children}
```

Also apply `disabled` and `opacity-70 cursor-wait` when loading.

**Step 2: Audit all async buttons**

Search for patterns like `disabled={submitting}` or `disabled={isPending}` and ensure they also pass `loading={submitting}` to show the spinner.

**Step 3: Commit**

```bash
git add packages/web/components/ui/button.tsx
git commit -m "feat(ux): add loading prop to Button with spinner state"
```

---

## Track 5: Functional Hardening

### Task 15: Create environment variable validation

**Files:**
- Create: `packages/web/lib/env.ts`
- Create: `packages/web/.env.example`
- Modify: `packages/web/app/layout.tsx` (import env validation)

**Step 1: Create Zod env schema**

```typescript
// packages/web/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Missing NEXT_PUBLIC_SUPABASE_URL — get it from your Supabase project settings'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Missing SUPABASE_SERVICE_ROLE_KEY').optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_').optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    throw new Error('Invalid environment variables. See errors above.')
  }
  return parsed.data
}

export const env = validateEnv()
```

**Step 2: Create .env.example**

```bash
# Sovra — Environment Variables
# Copy to .env.local and fill in your values

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (optional — billing features)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# PostHog (optional — analytics)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Sentry (optional — error tracking)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Go Worker (for local development)
GO_WORKER_URL=http://localhost:3001
```

**Step 3: Commit**

```bash
git add packages/web/lib/env.ts packages/web/.env.example
git commit -m "feat(dx): add Zod env validation and .env.example with documentation"
```

---

### Task 16: Create error boundaries

**Files:**
- Create: `packages/web/app/error.tsx`
- Create: `packages/web/app/global-error.tsx`
- Create: `packages/web/app/(tenant)/t/[slug]/error.tsx`
- Create: `packages/web/app/(admin)/admin/error.tsx`

**Step 1: Create root error boundary**

```tsx
// packages/web/app/error.tsx
'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-error/10 mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-status-error" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Create global-error.tsx** (fixes the Sentry warning)

Same pattern but renders its own `<html>` and `<body>` tags since it replaces the entire root layout.

**Step 3: Create tenant and admin error boundaries**

Same component but with navigation back to dashboard/admin home.

**Step 4: Commit**

```bash
git add packages/web/app/error.tsx packages/web/app/global-error.tsx packages/web/app/\(tenant\)/t/\[slug\]/error.tsx packages/web/app/\(admin\)/admin/error.tsx
git commit -m "feat(dx): add styled error boundaries for all route groups"
```

---

### Task 17: API route hardening

**Files:**
- Modify: `packages/web/app/api/chat/route.ts` (add rate check note, verify tenant scope)
- Modify: `packages/web/app/api/documents/embed/route.ts`
- Modify: `packages/web/app/api/documents/search/route.ts`

**Step 1: Audit each API route for**

- Auth check (getUser) ✅ chat has it
- Tenant scoping (queries filtered by tenant_id) — chat uses agent.tenant_id implicitly, but doesn't verify the user belongs to that tenant
- Input validation (Zod schemas for request bodies)
- Proper error shapes (JSON with `{ error: string }`)
- Try-catch on all async operations

**Step 2: Add tenant ownership verification to chat route**

After fetching the agent at line 37-42 of `api/chat/route.ts`, verify the user has access to this agent's tenant:

```typescript
// Verify user belongs to agent's tenant
const { data: membership } = await supabase
  .from('tenant_users')
  .select('id')
  .eq('user_id', user.id)
  .eq('tenant_id', agent.tenant_id)
  .single()

if (!membership) return new Response('Forbidden', { status: 403 })
```

**Step 3: Audit documents routes similarly**

Verify auth + tenant scoping on embed and search routes.

**Step 4: Commit**

```bash
git add packages/web/app/api/
git commit -m "fix(security): add tenant ownership verification to API routes"
```

---

### Task 18: Final verification and README

**Files:**
- Modify: `README.md` (root)

**Step 1: Run full verification**

```bash
cd packages/web
npx tsc --noEmit          # TypeScript check
npm test                   # 305+ tests
npm run build              # Production build
```

**Step 2: Verify zero remaining zinc/hex references**

```bash
grep -r "bg-zinc\|text-zinc\|border-zinc" packages/web/components packages/web/app --include="*.tsx" | grep -v node_modules | grep -v ".next" | grep -v oauth-button
```

Expected: Zero results

**Step 3: Update README with quick-start**

Write a comprehensive README.md at the project root with:
- Hero banner describing Sovra
- Quick start (3 commands: clone, env setup, docker-compose up)
- Architecture overview (Next.js + Supabase + Go Worker)
- Feature list with categories
- Screenshots section (placeholder paths)
- Contributing guide
- License (MIT)

**Step 4: Final commit and push**

```bash
git add -A
git commit -m "docs: comprehensive README with quick-start and architecture overview"
git push
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] Dark mode toggle works in sidebar and landing page
- [ ] Theme persists across page refreshes (localStorage)
- [ ] Geist font renders (not Inter)
- [ ] Zero `bg-zinc` references outside SVG fills
- [ ] `prefers-reduced-motion` disables all CSS animations
- [ ] Security headers present on every response
- [ ] Skip-to-content link visible on Tab from fresh page load
- [ ] Toast announcements read by screen reader
- [ ] All 305+ tests pass
- [ ] Production build succeeds
- [ ] Error boundaries render styled fallback on thrown error
- [ ] `.env.example` documents all required variables
- [ ] README quick-start is accurate
