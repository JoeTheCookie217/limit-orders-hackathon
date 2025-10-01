import { Args, bytesToNativeTypeArray } from '@massalabs/as-types';
import {
  Address,
  balance,
  Context,
  generateEvent,
  getOpData,
  hasOpKey,
} from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';
import {
  IWMAS,
  IRouter,
  IPair,
  LiquidityParameters,
  ONE_COIN,
  PRECISION,
  SafeMath256,
  // PairStorage,
  createKey,
  PersistentMap,
  LBRouter__AmountSlippageCaught,
  transferRemaining,
  IERC20,
} from '@dusalabs/core';
import {
  _getAmountsForLiquidities,
  _getAmountsOf,
} from '../helpers/LiquidityAmounts';

const BALANCES = new PersistentMap<string, u256>('balances');

const mainnet = false;

const wmas = new IWMAS(
  new Address(
    mainnet
      ? 'AS12U4TZfNK7qoLyEERBBRDMu8nm5MKoRzPXDXans4v9wdATZedz9'
      : 'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU',
  ),
);

const v1Router = new IRouter(
  new Address(
    mainnet
      ? 'AS12UMSUxgpRBB6ArZDJ19arHoxNkkpdfofQGekAiAJqsuE6PEFJy'
      : 'AS1XqtvX3rz2RWbnqLfaYVKEjM3VS5pny9yKDdXcmJ5C1vrcLEFd',
  ),
);
const v2Router = new IRouter(
  new Address(
    mainnet ? '' : 'AS15VtUroncrrPHEsRBsdzRjyomJ42emZWdSDEbCj4gU8YctrAU7',
  ),
);

export function main(_: StaticArray<u8>): void {
  const args = getConstructorArgs(0);

  const newPoolAddress = new Address(
    args.nextString().expect('newPoolAddress argument missing'),
  );
  const oldPoolAddress = new Address(
    args.nextString().expect('oldPoolAddress argument missing'),
  );
  const ids = args.nextFixedSizeArray<u64>().expect('ids argument missing');

  assert(false, 'done');
}

export function constructor(bs: StaticArray<u8>): void {
  // main(bs);
}

export function migrate(bs: StaticArray<u8>): void {
  const args = new Args(bs);
  const newPoolAddress = new Address(
    args.nextString().expect('newPoolAddress argument missing'),
  );
  const oldPoolAddress = new Address(
    args.nextString().expect('oldPoolAddress argument missing'),
  );
  const ids = args.nextFixedSizeArray<u64>().expect('ids argument missing');

  _migrate(oldPoolAddress, newPoolAddress, ids);
}

function _migrate(
  oldPoolAddress: Address,
  newPoolAddress: Address,
  ids: u64[],
): void {
  const caller = Context.transactionCreator();
  const callee = Context.callee();

  const oldPool = new IPair(oldPoolAddress);
  const newPool = new IPair(newPoolAddress);

  const tokenX = oldPool.getTokenX();
  const tokenY = oldPool.getTokenY();
  const binStep = oldPool.feeParameters().binStep;

  assert(tokenX.equals(newPool.getTokenX()), 'different tokenX');
  assert(tokenY.equals(newPool.getTokenY()), 'different tokenY');
  assert(binStep === newPool.feeParameters().binStep, 'different binStep');
  assert(oldPool.getFactory().notEqual(newPool.getFactory()), 'same factory');

  // const ids = oldPool.getUserBins(caller).map<u64>((b) => u64(b));
  const accounts = new Array<Address>(ids.length).fill(caller);
  const liquidities = oldPool.balanceOfBatch(accounts, ids);
  // let liquidities = new Array<u256>(ids.length);
  // for (let i = 0; i < ids.length; i++) {
  //   const _id = ids[i];
  //   const key = createKey([_id.toString(), caller.toString()]);
  //   const contains = BALANCES.contains(key, oldPool._origin);
  //   const liquidity = BALANCES.getOf(oldPool._origin, key, u256.Zero);
  //   liquidities[i] = liquidity;
  //   // batchBalances[i] = getBalance(_ids[i], caller);
  // }

  // calc
  const prevDistributionX = new Array<u256>(ids.length);
  const prevDistributionY = new Array<u256>(ids.length);
  for (let i = 0; i < ids.length; i++) {
    const id = u32(ids[i]);
    const bin = oldPool.getBin(id);
    const supply = oldPool.totalSupply(id);
    // generateEvent('supply: ' + supply.toString());
    const balance = liquidities[i];
    const x = SafeMath256.div(SafeMath256.mul(balance, bin.reserveX), supply);
    const y = SafeMath256.div(SafeMath256.mul(balance, bin.reserveY), supply);
    prevDistributionX[i] = x;
    prevDistributionY[i] = y;
  }

  const sumX = prevDistributionX.reduce<u256>(
    (a, b) => SafeMath256.add(a, b),
    u256.Zero,
  );
  const sumY = prevDistributionY.reduce<u256>(
    (a, b) => SafeMath256.add(a, b),
    u256.Zero,
  );

  const distributionX = new Array<u256>(ids.length);
  const distributionY = new Array<u256>(ids.length);
  for (let i = 0; i < ids.length; i++) {
    distributionX[i] = SafeMath256.div(
      SafeMath256.mul(prevDistributionX[i], PRECISION),
      sumX,
    );
    distributionY[i] = SafeMath256.div(
      SafeMath256.mul(prevDistributionY[i], PRECISION),
      sumY,
    );
  }

  // const amounts = _getAmountsOf(caller, ids, oldPool);

  for (let i = 0; i < ids.length; i++) {
    // const bin = oldPool.getBin(ids[i]);
    //   distributionX[i] = SafeMath256.mul(SafeMath256.div( bin.reserveX, amount0), PRECISION)
  }

  // withdraw from old pool
  const isTokenXMAS = tokenX._origin.equals(wmas._origin);
  const isTokenYMAS = tokenY._origin.equals(wmas._origin);
  const isMAS = isTokenXMAS || isTokenYMAS;

  // generateEvent(
  //   'liquidities: ' + liquidities.map<string>((l) => l.toString()).join(' '),
  // );

  let amountX = u256.Zero;
  let amountY = u256.Zero;

  const expected = _getAmountsOf(caller, ids, oldPool);
  generateEvent(
    'expected amountX: ' +
      expected.amountX.toString() +
      ' expected amountY: ' +
      expected.amountY.toString(),
  );

  const amountXMin = u256.Zero;
  const amountYMin = u256.Zero;

  oldPool.safeBatchTransferFrom(caller, callee, ids, liquidities, 2 * ONE_COIN);
  oldPool.setApprovalForAll(true, v1Router._origin);

  if (isMAS) {
    const r = v1Router.removeLiquidityMAS(
      (isTokenXMAS ? tokenY : tokenX)._origin,
      binStep,
      isTokenXMAS ? amountYMin : amountXMin,
      isTokenXMAS ? amountXMin : amountYMin,
      ids,
      liquidities,
      callee,
      Context.timestamp(),
      ONE_COIN,
    );

    amountX = r.amountX;
    amountY = r.amountY;
  } else {
    const r = v1Router.removeLiquidity(
      tokenX._origin,
      tokenY._origin,
      binStep,
      amountXMin,
      amountXMin,
      ids,
      liquidities,
      callee,
      Context.timestamp(),
      2 * ONE_COIN,
    );
    amountX = r.amountX;
    amountY = r.amountY;
  }

  generateEvent(
    'amountX: ' + amountX.toString() + ' amountY: ' + amountY.toString(),
  );

  // deposit to new pool
  const oldPoolId = oldPool.getPairInformation().activeId;
  const newPoolId = newPool.getPairInformation().activeId;
  const idShift = i64(newPoolId) - i64(oldPoolId);
  const activeBin = newPoolId;
  const deltaIds = new Array<i64>(ids.length).fill(0);
  for (let i = 0; i < ids.length; i++) {
    deltaIds[i] = activeBin - ids[i];
  }

  const params = new LiquidityParameters(
    tokenX,
    tokenY,
    binStep,
    amountX,
    amountY,
    u256.Zero,
    u256.Zero,
    activeBin,
    0,
    deltaIds,
    distributionX,
    distributionY,
    caller,
    Context.timestamp(),
  );
  const amountMAS = isTokenXMAS ? amountX : amountY;
  const amountToken = isTokenXMAS ? amountY : amountX;
  const addStorageCost = ONE_COIN;
  (isTokenXMAS ? tokenY : tokenX).increaseAllowance(
    v2Router._origin,
    amountToken,
  );
  if (isMAS && !amountMAS.isZero()) {
    const amountTotal = SafeMath256.add(u256.from(addStorageCost), amountMAS);
    generateEvent('amountTotal: ' + amountTotal.toString());

    const r2 = v2Router.addLiquidityMAS(params, amountTotal, addStorageCost);
    // assert(r2.depositIds === ids, 'Failed to deposit to new pool');
    for (let i = 0; i < ids.length; i++) {
      assert(
        r2.depositIds[i] === ids[i],
        'Failed to deposit to new pool: ' + i.toString(),
      );
    }
  } else {
    const r2 = v2Router.addLiquidity(params, addStorageCost);
    assert(r2.depositIds === ids, 'Failed to deposit to new pool');
  }
}

/**
 * Get the arguments key of the constructor function of the smart contract to deploy.
 * @param i - The index of the smart contract.
 * @returns The arguments key of the constructor function.
 */
function argsKey(i: u64): StaticArray<u8> {
  const argsSubKey: StaticArray<u8> = [0];
  return new Args()
    .add(i + 1)
    .add(argsSubKey)
    .serialize();
}

/**
 * Get the arguments of the constructor function of the smart contract to deploy.
 * @param i - The index of the smart contract.
 * @returns The arguments of the constructor function.
 */
function getConstructorArgs(i: u64): Args {
  const keyArgs = argsKey(i);
  return hasOpKey(keyArgs) ? new Args(getOpData(argsKey(i))) : new Args();
}

/**
 * Get the coins key of the constructor function of the smart contract to deploy.
 * @param i - The index of the smart contract.
 * @returns The coins key of the constructor function.
 */
function coinsKey(i: u64): StaticArray<u8> {
  let coinsSubKey: StaticArray<u8> = [1];

  return new Args()
    .add(i + 1)
    .add(coinsSubKey)
    .serialize();
}

/**
 * Get the coins of the constructor function of the smart contract to deploy.
 * @param i - The index of the smart contract.
 * @returns The coins of the constructor function.
 */
function getCoins(i: u64): u64 {
  let keyCoins = coinsKey(i);

  return hasOpKey(keyCoins)
    ? new Args(getOpData(keyCoins)).next<u64>().unwrapOrDefault()
    : 0;
}

/**
 * @notice Function used by an SC to receive Massa coins
 * @param _ unused
 */
export function receiveCoins(_: StaticArray<u8>): void {}

// if oldActiveId < newActiveId and user only has liquidity on the left side, just migrate to the same ids
// if oldActiveId < newActiveId and user only has liquidity on the right side (ex: old 0.08, liq 0.09, new 0.1 NO), just migrate to the same ids
// if oldActiveId < newActiveId and user has liquidity on both sides, migrate to the left side
// if oldActiveId > newActiveId and user only has liquidity on the left side, migrate to the right side

// easy scenario: lastId < oldActiveId < newActiveId OR oldActiveId < newActiveId < firstId
// medium scenario: firstId < oldActiveId < newActiveId < lastId (ex: liq 0.08 -> 0.12, old 0.1, new 0.11)
// -> 