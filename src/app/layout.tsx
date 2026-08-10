import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AntdProvider } from "@/components/antd-provider";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AntdProvider locale={locale}>{children}</AntdProvider>
      </body>
    </html>
  );
}
