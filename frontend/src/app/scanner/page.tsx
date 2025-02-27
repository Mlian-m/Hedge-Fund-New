'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import Link from 'next/link';

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
  social_dominance: number;
  network: string;
  logo: string;
  address: string;
}

export default function ScannerPage() {
  const [memecoins, setMemecoins] = useState<Memecoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
  };

  const fetchMemecoins = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scanner');
      if (!response.ok) {
        throw new Error('Failed to fetch memecoins');
      }
      const data = await response.json();
      setMemecoins(data.data || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error('Error fetching memecoins:', error);
      setError('Failed to load memecoins data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchMemecoins();
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Social Memecoin Scanner</h1>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <p className="text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={fetchMemecoins}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isLoading
                  ? 'bg-blue-500/50 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Refreshing...
                </span>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-500">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800 text-left">
                  <th className="p-4 font-semibold w-[140px]">
                    <div>
                      <span>AltRank™</span>
                      <span className="block text-xs text-gray-400">Lower = Better</span>
                    </div>
                  </th>
                  <th className="p-4 font-semibold min-w-[200px]">Name</th>
                  <th className="p-4 font-semibold w-[160px]">Network</th>
                  <th className="p-4 font-semibold w-[120px]">Price</th>
                  <th className="p-4 font-semibold w-[120px]">24h Change</th>
                  <th className="p-4 font-semibold w-[120px]">Market Cap</th>
                  <th className="p-4 font-semibold w-[120px]">Volume (24h)</th>
                  <th className="p-4 font-semibold w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {memecoins.map((coin) => (
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
                    <td className="p-4 whitespace-nowrap">${coin.price.toLocaleString()}</td>
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
        )}
      </div>
    </main>
  );
} 