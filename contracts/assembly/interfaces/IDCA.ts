import { Args, bytesToU64 } from '@massalabs/as-types';
import { Address, call } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';

export class IDCA {
  constructor(public _origin: Address) {}

  /**
   * Initialize the contract
   * @param quoter - Address of the quoter contract
   */
  init(quoter: Address): void {
    const args = new Args().add(quoter);
    call(this._origin, 'constructor', args, 0);
  }

  /**
   * Start a DCA
   * @param amountEachDCA {u256} - Amount of tokens to swap each DCA
   * @param interval {u64} - Interval between each DCA in milliseconds
   * @param nbOfDCA {u64} - Number of DCA (if 0, infinite)
   * @param tokenPath {Address[]} - Path of the tokens to swap (ex: [tokenA, tokenB, tokenC] => tokenA -> tokenB -> tokenC)
   * @param startIn {u64} - Start the DCA in x milliseconds (default: 0
   * @returns {u64} - Id of the DCA
   */
  startDCA(
    amountEachDCA: u256,
    interval: u64,
    nbOfDCA: u64,
    tokenPath: Address[],
    startIn: u64 = 0,
  ): u64 {
    const args = new Args()
      .add(amountEachDCA)
      .add(interval)
      .add(nbOfDCA)
      .addSerializableObjectArray(tokenPath)
      .add(startIn);
    const res = call(this._origin, 'startDCA', args, 0);
    return bytesToU64(res);
  }

  /**
   * Stop a DCA
   * @param dcaId {u64} - Id of the DCA
   */
  stopDCA(dcaId: u64): void {
    call(this._origin, 'stopDCA', new Args().add(dcaId), 0);
  }

  /**
   * Update a DCA
   * @param dcaId {u64} - Id of the DCA
   * @param amountEachDCA {u256} - Amount of tokens to swap each DCA
   * @param interval {u64} - Interval between each DCA in milliseconds
   * @param nbOfDCA {u64} - Number of DCA (if 0, infinite)
   * @param tokenPath {Address[]} - Path of the tokens to swap (ex: [tokenA, tokenB, tokenC] => tokenA -> tokenB -> tokenC)
   */
  updateDCA(
    dcaId: u64,
    amountEachDCA: u256,
    interval: u64,
    nbOfDCA: u64,
    tokenPath: Address[],
  ): void {
    const args = new Args()
      .add(dcaId)
      .add(amountEachDCA)
      .add(interval)
      .add(nbOfDCA)
      .addSerializableObjectArray(tokenPath);
    call(this._origin, 'updateDCA', args, 0);
  }
}
