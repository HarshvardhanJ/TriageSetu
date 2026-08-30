import type { Metadata } from "next";
import { Geist, Geist_Mono, UnifrakturMaguntia, Playfair_Display, Lora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Newspaper fonts
const unifraktur = UnifrakturMaguntia({
  variable: "--font-blackletter",
  subsets: ["latin"],
  weight: ["400"],
});

const playfair = Playfair_Display({
  variable: "--font-didone",
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  style: ["normal", "italic"],
});

const lora = Lora({
  variable: "--font-serif-old",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "TriageSetu — Safety-first AI triage for emergency care",
  description:
    "TriageSetu is a clinical decision-support prototype that helps ED staff prioritize and route patients, with transparent rules, explainable ML, and an unbreakable clinician-override audit trail.",
  keywords: ["triage", "emergency", "ED", "clinical AI", "ESI", "patient safety", "India healthcare"],
  authors: [{ name: "TriageSetu Team" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/logo.svg",
  },
  manifest: undefined,
  openGraph: {
    title: "TriageSetu — Safety-first AI triage for emergency care",
    description: "A clinical decision-support prototype that helps ED staff prioritize and route patients.",
    siteName: "TriageSetu",
    type: "website",
    images: ["/logo.svg"],
  },
  twitter: {
    card: "summary",
    title: "TriageSetu — Safety-first AI triage",
    description: "Hybrid rule + ML scoring with explicit uncertainty. Rules can only escalate, never downgrade.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <link rel="alternate icon" href="/logo.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${unifraktur.variable} ${playfair.variable} ${lora.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
