'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TradingViewWidget } from '../../components/TradingViewWidget';
import AnalysisPanel from '@/components/AnalysisPanel';
import { Header } from '../../components/Header';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
    const tokenPublicKey = new PublicKey(tokenAddress);
    
    // First try getParsedTokenAccountsByOwner
    try {
      const accountInfo = await connection.getParsedTokenAccountsByOwner(address, {
        mint: tokenPublicKey,
      });

      if (accountInfo.value.length > 0) {
        return accountInfo.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      }
    } catch (e) {
      console.warn('Failed to get parsed token accounts:', e);
    }

    // Fallback to getTokenAccountBalance
    try {
      const accounts = await connection.getTokenAccountsByOwner(address, {
        mint: tokenPublicKey,
      });

      if (accounts.value.length > 0) {
        const balance = await connection.getTokenAccountBalance(accounts.value[0].pubkey);
        return balance.value.uiAmount || 0;
      }
    } catch (e) {
      console.warn('Failed to get token accounts by owner:', e);
    }

    return 0;
  } catch (error) {
    console.error(`Error fetching token balance (attempt ${retries + 1}):`, error);
    
    if (retries < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getTokenBalance(connection, address, tokenAddress, retries + 1);
    }
    
    console.error('Failed to fetch token balance after all retries');
    return 0;
  }
}

const POPULAR_CRYPTOCURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'AAVE', name: 'Aave' },
  { symbol: 'SNX', name: 'Synthetix' },
  { symbol: 'OP', name: 'Optimism' },
  { symbol: 'ARB', name: 'Arbitrum' },
];

interface AnalysisResponse {
  analysis: {
    portfolio: {
      cash: string;
      leverage: string;
      risk: string;
    };
    decision: {
      action: string;
      quantity: number;
      volatility: string;
      stop_loss: string;
      take_profit: string;
      confidence: string;
    };
    agent_signals: Array<{
      agent: string;
      signal: string;
      confidence: string;
    }>;
    reasoning: string;
  };
  agent_reasoning: Array<{
    agent: string;
    reasoning: string | object;
  }>;
}

interface AnalysisRequest {
  crypto: string;
  startDate?: string;
  endDate?: string;
  balance?: number;
  leverage?: number;
  risk?: number;
}

interface PortfolioSettings {
  balance: number;
  leverage: number;
  risk: number;
}

interface Cryptocurrency {
  symbol: string;
  name: string;
  market_cap: number;
  volume_24h: number;
}

export default function AnalysisPage() {
  const router = useRouter();
  
  // Solana wallet state
  const { publicKey: solAddress, connected: isSolConnected } = useWallet();
  const { connection } = useConnection();
  
  // State declarations - keep all hooks at the top
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [crypto, setCrypto] = useState('BTC');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCryptos, setFilteredCryptos] = useState<Cryptocurrency[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResponse['analysis'] | null>(null);
  const [agentReasoning, setAgentReasoning] = useState<AnalysisResponse['agent_reasoning']>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [portfolioSettings, setPortfolioSettings] = useState<PortfolioSettings>({
    balance: 500000,
    leverage: 20,
    risk: 0.01
  });
  const [availableCoins, setAvailableCoins] = useState<Cryptocurrency[]>([]);
  const [isLoadingCoins, setIsLoadingCoins] = useState(true);

  // Effect for checking Solana token balance
  useEffect(() => {
    async function checkSolanaBalance() {
      if (!solAddress || !isSolConnected) {
        setSolBalance(0);
        setIsCheckingBalance(false);
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
      setIsCheckingBalance(false);
    }

    checkSolanaBalance();
  }, [solAddress, isSolConnected, connection]);

  // Effect for authorization check
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        if (!isSolConnected) {
          await router.replace('/');
          return;
        }

        const hasEnoughTokens = solBalance >= REQUIRED_HEDGY_TOKENS;
        setIsAuthorized(hasEnoughTokens);
        
        if (!hasEnoughTokens && !isCheckingBalance) {
          await router.replace('/');
        }
      } catch (error) {
        console.warn('Navigation error:', error);
        // If navigation fails, at least update the UI state
        setIsAuthorized(false);
      }
    };

    checkAuthorization();
  }, [isSolConnected, solBalance, router, isCheckingBalance]);

  // Effect for fetching available cryptocurrencies
  useEffect(() => {
    async function fetchCoins() {
      setIsLoadingCoins(true);
      try {
        console.log('Fetching coins from:', `${API_URL}/api/coins`);
        const response = await fetch(`${API_URL}/api/coins`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch cryptocurrencies: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.coins && Array.isArray(data.coins)) {
          // Filter out duplicates based on symbol-name combination
          const uniqueCoins = data.coins.filter((coin: Cryptocurrency, index: number, self: Cryptocurrency[]) =>
            index === self.findIndex((c: Cryptocurrency) => c.symbol === coin.symbol && c.name === coin.name)
          );
          setAvailableCoins(uniqueCoins);
          // Initially show top 100 by market cap
          setFilteredCryptos(uniqueCoins.slice(0, 100));
          console.log(`Loaded ${uniqueCoins.length} unique cryptocurrencies`);
        } else {
          console.error('Invalid API response format:', data);
          throw new Error('Invalid response format from API');
        }
      } catch (error) {
        console.error('Error fetching cryptocurrencies:', error);
        // Fallback to hardcoded list if API fails
        const fallbackCoins = POPULAR_CRYPTOCURRENCIES.map(coin => ({
          ...coin,
          market_cap: 0,
          volume_24h: 0
        }));
        setAvailableCoins(fallbackCoins);
        setFilteredCryptos(fallbackCoins);
        setError(
          `Failed to fetch cryptocurrency list: ${error instanceof Error ? error.message : 'Unknown error'}. Showing popular coins only.`
        );
      } finally {
        setIsLoadingCoins(false);
      }
    }

    fetchCoins();
  }, []);

  // Effect for search handling
  useEffect(() => {
    if (searchTerm) {
      const filtered = availableCoins.filter(
        coin => 
          coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coin.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCryptos(filtered);
    } else {
      // Show top 100 by market cap when no search term
      setFilteredCryptos(availableCoins.slice(0, 100));
    }
  }, [searchTerm, availableCoins]);

  // Handler functions
  const handleSearch = (value: string) => {
    setSearchTerm(value.toUpperCase());
    setShowDropdown(true);
  };

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const request: AnalysisRequest = {
        crypto,
        balance: portfolioSettings.balance,
        leverage: portfolioSettings.leverage,
        risk: portfolioSettings.risk
      };

      if (startDate) request.startDate = startDate;
      if (endDate) request.endDate = endDate;

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      const data: AnalysisResponse = await response.json();
      setAnalysis(data.analysis);
      setAgentReasoning(data.agent_reasoning);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setAnalysis(null);
      setAgentReasoning([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Loading state for balance check
  if (isCheckingBalance) {
    return (
      <main className="min-h-screen bg-gray-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Checking access requirements...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Unauthorized state - show message but don't redirect immediately
  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-gray-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <p className="text-red-400">You need {REQUIRED_HEDGY_TOKENS.toLocaleString()} Spark tokens to access this page.</p>
              <p className="text-gray-400 mt-2">Current balance: {solBalance.toLocaleString()} Spark</p>
              <p className="text-gray-400 mt-2">Redirecting to home...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Main render
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Analysis Panel - Now on the left and wider */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <label htmlFor="crypto" className="block text-sm font-medium">
                    Cryptocurrency
                  </label>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {showSettings ? 'Hide Settings' : 'Show Settings'}
                  </button>
                </div>

                {showSettings && (
                  <div className="mb-4 space-y-4 p-4 bg-gray-700/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Balance ($)</label>
                      <input
                        type="number"
                        value={portfolioSettings.balance}
                        onChange={(e) => setPortfolioSettings(prev => ({
                          ...prev,
                          balance: Number(e.target.value)
                        }))}
                        min="0"
                        step="10000"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Leverage (x)</label>
                      <input
                        type="number"
                        value={portfolioSettings.leverage}
                        onChange={(e) => setPortfolioSettings(prev => ({
                          ...prev,
                          leverage: Number(e.target.value)
                        }))}
                        min="1"
                        max="125"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Risk per Trade (%)</label>
                      <input
                        type="number"
                        value={portfolioSettings.risk * 100}
                        onChange={(e) => setPortfolioSettings(prev => ({
                          ...prev,
                          risk: Number(e.target.value) / 100
                        }))}
                        min="0.1"
                        max="100"
                        step="0.1"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Max loss per trade: ${(portfolioSettings.balance * portfolioSettings.risk).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        id="crypto"
                        value={searchTerm}
                        onChange={(e) => {
                          handleSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter or select crypto (e.g. BTC)"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        onClick={() => setShowDropdown(!showDropdown)}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={showDropdown ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                          />
                        </svg>
                      </button>
                      
                      {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                          {isLoadingCoins ? (
                            <div className="px-4 py-2 text-gray-400">
                              Loading cryptocurrencies...
                            </div>
                          ) : filteredCryptos.length > 0 ? (
                            <>
                              <div className="sticky top-0 bg-gray-800 p-2 border-b border-gray-600 text-xs text-gray-400">
                                {searchTerm ? 
                                  `Found ${filteredCryptos.length} matches` : 
                                  `Showing top ${filteredCryptos.length} by market cap`
                                }
                              </div>
                              {filteredCryptos.map((coin) => (
                                <button
                                  key={`${coin.symbol}-${coin.name}`}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-600 focus:outline-none focus:bg-gray-600"
                                  onClick={() => {
                                    setCrypto(coin.symbol);
                                    setSearchTerm(coin.symbol);
                                    setShowDropdown(false);
                                  }}
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="font-medium">{coin.symbol}</span>
                                      <span className="text-gray-400 ml-2">{coin.name}</span>
                                    </div>
                                    <div className="text-right text-sm">
                                      {coin.market_cap > 0 && (
                                        <span className="text-gray-500">
                                          MCap: ${(coin.market_cap / 1e9).toFixed(2)}B
                                        </span>
                                      )}
                                      {coin.volume_24h > 0 && (
                                        <span className="text-gray-500 ml-2">
                                          Vol: ${(coin.volume_24h / 1e6).toFixed(1)}M
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </>
                          ) : (
                            <div className="px-4 py-2 text-gray-400">
                              No cryptocurrencies found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setCrypto(searchTerm);
                        handleAnalysis();
                      }}
                      disabled={isAnalyzing}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isAnalyzing 
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {isAnalyzing ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </div>
                      ) : 'Analyze'}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="mt-2 p-2 bg-red-900/50 border border-red-500 rounded-lg">
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </div>
            
            <AnalysisPanel
              analysis={analysis}
              isLoading={isAnalyzing}
              error={error}
              agentReasoning={agentReasoning}
              showDecisionModal={showDecisionModal}
              setShowDecisionModal={setShowDecisionModal}
            />
          </div>
          
          {/* Right sidebar with How It Works and Trading View */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">How It Works</h2>
                <button
                  onClick={() => setShowDecisionModal(true)}
                  className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Learn more
                </button>
              </div>
              <p className="text-sm text-gray-300">
                Our AI combines four key factors to make trading decisions: Risk Management (50%), 
                Technical Analysis (25%), Social Monitoring (15%), and Sentiment Analysis (10%). 
                Risk management sets position limits and stop-losses, while technical analysis 
                determines timing. Social and sentiment data provide final adjustments for a 
                comprehensive trading strategy.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <TradingViewWidget symbol={`${crypto}USDT`} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 