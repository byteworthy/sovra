import Link from 'next/link'
import { Bot, ArrowLeft, BookOpen, Github, Terminal, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = {
  title: 'Documentation | Sovra',
  description: 'Get started with Sovra — guides, API reference, and deployment docs.',
}

const guides = [
  {
    icon: Terminal,
    title: 'Quick Start',
    description: 'Clone the repo, configure environment variables, and run locally in under 2 minutes.',
    href: 'https://github.com/byteworthy/sovra#quick-start',
  },
  {
    icon: BookOpen,
    title: 'Architecture',
    description: 'Understand how Next.js, Supabase, and the Go worker fit together.',
    href: 'https://github.com/byteworthy/sovra#architecture',
  },
  {
    icon: Github,
    title: 'Contributing',
    description: 'Set up your development environment and submit your first pull request.',
    href: 'https://github.com/byteworthy/sovra/blob/main/CONTRIBUTING.md',
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-surface-1">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-surface-1/80 backdrop-blur-md">
        <div className="container flex h-14 items-center mx-auto px-4 max-w-4xl">
          <Link href="/" className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-bold">Sovra</span>
          </Link>
          <span className="ml-2 text-sm text-muted-foreground">/ docs</span>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 max-w-4xl py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-3">Documentation</h1>
          <p className="text-muted-foreground max-w-2xl">
            Sovra documentation lives on GitHub. Below are quick links to get you started.
            Full API reference and advanced guides are coming soon.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-12">
          {guides.map((guide) => (
            <Link key={guide.title} href={guide.href} target="_blank" rel="noopener noreferrer">
              <Card variant="glass" className="h-full hover:shadow-glow-sm transition-all duration-200 cursor-pointer group">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3 group-hover:bg-primary/15 transition-colors">
                    <guide.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {guide.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{guide.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="glass-card rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Need help?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Open an issue on GitHub or join the community discussion.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="https://github.com/byteworthy/sovra/issues" target="_blank">
              <Button variant="outline" size="sm">
                Report an issue
              </Button>
            </Link>
            <Link href="https://github.com/byteworthy/sovra/discussions" target="_blank">
              <Button variant="ghost-premium" size="sm">
                Discussions
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
