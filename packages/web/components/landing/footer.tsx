import Link from 'next/link'
import { Bot } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Stack', href: '#stack' },
    { label: 'Pricing', href: '#get-started' },
    { label: 'Documentation', href: '/docs' },
  ],
  Developers: [
    { label: 'GitHub', href: 'https://github.com/byteswarm/byteswarm' },
    { label: 'Documentation', href: '/docs' },
    { label: 'Contributing', href: 'https://github.com/byteswarm/byteswarm/blob/main/CONTRIBUTING.md' },
    { label: 'Changelog', href: 'https://github.com/byteswarm/byteswarm/releases' },
  ],
  Community: [
    { label: 'Discussions', href: 'https://github.com/byteswarm/byteswarm/discussions' },
    { label: 'Issues', href: 'https://github.com/byteswarm/byteswarm/issues' },
    { label: 'Star on GitHub', href: 'https://github.com/byteswarm/byteswarm' },
  ],
  Legal: [
    { label: 'MIT License', href: 'https://github.com/byteswarm/byteswarm/blob/main/LICENSE' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-surface-2/30">
      <div className="container mx-auto px-4 max-w-6xl py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold">ByteSwarm</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Open-source AI-native SaaS boilerplate. Self-hosted. MIT licensed.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ByteSwarm. MIT License.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ByteSwarm
          </p>
        </div>
      </div>
    </footer>
  )
}
