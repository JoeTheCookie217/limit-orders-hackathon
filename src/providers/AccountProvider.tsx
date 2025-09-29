import React, { useCallback, useContext } from 'react';
import {
  AccountWrapperContext,
  type AccountWrapperContextType,
} from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { useFetchBalances } from "hooks/useFetchBalances";
import { useWalletConnect } from "hooks/useWalletConnect";

interface AccountProviderProps {
  children: React.ReactNode;
}

const AccountProvider: React.FC<AccountProviderProps> = ({ children }) => {
  const { autoRefresh } = useContext(SettingsContext);

  const {
    client,
    connectedAddress,
    selectedProvider,
    isConnected,
    isConnecting,
    isLoading: walletLoading,
    isAutoConnecting,
    shouldOpenBearbyModal,
    connectWallet,
    disconnectWallet,
    switchAccount,
    providerList,
    openBearbyModal,
    dismissBearbyModal,
  } = useWalletConnect();

  const {
    tokensInfo,
    balances,
    isLoading: balancesLoading,
    refetchBalances,
  } = useFetchBalances({
    client,
    connectedAddress,
    autoRefresh,
    refreshInterval: 10000, // 10 seconds
  });

  const refetch = useCallback(
    (keys?: string[]) => {
      console.log('Refetching data:', keys);

      if (!keys || keys.length === 0) {
        // Refetch everything
        refetchBalances();
        return;
      }

      // Refetch specific data types
      if (keys.includes('balances')) {
        refetchBalances();
      }

      // Add more specific refetch logic here as needed
    },
    [refetchBalances],
  );

  const contextValue: AccountWrapperContextType = {
    client,
    connectedAddress,
    selectedProvider,
    isConnected,
    providerList,
    tokensInfo,
    balances,
    connectWallet,
    disconnectWallet,
    refetch,
    openBearbyModal,
    dismissBearbyModal,
    isLoading: walletLoading || balancesLoading,
    isConnecting,
    isAutoConnecting,
    shouldOpenBearbyModal,
  };

  return (
    <AccountWrapperContext.Provider value={contextValue}>
      {children}
    </AccountWrapperContext.Provider>
  );
};

export default AccountProvider;
