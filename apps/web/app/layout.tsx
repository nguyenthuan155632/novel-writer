import './globals.css';
import type { ReactNode } from 'react';
import ProviderSwitcher from './provider-switcher';

export const metadata = { title: 'Novel Writer', description: 'AI Novel Factory' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <header
          style={{
            padding: 16,
            borderBottom: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <a href="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
            Novel Writer
          </a>
          <ProviderSwitcher />
        </header>
        <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>{children}</main>
      </body>
    </html>
  );
}
