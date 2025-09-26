import { Token as _Token } from "@dusalabs/sdk";
import { Args } from "@massalabs/massa-web3";

export class Token extends _Token {
  public readonly logoURI: string;
  public readonly symbol: string;
  public readonly name: string;

  constructor(
    chainId: number,
    address: string,
    decimals: number,
    logoURI: string,
    symbol: string,
    name: string,
  ) {
    super(chainId, address, decimals, symbol, name);
    this.logoURI = logoURI;
    this.symbol = symbol;
    this.name = name;
  }
}

export interface TokenInfo {
  token: Token;
  balance: bigint;
  allowance: bigint;
}

export interface ICallData {
  targetAddress: string;
  targetFunction: string;
  parameter: Args;
  coins?: bigint;
  fee?: bigint;
  maxGas?: bigint;
}

export const MassaUnits = {
  nanoMassa: 1n,
  microMassa: 1000n,
  mMassa: 1000000n,
  oneMassa: 1000000000n,
} as const;

export type Version = 'V1' | 'V2';

export interface Pool {
  token0: Token;
  token1: Token;
  pairAddress: string;
  binStep: number;
  version: Version;
}

export interface PoolV2WithLO extends Pool {
  loSC: string;
}

// LimitOrder class compatible with @dusalabs/sdk
export class LimitOrder {
  orderType: bigint;
  binId: bigint;
  amountIn: bigint;

  constructor(orderType: bigint, binId: bigint, amountIn: bigint) {
    this.orderType = orderType;
    this.binId = binId;
    this.amountIn = amountIn;
  }
}

export interface Order {
  id: string;
  poolAddress: string;
  limitOrderAddress: string;
  status: 'ACTIVE' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED' | 'CLAIMED';
  timestamp: string;
  binId: number;
  isSellOrder: boolean;
  amountIn: bigint;
  amountOut: bigint;
  tokenIn: Token;
  tokenOut: Token;
  price: number;
  expiryDate?: number;
}

export interface Transaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  description: string;
}

export type Allowance = 'increase' | 'increaseMax';
