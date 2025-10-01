import { Args, bytesToU64, u64ToBytes } from '@massalabs/as-types';
import {
  Address,
  Context,
  generateEvent,
  Storage,
  callerHasWriteAccess,
  deferredCallRegister,
  deferredCallCancel,
  createEvent,
} from '@massalabs/massa-as-sdk';
import { DCA } from '../structs/DCA';
import { u256 } from 'as-bignum/assembly/integer/u256';
import {
  onlyOwner,
  setOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import { findSlotUnderPrice } from '../helpers/methods';
import { onlyAutonomous } from '../helpers/utils';
import { QUOTER, DCA_ID, DCAS } from '../storage/DCA';
import {
  IERC20,
  IQuoter,
  IPair,
  u256ToString,
  createKey,
  ONE_COIN,
} from '@dusalabs/core';
import {
  MAX_GAS_ASC_CALL,
  ONE_MINUTE,
  ONE_WEEK,
  PERIOD_DURATION,
} from '../helpers/constants';

// ERRORS

const DCA_Wrong_Id = (id: u64): string => {
  return `DCA_Wrong_Id: ${id.toString()}`;
};

// TEMP
export { recover, upgrade } from './Upgradeable';

export function constructor(bs: StaticArray<u8>): void {
  assert(callerHasWriteAccess());

  const args = new Args(bs);
  Storage.set(QUOTER, args.nextString().unwrap());
  Storage.set(DCA_ID, u64ToBytes(0));
  setOwner(new Args().add(Context.caller()).serialize());
}

/**
 * Start a DCA
 * @param {StaticArray<u8>} bs
 *
 */
export function startDCA(bs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(bs);
  const dcaId = incremenentDCAId();
  const caller = Context.caller();

  const amountEachDCA = args.nextU256().unwrap();
  const interval = args.nextU64().unwrap(); // in milliseconds
  const nbOfDCA = args.nextU64().unwrap(); // if end time not set: nbOfDCA = 0
  const tokenPath = args.nextSerializableObjectArray<Address>().unwrap();

  assert(interval >= ONE_MINUTE, 'Interval too short');
  const startInResult = args.nextU64();
  const startIn = startInResult.isOk() ? startInResult.unwrap() : 0;
  const startTime = Context.timestamp() + startIn;
  const dcaKey = buildDCAKey(caller, dcaId);

  const dca = new DCA(
    amountEachDCA,
    interval,
    nbOfDCA,
    tokenPath,
    startTime,
    0,
  );
  DCAS.set(dcaKey, dca);

  const event = createEvent('DCA_ADDED', [caller.toString(), dcaId.toString()]);
  generateEvent(event);

  if (startIn == 0) advance(new Args().add(caller).add(dcaId).serialize());
  else _scheduleDCA(caller, dcaId, interval);

  return u64ToBytes(dcaId);
}

/**
 * Stop a DCA
 * @param {StaticArray<u8>} bs byte string containing the DCA id (u64)
 */
export function stopDCA(bs: StaticArray<u8>): void {
  const args = new Args(bs);
  const dcaId = args.nextU64().unwrap();
  const caller = Context.caller();
  const dcaKey = buildDCAKey(caller, dcaId);
  assert(DCAS.contains(dcaKey), DCA_Wrong_Id(dcaId));

  deleteDCA(dcaKey);
}

/**
 * Update a DCA
 * @param {StaticArray<u8>} bs - byte string containing the DCA id (u64), amountEachDCA (u256), interval (u64), nbOfDCA (u64), tokenPath (Address[])
 */
export function updateDCA(bs: StaticArray<u8>): void {
  const args = new Args(bs);
  const dcaId = args.nextU64().unwrap();
  const caller = Context.caller();
  const dcaKey = buildDCAKey(caller, dcaId);
  assert(DCAS.contains(dcaKey), DCA_Wrong_Id(dcaId));

  const dca = DCAS.getSome(dcaKey);

  if (dca.deferredCallId != '') {
    deferredCallCancel(dca.deferredCallId);
  }

  const amountEachDCA = args.nextU256().unwrap();
  const interval = args.nextU64().unwrap(); // in milliseconds
  const nbOfDCA = args.nextU64().unwrap();
  const tokenPath = args.nextSerializableObjectArray<Address>().unwrap();

  dca.amountEachDCA = amountEachDCA;
  dca.interval = interval;
  dca.nbOfDCA = nbOfDCA;
  dca.tokenPath = tokenPath;

  _scheduleDCA(caller, dcaId, interval);

  const event = createEvent('DCA_UPDATED', [
    caller.toString(),
    dcaId.toString(),
  ]);
  generateEvent(event);
}

/**
 * Owner function to collect the fee
 * @param {StaticArray<u8>} bs - byte string containing the tokens to collect (Address[])
 */
export function collectFee(bs: StaticArray<u8>): void {
  onlyOwner();

  const args = new Args(bs);
  const tokens = args.nextSerializableObjectArray<Address>().unwrap();

  for (let i = 0; i < tokens.length; i++) {
    const token = new IERC20(tokens[i]);
    token.transfer(Context.caller(), token.balanceOf(Context.callee()));
  }
  generateEvent('FEE_COLLECTED');
}

// ==================================================== //
// ====               SC AUTOMATION                ==== //
// ==================================================== //

/**
 * @notice Contract automation
 * @dev This function is called by the contract itself
 * @param {StaticArray<u8>} bs - serialized arguments for the message (dcaOwner, dcaId)
 */
export function advance(bs: StaticArray<u8>): void {
  onlyAutonomous();

  const args = new Args(bs);
  const dcaOwner = new Address(args.nextString().unwrap());
  const dcaId = args.nextU64().unwrap();
  const dcaKey = buildDCAKey(dcaOwner, dcaId);
  const dca = DCAS.getSome(dcaKey);

  const quoter = new IQuoter(new Address(Storage.get(QUOTER)));
  const quote = quoter.findBestPathFromAmountIn(
    dca.tokenPath,
    dca.amountEachDCA,
  );

  let pair = new IPair(quote.pairs[0]);
  let token = new IERC20(dca.tokenPath[0]);
  let _swapForY = token.equals(pair.getTokenX());

  if (
    token.balanceOf(dcaOwner) < dca.amountEachDCA ||
    token.allowance(dcaOwner, Context.callee()) < dca.amountEachDCA
  ) {
    deleteDCA(dcaKey);
    return;
  }

  // transfer token to contract
  token.transferFrom(dcaOwner, pair._origin, dca.amountEachDCA);

  const storageCost = 5 * 10 ** 8; // 0.05 MAS

  // if tokenPath.length > 1, perform intermediate swaps
  for (let i = 1; i < quote.pairs.length; i++) {
    const amount = pair.swap(_swapForY, Context.callee(), storageCost);

    pair = new IPair(quote.pairs[i]);
    token = new IERC20(dca.tokenPath[i]);
    _swapForY = token.equals(pair.getTokenX());

    token.transfer(pair._origin, amount);
  }
  token = new IERC20(dca.tokenPath[dca.tokenPath.length - 1]);

  // swap token
  let amountOut = pair.swap(_swapForY, Context.callee(), storageCost);

  // Collect fee of 0.7% for the ASC execution gas fee
  let fee = u256.div(u256.mul(amountOut, u256.from(7)), u256.from(1000)); // 0.7% fee
  amountOut = u256.sub(amountOut, fee);

  // Send token
  token.transfer(dcaOwner, amountOut);

  const event = createEvent('DCA_EXECUTED', [
    dcaOwner.toString(),
    dcaId.toString(),
    u256ToString(amountOut),
  ]);
  generateEvent(event);

  dca.executedCount += 1;

  if (dca.executedCount > dca.nbOfDCA - 1 && dca.nbOfDCA != 0) {
    deleteDCA(dcaKey);
    return;
  }
  DCAS.set(dcaKey, dca);

  _scheduleDCA(dcaOwner, dcaId, dca.interval);
}

// ==================================================== //
// ====                  HELPERS                   ==== //
// ==================================================== //
/**
 * Build DCA key for storage
 * @param dcaOwner - address of the DCA owner
 * @param dcaId - id of the DCA
 * @returns Key for storage
 */
function buildDCAKey(dcaOwner: Address, dcaId: u64): string {
  return createKey([dcaOwner.toString(), dcaId.toString()]);
}

/**
 * Delete DCA from storage
 * @param dcaOwner - address of the DCA owner
 * @param dcaId - id of the DCA
 */
function deleteDCA(dcaKey: string): void {
  const dca = DCAS.getSome(dcaKey);

  // Cancel the deferred call if it exists
  if (dca.deferredCallId !== '') {
    deferredCallCancel(dca.deferredCallId);
  }

  DCAS.delete(dcaKey); // Recover locked resources
  const event = createEvent('DCA_ENDED', dcaKey.split(':'));
  generateEvent(event);
}

/**
 * Increment DCA id
 * @returns incremented DCA id
 */
function incremenentDCAId(): u64 {
  const id = bytesToU64(Storage.get(DCA_ID));
  Storage.set(DCA_ID, u64ToBytes(id + 1));
  return id;
}

/**
 * Schedule the next deferred call for the DCA
 * @param bs - serialized arguments for the message (caller, dcaId, remainingDelay)
 */
export function scheduleDCA(bs: StaticArray<u8>): void {
  onlyAutonomous();

  const args = new Args(bs);
  const caller = new Address(args.nextString().unwrap());
  const dcaId = args.nextU64().unwrap();
  let remainingDelay = args.nextU64().unwrap();

  _scheduleDCA(caller, dcaId, remainingDelay);
}

function _scheduleDCA(caller: Address, dcaId: u64, remainingDelay: u64): void {
  const dcaKey = buildDCAKey(caller, dcaId);
  const dca = DCAS.getSome(dcaKey);

  // Cancel the previous deferred call if it exists
  if (dca.deferredCallId != '') {
    deferredCallCancel(dca.deferredCallId);
  }

  // First, determine the delayMillis for the next deferred call
  let delayMillis: u64;
  if (remainingDelay > ONE_WEEK) {
    delayMillis = ONE_WEEK;
    remainingDelay -= ONE_WEEK;
  } else {
    delayMillis = remainingDelay;
    remainingDelay = 0;
  }

  // Prepare the arguments for the next deferred call
  const nextArgs = new Args()
    .add(caller)
    .add(dcaId)
    .add(remainingDelay)
    .serialize();

  const currentPeriod = Context.currentPeriod();
  const delayPeriods = delayMillis / PERIOD_DURATION;
  const startPeriod = currentPeriod + delayPeriods;
  const endPeriod = startPeriod + 10;

  const paramsSize = nextArgs.length;

  const targetSlot = findSlotUnderPrice(
    startPeriod,
    endPeriod,
    MAX_GAS_ASC_CALL,
    paramsSize,
  );

  let deferredCallId: string;
  if (remainingDelay > 0) {
    deferredCallId = deferredCallRegister(
      Context.callee().toString(),
      'scheduleDCA',
      targetSlot,
      700_000_000,
      nextArgs,
      0,
    );
    generateEvent(
      [
        'DCA_RELAY_SCHEDULED',
        caller.toString(),
        dcaId.toString(),
        deferredCallId,
      ].join(' '),
    );
  } else {
    const argsAdvance = new Args().add(caller).add(dcaId).serialize();
    deferredCallId = deferredCallRegister(
      Context.callee().toString(),
      'advance',
      targetSlot,
      700_000_000,
      argsAdvance,
      0,
    );
    generateEvent(
      [
        'DCA_SCHEDULED',
        caller.toString(),
        dcaId.toString(),
        deferredCallId,
      ].join(' '),
    );
  }

  // Update the DCA deferredCallId
  dca.deferredCallId = deferredCallId;
  DCAS.set(dcaKey, dca);
}

/**
 * @notice Function used by an SC to receive Massa coins
 * @param _ unused
 */
export function receiveCoins(_: StaticArray<u8>): void {}
