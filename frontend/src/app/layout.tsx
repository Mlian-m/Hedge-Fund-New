'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SolanaWalletProvider from "@/components/SolanaWalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Create a client
const queryClient = new QueryClient();

// Page metadata
const pageMetadata = {
  title: "Hedgy Analysis Tool",
  description: "AI-powered crypto trading analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>{pageMetadata.title}</title>
        <meta name="description" content={pageMetadata.description} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          <SolanaWalletProvider>
            {children}
          </SolanaWalletProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
