import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Novel Writer', description: 'AI Novel Factory' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <header style={{ padding: 16, borderBottom: '1px solid #ddd' }}>
          <a href="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
            Novel Writer
          </a>
        </header>
        <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>{children}</main>
      </body>
    </html>
  );
}