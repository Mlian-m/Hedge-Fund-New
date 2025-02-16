import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { crypto } = await request.json();

    // For now, return mock data until we integrate with the Python backend
    const mockAnalysis = {
      analysis: {
        signal: Math.random() > 0.5 ? 'bullish' : 'bearish',
        confidence: `${Math.floor(Math.random() * 40 + 60)}%`, // Random between 60-100%
        reasoning: `Analysis based on market data for ${crypto}. This is currently mock data until we integrate with the Python backend.`
      }
    };

    return NextResponse.json(mockAnalysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze cryptocurrency' },
      { status: 500 }
    );
  }
} 