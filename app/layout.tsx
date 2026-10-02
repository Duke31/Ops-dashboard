import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeScript = `
  (function() {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = media.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    };
    apply();
    if (media.addEventListener) {
      media.addEventListener('change', apply);
    } else {
      media.addListener(apply);
    }
  })();
`;

export const metadata: Metadata = {
  title: "Ops Dashboard",
  description: "Emergency healthcare dispatch operations",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light dark" }}
    >
      <Script id="theme-sync" strategy="beforeInteractive">
        {themeScript}
      </Script>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
