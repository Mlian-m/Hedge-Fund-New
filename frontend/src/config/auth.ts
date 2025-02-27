export const AUTH_CONFIG = {
  TOKEN_NAME: 'SPARK',
  REQUIRED_TOKENS: 100,
  TOKEN_ADDRESSES: {
    devnet: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    mainnet: '5Tytu6cHm69UN9k1ZEqrvCmfJsdUAJnTJpaAV1fZ2e4h'
  }
} as const;

export const AUTH_MESSAGES = {
  CONNECT_WALLET: {
    title: 'Connect Your Wallet',
    description: 'Please connect your wallet to access this feature'
  },
  INSUFFICIENT_BALANCE: {
    title: 'Insufficient Balance',
    description: (required: number, tokenName: string) => 
      `You need at least ${required} ${tokenName} tokens to access this feature`
  }
} as const; 