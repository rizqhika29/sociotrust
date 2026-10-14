import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "@/lib/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WalletModal } from "@/components/WalletModal";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "900"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "SocioTrust — On-chain Identity Verification",
  description:
    "Link your social, prove your trust. Identity verification adjudicated by decentralized AI validators on GenLayer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} bg-paper font-sans text-ink antialiased`}
      >
        <SessionProvider>
          <Navbar />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
          <WalletModal />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#101D17",
                color: "#F6F1E6",
                border: "1px solid rgba(227,185,78,0.35)",
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
