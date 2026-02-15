import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import CookieBanner from "./components/CookieBanner";
import UserAuth from "./components/UserAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. Separate Viewport configuration (Next.js standard)
export const viewport: Viewport = {
  themeColor: '#ea580c', // Orange-600
  colorScheme: 'dark',
};

// 2. Metadata configuration
export const metadata: Metadata = {
  metadataBase: new URL('https://nuke.farm'),
  title: {
    template: '%s | NUKE.FARM',
    default: 'NUKE.FARM | Radioactive Polymarket Agents',
  },
  description: 'Deploy autonomous AI crabs to pinch alpha from prediction markets. Real-time EV analysis, automated execution, and radioactive yield harvesting on Polymarket.',
  applicationName: 'NUKE.FARM',
  authors: [{ name: 'The Colony' }],
  generator: 'Next.js',
  keywords: [
    "Polymarket", "AI Agent", "Prediction Markets", "Crypto Betting",
    "Yield Farming", "ClawdBot", "Nuke Farm", "Autonomous Trading",
    "USDC", "Polygon", "Radioactive Yield"
  ],
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'NUKE.FARM | Radioactive Polymarket Agents',
    description: 'Deploy autonomous AI crabs to pinch alpha from prediction markets. Real-time EV analysis and automated execution.',
    url: 'https://nuke.farm',
    siteName: 'NUKE.FARM',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og', width: 1200, height: 630 }], 
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NUKE.FARM | Radioactive Polymarket Agents',
    description: 'Deploy autonomous AI crabs to pinch alpha from prediction markets.',
    creator: '@NukeFarm', 
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-zinc-950`}>
        <Providers>
          {/* Pass UserAuth as a prop */}
          <Navbar userAuthSlot={<UserAuth />} />
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}