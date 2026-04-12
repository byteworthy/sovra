import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgentForge - AI-Native SaaS Boilerplate',
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
      <body className={cn(inter.className, 'min-h-screen bg-background font-sans antialiased')}>{children}</body>
    </html>
  );
}
