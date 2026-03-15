import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "meal preper — prep smarter, eat better",
  description: "Plan your weekly meal prep with personalized recipes, fridge life tracking, and smart grocery lists.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Navbar />
          <main className="pt-14 min-h-screen">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
