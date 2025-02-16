'use client';

import { Web3Button } from '@web3modal/react';

export function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">AI Hedge Fund Manager</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Web3Button />
          </div>
        </div>
      </div>
    </header>
  );
} 