'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AUTH_CONFIG, AUTH_MESSAGES } from '@/config/auth';

interface Memecoin {
  id: string;
  name: string;
  symbol: string;
  price: number;
  price_change_24h: number;
  market_cap: number;
  volume_24h: number;
  alt_rank: number;
  alt_rank_previous: number;
  galaxy_score: number;
  galaxy_score_previous: number;
  social_dominance: number;
  sentiment: number;
  sentiment_relative: number;
  network: string;
  logo: string;
  address: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

type SortField = 'alt_rank' | 'galaxy_score' | 'sentiment' | 'name' | 'price_change_24h' | 'market_cap' | 'volume_24h';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

async function getTokenBalance(connection: Connection, walletAddress: PublicKey, tokenMintAddress: string): Promise<number> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { programId: TOKEN_PROGRAM_ID }
    );

    for (const { account } of tokenAccounts.value) {
      const tokenData = account.data.parsed.info;
      if (tokenData.mint === tokenMintAddress) {
        return Number(tokenData.tokenAmount.amount) / Math.pow(10, tokenData.tokenAmount.decimals);
      }
    }
    return 0;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}

export default function ScannerPage() {
  const [memecoins, setMemecoins] = useState<Memecoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortConfig>({ field: 'alt_rank', direction: 'asc' });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
    hasMore: false
  });
  
  const { connected, publicKey: walletAddress } = useWallet();

  const handleCopy = (id: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check token balance when wallet is connected
  useEffect(() => {
    async function checkBalance() {
      if (!connected || !walletAddress) {
        setIsAuthorized(false);
        setTokenBalance(0);
        return;
      }

      setCheckError(null);

      try {
        const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
        if (!rpcEndpoint) {
          throw new Error('Solana RPC URL not configured');
        }

        console.log('Checking token balance with RPC:', rpcEndpoint);
        
        const connection = new Connection(rpcEndpoint, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000,
          disableRetryOnRateLimit: false
        });

        const isDevnet = connection.rpcEndpoint.includes('devnet');
        const tokenAddress = isDevnet ? AUTH_CONFIG.TOKEN_ADDRESSES.devnet : AUTH_CONFIG.TOKEN_ADDRESSES.mainnet;
        
        console.log('Using token address:', tokenAddress, 'on', isDevnet ? 'devnet' : 'mainnet');
        console.log('Required tokens:', AUTH_CONFIG.REQUIRED_TOKENS);
        
        const balance = await getTokenBalance(connection, walletAddress, tokenAddress);
        console.log('Current token balance:', balance);
        
        setTokenBalance(balance);
        const hasEnoughTokens = balance >= AUTH_CONFIG.REQUIRED_TOKENS;
        console.log('Has enough tokens:', hasEnoughTokens);
        
        setIsAuthorized(hasEnoughTokens);
      } catch (error) {
        console.error('Balance check failed:', error);
        setCheckError('Failed to verify token balance. Please try again.');
        setTokenBalance(0);
        setIsAuthorized(false);
      }
    }

    checkBalance();
  }, [walletAddress, connected]);

  const fetchMemecoins = async (page = 1, append = false) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await fetch(`/api/scanner?page=${page}&limit=${pagination.limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch memecoins');
      }
      const data = await response.json();
      
      if (append) {
        setMemecoins(prev => [...prev, ...data.data]);
      } else {
        setMemecoins(data.data || []);
      }
      
      setPagination(data.pagination);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error fetching memecoins:', error);
      setError('Failed to load memecoins data');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!pagination.hasMore || isLoadingMore) return;
    fetchMemecoins(pagination.page + 1, true);
  };

  // Only fetch data when authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchMemecoins();
    }
  }, [isAuthorized]);

  const handleSort = (field: SortField) => {
    setSort(prevSort => ({
      field,
      direction: prevSort.field === field && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedMemecoins = () => {
    return [...memecoins].sort((a, b) => {
      const direction = sort.direction === 'asc' ? 1 : -1;
      
      switch (sort.field) {
        case 'alt_rank':
          return (a.alt_rank - b.alt_rank) * direction;
        case 'galaxy_score':
          return (b.galaxy_score - a.galaxy_score) * direction; // Higher is better
        case 'sentiment':
          return (b.sentiment - a.sentiment) * direction; // Higher is better
        case 'name':
          return a.name.localeCompare(b.name) * direction;
        case 'price_change_24h':
          return (b.price_change_24h - a.price_change_24h) * direction;
        case 'market_cap':
          return (b.market_cap - a.market_cap) * direction;
        case 'volume_24h':
          return (b.volume_24h - a.volume_24h) * direction;
        default:
          return 0;
      }
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-30">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
        </svg>
      );
    }
    return sort.direction === 'asc' ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {!connected ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{AUTH_MESSAGES.CONNECT_WALLET.title}</h2>
            <p className="text-gray-400 mb-6">{AUTH_MESSAGES.CONNECT_WALLET.description}</p>
          </div>
        ) : !isAuthorized ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{AUTH_MESSAGES.INSUFFICIENT_BALANCE.title}</h2>
            <p className="text-gray-400 mb-2">
              {AUTH_MESSAGES.INSUFFICIENT_BALANCE.description(AUTH_CONFIG.REQUIRED_TOKENS, AUTH_CONFIG.TOKEN_NAME)}
            </p>
            <p className="text-gray-400">
              Current balance: {tokenBalance.toFixed(2)} {AUTH_CONFIG.TOKEN_NAME}
            </p>
            {checkError && (
              <p className="text-red-500 mt-4">{checkError}</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Social Meme Scanner</h1>
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <p className="text-sm text-gray-400">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
                <button
                  onClick={() => fetchMemecoins(1)}
                  disabled={isLoading}
                  className={`p-2 rounded-lg transition-all hover:bg-gray-700 ${
                    isLoading
                      ? 'text-blue-400/50 cursor-not-allowed'
                      : 'text-blue-400 hover:text-white'
                  }`}
                  title="Refresh data"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-500">
                {error}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-left">
                        <th className="p-4 font-semibold w-[140px]">
                          <div className="group relative">
                            <button 
                              onClick={() => handleSort('alt_rank')}
                              className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                            >
                              <div className="flex flex-col">
                                <span>AltRank™</span>
                                <span className="text-[10px] text-gray-400">Lower = Better</span>
                              </div>
                              {renderSortIcon('alt_rank')}
                            </button>
                            <div className="absolute top-full left-0 mt-2 px-3 py-2 w-80 text-sm font-normal text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                              A proprietary LunarCrush score based on how an asset is performing relative to all other assets supported
                            </div>
                          </div>
                        </th>
                        <th className="p-4 font-semibold w-[140px]">
                          <div className="group relative">
                            <button 
                              onClick={() => handleSort('galaxy_score')}
                              className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                            >
                              <div className="flex flex-col">
                                <span>HedgyScore</span>
                                <span className="text-[10px] text-gray-400">Higher = Better</span>
                              </div>
                              {renderSortIcon('galaxy_score')}
                            </button>
                            <div className="absolute top-full left-0 mt-2 px-3 py-2 w-80 text-sm font-normal text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                              A proprietary score based on technical indicators of price, average social sentiment, relative social activity, and a factor of how closely social indicators correlate with price and volume.
                            </div>
                          </div>
                        </th>
                        <th className="p-4 font-semibold w-[180px]">
                          <div className="group relative">
                            <button 
                              onClick={() => handleSort('sentiment')}
                              className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                            >
                              <div className="flex flex-col">
                                <span>Sentiment</span>
                                <span className="text-[10px] text-gray-400">Higher = Better</span>
                              </div>
                              {renderSortIcon('sentiment')}
                            </button>
                            <div className="absolute top-full left-0 mt-2 px-3 py-2 w-80 text-sm font-normal text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                              % of posts (weighted by interactions) that are positive. 100% means all posts are positive, 50% is half positive and half negative, and 0% is all negative posts.
                            </div>
                          </div>
                        </th>
                        <th className="p-4 font-semibold min-w-[200px]">
                          <button 
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                          >
                            <span>Name</span>
                            {renderSortIcon('name')}
                          </button>
                        </th>
                        <th className="p-4 font-semibold w-[160px]">Network</th>
                        <th className="p-4 font-semibold w-[120px]">
                          <div className="group relative">
                            <button 
                              onClick={() => handleSort('price_change_24h')}
                              className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                            >
                              <span>24h Change</span>
                              {renderSortIcon('price_change_24h')}
                            </button>
                            <div className="absolute top-full left-0 mt-2 px-3 py-2 w-80 text-sm font-normal text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                              Percent change in price since 24 hours ago
                            </div>
                          </div>
                        </th>
                        <th className="p-4 font-semibold w-[120px]">
                          <button 
                            onClick={() => handleSort('market_cap')}
                            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                          >
                            <span>Market Cap</span>
                            {renderSortIcon('market_cap')}
                          </button>
                        </th>
                        <th className="p-4 font-semibold w-[120px]">
                          <button 
                            onClick={() => handleSort('volume_24h')}
                            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                          >
                            <span>Volume (24h)</span>
                            {renderSortIcon('volume_24h')}
                          </button>
                        </th>
                        <th className="p-4 font-semibold w-[80px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {getSortedMemecoins().map((coin) => (
                        <tr key={coin.id} className="hover:bg-gray-800/50">
                          <td className="p-4 whitespace-nowrap">
                            <div>
                              <span className="font-medium">#{coin.alt_rank}</span>
                              {coin.alt_rank !== coin.alt_rank_previous && (
                                <span className="ml-2 text-sm">
                                  {coin.alt_rank < coin.alt_rank_previous ? (
                                    <span className="text-green-500">↑</span>
                                  ) : (
                                    <span className="text-red-500">↓</span>
                                  )}
                                  <span className="text-gray-500 text-xs ml-1">
                                    from #{coin.alt_rank_previous}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div>
                              <span className="font-medium">{coin.galaxy_score}</span>
                              {coin.galaxy_score !== coin.galaxy_score_previous && (
                                <span className="ml-2 text-sm">
                                  {coin.galaxy_score > coin.galaxy_score_previous ? (
                                    <span className="text-green-500">↑</span>
                                  ) : (
                                    <span className="text-red-500">↓</span>
                                  )}
                                  <span className="text-gray-500 text-xs ml-1">
                                    from {coin.galaxy_score_previous}
                                  </span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div>
                              <span className={`font-medium ${
                                coin.sentiment > 60 ? 'text-green-500' : 
                                coin.sentiment > 40 ? 'text-yellow-500' : 
                                'text-red-500'
                              }`}>
                                {coin.sentiment.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 relative">
                                <img 
                                  src={coin.logo} 
                                  alt={`${coin.name} logo`}
                                  width={32}
                                  height={32}
                                  className="rounded-full w-8 h-8 object-cover bg-gray-700"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    // Try the alternative URL format first
                                    if (!target.src.includes('/assets/coins/')) {
                                      target.src = `https://cdn.lunarcrush.com/assets/coins/${coin.symbol.toLowerCase()}/logo.png`;
                                    } else {
                                      // If both URLs fail, use the generic icon
                                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSIxNiIgZmlsbD0iIzJEMzc0OCIvPjxwYXRoIGQ9Ik0xNiA4QzExLjU4MTcgOCA4IDExLjU4MTcgOCAxNkM4IDIwLjQxODMgMTEuNTgxNyAyNCAxNiAyNEMyMC40MTgzIDI0IDI0IDIwLjQxODMgMjQgMTZDMjQgMTEuNTgxNyAyMC40MTgzIDggMTYgOFoiIHN0cm9rZT0iIzRCNTU2MyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+';
                                      target.onerror = null; // Prevent further retries
                                    }
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate flex items-center gap-2">
                                  <span>{coin.name}</span>
                                  <span className="text-gray-400 text-sm">{coin.symbol}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium">
                                {coin.network}
                              </span>
                              {coin.address !== 'Unknown' && (
                                <button
                                  onClick={() => handleCopy(coin.id, coin.address)}
                                  className="text-gray-400 hover:text-blue-400 transition-colors group relative"
                                  title="Copy address"
                                >
                                  {copiedId === coin.id ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                                      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                                    </svg>
                                  )}
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {copiedId === coin.id ? 'Copied!' : 'Copy address'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={`p-4 whitespace-nowrap ${coin.price_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {coin.price_change_24h.toFixed(2)}%
                          </td>
                          <td className="p-4 whitespace-nowrap">${(coin.market_cap / 1e6).toFixed(2)}M</td>
                          <td className="p-4 whitespace-nowrap">${(coin.volume_24h / 1e6).toFixed(2)}M</td>
                          <td className="p-4 whitespace-nowrap">
                            <Link
                              href={`/analysis?symbol=${coin.symbol}`}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              Analyze
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {pagination.hasMore && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        isLoadingMore
                          ? 'bg-blue-500/50 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {isLoadingMore ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Loading more...
                        </span>
                      ) : (
                        `Load More (${memecoins.length} of ${pagination.total})`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
} 