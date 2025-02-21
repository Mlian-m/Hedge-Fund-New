'use client';

import dynamic from 'next/dynamic';

// Dynamically import WalletMultiButton with no SSR
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export function WalletButton() {
  return (
    <WalletMultiButton className="!bg-blue-500 hover:!bg-blue-600 !rounded-lg" />
  );
} 