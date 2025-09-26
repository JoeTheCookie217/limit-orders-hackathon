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

  // Loading states
  isLoading: boolean;
  isConnecting: boolean;
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
  isLoading: false,
  isConnecting: false,
});
