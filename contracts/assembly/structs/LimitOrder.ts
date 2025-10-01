import { Args, Result, Serializable } from '@massalabs/as-types';
import { Address } from '@massalabs/massa-as-sdk';
import { IPair } from '@dusalabs/core';
import { u256 } from 'as-bignum/assembly/integer/u256';

// Structure of a limit order
export class LimitOrder implements Serializable {
  /**
   * @param pair {IPair} - Pair to execute the order
   * @param swapForY {bool} - If true, the order will be executed for the token Y of the pair, otherwise for the token X
   * @param binId {u32} - Id of the bin to use for the swap
   * @param amountIn {u256} - Amount of tokens to swap
   * @param to {Address} - Address to receive the tokens
   * @param deadline {u64} - Timestamp (in ms) after which the order is invalid, 0 means no deadline
   * @param _amount {u256} - Number of LBToken received in return
   */
  constructor(
    public pair: IPair = new IPair(new Address()),
    public swapForY: bool = false,
    public binId: u32 = 0,
    public binWithdraw: u32 = 0,
    public amountIn: u256 = u256.Zero,
    public to: Address = new Address(),
    public deadline: u64 = 0,
    public _amount: u256 = u256.Zero,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.pair._origin)
      .add(this.swapForY)
      .add(this.binId)
      .add(this.binWithdraw)
      .add(this.amountIn)
      .add(this.to)
      .add(this.deadline)
      .add(this._amount)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);
    this.pair = new IPair(new Address(args.nextString().unwrap()));
    this.swapForY = args.nextBool().unwrap();
    this.binId = args.nextU32().unwrap();
    this.binWithdraw = args.nextU32().unwrap();
    this.amountIn = args.nextU256().unwrap();
    this.to = new Address(args.nextString().unwrap());
    this.deadline = args.nextU64().unwrap();
    this._amount = args.nextU256().unwrap();
    return new Result(args.offset);
  }
}
