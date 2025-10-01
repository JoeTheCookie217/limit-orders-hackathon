export const U256_MAX = 2n ** 256n - 1n;
export const ONE_DAY = 24 * 60 * 60 * 1000; // milliseconds
export const POINT_VALUE = 10000; // Base for percentage calculations (100% = 10000)
export const REAL_ID_SHIFT = 8388608; // 2^23, used as default ID

// Transaction parameters
export const minimalFee = 100000n; // Minimal fee for transactions

// Slippage defaults (base 10000)
export const DEFAULT_SLIPPAGE = {
  SWAP: 50, // 0.5%
  LIMIT_ORDER: 100, // 1%
  LIQUIDITY: 50, // 0.5%
};

// Refresh intervals
export const REFRESH_INTERVALS = {
  BALANCES: 10000, // 10s
  ORDERS: 5000, // 5s
  PRICES: 3000, // 3s
};

// Transaction timeouts
export const TX_TIMEOUT = 300000; // 5 minutes
export const CONFIRMATION_TIMEOUT = 60000; // 1 minute
