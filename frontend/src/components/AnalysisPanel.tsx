'use client';

import React from 'react';

interface AgentReasoning {
  agent: string;
  reasoning: string | object;
}

interface AnalysisResult {
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
  social_metrics?: {
    alt_rank: number;
    alt_rank_previous: number;
    social_dominance: number;
  };
}

interface TechnicalStrategy {
  signal: string;
  confidence: string;
}

interface TechnicalAnalysis {
  signal: string;
  confidence: string;
  strategies: Record<string, TechnicalStrategy>;
}

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  agentReasoning?: AgentReasoning[];
}

const formatTechnicalAnalysis = (data: TechnicalAnalysis): string => {
  if (!data || typeof data !== 'object') return JSON.stringify(data, null, 2);
  
  const strategies = data.strategies || {};
  let output = `Signal: ${data.signal.toUpperCase()} (${data.confidence} confidence)\n\nStrategy Breakdown:\n`;
  
  for (const [strategy, info] of Object.entries(strategies)) {
    output += `\n${strategy.replace(/_/g, ' ').toUpperCase()}:\n`;
    output += `• Signal: ${info.signal.toUpperCase()}\n`;
    output += `• Confidence: ${info.confidence}\n`;
  }
  
  return output;
};

const formatReasoning = (reasoning: string | object, agentName: string): string => {
  if (typeof reasoning === 'string') return reasoning;
  if (agentName === 'technical_analyst_agent') {
    return formatTechnicalAnalysis(reasoning as TechnicalAnalysis);
  }
  return JSON.stringify(reasoning, null, 2);
};

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  analysis, 
  isLoading, 
  error,
  agentReasoning = []
}) => {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        <div className="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-gray-400 text-center py-8">
        Enter a cryptocurrency to analyze market sentiment and trading signals.
      </div>
    );
  }

  const getSignalColor = (signal?: string) => {
    if (!signal) return 'text-yellow-500';
    
    const signalLower = signal.toLowerCase();
    if (signalLower === 'bullish' || signalLower === 'long') return 'text-green-500';
    if (signalLower === 'bearish' || signalLower === 'short') return 'text-red-500';
    return 'text-yellow-500';
  };

  const signalColor = getSignalColor(analysis.decision.action);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Portfolio Settings</h2>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Available Cash:</span>
            <span className="font-bold text-green-500">
              ${Number(analysis.portfolio.cash).toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Leverage:</span>
            <span className="font-bold text-yellow-500">
              {analysis.portfolio.leverage}x
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Risk per Trade:</span>
            <span className="font-bold text-red-500">
              {(Number(analysis.portfolio.risk) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Trading Decision</h2>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Recommended Action:</span>
            <span className={`font-bold ${signalColor}`}>
              {analysis.decision.action.toUpperCase()}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Signal Confidence:</span>
            <span className="font-bold text-blue-500">
              {analysis.decision.confidence}
            </span>
          </div>

          <div className="border-t border-gray-700 my-4"></div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Position Details</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Position Size:</span>
                <div className="text-right">
                  <span className="font-bold text-orange-500 block">
                    {analysis.decision.quantity.toLocaleString()} contracts
                  </span>
                  <span className="text-xs text-gray-500">
                    (Based on risk management and leverage settings)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Market Volatility:</span>
                <span className="font-bold text-purple-500">
                  {analysis.decision.volatility}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-400">Stop Loss:</span>
                  <span className="text-xs text-gray-500 block">
                    (Maximum loss per position)
                  </span>
                </div>
                <span className="font-bold text-red-500">
                  {analysis.decision.stop_loss}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-400">Take Profit:</span>
                  <span className="text-xs text-gray-500 block">
                    (Target profit level)
                  </span>
                </div>
                <span className="font-bold text-green-500">
                  {analysis.decision.take_profit}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {analysis.social_metrics ? (
        <div>
          <h2 className="text-xl font-bold mb-4">Social Strength</h2>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-400">AltRank™:</span>
                <span className="text-xs text-gray-500 block">
                  (A proprietary score based on how an asset is performing relative to all other assets supported)
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-blue-500">
                  #{analysis.social_metrics.alt_rank}
                </span>
                {analysis.social_metrics.alt_rank !== analysis.social_metrics.alt_rank_previous && (
                  <span className="ml-2 text-sm">
                    {analysis.social_metrics.alt_rank < analysis.social_metrics.alt_rank_previous ? (
                      <span className="text-green-500">↑</span>
                    ) : (
                      <span className="text-red-500">↓</span>
                    )}
                    <span className="text-gray-500 text-xs ml-1">
                      from #{analysis.social_metrics.alt_rank_previous}
                    </span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-400">Social Dominance:</span>
                <span className="text-xs text-gray-500 block">
                  (The percent of total social volume that this topic represents)
                </span>
              </div>
              <span className="font-bold text-purple-500">
                {analysis.social_metrics.social_dominance.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-4">Social Strength</h2>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-center text-gray-400">
              <p>AltRank™ and Social Dominance metrics are temporarily unavailable.</p>
              <p className="text-sm mt-1">Please try again later.</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">Detailed Analysis</h3>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <pre className="whitespace-pre-wrap font-sans text-gray-300">
            {analysis.reasoning}
          </pre>
        </div>
      </div>

      {agentReasoning.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Agent Reasoning</h3>
          <div className="space-y-4">
            {agentReasoning.map((agent, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
              >
                <h4 className="text-blue-400 font-medium mb-2">
                  {agent.agent.replace(/_/g, ' ').split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </h4>
                <pre className="whitespace-pre-wrap font-sans text-gray-300">
                  {formatReasoning(agent.reasoning, agent.agent)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel; 