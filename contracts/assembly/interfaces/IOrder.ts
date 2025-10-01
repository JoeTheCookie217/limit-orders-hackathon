import { Args, NoArg, bytesToU64 } from '@massalabs/as-types';
import { Address, call } from '@massalabs/massa-as-sdk';
import { LimitOrder } from '../structs';
import { IUpgradeable } from './IUpgradeable';

export class IOrder extends IUpgradeable {
  constructor(public _origin: Address) {
    super(_origin);
  }

  /**
   * Initialize the contract
   */
  init(): void {
    call(this._origin, 'constructor', NoArg, 0);
  }

  /**
   * Add a limit order
   * @param order {LimitOrder} - Limit order
   * @returns {u64} - Id of the order
   */
  addLimitOrder(order: LimitOrder): u64 {
    const res = call(this._origin, 'addLimitOrder', new Args().add(order), 0);
    return bytesToU64(res);
  }

  /**
   * Remove a limit order
   * @param orderId {u64} - Id of the order
   */
  removeLimitOrder(orderId: u64): void {
    call(this._origin, 'removeLimitOrder', new Args().add(orderId), 0);
  }
}
