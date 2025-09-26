import type { InterfaceLevel } from 'context/SettingsContext';
import { DEFAULT_SLIPPAGE } from './constants';

// Storage keys
const STORAGE_KEYS = {
  INTERFACE_LEVEL: 'dusa-limit-orders-interface-level',
  INTERFACE_THEME: 'dusa-limit-orders-theme',
  LIMIT_ORDER_SLIPPAGE: 'dusa-limit-orders-slippage',
  AUTO_REFRESH: 'dusa-limit-orders-auto-refresh',
  IS_OVERLAY: 'dusa-limit-orders-overlay',
  RECENT_TRANSACTIONS: 'dusa-limit-orders-recent-tx',
  PENDING_ORDERS: 'dusa-limit-orders-pending',
};

// Generic storage functions
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setInStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

// Interface Level
export const getInterfaceLevel = (): InterfaceLevel =>
  getFromStorage(STORAGE_KEYS.INTERFACE_LEVEL, 'simple');

export const setInterfaceLevel = (level: InterfaceLevel): void =>
  setInStorage(STORAGE_KEYS.INTERFACE_LEVEL, level);

// Interface Theme
export const getInterfaceTheme = (): string | null =>
  getFromStorage(STORAGE_KEYS.INTERFACE_THEME, null);

export const setInterfaceTheme = (theme: string): void =>
  setInStorage(STORAGE_KEYS.INTERFACE_THEME, theme);

// Slippage Settings
export const getLimitOrderSlippage = (): number =>
  getFromStorage(
    STORAGE_KEYS.LIMIT_ORDER_SLIPPAGE,
    DEFAULT_SLIPPAGE.LIMIT_ORDER,
  );

export const setLimitOrderSlippage = (slippage: number): void =>
  setInStorage(STORAGE_KEYS.LIMIT_ORDER_SLIPPAGE, slippage);

// Auto Refresh
export const getAutoRefresh = (): boolean =>
  getFromStorage(STORAGE_KEYS.AUTO_REFRESH, true);

export const setAutoRefresh = (enabled: boolean): void =>
  setInStorage(STORAGE_KEYS.AUTO_REFRESH, enabled);

// Overlay
export const getIsOverlay = (): boolean =>
  getFromStorage(STORAGE_KEYS.IS_OVERLAY, false);

export const setIsOverlay = (enabled: boolean): void =>
  setInStorage(STORAGE_KEYS.IS_OVERLAY, enabled);

// Pending Orders - matching Dusa interface structure
export interface PendingLimitOrder {
  id: number;
  scAddress: string;
}

export const getPendingLimitOrderCreation = (
  userAddress: string,
): PendingLimitOrder[] =>
  getFromStorage<PendingLimitOrder[]>(
    `pendingLimitOrderCreation${userAddress}`,
    [],
  );

export const setPendingLimitOrderCreation = (
  userAddress: string,
  order: PendingLimitOrder,
) => {
  const pending = getPendingLimitOrderCreation(userAddress);
  pending.push(order);
  setInStorage(`pendingLimitOrderCreation${userAddress}`, pending);
};

export const setPendingLimitOrderCreationRemove = (
  userAddress: string,
  orders: PendingLimitOrder[],
) => {
  const pending = getPendingLimitOrderCreation(userAddress);
  const filtered = pending.filter(
    (storedOrder) =>
      !orders.some(
        (order) =>
          order.id === storedOrder.id &&
          order.scAddress === storedOrder.scAddress,
      ),
  );
  setInStorage(`pendingLimitOrderCreation${userAddress}`, filtered);
};

export const getPendingLimitOrderDelete = (
  userAddress: string,
): PendingLimitOrder[] =>
  getFromStorage<PendingLimitOrder[]>(
    `pendingLimitOrderDelete${userAddress}`,
    [],
  );

export const setPendingLimitOrderDelete = (
  userAddress: string,
  order: PendingLimitOrder,
) => {
  const pending = getPendingLimitOrderDelete(userAddress);
  pending.push(order);
  setInStorage(`pendingLimitOrderDelete${userAddress}`, pending);
};

export const setPendingLimitOrderDeleteRemove = (
  userAddress: string,
  orders: PendingLimitOrder[],
) => {
  const pending = getPendingLimitOrderDelete(userAddress);
  const filtered = pending.filter(
    (storedOrder) =>
      !orders.some(
        (order) =>
          order.id === storedOrder.id &&
          order.scAddress === storedOrder.scAddress,
      ),
  );
  setInStorage(`pendingLimitOrderDelete${userAddress}`, filtered);
};

// Recent Transactions
export interface RecentTransaction {
  hash: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export const addRecentTransaction = (tx: RecentTransaction): void => {
  const recent = getFromStorage<RecentTransaction[]>(
    STORAGE_KEYS.RECENT_TRANSACTIONS,
    [],
  );
  recent.unshift(tx); // Add to beginning
  // Keep only last 50 transactions
  const trimmed = recent.slice(0, 50);
  setInStorage(STORAGE_KEYS.RECENT_TRANSACTIONS, trimmed);
};

export const getRecentTransactions = (): RecentTransaction[] =>
  getFromStorage<RecentTransaction[]>(STORAGE_KEYS.RECENT_TRANSACTIONS, []);
