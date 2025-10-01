import { Bin as _Bin, Fraction, TokenAmount } from "@dusalabs/sdk";
import { poolsV2WithLO } from "./pools";
import { MASSA, WMAS } from "./tokens";
import type { Token, PoolV2WithLO } from "./types";

/**
 * Get MAS if WMAS is provided
 * @param token - Input token
 * @returns MAS token if input is WMAS, else returns input token
 */
export const getMasIfWmas = (token: Token): Token => {
  return token.equals(WMAS) ? MASSA : token;
};

/**
 * Finds a pool in poolsV2WithLO that matches the given tokens (regardless of order)
 * @param token0 First token
 * @param token1 Second token
 * @returns The matching PoolV2WithLO or undefined if not found
 */
export const findLimitOrderPool = (
  token0: Token,
  token1: Token
): PoolV2WithLO | undefined => {
  return poolsV2WithLO.find(
    (pool) =>
      pool?.token0?.address &&
      pool?.token1?.address &&
      token0?.address &&
      token1?.address &&
      ((pool.token0.address === token0.address &&
        pool.token1.address === token1.address) ||
        (pool.token0.address === token1.address &&
          pool.token1.address === token0.address))
  );
};

/**
 * Finds a pool in poolsV2WithLO that matches the given pool address
 * @param poolAddress - The pool address to match
 * @returns The matching PoolV2WithLO or undefined if not found
 */
export const findLimitOrderPoolByAddress = (
  poolAddress: string
): PoolV2WithLO | undefined => {
  return poolsV2WithLO.find((pool) => pool.pairAddress === poolAddress);
};

export const getPoolByLOAddress = (loSC: string): PoolV2WithLO | undefined =>
  poolsV2WithLO.find((pool) => pool.loSC === loSC);

/**
 * Validates if a pool supports limit orders and returns detailed info
 * @param token0 First token
 * @param token1 Second token
 * @returns Object with support status and pool info
 */
export const validateLimitOrderSupport = (
  token0: Token | undefined,
  token1: Token | undefined
): {
  isSupported: boolean;
  pool: PoolV2WithLO | undefined;
  error?: string;
} => {
  if (!token0 || !token1) {
    return {
      isSupported: false,
      pool: undefined,
      error: "Both tokens must be selected",
    };
  }

  const pool = findLimitOrderPool(token0, token1);

  if (!pool) {
    return {
      isSupported: false,
      pool: undefined,
      error: `Limit orders are not supported for ${token0.symbol}/${token1.symbol} pair`,
    };
  }

  return {
    isSupported: true,
    pool,
  };
};

// Use the proper implementations from @dusalabs/sdk
export const getPriceFromId = _Bin.getPriceFromId;
export const getIdFromPrice = _Bin.getIdFromPrice;
export const getIdSlippageFromPriceSlippage =
  _Bin.getIdSlippageFromPriceSlippage;

/**
 * Convert a number to Fraction
 * @param value - The number to convert
 * @returns Fraction object
 */
export const toFraction = (value: number | string): Fraction => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return new Fraction(0n);

  // Convert to fraction with high precision
  const precision = 1000000000000; // 12 decimal places
  return new Fraction(BigInt(Math.round(num * precision)), BigInt(precision));
};

/**
 * Format a TokenAmount to a readable string with significant figures
 * @param tokenAmount - The TokenAmount to format
 * @param significantFigures - Number of significant figures
 * @returns Formatted string
 */
export const tokenAmountToSignificant = (
  tokenAmount: TokenAmount,
  significantFigures = 6
): string => {
  return tokenAmount.toSignificant(significantFigures);
};

/**
 * Round a fraction price for adaptive display
 * @param price - The price as Fraction
 * @param token - Reference token for adaptive decimals
 * @returns Formatted price string
 */
export const roundFractionPriceAdaptive = (
  price: Fraction,
  token: Token
): string => {
  if (price.numerator === 0n) return "0";

  const priceNumber = parseFloat(price.toSignificant(8));

  // Adaptive decimal places based on price magnitude and token decimals
  let decimals = 6;
  if (priceNumber < 0.001) decimals = 8;
  else if (priceNumber < 0.01) decimals = 7;
  else if (priceNumber < 1) decimals = 6;
  else if (priceNumber < 100) decimals = 4;
  else decimals = 2;

  return priceNumber.toFixed(decimals);
};

/**
 * Round a fraction price for standard display
 * @param price - The price as Fraction
 * @param adaptive - Whether to use adaptive formatting
 * @returns Formatted price string
 */
export const roundFractionPrice = (
  price: Fraction,
  adaptive = true
): string => {
  if (price.numerator === 0n) return "0";
  return price.toSignificant(adaptive ? 8 : 6);
};

/**
 * Format a bigint amount to a readable string
 * @param amount - The amount as bigint
 * @param decimals - Token decimals
 * @param maxDecimals - Maximum decimal places to show
 * @returns Formatted string
 */
export const formatAmount = (
  amount: bigint,
  decimals: number,
  maxDecimals = 6
): string => {
  const formatted = Number(amount) / 10 ** decimals;
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

/**
 * Format a price to a readable string
 * @param price - The price as number
 * @param maxDecimals - Maximum decimal places to show
 * @returns Formatted string
 */
export const formatPrice = (price: number, maxDecimals = 6): string => {
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
};
