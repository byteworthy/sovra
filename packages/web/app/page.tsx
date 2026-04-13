import type { Metadata } from 'next'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FeatureBento } from '@/components/landing/feature-bento';
import { Footer } from '@/components/landing/footer';
import { ScrollSection } from '@/components/landing/scroll-section';
import {
  Bot,
  Database,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Code2,
  Server,
  Github,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ByteSwarm — AI-Native SaaS Boilerplate',
  description: 'Open-source boilerplate for building multi-tenant AI applications with MCP, vector database, and multi-agent collaboration.',
}

export default function HomePage() {
  const features = [
    {
      icon: 'Bot',
      title: 'MCP-Native Agents',
      description: 'Full Model Context Protocol client and server. Your agents use tools the way the ecosystem intended. Not a wrapper. Native.',
    },
    {
      icon: 'Database',
      title: 'Vector Search Built In',
      description: 'pgvector inside your existing Postgres. Semantic search, hybrid search, tenant-scoped. No separate Pinecone bill.',
    },
    {
      icon: 'Lock',
      title: 'Tenant Isolation at the Database',
      description: 'Row-level security enforced by Postgres. Not middleware. Not application logic. User A cannot see User B\'s data. Period.',
    },
    {
      icon: 'Users',
      title: 'Multi-Agent Workspaces',
      description: 'Agents collaborate in real-time. Shared memory, conflict resolution, parallel execution. One workspace, many agents.',
    },
    {
      icon: 'Cloud',
      title: 'Self-Hosted. Your Data.',
      description: 'Docker, Railway, AWS, GCP. Deploy wherever you want. Your infrastructure, your rules, your data.',
    },
    {
      icon: 'Zap',
      title: 'Production on Day One',
      description: 'Auth, billing, API keys, monitoring, audit logs. The boring stuff that takes months. Already done.',
    },
  ];

  const stack = [
    { icon: Terminal, name: 'Next.js 15', desc: 'App Router + Vercel AI SDK' },
    { icon: Code2, name: 'Go 1.22+', desc: 'Gin + gRPC + Goroutines' },
    { icon: Database, name: 'Supabase', desc: 'PostgreSQL + pgvector + Auth' },
    { icon: Server, name: 'Docker', desc: 'All-in-one local development' },
  ];

  return (
    <div className="min-h-screen bg-surface-1">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-surface-1/80 backdrop-blur-md">
        <div className="container flex h-14 items-center mx-auto px-4 max-w-6xl">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Bot className="h-6 w-6 text-primary drop-shadow-[0_0_8px_hsl(var(--glow-primary)/0.6)]" />
              <span className="font-bold text-xl">ByteSwarm</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium ml-auto">
            <Link href="#features" className="transition-colors hover:text-foreground/80 text-muted-foreground hidden sm:block">Features</Link>
            <Link href="#stack" className="transition-colors hover:text-foreground/80 text-muted-foreground hidden sm:block">Stack</Link>
            <ThemeToggle />
            <Link href="#get-started">
              <Button variant="gradient" size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-28 md:py-40 overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--glow-primary)/0.12),transparent_70%)] blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(270_70%_50%/0.08),transparent_70%)] blur-3xl" />
        </div>

        {/* Floating grid lines */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(hsl(var(--surface-3)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--surface-3)/0.3)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 border-primary/20 bg-primary/10 text-primary">Open Source &middot; MIT License</Badge>
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Ship AI products.<br />
              <span className="text-primary text-glow">Not infrastructure.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              The open-source platform that gives you multi-tenant auth, MCP-native agents,
              vector search, and real-time collaboration in one repo. Self-hosted. MIT licensed.
              Clone it, run it, build on it.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="https://github.com/byteswarm/byteswarm" target="_blank">
                <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                  <Github className="mr-2 h-4 w-4" />
                  Star on GitHub
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="w-full sm:w-auto hover:shadow-glow-sm">
                  Read the Docs <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stack */}
      <ScrollSection>
        <section id="stack" className="py-16 bg-surface-2/50">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">Built On</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stack.map((item) => (
                <Card key={item.name} variant="glass" className="text-center hover:shadow-glow-sm transition-all duration-200 cursor-default">
                  <CardHeader className="pb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-2">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-sm">{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </ScrollSection>

      {/* Features — Bento Grid */}
      <ScrollSection>
        <section id="features" className="py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-4">What You Get on Day One</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Every feature that takes teams months to build. Already wired up. Already tested. Already working.
            </p>
            <FeatureBento features={features} />
          </div>
        </section>
      </ScrollSection>

      {/* What's Included */}
      <ScrollSection>
        <section className="py-16 bg-surface-2/40">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12">What&apos;s Included</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                { title: 'Authentication', items: ['Email/password signup & login', 'Magic link authentication', 'OAuth (Google, GitHub)', 'Session management with JWT', 'Password reset & email verification'] },
                { title: 'Multi-Tenancy', items: ['Tenant creation & management', 'Subdomain-based routing', 'Role-based access control', 'Tenant-scoped queries', 'RLS policies enforced'] },
                { title: 'AI Features', items: ['MCP client & server', 'Built-in tools (file, web, DB)', 'Streaming via Vercel AI SDK', 'Vector memory with pgvector', 'Tool usage cost tracking'] },
                { title: 'Production', items: ['Billing (Stripe)', 'Admin dashboard', 'API keys with rate limiting', 'Sentry + PostHog integration', 'CI/CD with GitHub Actions'] },
              ].map(({ title, items }) => (
                <div key={title}>
                  <h3 className="text-xl font-semibold mb-4">{title}</h3>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-status-online shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollSection>

      {/* CTA */}
      <ScrollSection>
        <section id="get-started" className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(var(--glow-primary)/0.08),transparent_70%)] blur-3xl" />
          </div>

          <div className="container mx-auto px-4 max-w-6xl">
            <div className="glass-card rounded-2xl p-12 text-center noise-overlay">
              <h2 className="text-3xl font-bold mb-4 relative z-10">Stop building plumbing. Start building product.</h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto relative z-10">
                One command. Full AI agent platform. Running locally in under 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                <Link href="https://github.com/byteswarm/byteswarm" target="_blank">
                  <Button variant="gradient" size="lg">
                    <Terminal className="mr-2 h-4 w-4" />
                    git clone byteswarm
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </ScrollSection>

      {/* Footer */}
      <Footer />
    </div>
  );
}
