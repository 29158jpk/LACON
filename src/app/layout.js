import { Geist, Geist_Mono } from "next/font/google";
import NavLinks from "./components/NavLinks";
import UserNavWidget from "./components/UserNavWidget";
import ThemeManager from "./components/ThemeManager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Horizon x CPU — ระบบขายหน้าร้าน",
  description: "ระบบ POS พร้อม Dashboard, Inventory และระบบชำระเงิน",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=JSON.parse(localStorage.getItem('horizonpos_theme_config')||'{}');if(c.preset)document.documentElement.setAttribute('data-theme',c.preset);}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <nav className="top-nav">
          {/* Brand */}
          <div className="nav-brand">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#3b82f6" strokeWidth="2"/>
              <path d="M12 7V17M7 12H17" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Horizon <span>x CPU</span>
          </div>

          {/* Client-side nav with active detection & role badges */}
          <NavLinks />

          {/* User Profile & Role Status */}
          <UserNavWidget />
        </nav>
        <main className="app-main">{children}</main>

        {/* Global Theme & Background Manager */}
        <ThemeManager />
      </body>
    </html>
  );
}
