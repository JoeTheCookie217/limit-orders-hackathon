import {
  Address,
  Context,
  createSC,
  fileToByteArray,
  generateEvent,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import { IDCA } from '../interfaces/IDCA';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { IERC20, ONE_COIN } from '@dusalabs/core';

export function constructor(_: StaticArray<u8>): void {
  main(_);
}

export function main(_: StaticArray<u8>): void {
  const caller = Context.caller();
  const dcaWasm: StaticArray<u8> = fileToByteArray('build/DCA.wasm');
  const dca = new IDCA(createSC(dcaWasm));
  transferCoins(dca._origin, 40 * ONE_COIN);
  const quoterAddress = new Address(
    'AS193a6BNHGUdMbMfAnyy7o8XtUZxFjJ7on2bNgkS3XBfPqwTxeu',
  );
  dca.init(quoterAddress);

  const usdc = new IERC20(
    new Address('AS1Pyk96h4MDvaPVEwSFKT3CM5f1EqGmUDnQyJpW4i25bzwkUZDT'),
  );

  const wmas = new IERC20(
    new Address('AS124RC2Vhz8EyvG1jFhveBgZUfk3BQgHHLUjZA8pyUhhANevdqhk'),
  );

  const amountEachDCA = u256.fromU64(1 * 10 ** 8); // 0.1 MAS
  const interval = 1000 * 60; // * 60 * 24 * 8; // 8 days in milliseconds
  const nbOfDCA = 1; // if end time not set: nbOfDCA = 0
  const tokenPath = [wmas._origin, usdc._origin];
  const startIn = 0;

  wmas.increaseAllowance(dca._origin, u256.Max);

  dca.startDCA(amountEachDCA, interval, nbOfDCA, tokenPath, startIn);

  generateEvent(['dca address:', dca._origin.toString()].join(' '));
  return;
}
