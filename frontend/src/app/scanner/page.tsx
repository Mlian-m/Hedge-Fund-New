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
}

export default function ScannerPage() {
  const [memecoins, setMemecoins] = useState<Memecoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMemecoins() {
      try {
        const response = await fetch('/api/scanner');
        if (!response.ok) {
          throw new Error('Failed to fetch memecoins');
        }
        const data = await response.json();
        setMemecoins(data.data || []);
      } catch (error) {
        console.error('Error fetching memecoins:', error);
        setError('Failed to load memecoins data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMemecoins();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchMemecoins, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Memecoin Scanner</h1>
          <p className="text-sm text-gray-400">
            Data updates every 5 minutes
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
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
                  <th className="p-4 font-semibold w-[100px]">Network</th>
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
                      <span className="px-2 py-1 bg-gray-700 rounded text-xs font-medium">
                        {coin.network}
                      </span>
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