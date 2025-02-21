'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { WalletButton } from './WalletButton';

export function Header() {
  const pathname = usePathname();
  
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold hover:text-blue-400 transition-colors">
              Hedgy Dashboard
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/analysis"
              className={`text-sm ${
                pathname === '/analysis' 
                  ? 'text-blue-400 font-medium' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Analysis Tool
            </Link>
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
} 