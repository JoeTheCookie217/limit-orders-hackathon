import { useState, useCallback, useEffect } from "react";
import type { Provider } from "@massalabs/massa-web3";
import {
  getWallets,
  type ListenerCtrl,
  type Wallet,
  WalletName,
} from "@massalabs/wallet-provider";
import { MASSA_CHAIN_ID, NETWORK } from "utils/config";

interface UseWalletConnectReturn {
  client: Provider | null;
  connectedAddress: string | null;
  selectedProvider: Wallet | null;
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchAccount: (address: string) => Promise<void>;
  providerList: Wallet[];
  accounts: Provider[] | null;
}

export const useWalletConnect = (): UseWalletConnectReturn => {
  const [client, setClient] = useState<Provider | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Wallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [providerList, setProviderList] = useState<Wallet[]>([]);
  const [accounts, setAccounts] = useState<Provider[] | null>(null);
  const [accountListener, setAccountListener] = useState<ListenerCtrl>();
  const [networkListener, setNetworkListener] = useState<ListenerCtrl>();

  // Initialize providers on mount
  useEffect(() => {
    const initializeProviders = async () => {
      setIsLoading(true);
      try {
        const providers = await getWallets();
        setProviderList(providers);

        // Try to reconnect to previous provider
        const savedProvider = localStorage.getItem("provider");
        if (savedProvider && providers.length > 0) {
          const provider = providers.find((p) => p.name() === savedProvider);
          if (provider) {
            setSelectedProvider(provider);
            await fetchAccounts(provider);
          }
        }
      } catch (error) {
        console.error("Failed to initialize providers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeProviders();
  }, []);

  // Fetch accounts from a provider
  const fetchAccounts = async (
    provider: Wallet,
  ): Promise<Provider[] | null> => {
    try {
      const providerAccounts = await provider.accounts();
      setAccounts(providerAccounts as any);

      if (providerAccounts.length === 0) {
        console.error("No accounts found in wallet");
        return null;
      }

      return providerAccounts as any;
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      return null;
    }
  };

  // Setup listeners for account and network changes
  const setupListeners = (provider: Wallet) => {
    // Clean up existing listeners
    accountListener?.unsubscribe();
    networkListener?.unsubscribe();

    if (
      provider.name() === WalletName.Bearby ||
      provider.name() === WalletName.MassaWallet
    ) {
      const accListener = provider.listenAccountChanges(() => {
        fetchAccounts(provider);
      });
      setAccountListener(accListener);
    }

    const netListener = provider.listenNetworkChanges((network) => {
      if (network.name !== NETWORK) {
        console.error(
          `Wrong network. Please switch to ${NETWORK} in your wallet.`,
        );
        disconnectWallet();
      }
    });
    setNetworkListener(netListener);
  };

  const connectWallet = useCallback(async () => {
    if (isConnecting) return;

    setIsConnecting(true);

    try {
      if (providerList.length === 0) {
        console.error(
          "No Massa wallet detected. Please install Station or Bearby wallet.",
        );
        return;
      }

      // Try to connect to the first available provider
      for (const provider of providerList) {
        try {
          // Verify network first
          const networkInfo = await provider.networkInfos();
          if (networkInfo.name !== NETWORK) {
            console.error(
              `Wrong network. Please switch to ${NETWORK} in your wallet.`,
            );
            continue;
          }

          const accounts = await fetchAccounts(provider);
          if (!accounts || accounts.length === 0) continue;

          // Create massa-web3 Provider instance from the first account
          setClient(accounts[0]);
          setConnectedAddress(accounts[0].address);
          setSelectedProvider(provider);

          // Set up listeners for changes
          setupListeners(provider);

          // Save provider preference
          localStorage.setItem("provider", provider.name());

          return;
        } catch (providerError) {
          console.log(
            `Failed to connect to ${provider.name()}:`,
            providerError,
          );
          continue;
        }
      }

      console.error("Failed to connect to any available wallet.");
    } catch (error) {
      console.error("Wallet connection error:", error);
      console.error("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, providerList]);

  const disconnectWallet = useCallback(() => {
    try {
      // Clean up listeners
      accountListener?.unsubscribe();
      networkListener?.unsubscribe();

      selectedProvider?.disconnect?.();
    } catch (error) {
      console.log("Disconnect error:", error);
    }

    // Clear local storage
    localStorage.removeItem("provider");

    // Reset state
    setClient(null);
    setConnectedAddress(null);
    setSelectedProvider(null);
    setAccounts(null);
    setAccountListener(undefined);
    setNetworkListener(undefined);
  }, [selectedProvider, accountListener, networkListener]);

  const switchAccount = useCallback(
    async (address: string) => {
      if (!selectedProvider || !accounts) return;

      try {
        setIsLoading(true);

        const targetAccount = accounts.find((acc) => acc.address === address);
        if (!targetAccount) {
          throw new Error("Account not found");
        }

        setClient(targetAccount);
        setConnectedAddress(address);
      } catch (error) {
        console.error("Account switch error:", error);
        console.error("Failed to switch account");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedProvider, accounts],
  );

  return {
    client,
    connectedAddress,
    selectedProvider,
    isConnected: !!connectedAddress,
    isConnecting,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchAccount,
    providerList,
    accounts,
  };
};
