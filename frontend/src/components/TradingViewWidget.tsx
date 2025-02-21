'use client';

import { useEffect, useRef, memo, useState } from 'react';

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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    let scriptElement: HTMLScriptElement | null = null;

    const initWidget = () => {
      if (!container.current) return;

      // Clean up any existing content
      container.current.innerHTML = '';

      // Create and load the script
      scriptElement = document.createElement('script');
      scriptElement.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      scriptElement.type = 'text/javascript';
      scriptElement.async = true;
      scriptElement.innerHTML = JSON.stringify({
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
        "hide_side_toolbar": true,
        "hide_legend": false,
        "hide_volume": false,
        "hide_floating_toolbar": false,
        "details": true,
        "hotlist": true,
        "calendar": true,
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650",
        "container_id": `tradingview_${Math.random().toString(36).substring(7)}`
      });

      // Add load event listener
      scriptElement.onload = () => setIsScriptLoaded(true);

      // Add the script to the container
      container.current.appendChild(scriptElement);
    };

    // Small delay to ensure container is ready
    const timeoutId = setTimeout(initWidget, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
      if (container.current) {
        container.current.innerHTML = '';
      }
      setIsScriptLoaded(false);
    };
  }, [symbol]); // Re-run when symbol changes

  return (
    <div className="relative w-full h-[600px] bg-gray-800 rounded-lg overflow-hidden">
      <div ref={container} className="tradingview-widget-container w-full h-full" />
      {!isScriptLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm text-gray-400">Loading chart...</p>
          </div>
        </div>
      )}
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget'; 