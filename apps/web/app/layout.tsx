import "./globals.css";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import ProviderSwitcher from "./provider-switcher";

export const metadata = {
  title: "Novel Writer",
  description: "AI Novel Factory",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
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
