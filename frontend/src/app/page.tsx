'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Header } from '../components/Header';

const REQUIRED_HEDGY_TOKENS = 100000;

// Token addresses for different networks
const TOKEN_ADDRESSES = {
  mainnet: '5Tytu6cHm69UN9k1ZEqrvCmfJsdUAJnTJpaAV1fZ2e4h',
  devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr' // Example devnet token
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function getTokenBalance(connection: Connection, address: PublicKey, tokenAddress: string, retries = 0): Promise<number> {
  const isDevnet = connection.rpcEndpoint.includes('devnet');
  
  // For development/testing on devnet
  if (isDevnet) {
    console.log('Using devnet mock balance');
    return 150000; // Mock balance above required amount
  }

  try {
    console.log('Checking token balance for address:', address.toString());
    console.log('Token address:', tokenAddress);
    console.log('Network:', isDevnet ? 'devnet' : 'mainnet');
    
    const tokenPublicKey = new PublicKey(tokenAddress);
    
    // First try getParsedTokenAccountsByOwner
    try {
      const accountInfo = await connection.getParsedTokenAccountsByOwner(address, {
        mint: tokenPublicKey,
      });

      if (accountInfo.value.length > 0) {
        const balance = accountInfo.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        console.log('Found token balance:', balance);
        return balance;
      }
      console.log('No token accounts found with getParsedTokenAccountsByOwner');
    } catch (e) {
      console.warn('Failed to get parsed token accounts:', e);
    }

    // Fallback to getTokenAccountsByOwner
    try {
      const accounts = await connection.getTokenAccountsByOwner(address, {
        mint: tokenPublicKey,
      });

      if (accounts.value.length > 0) {
        const balance = await connection.getTokenAccountBalance(accounts.value[0].pubkey);
        console.log('Found token balance using fallback:', balance.value.uiAmount);
        return balance.value.uiAmount || 0;
      }
      console.log('No token accounts found with getTokenAccountsByOwner');
    } catch (e) {
      console.warn('Failed to get token accounts by owner:', e);
    }

    return 0;
  } catch (error) {
    console.error(`Error fetching token balance (attempt ${retries + 1}):`, error);
    
    if (retries < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retries);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getTokenBalance(connection, address, tokenAddress, retries + 1);
    }
    
    console.error('Failed to fetch token balance after all retries');
    return 0;
  }
}

export default function HomePage() {
  const router = useRouter();
  
  // Solana wallet state
  const { publicKey: solAddress, connected: isSolConnected } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number>(0);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Effect for checking Solana token balance
  useEffect(() => {
    async function checkSolanaBalance() {
      if (!solAddress || !isSolConnected) {
        setSolBalance(0);
        setIsChecking(false);
        return;
      }

      try {
        const isDevnet = connection.rpcEndpoint.includes('devnet');
        const tokenAddress = isDevnet ? TOKEN_ADDRESSES.devnet : TOKEN_ADDRESSES.mainnet;
        console.log('Using token address:', tokenAddress, 'on', isDevnet ? 'devnet' : 'mainnet');
        
        const balance = await getTokenBalance(connection, solAddress, tokenAddress);
        setSolBalance(balance);
      } catch (error) {
        console.error('Failed to fetch token balance:', error);
        setSolBalance(0);
      }
      setIsChecking(false);
    }

    checkSolanaBalance();
  }, [solAddress, isSolConnected, connection]);

  // Check authorization based on token balance
  useEffect(() => {
    const hasEnoughTokens = solBalance >= REQUIRED_HEDGY_TOKENS;
    setIsAuthorized(hasEnoughTokens);
  }, [solBalance]);

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
                  <span className={`mr-2 ${isSolConnected ? 'text-green-500' : 'text-gray-500'}`}>
                    {isSolConnected ? '✓' : '○'}
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
                <p className="text-gray-400">Checking requirements...</p>
              </div>
            ) : isSolConnected ? (
              <div>
                {isAuthorized ? (
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
                      Current balance: {solBalance.toLocaleString()} Spark
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
