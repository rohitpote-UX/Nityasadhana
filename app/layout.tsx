import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Noto_Serif_Devanagari } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { siteConfig } from "@/lib/config/site";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-serif-devanagari",
  weight: ["400", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#EAF7F4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.creator }],
  creator: siteConfig.creator,
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-192x192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nityasādhanā",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    title: `${siteConfig.name} (${siteConfig.nameSanskrit})`,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} (${siteConfig.nameSanskrit})`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (
    !clerkPublishableKey ||
    clerkPublishableKey.includes("placeholder_key_for_development")
  ) {
    throw new Error(
      "Clerk is not configured. Add a valid NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from https://dashboard.clerk.com/last-active?path=api-keys to your .env.local or .env file and restart the dev server."
    );
  }

  return (
    <html lang="en" className={`${nunitoSans.variable} ${notoSerifDevanagari.variable}`}>
      <body className="min-h-screen bg-[#EAF7F4] text-[#193B3B] antialiased selection:bg-[#3F9495] selection:text-white">
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          appearance={{
            variables: {
              colorPrimary: "#3F9495",
              colorBackground: "#FFFFFF",
              colorText: "#193B3B",
              colorTextSecondary: "#547070",
              borderRadius: "12px",
              fontFamily: "var(--font-nunito-sans), system-ui, sans-serif",
            },
          }}
        >
          <ServiceWorkerRegister />
          <OfflineIndicator />
          <InstallPrompt />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

