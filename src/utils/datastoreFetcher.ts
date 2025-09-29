import {
  ILBPair,
  type LBPairReservesAndId,
  IBaseContract,
} from "@dusalabs/sdk";
import { Args, bytesToStr, U8 } from "@massalabs/massa-web3";
import { CHAIN_ID } from './config';
import {
  findLimitOrderPoolByAddress,
  getMasIfWmas,
  getPriceFromId,
} from './methods';
import { tokens } from './tokens';
import type { Order as BackendOrder } from "./trpc";
import { Token } from "./types";
import { readOnlyClient } from "./web3Client";

// Default logo URI for unknown tokens
const unknownURI = "https://via.placeholder.com/64/808080/ffffff?text=?";

/**
 * Fetch pair information optimized - exactly like Dusa
 * @param poolAddress - The pool address
 * @returns Promise with activeId, reserves and fees
 */
export const fetchPairInformationOpti = (
  poolAddress: string,
): Promise<LBPairReservesAndId> =>
  new ILBPair(poolAddress, readOnlyClient)
    .extract(["PAIR_INFORMATION"])
    .then((res) => {
      if (!res[0]?.length) throw new Error("No pair information found");
      const args = new Args(res[0]);
      const activeId = Number(args.nextU32());
      const reserveX = args.nextU256();
      const reserveY = args.nextU256();
      const feesX = { total: args.nextU256(), protocol: args.nextU256() };
      const feesY = { total: args.nextU256(), protocol: args.nextU256() };
      return { activeId, reserveX, reserveY, feesX, feesY };
    });

/**
 * Get token addresses from pair contract
 * @param pairAddress - The pair address
 * @returns Promise with [tokenX, tokenY] addresses
 */
const getPairAddressTokens = async (
  pairAddress: string,
): Promise<[string, string]> =>
  new ILBPair(pairAddress, readOnlyClient)
    .extract(["TOKEN_X", "TOKEN_Y"])
    .then((r) => {
      if (!r[0]?.length || !r[1]?.length)
        throw new Error("No token addresses found");
      return [bytesToStr(r[0]), bytesToStr(r[1])];
    });

/**
 * Get token from known tokens list by address
 * @param address - Token address
 * @returns Token object
 */
const getTokenFromAddress = (address: string): Token => {
  const token = tokens.find((t) => t.address === address);
  if (!token) {
    throw new Error(`Token ${address} not found in known tokens list.`);
  }
  return token;
};

/**
 * Fetch token information from contract
 * @param address - Token address
 * @returns Promise with token info
 */
const fetchTokenInfo = async (address: string): Promise<Token> => {
  return new IBaseContract(address, readOnlyClient)
    .extract(["NAME", "SYMBOL", "DECIMALS"])
    .then((res) => {
      if (!res[0]?.length || !res[1]?.length || !res[2]?.length)
        throw new Error("No token info found");

      const token: Token = new Token(
        CHAIN_ID,
        address,
        Number(U8.fromBytes(res[2])),
        unknownURI,
        bytesToStr(res[1]),
        bytesToStr(res[0]),
      );
      return token;
    });
};

/**
 * Get tokens from pair address - exactly like Dusa interface
 * @param pairAddress - The pair address
 * @returns Promise with [token0, token1] array
 */
export const getTokensFromPairAddress = async (
  pairAddress: string,
): Promise<[Token, Token]> => {
  const pairAddressTokens = await getPairAddressTokens(pairAddress);
  const tokenPromises = pairAddressTokens.map(async (address) => {
    try {
      return getTokenFromAddress(address);
    } catch {
      return fetchTokenInfo(address);
    }
  });
  const [token0, token1] = await Promise.all(tokenPromises);
  return [token0, token1];
};

/**
 * Fetch token from address - uses known tokens first, then contracts
 * @param address - Token address
 * @returns Promise with token info
 */
export const fetchTokenFromAddress = async (
  address: string,
): Promise<Token> => {
  try {
    return getTokenFromAddress(address);
  } catch {
    return fetchTokenInfo(address);
  }
};

/**
 * Fetch pair bin step - simplified version
 * @param token0Address - First token address
 * @param token1Address - Second token address
 * @returns Promise with bin step
 */
export const fetchPairBinStep = async (
  token0Address: string,
  token1Address: string,
): Promise<number> => {
  // This would query the factory to find the pair and get its bin step
  // For now, return default bin step for our test pool
  return 20; // Default bin step for MAS-USDC pool
};

/**
 * Fetch pool version - simplified version
 * @param token0Address - First token address
 * @param token1Address - Second token address
 * @param binStep - Bin step
 * @returns Promise with version
 */
export const fetchPoolVersion = async (
  token0Address: string,
  token1Address: string,
  binStep: number,
): Promise<"V1" | "V2"> => {
  // For our implementation, we're using V2 pools
  return "V2";
};

// Type for enriched order with calculated token properties
export interface EnrichedOrder extends Omit<BackendOrder, 'timestamp'> {
  tokenIn: Token;
  tokenOut: Token;
  amountOut: bigint;
  price: number;
  timestamp: Date;
}

/**
 * Calculate amount out from amount in and price
 * @param amountIn - Amount in as string
 * @param price - Price as number
 * @param isSellOrder - Whether it's a sell order
 * @param decimalsIn - Decimals of input token
 * @param decimalsOut - Decimals of output token
 * @returns Amount out as bigint
 */
const calculateAmountOut = (
  amountIn: string,
  price: number,
  isSellOrder: boolean,
  decimalsIn: number,
  decimalsOut: number,
): bigint => {
  try {
    const amountInBigint = BigInt(amountIn);

    // Use a high precision for price calculations
    const PRICE_PRECISION = 1e18;
    const priceBigint = BigInt(Math.floor(price * PRICE_PRECISION));

    if (priceBigint === 0n || amountInBigint === 0n) {
      return 0n;
    }

    let amountOutRaw: bigint;

    if (isSellOrder) {
      // Sell order: amountOut = amountIn * price
      amountOutRaw = (amountInBigint * priceBigint) / BigInt(PRICE_PRECISION);
    } else {
      // Buy order: amountOut = amountIn / price
      amountOutRaw = (amountInBigint * BigInt(PRICE_PRECISION)) / priceBigint;
    }

    // Adjust for decimal differences between tokens
    const decimalDiff = decimalsOut - decimalsIn;

    if (decimalDiff > 0) {
      // Output token has more decimals
      return amountOutRaw * BigInt(10 ** decimalDiff);
    } else if (decimalDiff < 0) {
      // Input token has more decimals
      return amountOutRaw / BigInt(10 ** (-decimalDiff));
    } else {
      // Same decimals
      return amountOutRaw;
    }
  } catch (error) {
    console.warn("Error calculating amountOut:", error);
    return 0n;
  }
};

/**
 * Enrich a backend order with calculated token properties
 * @param order - Backend order (with string timestamp)
 * @returns Promise with enriched order
 */
export const enrichOrderWithTokens = async (
  order: Omit<BackendOrder, 'timestamp'> & { timestamp: string | Date },
): Promise<EnrichedOrder> => {
  try {
    // Get tokens from pool address
    const [token0, token1] = await getTokensFromPairAddress(order.poolAddress);

    // Determine tokenIn/tokenOut based on isSellOrder
    // Sell order: selling token0 to get token1
    // Buy order: spending token1 to get token0
    const tokenIn = order.isSellOrder ? token0 : token1;
    const tokenOut = order.isSellOrder ? token1 : token0;

    // Calculate price and amountOut
    const pool = findLimitOrderPoolByAddress(order.poolAddress);
    if (!pool) {
      throw new Error(`Pool not found for address: ${order.poolAddress}`);
    }

    const price = getPriceFromId(order.binId, pool.binStep);
    const amountOut = calculateAmountOut(
      order.amountIn,
      price,
      order.isSellOrder,
      tokenIn.decimals,
      tokenOut.decimals,
    );

    return {
      ...order,
      tokenIn,
      tokenOut,
      amountOut,
      price,
      timestamp: order.timestamp instanceof Date ? order.timestamp : new Date(order.timestamp),
    };
  } catch (error) {
    console.error("Error enriching order with tokens:", error, order);

    // Return order with fallback values
    const fallbackToken = new Token(
      CHAIN_ID,
      "unknown",
      18,
      unknownURI,
      "UNKNOWN",
      "Unknown Token",
    );

    return {
      ...order,
      tokenIn: fallbackToken,
      tokenOut: fallbackToken,
      amountOut: 0n,
      price: 0,
      timestamp: order.timestamp instanceof Date ? order.timestamp : new Date(order.timestamp),
    };
  }
};
