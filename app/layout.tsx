import type { Metadata } from 'next';
import { firaSans } from './theme/font';
import { AppVersion } from '../components/ui/app-version';
import './theme/globals.css';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Access Control Demo',
  description:
    'A small LMS demonstrating authentication, role-based access control, resource ownership, and PostgreSQL row-level security.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={firaSans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <AppVersion />
      </body>
    </html>
  );
}
