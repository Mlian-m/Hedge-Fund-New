'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

function BaseProvider({ children }: SolanaWalletProviderProps) {
  // Get RPC endpoints from environment variable
  const endpoints = useMemo(() => {
    const envEndpoints = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.split(',') || [];
    return envEndpoints.filter(Boolean).map(endpoint => endpoint.trim());
  }, []);

  // Use the first endpoint as primary, with others as fallbacks
  const endpoint = useMemo(() => {
    if (endpoints.length === 0) {
      return 'https://api.mainnet-beta.solana.com';
    }
    return endpoints[0];
  }, [endpoints]);

  // Initialize wallet adapter
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  // Connection config with proper headers and settings
  const config = useMemo(
    () => ({
      commitment: 'confirmed' as const,
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: endpoint.replace('https://', 'wss://'),
      disableRetryOnRateLimit: false,
      httpHeaders: {
        'Content-Type': 'application/json',
      }
    }),
    [endpoint]
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default dynamic(() => Promise.resolve(BaseProvider), {
  ssr: false
}); 