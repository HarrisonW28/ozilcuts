import { AppProviders } from "@/components/app-providers";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
import { loadShopBranding } from "@/lib/shop-branding-server";
import { resolveShopAssetUrl } from "@/lib/shop-asset-url";
import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "Ozil Cuts",
    template: "%s · Ozil Cuts",
  },
  description: "Book sharp cuts and run your barber shop.",
  applicationName: "Ozil Cuts",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ozil Cuts",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1d24" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialShopBranding = await loadShopBranding();
  const preloadLogoUrl = resolveShopAssetUrl(initialShopBranding?.logo_url);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} min-h-dvh`}
      suppressHydrationWarning
    >
      <head>
        {preloadLogoUrl ? (
          <link rel="preload" as="image" href={preloadLogoUrl} />
        ) : null}
      </head>
      <body className="app-root flex min-h-dvh flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders initialShopBranding={initialShopBranding}>
            {children}
            <InstallPrompt />
            <ServiceWorkerRegister />
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
