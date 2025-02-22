import { NextResponse } from 'next/server';

interface Blockchain {
  network: string;
}

interface RawCoinData {
  logo?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface LunarCrushCoin {
  id?: string;
  name: string;
  symbol: string;
  price: string;
  percent_change_24h: string;
  market_cap: string;
  volume_24h: string;
  alt_rank: string;
  alt_rank_previous: string;
  social_dominance: string;
  blockchains: Blockchain[];
  categories: string;
  raw?: RawCoinData | string;
  logo?: string;
}

export async function GET() {
  try {
    const apiKey = process.env.LUNARCRUSH_API_KEY;
    if (!apiKey) {
      throw new Error('LUNARCRUSH_API_KEY is not configured');
    }

    const url = "https://lunarcrush.com/api4/public/coins/list/v2";
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    };

    console.log('Fetching memecoins data...');
    const response = await fetch(`${url}?filter=meme&sort=alt_rank`, {
      headers,
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LunarCrush API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || !data.data) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid response format from API');
    }

    // Transform the data to match our interface
    const transformedData = data.data.map((coin: LunarCrushCoin) => {
      // Get logo URL with fallbacks
      let logoUrl = null;

      // Try to get logo from the coin's direct logo property
      if (coin.logo) {
        logoUrl = coin.logo;
      }
      // Try to get from raw data if available
      else if (coin.raw) {
        try {
          const rawData = typeof coin.raw === 'string' ? JSON.parse(coin.raw) : coin.raw;
          if (rawData?.logo) {
            logoUrl = rawData.logo;
          }
        } catch (e) {
          console.warn(`Failed to parse raw data for ${coin.symbol}:`, e);
        }
      }

      // If still no logo, use the CDN URL
      if (!logoUrl) {
        logoUrl = `https://cdn.lunarcrush.com/assets/coins/${coin.symbol.toLowerCase()}/logo.png`;
      }

      // Debug log for logo URL
      console.log(`Logo URL for ${coin.symbol}:`, logoUrl);

      // Get network information
      let network = 'Unknown';
      
      // Try to get network from blockchains array
      if (Array.isArray(coin.blockchains) && coin.blockchains.length > 0) {
        network = coin.blockchains.map(bc => bc.network).join(', ');
      } 
      // If no blockchain data, try to extract from categories
      else if (coin.categories) {
        const categories = coin.categories.split(',');
        const networkCategories = categories.filter(cat => 
          cat.includes('ecosystem') || 
          ['ethereum', 'bnbchain', 'solana', 'arbitrum', 'polygon'].includes(cat.toLowerCase())
        );
        if (networkCategories.length > 0) {
          network = networkCategories.map(cat => {
            // Clean up ecosystem names
            return cat.replace('-ecosystem', '').toLowerCase();
          }).join(', ');
        }
      }

      return {
        id: coin.id || coin.symbol,
        name: coin.name,
        symbol: coin.symbol,
        logo: logoUrl,
        price: parseFloat(coin.price) || 0,
        price_change_24h: parseFloat(coin.percent_change_24h) || 0,
        market_cap: parseFloat(coin.market_cap) || 0,
        volume_24h: parseFloat(coin.volume_24h) || 0,
        alt_rank: parseInt(coin.alt_rank) || 0,
        alt_rank_previous: parseInt(coin.alt_rank_previous) || 0,
        social_dominance: parseFloat(coin.social_dominance) || 0,
        network: network
      };
    });

    // Sort by alt_rank in ascending order (lower is better)
    const sortedData = transformedData.sort((a: { alt_rank: number }, b: { alt_rank: number }) => a.alt_rank - b.alt_rank);

    return NextResponse.json({ data: sortedData });
  } catch (error) {
    console.error('Error fetching memecoins:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch memecoins data' },
      { status: 500 }
    );
  }
} 