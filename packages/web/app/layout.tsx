import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { MotionProvider } from '@/components/providers/MotionProvider';
import { SkipToContent } from '@/components/ui/skip-to-content';

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
        <SkipToContent />
        <ThemeProvider>
          <MotionProvider>
            <PostHogProvider>{children}</PostHogProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
