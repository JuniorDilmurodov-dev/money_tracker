import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Script from "next/script";

import { AntdProvider } from "@/components/antd-provider";
import { ServiceWorkerRegistrar } from "@/components/pwa";
import { getLocale, getT } from "@/lib/i18n/server";

// Cyrillic is a separate subset — without it every Russian string falls back
// to a system font while the rest of the page stays on Geist.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: `${t.appName} — expense tracker`,
    description: t.meta.description,
    // iOS ignores the manifest's `display` field. Without this, "Add to Home
    // Screen" opens the app in a Safari tab with the address bar showing.
    appleWebApp: {
      capable: true,
      title: t.appName,
      // `black-translucent` would run the page under the status bar, which the
      // app's fixed header isn't built for. `default` keeps the webview below
      // it, tinted with the page background either way.
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1c" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Applies the saved theme before first paint. Dark is the default, so this only
 * has to act when the user has explicitly chosen light.
 */
const themeScript = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
} catch (e) {}
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Next's `appleWebApp.capable` emits the standardised
            `mobile-web-app-capable` only. Safari below iOS 16 reads the old
            Apple-prefixed name and nothing else, and without it "Add to Home
            Screen" there opens the app in a tab with the address bar showing. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AntdProvider locale={locale}>{children}</AntdProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
