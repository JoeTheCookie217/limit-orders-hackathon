import { createContext } from 'react';
import type { Provider } from '@massalabs/massa-web3';
import type { TokenInfo } from 'utils/types';

export interface AccountWrapperContextType {
  // Wallet connection
  client: Provider | null;
  connectedAddress: string | null;
  selectedProvider: any | null; // Temporary fix for IProvider import issue
  isConnected: boolean;

  // Account data
  tokensInfo: TokenInfo[];
  balances: Map<string, bigint>;

  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refetch: (keys?: string[]) => void;
  openBearbyModal: () => boolean;
  dismissBearbyModal: () => void;

  // Loading states
  isLoading: boolean;
  isConnecting: boolean;
  isAutoConnecting: boolean;
  shouldOpenBearbyModal: boolean;
}

export const AccountWrapperContext = createContext<AccountWrapperContextType>({
  client: null,
  connectedAddress: null,
  selectedProvider: null,
  isConnected: false,
  tokensInfo: [],
  balances: new Map(),
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refetch: () => {},
  openBearbyModal: () => false,
  dismissBearbyModal: () => {},
  isLoading: false,
  isConnecting: false,
  isAutoConnecting: false,
  shouldOpenBearbyModal: false,
});
