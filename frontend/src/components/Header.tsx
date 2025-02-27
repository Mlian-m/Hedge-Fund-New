'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { WalletButton } from './WalletButton';
import { useState } from 'react';

export function Header() {
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold hover:text-blue-400 transition-colors">
                Hedgy Dashboard
              </Link>
              <button
                onClick={() => setShowModal(true)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                How It Works
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/analysis"
                className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  pathname === '/analysis' 
                    ? 'bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" />
                </svg>
                Analysis Tool
              </Link>
              <Link 
                href="/scanner"
                className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  pathname === '/scanner' 
                    ? 'bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20' 
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Social Meme Scanner
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* How It Works Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-4">How Hedgy Hedge Fund Works</h2>
            
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Version 1.0 (Current)</h3>
                <p>
                  Hedgy Hedge Fund v1.0 operates as a hybrid human-AI model, combining the best of both worlds:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-2">
                  <li>
                    <span className="text-blue-400 font-medium">Step 1:</span> Human analysts use the Social Meme Scanner to identify promising projects and track their social metrics.
                  </li>
                  <li>
                    <span className="text-blue-400 font-medium">Step 2:</span> Selected projects are then analyzed through our Analysis Tool.
                  </li>
                  <li>
                    <span className="text-blue-400 font-medium">Step 3:</span> A group of specialized AI agents analyze various aspects of the token:
                    <ul className="list-disc pl-6 mt-1 text-gray-400">
                      <li>Technical analysis</li>
                      <li>Market sentiment</li>
                      <li>Social metrics</li>
                      <li>Risk assessment</li>
                    </ul>
                  </li>
                  <li>
                    <span className="text-blue-400 font-medium">Step 4:</span> Human traders make the final decision based on the comprehensive AI analysis.
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-white">Version 2.0 (Roadmap)</h3>
                <p>
                  The next evolution of Hedgy Hedge Fund will introduce fully automated AI-based trading:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  <li>Autonomous market analysis and decision-making</li>
                  <li>Real-time trading execution</li>
                  <li>Advanced risk management protocols</li>
                  <li>Self-optimizing trading strategies</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 