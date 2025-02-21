import { useState, useEffect } from 'react';

interface MemeCoin {
  symbol: string;
  name: string;
  alt_rank: number;
  alt_rank_previous: number;
  social_dominance: number;
  category: string;
}

interface MemeCoinsResponse {
  meme_coins: MemeCoin[];
  error?: string;
}

interface MemeCoinsProps {
  className?: string;
}

export const MemeCoins: React.FC<MemeCoinsProps> = ({ className = '' }) => {
  const [memeCoins, setMemeCoins] = useState<MemeCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemeCoins = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/meme-coins');
        if (!response.ok) {
          throw new Error('Failed to fetch meme coins');
        }
        const data: MemeCoinsResponse = await response.json();
        setMemeCoins(data.meme_coins);
        if (data.error) {
          setError(data.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch meme coins');
      } finally {
        setLoading(false);
      }
    };

    fetchMemeCoins();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMemeCoins, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}>
        <h2 className="text-xl font-semibold mb-4 text-gray-300">
          Loading top meme coins...
        </h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-700/50 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && memeCoins.length === 0) {
    return (
      <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}>
        <h2 className="text-xl font-semibold mb-4 text-gray-300">
          Top 10 Meme Coins by AltRank
        </h2>
        <div className="text-red-400 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}>
      <h2 className="text-xl font-semibold mb-4 text-gray-300">
        Top 10 Meme Coins by AltRank
      </h2>
      {error && (
        <div className="text-yellow-400 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg mb-4">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-4 text-gray-400">Rank</th>
              <th className="text-left py-2 px-4 text-gray-400">Name</th>
              <th className="text-left py-2 px-4 text-gray-400">Symbol</th>
              <th className="text-left py-2 px-4 text-gray-400">AltRank</th>
              <th className="text-left py-2 px-4 text-gray-400">Change</th>
              <th className="text-left py-2 px-4 text-gray-400">Social Dominance</th>
            </tr>
          </thead>
          <tbody>
            {memeCoins.map((coin, index) => (
              <tr 
                key={coin.symbol}
                className="border-b border-gray-700 hover:bg-gray-700/50"
              >
                <td className="py-2 px-4 text-gray-300">{index + 1}</td>
                <td className="py-2 px-4 text-gray-300">{coin.name}</td>
                <td className="py-2 px-4 text-gray-300">{coin.symbol}</td>
                <td className="py-2 px-4 text-gray-300">{coin.alt_rank}</td>
                <td className="py-2 px-4">
                  {coin.alt_rank !== coin.alt_rank_previous && (
                    <span className={coin.alt_rank < coin.alt_rank_previous ? 'text-green-500' : 'text-red-500'}>
                      {coin.alt_rank < coin.alt_rank_previous ? '↑' : '↓'}
                      {Math.abs(coin.alt_rank - coin.alt_rank_previous)}
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 text-gray-300">{coin.social_dominance.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 