import {
  Context,
  deferredCallQuote,
  generateEvent,
  Slot,
} from '@massalabs/massa-as-sdk';
import { PERIOD_DURATION, THREAD_DURATION, THREADS } from './constants';
import { CheapestSlotResult } from '../structs';

export function findSlotUnderPrice(
  startPeriod: u64,
  endPeriod: u64,
  maxGas: u64,
  paramsSize: u64,
): Slot {
  let bestSlot = findCheapestSlot(startPeriod, endPeriod, maxGas, paramsSize);
  const price = 2 * maxGas;
  generateEvent(
    [
      'First slot found:',
      bestSlot.slot.period.toString(),
      bestSlot.slot.thread.toString(),
      bestSlot.price.toString(),
      price.toString(),
    ].join(' '),
  );
  let maxIterations = 100; // Prevent infinite loop

  while (bestSlot.price > price && maxIterations > 0) {
    bestSlot = findCheapestSlot(
      bestSlot.slot.period + 1,
      bestSlot.slot.period + 2,
      maxGas,
      paramsSize,
    );
    maxIterations--;
  }
  if (maxIterations == 0) {
    generateEvent('No available slot under acceptable price');
  }
  return bestSlot.slot;
}

export function findCheapestSlot(
  startPeriod: u64,
  endPeriod: u64,
  maxGas: u64,
  paramsSize: u64,
): CheapestSlotResult {
  let cheapestSlotPeriod: u64 = startPeriod;
  let cheapestSlotThread: u8 = 0;
  let cheapestSlotPrice: u64 = deferredCallQuote(
    new Slot(startPeriod, 0),
    maxGas,
    paramsSize,
  );

  for (let period = startPeriod; period <= endPeriod; period++) {
    for (let thread: u8 = 1; thread < 32; thread++) {
      const price = deferredCallQuote(
        new Slot(period, thread),
        maxGas,
        paramsSize,
      );
      if (price < cheapestSlotPrice) {
        cheapestSlotPrice = price;
        cheapestSlotPeriod = period;
        cheapestSlotThread = thread;
      }
    }
  }

  return new CheapestSlotResult(
    new Slot(cheapestSlotPeriod, cheapestSlotThread),
    cheapestSlotPrice,
  );
}

export const computeTargetSlotFromDelay = (delayMillis: u64): Slot => {
  const periodsDelay = delayMillis / PERIOD_DURATION;
  const millisRemainder = delayMillis % PERIOD_DURATION;

  const threadsDelay = u8(millisRemainder / THREAD_DURATION);

  let targetThread = (Context.currentThread() + threadsDelay) % THREADS;
  let targetPeriod = Context.currentPeriod() + periodsDelay;

  // Adjust period if thread overflows
  if (Context.currentThread() + threadsDelay >= THREADS) {
    targetPeriod += 1;
  }

  return new Slot(targetPeriod, targetThread);
};
