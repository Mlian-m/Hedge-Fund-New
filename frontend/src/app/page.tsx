'use client';

import { useState, useEffect } from 'react';
import { TradingViewWidget } from '../components/TradingViewWidget';
import AnalysisPanel from '@/components/AnalysisPanel';
import { Header } from '../components/Header';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export default function Home() {
  const [crypto, setCrypto] = useState('BTC');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCryptos, setFilteredCryptos] = useState(POPULAR_CRYPTOCURRENCIES);
  const [analysis, setAnalysis] = useState<AnalysisResponse['analysis'] | null>(null);
  const [agentReasoning, setAgentReasoning] = useState<AnalysisResponse['agent_reasoning']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Date range state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Portfolio settings state
  const [portfolioSettings, setPortfolioSettings] = useState<PortfolioSettings>({
    balance: 500000,
    leverage: 20,
    risk: 0.01
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value.toUpperCase());
    const filtered = POPULAR_CRYPTOCURRENCIES.filter(
      crypto => 
        crypto.symbol.toLowerCase().includes(value.toLowerCase()) ||
        crypto.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredCryptos(filtered);
  };

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm]);

  const handleAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const request: AnalysisRequest = {
        crypto,
        balance: portfolioSettings.balance,
        leverage: portfolioSettings.leverage,
        risk: portfolioSettings.risk
      };

      // Only add dates if they're set
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
      setIsLoading(false);
    }
  };

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
                        <div 
                          className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto"
                        >
                          {filteredCryptos.map((crypto) => (
                            <button
                              key={crypto.symbol}
                              className="w-full px-4 py-2 text-left hover:bg-gray-600 focus:outline-none focus:bg-gray-600"
                              onClick={() => {
                                setCrypto(crypto.symbol);
                                setSearchTerm(crypto.symbol);
                                setShowDropdown(false);
                              }}
                            >
                              <span className="font-medium">{crypto.symbol}</span>
                              <span className="text-gray-400 ml-2">{crypto.name}</span>
                            </button>
                          ))}
                          {filteredCryptos.length === 0 && (
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
                      disabled={isLoading}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isLoading 
                          ? 'bg-blue-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {isLoading ? 'Analyzing...' : 'Analyze'}
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
              isLoading={isLoading}
              error={error}
              agentReasoning={agentReasoning}
            />
          </div>
          
          {/* Trading View Chart - Now on the right and smaller */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <TradingViewWidget symbol={`${crypto}USDT`} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
