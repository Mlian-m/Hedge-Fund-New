'use client';

import { useEffect, useRef, memo } from 'react';

interface TradingViewConfig {
  widget: {
    container: HTMLDivElement;
    symbol: string;
    interval: string;
    timezone: string;
    theme: string;
    style: string;
    locale: string;
    enable_publishing: boolean;
    allow_symbol_change: boolean;
    save_image: boolean;
    height: string;
    hide_side_toolbar: boolean;
  };
}

declare global {
  interface Window {
    TradingView: TradingViewConfig;
  }
}

interface TradingViewWidgetProps {
  symbol: string;
}

export const TradingViewWidget = memo(({ symbol }: TradingViewWidgetProps) => {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clean up any existing widget
    container.current.innerHTML = '';

    // Create and load the script
    scriptRef.current = document.createElement('script');
    scriptRef.current.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    scriptRef.current.type = 'text/javascript';
    scriptRef.current.async = true;
    
    // Configure the widget
    scriptRef.current.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": `BINANCE:${symbol}`,
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "support_host": "https://www.tradingview.com",
      "backgroundColor": "rgba(19, 23, 34, 1)",
      "gridColor": "rgba(42, 46, 57, 1)",
      "width": "100%",
      "height": "600",
      "save_image": false,
      "hide_side_toolbar": false,
      "withdateranges": true,
      "details": true,
      "hotlist": true,
      "calendar": true,
      "studies": [
        "RSI@tv-basicstudies",
        "MAExp@tv-basicstudies",
        "MACD@tv-basicstudies"
      ]
    });

    // Add the script to the container
    container.current.appendChild(scriptRef.current);

    // Cleanup function
    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [symbol]); // Re-run when symbol changes

  return (
    <div className="relative w-full h-[600px] bg-gray-800 rounded-lg overflow-hidden">
      <div ref={container} className="tradingview-widget-container w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-gray-400 text-sm">
          Loading TradingView chart...
        </div>
      </div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget'; 