import { Args, ArrayTypes, MAX_GAS_CALL } from "@massalabs/massa-web3";
import { U256_MAX, minimalFee } from "./constants";
import { MassaUnits } from "./types";
import type { ICallData } from "./types";

/**
 * Convert a value to BigInt safely
 */
export const toBI = (value: number | bigint | string): bigint => {
  if (typeof value === "bigint") return value;
  return BigInt(isNaN(Number(value)) ? 0 : Math.floor(Math.abs(Number(value))));
};

const ONE_BILLION = 1_000_000_000n;
const callData: Pick<ICallData, "coins" | "fee" | "maxGas"> = {
  coins: 100n * MassaUnits.mMassa, // 0.1 MAS
  fee: minimalFee,
  maxGas: ONE_BILLION,
};

/**
 * Build transaction for increasing token allowance
 */
export const buildIncreaseAllowanceTx = (
  token: string,
  spender: string,
  amount: bigint
): ICallData => {
  const args = new Args().addString(spender).addU256(amount > 0n ? amount : 0n);

  return {
    ...callData,
    targetAddress: token,
    targetFunction: "increaseAllowance",
    parameter: args,
  };
};

/**
 * Build transaction for creating a limit order - following Dusa interface signature
 */
export const buildAddOrderTx = (
  order: { orderType: bigint; binId: bigint; amountIn: bigint },
  limitOrderSC: string,
  useMas = false
): ICallData => {
  const masToSend = MassaUnits.oneMassa;

  const args = new Args().addU8(order.orderType).addU64(order.binId);
  if (useMas) {
    args.addU64(order.amountIn);
  } else {
    args.addU256(order.amountIn);
  }

  return {
    ...callData,
    targetAddress: limitOrderSC,
    targetFunction: useMas ? "addLimitOrderMas" : "addLimitOrder",
    parameter: args,
    coins: useMas ? order.amountIn + masToSend : 100n * MassaUnits.mMassa,
    maxGas: MAX_GAS_CALL,
    fee: MassaUnits.oneMassa,
  };
};

/**
 * Build transaction for canceling a limit order
 */
export const buildCancelOrderTx = (
  orderId: number,
  limitOrderSC: string,
  isMas: boolean
): ICallData => {
  const args = new Args().addU32(BigInt(orderId));

  return {
    ...callData,
    targetAddress: limitOrderSC,
    targetFunction: isMas ? "cancelOrderMas" : "cancelOrder",
    parameter: args,
  };
};

/**
 * Build transaction for claiming a limit order
 */
export const buildClaimOrderTx = (
  orderId: number,
  limitOrderSC: string,
  useMas: boolean
): ICallData => {
  const args = new Args().addU32(BigInt(orderId));

  return {
    ...callData,
    targetAddress: limitOrderSC,
    targetFunction: useMas ? "claimOrderMas" : "claimOrder",
    parameter: args,
  };
};

/**
 * Build transaction for wrapping MAS to WMAS
 */
export const buildWrapTx = (amount: bigint, wmasAddress: string): ICallData => {
  return {
    ...callData,
    targetAddress: wmasAddress,
    targetFunction: "deposit",
    parameter: new Args(),
    coins: amount,
  };
};

/**
 * Build transaction for unwrapping WMAS to MAS
 */
export const buildUnwrapTx = (
  _amount: bigint,
  target: string,
  wmasAddress: string
): ICallData => {
  const amount = _amount <= BigInt(2 ** 64 - 1) ? _amount : 0n;
  const args = new Args().addU64(amount).addString(target);

  return {
    ...callData,
    targetAddress: wmasAddress,
    targetFunction: "withdraw",
    parameter: args,
    coins: 0n,
  };
};

/**
 * Build transaction for token transfer
 */
export const buildTransferTokenTx = (
  token: string,
  receiver: string,
  amount: bigint
): ICallData => {
  const args = new Args()
    .addString(receiver)
    .addU256(amount > 0n ? amount : 0n);

  return {
    ...callData,
    targetAddress: token,
    targetFunction: "transfer",
    parameter: args,
  };
};
