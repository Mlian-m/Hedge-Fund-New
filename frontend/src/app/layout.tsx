'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { WagmiConfig } from 'wagmi';
import { arbitrum, mainnet } from 'viem/chains';
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

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// 2. Create wagmiConfig
const web3Metadata = {
  name: 'Hedgy Analysis Tool',
  description: 'AI-powered crypto trading analysis',
  url: 'https://your-website.com', // TODO: Update with your website
  icons: ['https://your-website.com/icon.png'] // TODO: Update with your icon
};

// Configure supported chains
const wagmiConfig = defaultWagmiConfig({
  chains: [mainnet, arbitrum] as const,
  projectId,
  metadata: web3Metadata,
});

// 3. Create modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  themeMode: 'dark',
  defaultChain: mainnet,
});

// 4. Create a client
const queryClient = new QueryClient();

// Page metadata
const pageMetadata = {
  title: "Hedgy Analysis Tool",
  description: "AI-powered crypto trading analysis platform",
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
        <WagmiConfig config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <SolanaWalletProvider>
              {children}
            </SolanaWalletProvider>
          </QueryClientProvider>
        </WagmiConfig>
      </body>
    </html>
  );
}
