import { stringToBytes } from '@massalabs/as-types';
import { LimitOrder } from '../structs';
import { PersistentMap } from '@dusalabs/core';

// @dev key: user + id
export const ORDERS = new PersistentMap<string, LimitOrder>('A');
export const ORDER_ID = stringToBytes('ORDER_ID');
