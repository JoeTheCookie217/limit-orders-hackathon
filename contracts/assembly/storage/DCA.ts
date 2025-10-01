import { stringToBytes } from '@massalabs/as-types';
import { PersistentMap } from '@dusalabs/core';
import { DCA } from '../structs';

// @dev key: user address
export const DCAS = new PersistentMap<string, DCA>('D');
export const DCA_ID = stringToBytes('DCA_ID');
export const QUOTER = 'QUOTER';
