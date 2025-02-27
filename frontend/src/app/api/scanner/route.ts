import { NextRequest, NextResponse } from 'next/server';

interface Blockchain {
  network: string;
  type?: string;
  address?: string | null;
  decimals?: number;
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
  galaxy_score: string;
  galaxy_score_previous: string;
  social_dominance: string;
  sentiment: string;
  sentiment_relative: string;
  blockchains: Blockchain[];
  categories: string;
  raw?: RawCoinData | string;
  logo?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    
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
      next: { revalidate: 300 }
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

    // Log detailed information about the first coin as an example
    if (data.data.length > 0) {
      const sampleCoin = data.data[0];
      console.log('\n=== Sample Token Data Structure ===');
      console.log(JSON.stringify(sampleCoin, null, 2));
      console.log('\n=== Available Fields ===');
      console.log(Object.keys(sampleCoin).join('\n'));
      console.log('\n=== Total Tokens Fetched ===');
      console.log(`Found ${data.data.length} tokens\n`);
    }

    // Transform the data to match our interface
    const transformedData = data.data.map((coin: LunarCrushCoin) => {
      // Get logo URL with fallbacks
      let logoUrl = null;

      // Try to get logo from the coin's properties
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

      // Get network information and contract address
      let network = 'Unknown';
      let contractAddress = 'Unknown';
      
      if (Array.isArray(coin.blockchains) && coin.blockchains.length > 0) {
        // Get networks
        network = coin.blockchains.map(bc => bc.network).join(', ');
        
        // Find the first non-null contract address
        const contractInfo = coin.blockchains.find(bc => bc.address && bc.address !== '0');
        if (contractInfo) {
          contractAddress = contractInfo.address as string;
          
          // Log the found contract address
          console.log(`Found contract address for ${coin.symbol} on ${contractInfo.network}:`, contractAddress);
        } else {
          console.log(`No contract address found for ${coin.symbol} in blockchains:`, coin.blockchains);
        }
      } else if (coin.categories) {
        // Fallback to categories for network info if no blockchains
        const categories = coin.categories.split(',');
        const networkCategories = categories.filter(cat => 
          cat.includes('ecosystem') || 
          ['ethereum', 'bnbchain', 'solana', 'arbitrum', 'polygon'].includes(cat.toLowerCase())
        );
        if (networkCategories.length > 0) {
          network = networkCategories.map(cat => {
            return cat.replace('-ecosystem', '').toLowerCase();
          }).join(', ');
        }
      }

      const transformed = {
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
        galaxy_score: parseInt(coin.galaxy_score) || 0,
        galaxy_score_previous: parseInt(coin.galaxy_score_previous) || 0,
        social_dominance: parseFloat(coin.social_dominance) || 0,
        sentiment: parseFloat(coin.sentiment) || 0,
        sentiment_relative: parseFloat(coin.sentiment_relative) || 0,
        network: network,
        address: contractAddress
      };

      return transformed;
    });

    // Sort by alt_rank in ascending order (lower is better)
    const sortedData = transformedData.sort((a: { alt_rank: number }, b: { alt_rank: number }) => a.alt_rank - b.alt_rank);

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = sortedData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sortedData.length / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: sortedData.length,
        totalPages,
        hasMore
      }
    });
  } catch (error) {
    console.error('Error fetching memecoins:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch memecoins data' },
      { status: 500 }
    );
  }
} 