import './globals.css';
import type { ReactNode } from 'react';
import ProviderSwitcher from './provider-switcher';

export const metadata = { title: 'Novel Writer', description: 'AI Novel Factory' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="app-shell">
        <header className="topbar">
          <a href="/" className="brand-mark">
            Novel Writer
          </a>
          <nav className="topbar-nav">
            <a href="/admin" className="nav-link">
              Admin
            </a>
            <ProviderSwitcher />
          </nav>
        </header>
        <main className="main-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
