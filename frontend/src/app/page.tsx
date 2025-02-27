'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Header } from '../components/Header';

const REQUIRED_HEDGY_TOKENS = 100000;

// Token addresses for different networks
const TOKEN_ADDRESSES = {
  mainnet: '5Tytu6cHm69UN9k1ZEqrvCmfJsdUAJnTJpaAV1fZ2e4h',
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
};

async function getTokenBalance(connection: Connection, walletAddress: PublicKey, tokenMintAddress: string): Promise<number> {
  try {
    console.log('Checking balance for:', {
      wallet: walletAddress.toString(),
      tokenMint: tokenMintAddress,
      network: connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet',
      rpcEndpoint: connection.rpcEndpoint
    });

    // For development only
    if (process.env.NEXT_PUBLIC_MOCK_BALANCE === 'true') {
      console.log('Using mock balance for development');
      return 150000;
    }

    const tokenMint = new PublicKey(tokenMintAddress);
    const maxAttempts = 3;

    // Retry logic for RPC calls with proper typing
    const retryWithBackoff = async <T,>(fn: () => Promise<T>, attempt: number): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (attempt >= maxAttempts) throw error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, attempt + 1);
      }
    };

    // Method 1: Use TOKEN_PROGRAM_ID to find all token accounts
    try {
      console.log('Attempting to find token accounts using TOKEN_PROGRAM_ID...');
      const tokenAccounts = await retryWithBackoff(() => 
        connection.getTokenAccountsByOwner(
          walletAddress,
          { programId: TOKEN_PROGRAM_ID },
          'confirmed'
        ), 0);

      console.log(`Found ${tokenAccounts.value.length} token accounts`);
      
      for (const { pubkey } of tokenAccounts.value) {
        try {
          const accountInfo = await connection.getParsedAccountInfo(pubkey, 'confirmed');
          if (!accountInfo.value) continue;

          const parsedData = accountInfo.value.data;
          if ('parsed' in parsedData && parsedData.parsed.info.mint === tokenMint.toString()) {
            const balance = await connection.getTokenAccountBalance(pubkey, 'confirmed');
            console.log('Found matching token account with balance:', balance.value.uiAmount);
            return balance.value.uiAmount || 0;
          }
        } catch (e) {
          console.warn('Error processing account:', pubkey.toString(), e);
          continue;
        }
      }
    } catch (e) {
      console.warn('Method 1 failed:', e);
    }

    // Method 2: Direct token account query with more detailed error handling
    try {
      console.log('Attempting direct token account query...');
      const tokenAccounts = await retryWithBackoff(() =>
        connection.getParsedTokenAccountsByOwner(
          walletAddress,
          { mint: tokenMint },
          'confirmed'
        ), 0);

      if (tokenAccounts.value.length > 0) {
        const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        console.log('Found balance through direct query:', balance);
        return balance || 0;
      }
    } catch (e) {
      console.warn('Method 2 failed:', e);
    }

    console.log('No token balance found using any method');
    return 0;
  } catch (error) {
    console.error('Error checking token balance:', error);
    return 0;
  }
}

export default function HomePage() {
  const router = useRouter();
  const { publicKey: walletAddress, connected } = useWallet();
  const { connection } = useConnection();
  
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Check token balance when wallet connects
  useEffect(() => {
    async function checkBalance() {
      if (!walletAddress || !connected) {
        setTokenBalance(0);
        setIsAuthorized(false);
        setIsChecking(false);
        setCheckError(null);
        return;
      }

      setIsChecking(true);
      setCheckError(null);

      try {
        // Create a new connection with specific commitment and rate limiting settings
        const customConnection = new Connection(
          connection.rpcEndpoint,
          { 
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000,
            disableRetryOnRateLimit: false
          }
        );

        const isDevnet = connection.rpcEndpoint.includes('devnet');
        const tokenAddress = isDevnet ? TOKEN_ADDRESSES.devnet : TOKEN_ADDRESSES.mainnet;
        
        console.log('Using connection:', {
          endpoint: customConnection.rpcEndpoint,
          commitment: 'confirmed',
          network: isDevnet ? 'devnet' : 'mainnet'
        });
        
        const balance = await getTokenBalance(customConnection, walletAddress, tokenAddress);
        console.log('Final balance result:', balance);
        
        setTokenBalance(balance);
        setIsAuthorized(balance >= REQUIRED_HEDGY_TOKENS);
      } catch (error) {
        console.error('Balance check failed:', error);
        setCheckError('Failed to verify token balance. Please try again.');
        setTokenBalance(0);
        setIsAuthorized(false);
      }

      setIsChecking(false);
    }

    checkBalance();
  }, [walletAddress, connected, connection]);

  const handleEnterDashboard = () => {
    if (isAuthorized) {
      router.push('/analysis');
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <h1 className="text-4xl font-bold mb-6">
            Hedgy Dashboard
          </h1>
          
          <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Access Requirements
              </h2>
              <p className="text-gray-300 mb-4">
                To access the Dashboard, you need to:
              </p>
              <ul className="text-left text-gray-300 space-y-2 mb-6">
                <li className="flex items-center">
                  <span className={`mr-2 ${connected ? 'text-green-500' : 'text-gray-500'}`}>
                    {connected ? '✓' : '○'}
                  </span>
                  Connect your Solana wallet
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${isAuthorized ? 'text-green-500' : 'text-gray-500'}`}>
                    {isAuthorized ? '✓' : '○'}
                  </span>
                  Hold at least {REQUIRED_HEDGY_TOKENS.toLocaleString()} Spark tokens
                </li>
              </ul>
            </div>
            
            {isChecking ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-400">Verifying token balance...</p>
              </div>
            ) : connected ? (
              <div>
                {checkError ? (
                  <div className="text-red-400 p-4 bg-red-400/10 rounded-lg">
                    <p>{checkError}</p>
                  </div>
                ) : isAuthorized ? (
                  <button
                    onClick={handleEnterDashboard}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                  >
                    Enter Dashboard
                  </button>
                ) : (
                  <div className="text-yellow-400 p-4 bg-yellow-400/10 rounded-lg">
                    <p>You need at least {REQUIRED_HEDGY_TOKENS.toLocaleString()} Spark tokens to access the dashboard.</p>
                    <div className="mt-2 text-sm">
                      Current balance: {tokenBalance.toLocaleString()} Spark
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">
                Please connect your Solana wallet to check access requirements
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
