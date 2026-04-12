import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Database,
  Lock,
  Cloud,
  Users,
  Zap,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Code2,
  Server,
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Bot,
      title: 'MCP-Native',
      description: 'Full Model Context Protocol client and server implementation with extensible tool registry.',
    },
    {
      icon: Database,
      title: 'Vector Storage',
      description: 'Built-in pgvector support for semantic search and AI-powered memory retrieval.',
    },
    {
      icon: Lock,
      title: 'Multi-Tenant Security',
      description: 'Row-level security, RBAC, and tenant isolation enforced at the database level.',
    },
    {
      icon: Users,
      title: 'Multi-Agent',
      description: 'Real-time collaboration with Socket.IO and shared workspace memory.',
    },
    {
      icon: Cloud,
      title: 'Deploy Anywhere',
      description: 'Railway, AWS, and GCP deployment configs included. Self-hosted only.',
    },
    {
      icon: Zap,
      title: 'Production Ready',
      description: 'Sentry, PostHog, billing, API keys, and audit logging out of the box.',
    },
  ];

  const stack = [
    { icon: Terminal, name: 'Next.js 15', desc: 'App Router + Vercel AI SDK' },
    { icon: Code2, name: 'Go 1.22+', desc: 'Gin + gRPC + Goroutines' },
    { icon: Database, name: 'Supabase', desc: 'PostgreSQL + pgvector + Auth' },
    { icon: Server, name: 'Docker', desc: 'All-in-one local development' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center mx-auto px-4 max-w-6xl">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Bot className="h-6 w-6" />
              <span className="font-bold text-xl">AgentForge</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium ml-auto">
            <Link href="#features" className="transition-colors hover:text-foreground/80">Features</Link>
            <Link href="#stack" className="transition-colors hover:text-foreground/80">Stack</Link>
            <Link href="#get-started">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Open Source • MIT License</Badge>
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Build AI Apps in Hours,<br />
              <span className="text-primary">Not Weeks</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Production-ready AI-native SaaS boilerplate with native MCP integration,
              vector database support, multi-tenant isolation, and real-time multi-agent
              collaboration. Self-hosted with deploy-anywhere flexibility.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="https://github.com/agentforge/agentforge" target="_blank">
                <Button size="lg" className="w-full sm:w-auto">
                  View on GitHub <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Read the Docs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Built On</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stack.map((item) => (
              <Card key={item.name} className="text-center">
                <CardHeader className="pb-2">
                  <item.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
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

      {/* Features */}
      <section id="features" className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Pre-configured with all the essentials for building production AI applications.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-10 w-10 mb-3 text-primary" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">What&apos;s Included</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-xl font-semibold mb-4">Authentication</h3>
              <ul className="space-y-2">
                {['Email/password signup & login', 'Magic link authentication', 'OAuth (Google, GitHub)', 'Session management with JWT', 'Password reset & email verification'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Multi-Tenancy</h3>
              <ul className="space-y-2">
                {['Tenant creation & management', 'Subdomain-based routing', 'Role-based access control', 'Tenant-scoped queries', 'RLS policies enforced'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">AI Features</h3>
              <ul className="space-y-2">
                {['MCP client & server', 'Built-in tools (file, web, DB)', 'Streaming via Vercel AI SDK', 'Vector memory with pgvector', 'Tool usage cost tracking'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Production</h3>
              <ul className="space-y-2">
                {['Billing (Lemon Squeezy)', 'Admin dashboard', 'API keys with rate limiting', 'Sentry + PostHog integration', 'CI/CD with GitHub Actions'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="get-started" className="py-24">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Clone the repo, run docker-compose up, and start building your AI application in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="https://github.com/agentforge/agentforge" target="_blank">
              <Button size="lg">
                <Terminal className="mr-2 h-4 w-4" />
                git clone agentforge
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">AgentForge</span>
            </div>
            <p className="text-sm text-muted-foreground">
              MIT License • Open Source
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
