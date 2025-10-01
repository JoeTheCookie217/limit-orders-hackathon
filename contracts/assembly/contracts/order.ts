import {
  Args,
  u64ToBytes,
  bytesToU64,
  stringToBytes,
} from '@massalabs/as-types';
import {
  Address,
  callerHasWriteAccess,
  Context,
  generateEvent,
  sendMessage,
  Storage,
} from '@massalabs/massa-as-sdk';
import { LimitOrder } from '../structs';
import {
  BinHelper,
  IERC20,
  PRECISION,
  u256ToString,
  createEvent,
} from '@dusalabs/core';
import { onlyAutonomous } from '../helpers/utils';
import {
  setOwner,
  onlyOwner,
} from '@massalabs/sc-standards/assembly/contracts/utils/ownership';
import { ORDERS, ORDER_ID } from '../storage/order';
import { u256 } from 'as-bignum/assembly/integer/u256';
import { Amounts } from '@dusalabs/core/assembly/structs/Returns';
export * from './Upgradeable';

// ==================================================== //
// ====                 INITIALIZE                 ==== //
// ==================================================== //

/**
 * @notice Initialize the smart contract
 * @param _ unused see https://github.com/massalabs/massa-sc-std/issues/18
 */
export function constructor(_: StaticArray<u8>): void {
  assert(callerHasWriteAccess(), 'Caller must have write access');

  setOwner(new Args().add(Context.caller()).serialize());
  Storage.set(ORDER_ID, u64ToBytes(1));
}

// ==================================================== //
// ====                  ORDERS                    ==== //
// ==================================================== //

/**
 * @notice Add a limit order
 *
 * @param {StaticArray<u8>} bs - byte string containing the order (LimitOrder) and if it is expiring (bool) and the expiring date if is expiring (u64)
 */
export function addLimitOrder(bs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(bs);
  const order = args.nextSerializable<LimitOrder>().unwrap();

  const caller = Context.caller();
  const currentPeriod = Context.currentPeriod();

  order.swapForY
    ? order.pair
        .getTokenX()
        .transferFrom(Context.caller(), Context.callee(), order.amountIn)
    : order.pair
        .getTokenY()
        .transferFrom(Context.caller(), Context.callee(), order.amountIn);

  // Collect the fee of 0.35% of the amountIn for the ASC execution gas fees
  order.amountIn = u256.sub(
    order.amountIn,
    u256.div(order.amountIn, u256.fromU64(285)),
  );

  // safety check, making sure that the price can be calculated
  BinHelper.getPriceFromId(order.binId, order.pair.feeParameters().binStep);
  BinHelper.getPriceFromId(
    order.binWithdraw,
    order.pair.feeParameters().binStep,
  );

  const orderId = incrementOrderId();
  const autonomousArgs = new Args().add(caller).add(orderId).serialize();

  order.swapForY
    ? order.pair.getTokenX().transfer(order.pair._origin, order.amountIn)
    : order.pair.getTokenY().transfer(order.pair._origin, order.amountIn);
  const r = order.pair.mint(
    [order.binId],
    [order.swapForY ? PRECISION : u256.Zero],
    [order.swapForY ? u256.Zero : PRECISION],
    caller,
    0,
  );

  order._amount = r.liquidityMinted[0];

  // Check if the slippage is too high (>0.2%)
  const amountSlippage = u256.sub(
    order.amountIn,
    u256.div(order.amountIn, u256.fromU64(500)),
  );
  const cond =
    r.amountXAdded < (order.swapForY ? amountSlippage : u256.Zero) ||
    r.amountYAdded < (order.swapForY ? u256.Zero : amountSlippage);
  assert(!cond, 'Order__AmountSlippageCaught');

  if (order.deadline != 0) {
    assert(order.deadline > currentPeriod, 'DEADLINE_PASSED');

    const timeAvailable = order.deadline - Context.timestamp();
    const periods = timeAvailable / 16_000; // period duration in milliseconds
    const validityEndPeriod = currentPeriod + periods;
    sendMessage(
      Context.callee(),
      'removePastLimitOrder',
      validityEndPeriod,
      0,
      validityEndPeriod,
      31,
      100_000_000,
      0,
      0,
      autonomousArgs,
    );
  }

  ORDERS.set(buildOrderKey(caller, orderId), order);
  sendExecuteMessage(caller, order, orderId);

  const event = createEvent('NEW_LIMIT_ORDER', [orderId.toString()]);
  generateEvent(event);

  return u64ToBytes(orderId);
}

/**
 * @notice Cancel a limit order
 *
 * @param {StaticArray<u8>} bs - the order's id
 */
export function removeLimitOrder(bs: StaticArray<u8>): void {
  const caller = Context.caller();
  const id = new Args(bs).nextU64().unwrap();

  const order = ORDERS.getSome(buildOrderKey(caller, id));

  _removeAndTransferLimitOrder(order, caller, id);
}

/**
 * @notice Cancel a limit order
 * @dev This function is called by the autonomous function to remove expired orders
 * @param {StaticArray<u8>} bs
 */
export function removePastLimitOrder(bs: StaticArray<u8>): void {
  onlyAutonomous();

  const args = new Args(bs);
  const caller = new Address(args.nextString().unwrap());
  const id = args.nextU64().unwrap();

  const order = ORDERS.getSome(buildOrderKey(caller, id));

  _removeAndTransferLimitOrder(order, caller, id);
}

function _removeAndTransferLimitOrder(
  order: LimitOrder,
  user: Address,
  id: u64,
): Amounts {
  ORDERS.delete(buildOrderKey(user, id));

  order.pair.safeTransferFrom(
    Context.callee(),
    order.pair._origin,
    order.binId,
    order._amount,
    0,
  );
  const r = order.pair.burn([order.binId], [order._amount], order.to, 0);

  const event = createEvent('REMOVE_LIMIT_ORDER', [id.toString()]);
  generateEvent(event);
  return r;
}

/**
 * @notice Execute a limit order
 * @param {StaticArray<u8>} bs
 */
export function executeLimitOrder(bs: StaticArray<u8>): void {
  onlyAutonomous();

  const args = new Args(bs);
  const user = new Address(args.nextString().unwrap());
  const id = args.nextU64().unwrap();
  const order = ORDERS.getSome(buildOrderKey(user, id));
  const activeId = order.pair.getPairInformation().activeId;
  if (
    order.swapForY
      ? activeId <= order.binWithdraw
      : activeId >= order.binWithdraw
  ) {
    generateEvent('AMOUNT_OUT_TOO_LOW');
    sendExecuteMessage(user, order, id);
    return;
  }

  const r = _removeAndTransferLimitOrder(order, user, id);

  const event = createEvent('EXECUTE_LIMIT_ORDER', [
    id.toString(),
    u256ToString(order.swapForY ? r.amountY : r.amountX),
  ]);
  generateEvent(event);
}

/**
 * Owner function to collect the fee
 * @dev Can't transfer LBTokens as they don't have a `transfer` function
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
// ====                  HELPERS                   ==== //
// ==================================================== //

/**
 * Build the key of the order for storage
 * @param user - the user's address
 * @param id - the order's id
 * @returns The key storage
 */
function buildOrderKey(user: Address, id: u64): string {
  return user.toString().concat(id.toString());
}

/**
 * Increment the order id
 * @returns The next order id
 */
function incrementOrderId(): u64 {
  const id = bytesToU64(Storage.get(ORDER_ID));
  Storage.set(ORDER_ID, u64ToBytes(id + 1));
  return id;
}

/**
 * Send an asynchronous message to the contract
 * @param caller - the caller's address
 * @param order - the order to execute
 * @param id - the order's id
 */
function sendExecuteMessage(caller: Address, order: LimitOrder, id: u64): void {
  const autonomousArgs = new Args().add(caller).add(id).serialize();
  const filterKey = stringToBytes('bin::'.concat(order.binWithdraw.toString()));

  sendMessage(
    Context.callee(),
    'executeLimitOrder',
    Context.currentPeriod(),
    Context.currentThread(),
    4_503_599_627_370_496, //2**52
    31,
    1_000_000_000,
    0,
    0,
    autonomousArgs,
    order.pair._origin,
    filterKey,
  );
}
