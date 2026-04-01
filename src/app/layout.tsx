import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GoogleAnalytics } from "@next/third-parties/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tangie.app"),
  title: {
    default: "Tangie – Meal prep made easy",
    template: "%s | Tangie",
  },
  description:
    "Tangie helps you pick recipes you love and builds a weekly meal prep plan with fridge life tracking and a smart grocery list. Free, fast, no sign-up.",
  keywords: [
    "meal prep",
    "meal planning",
    "weekly meal plan",
    "grocery list",
    "recipe planner",
    "healthy recipes",
    "meal prep app",
    "fridge life",
  ],
  authors: [{ name: "Tangie" }],
  creator: "Tangie",
  alternates: {
    canonical: "https://tangie.app",
  },
  openGraph: {
    type: "website",
    url: "https://tangie.app",
    siteName: "Tangie",
    title: "Tangie – Meal prep made easy",
    description:
      "Pick recipes you love. We'll build your meal prep plan, track fridge life, and generate your grocery list.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tangie meal prep app",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tangie – Meal prep made easy",
    description:
      "Pick recipes you love. We'll build your meal prep plan, track fridge life, and generate your grocery list.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Tangie",
  url: "https://tangie.app",
  description:
    "Tangie helps you pick recipes you love and builds a weekly meal prep plan with fridge life tracking and a smart grocery list.",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans">
        <AppProvider>
          <Navbar />
          <main className="pt-20 min-h-screen">{children}</main>
          <Footer />
        </AppProvider>
      </body>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
