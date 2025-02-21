'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

function BaseProvider({ children }: SolanaWalletProviderProps) {
  // Get RPC endpoints from environment variable
  const rpcEndpoints = useMemo(() => {
    const envEndpoints = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.split(',') || [];
    return [
      ...envEndpoints,
      'https://api.devnet.solana.com', // Devnet fallback
      clusterApiUrl('devnet'), // Additional fallback
    ].filter(Boolean);
  }, []);

  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  // Test RPC endpoint connectivity
  useEffect(() => {
    async function testEndpoint(endpoint: string) {
      try {
        const connection = new Connection(endpoint, {
          commitment: 'processed',
          confirmTransactionInitialTimeout: 60000,
        });

        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        };

        // Test connection with proper headers
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: 'getHealth',
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Additional connection test
        await connection.getLatestBlockhash();
        return true;
      } catch (error) {
        console.warn(`RPC endpoint ${endpoint} failed:`, error);
        return false;
      }
    }

    async function findWorkingEndpoint() {
      for (const endpoint of rpcEndpoints) {
        if (await testEndpoint(endpoint)) {
          console.log(`Using RPC endpoint: ${endpoint}`);
          setActiveEndpoint(endpoint);
          return;
        }
      }
      console.error('All RPC endpoints failed');
      // Default to devnet as last resort
      setActiveEndpoint('https://api.devnet.solana.com');
    }

    if (!activeEndpoint) {
      findWorkingEndpoint();
    }
  }, [rpcEndpoints, activeEndpoint]);

  // Initialize wallet adapter
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  // Connection config
  const config = useMemo(
    () => ({
      commitment: 'processed' as const,
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: activeEndpoint?.replace('https', 'wss'),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    }),
    [activeEndpoint]
  );

  if (!activeEndpoint) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Connecting to Solana network...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={activeEndpoint} config={config}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default dynamic(() => Promise.resolve(BaseProvider), {
  ssr: false
}); 