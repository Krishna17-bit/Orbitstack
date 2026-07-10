import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrbitStack // Reliability Layer",
  description: "Extreme Environment Datacenter Observability and Fault Simulation Operating Layer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <div className="flex min-h-screen bg-zinc-50 text-zinc-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto h-screen relative no-scrollbar">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
