import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/coins`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch coins');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching coins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available cryptocurrencies' },
      { status: 500 }
    );
  }
} 