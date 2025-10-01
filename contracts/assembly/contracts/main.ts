import {
  Address,
  Context,
  createSC,
  fileToByteArray,
  generateEvent,
  transferCoins,
} from '@massalabs/massa-as-sdk';
import {
  IERC20,
  IFactory,
  IRouter,
  PRECISION,
  _sortTokens,
  ONE_COIN,
} from '@dusalabs/core';
import { StrategyParameters } from '../structs/StrategyParameters';
import { ILBStrategy, IRouterVault, IVault } from '../interfaces';
import { u256 } from 'as-bignum/assembly/integer/u256';

const binStepMAS_USDC: u32 = 20;
const binStepMAS_ETH: u32 = 15;
const binStepMAS_BTC: u32 = 15;

export function main(_: StaticArray<u8>): void {
  const callee = Context.callee();
  const caller = Context.caller();

  const usdc = new IERC20(
    new Address('AS1297hjduYBnMpEAcfyBYv8uYCdLH1HLyHoRJYeKB2jqfx9u5C2t'),
  );
  const wmas = new IERC20(
    new Address('AS1ZpbV7rxMrbMUCgaFaHQLpXyCspNC65mYHPcpaT1ArHbqxt4R8'),
  );
  const weth = new IERC20(
    new Address('AS12P7ismSUCGrTQhcE8riJfvGfHnDFgmwd2dsqjMbSMhqpGTHho2'),
  );
  const router = new IRouter(
    new Address('AS1Pfda117DsHdWYHMjhhLwkqWGPXSQUNmB2fVBHK6yQ37fv6mL8'),
  );
  const factory = new IFactory(
    new Address('AS12U1Z3AApUkVso2kbJbf3LUZUeoStjPrWgaqdaduo9P1uMifZh7'),
  );
  // const routerVault = new IRouterVault(
  //   new Address('AS12ENr8esYtHLknouREmjFdqrP7gccAqR4vqfRnmtUnu9kDW26CL'),
  // );

  const tokensA = _sortTokens(usdc._origin, wmas._origin);
  const tokensB = _sortTokens(wmas._origin, weth._origin);
  const pairInfoWmasUsdc = factory.getLBPairInformation(
    tokensA.token0,
    tokensA.token1,
    binStepMAS_USDC,
  );
  const pairInfoWmasWeth = factory.getLBPairInformation(
    tokensB.token0,
    tokensB.token1,
    binStepMAS_ETH,
  );

  const routerVaultWasm: StaticArray<u8> = fileToByteArray(
    'build/RouterVault.wasm',
  );
  const routerVault = new IRouterVault(createSC(routerVaultWasm));
  transferCoins(routerVault._origin, 5 * ONE_COIN);
  routerVault.init(wmas._origin);

  const vaultWasm: StaticArray<u8> = fileToByteArray('build/Vault.wasm');
  const vault = new IVault(createSC(vaultWasm));
  transferCoins(vault._origin, 20 * ONE_COIN);

  // deploy Strat
  const LBStrategyWasm: StaticArray<u8> = fileToByteArray(
    'build/LBStrategy.wasm',
  );
  const lBStrategy = new ILBStrategy(createSC(LBStrategyWasm));
  transferCoins(lBStrategy._origin, 100 * ONE_COIN);

  const deltaIds: i64[] = [
    -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  ];
  const amount = u256.div(PRECISION, u256.from(10));
  const distributionX: u256[] = [
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
  ];
  const distributionY: u256[] = [
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    amount,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
  ];

  const deltaIds1: i64[] = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  const amount01 = u256.div(PRECISION, u256.from(6));
  const distributionX1: u256[] = [
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    amount01,
    amount01,
    amount01,
    amount01,
    amount01,
    amount01,
  ];
  const distributionY1: u256[] = [
    amount01,
    amount01,
    amount01,
    amount01,
    amount01,
    amount01,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
  ];

  const deltaIds3: i64[] = [
    -15, -14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2,
    3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ];
  const amount3 = u256.div(PRECISION, u256.from(16));
  const distributionX3: u256[] = [
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
  ];
  const distributionY3: u256[] = [
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    amount3,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
    u256.Zero,
  ];

  const strategyParamsWethWmas = new StrategyParameters(
    pairInfoWmasWeth.pair.getTokenX(),
    pairInfoWmasWeth.pair.getTokenY(),
    pairInfoWmasWeth.pair._origin,
    pairInfoWmasWeth.binStep,
    deltaIds,
    distributionX,
    distributionY,
    5,
  );
  const strategyParamsUsdcWmas = new StrategyParameters(
    pairInfoWmasUsdc.pair.getTokenX(),
    pairInfoWmasUsdc.pair.getTokenY(),
    pairInfoWmasUsdc.pair._origin,
    pairInfoWmasUsdc.binStep,
    deltaIds,
    distributionX,
    distributionY,
    5,
  );

  let amount1 = u64(200 * 10 ** 9);
  let amount2: u256 = u256.mul(u256.from(1000), u256.from(u64(10 ** 6)));

  // vault 1 : WMAS/USDC
  vault.initt(
    0,
    pairInfoWmasUsdc.pair.getTokenX()._origin,
    pairInfoWmasUsdc.pair.getTokenY()._origin,
    'Vault_MasUsdc12',
    'VMU',
    18,
  ); //0 is just for the test

  lBStrategy.init(
    router._origin,
    vault._origin,
    callee,
    strategyParamsUsdcWmas,
    1,
    5,
  );

  wmas.increaseAllowance(
    routerVault._origin,
    u256.mul(u256.from(10000000), PRECISION),
  );
  usdc.increaseAllowance(
    routerVault._origin,
    u256.mul(u256.from(10000000), PRECISION),
  );

  vault.setStrategyAddress(lBStrategy._origin);
  routerVault.addVault(wmas._origin, usdc._origin, u64(22), vault._origin);

  routerVault.depositMAS(
    wmas._origin,
    usdc._origin,
    u64(22),
    amount1,
    amount2,
    u256.Zero,
    u256.Zero,
  );

  lBStrategy.start();
  lBStrategy.earn();
  vault.start();

  lBStrategy.setFeeRecipient(caller);
  lBStrategy.setOwner(caller);

  // // vault 2 : wmas/wbtc
  // vault.init(0, pairInfoWmasWbtc.pair.getTokenX()._origin,
  // pairInfoWmasWbtc.pair.getTokenY()._origin,"Vault_MasBTC", "VMB", 18); //0 is just for the test
  // lBStrategy.init(router._origin, vault._origin, callee, strategyParamsWbtcWmas, 1, 5);
  // wmas.increaseAllowance(routerVault._origin, u256.Max);

  // wbtc.increaseAllowance(routerVault._origin, u256.Max);

  // vault.setStrategyAddress(lBStrategy._origin);

  // amount1 = u64(680 * 10**9);
  // amount2 = u256.div(u256.from(10**8), u256.from(10));

  // routerVault.addVault(wmas._origin, wbtc._origin,22, vault._origin);
  // routerVault.depositMAS(wmas._origin,wbtc._origin ,22, amount1, amount2, u256.Zero, u256.Zero);
  // lBStrategy.start();
  // lBStrategy.earn();
  // vault.start();

  // lBStrategy.setFeeRecipient(caller);
  // lBStrategy.setOwner(caller);

  // // vault 3 : wmas/weth
  // vault.init(0,pairInfoWmasWeth.pair.getTokenX()._origin,
  // pairInfoWmasWeth.pair.getTokenY()._origin, 'Vault_MasWeth', 'VME', 18); //0 is just for the test

  // lBStrategy.init(
  //   router._origin,
  //   vault._origin,
  //   callee,
  //   strategyParamsWethWmas,
  //   1,
  //   5,
  // );
  // wmas.increaseAllowance(routerVault._origin, u256.Max);
  // weth.increaseAllowance(routerVault._origin, u256.Max);

  // vault.setStrategyAddress(lBStrategy._origin);

  // amount1 = u64(360*10**9);
  // amount2 = PRECISION;

  // routerVault.addVault(wmas._origin, weth._origin,22, vault._origin);
  // routerVault.depositMAS(wmas._origin,weth._origin ,22, amount1, amount2, u256.Zero, u256.Zero);

  // lBStrategy.start();
  // lBStrategy.earn();

  // vault.start();

  // lBStrategy.setFeeRecipient(caller);
  // lBStrategy.setOwner(caller);

  generateEvent(
    [vault._origin.toString(), lBStrategy._origin.toString()].join(),
  );
}
