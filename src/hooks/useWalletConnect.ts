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
  isAutoConnecting: boolean;
  shouldOpenBearbyModal: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchAccount: (address: string) => Promise<void>;
  providerList: Wallet[];
  accounts: Provider[] | null;
  openBearbyModal: () => boolean;
  dismissBearbyModal: () => void;
}

export const useWalletConnect = (): UseWalletConnectReturn => {
  const [client, setClient] = useState<Provider | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Wallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [providerList, setProviderList] = useState<Wallet[]>([]);
  const [accounts, setAccounts] = useState<Provider[] | null>(null);
  const [accountListener, setAccountListener] = useState<ListenerCtrl>();
  const [networkListener, setNetworkListener] = useState<ListenerCtrl>();
  const [shouldOpenBearbyModal, setShouldOpenBearbyModal] = useState(false);

  // Auto-reconnect to saved wallet
  const autoReconnect = useCallback(async (provider: Wallet) => {
    setIsAutoConnecting(true);
    try {
      const accounts = await fetchAccounts(provider);
      if (!accounts || accounts.length === 0) {
        console.error("No accounts found during auto-reconnect");
        return false;
      }

      // Try to reconnect to the saved address, or use the first available
      const savedAddress = localStorage.getItem("connectedAddress");
      let targetAccount = accounts[0];

      if (savedAddress) {
        const foundAccount = accounts.find((acc) => acc.address === savedAddress);
        if (foundAccount) {
          targetAccount = foundAccount;
        }
      }

      // Create massa-web3 Provider instance
      setClient(targetAccount);
      setConnectedAddress(targetAccount.address);
      setSelectedProvider(provider);

      // Set up listeners for changes
      setupListeners(provider);

      // Update saved address in case it changed
      localStorage.setItem("connectedAddress", targetAccount.address);

      console.log(`Auto-reconnected to ${provider.name()} (${targetAccount.address})`);
      return true;
    } catch (error) {
      console.error(`Failed to auto-reconnect to ${provider.name()}:`, error);
      return false;
    } finally {
      setIsAutoConnecting(false);
    }
  }, []);

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
            const reconnected = await autoReconnect(provider);
            if (!reconnected) {
              // If reconnection failed, check if it was Bearby and set flag to open modal
              if (provider.name() === WalletName.Bearby) {
                setShouldOpenBearbyModal(true);
              }
            }
          } else {
            // Provider not found, check if we should suggest Bearby
            const bearbyProvider = providers.find((p) => p.name() === WalletName.Bearby);
            if (savedProvider === WalletName.Bearby && !bearbyProvider) {
              console.log("Bearby wallet not detected but was previously connected");
            } else if (savedProvider === WalletName.Bearby && bearbyProvider) {
              setShouldOpenBearbyModal(true);
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize providers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeProviders();
  }, [autoReconnect]);

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
        console.warn(
          `Network changed to ${network.name}. Transactions will require ${NETWORK}.`,
        );
      }
    });
    setNetworkListener(netListener);
  };

  const connectWallet = useCallback(async (specificProvider?: Wallet) => {
    if (isConnecting) return;

    setIsConnecting(true);

    try {
      if (providerList.length === 0) {
        console.error(
          "No Massa wallet detected. Please install Station or Bearby wallet.",
        );
        return;
      }

      // If a specific provider is given, only try that one
      const providersToTry = specificProvider ? [specificProvider] : providerList;

      // Try to connect to the provider(s)
      for (const provider of providersToTry) {
        try {
          // Call provider.connect() to open the wallet popup (important for Bearby)
          await provider.connect();

          const accounts = await fetchAccounts(provider);
          if (!accounts || accounts.length === 0) continue;

          // Create massa-web3 Provider instance from the first account
          setClient(accounts[0]);
          setConnectedAddress(accounts[0].address);
          setSelectedProvider(provider);

          // Set up listeners for changes
          setupListeners(provider);

          // Save provider preference and connected address
          localStorage.setItem("provider", provider.name());
          localStorage.setItem("connectedAddress", accounts[0].address);

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
    localStorage.removeItem("connectedAddress");

    // Reset state
    setClient(null);
    setConnectedAddress(null);
    setSelectedProvider(null);
    setAccounts(null);
    setAccountListener(undefined);
    setNetworkListener(undefined);
    setShouldOpenBearbyModal(false);
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

        // Save the new address
        localStorage.setItem("connectedAddress", address);
      } catch (error) {
        console.error("Account switch error:", error);
        console.error("Failed to switch account");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedProvider, accounts],
  );

  // Function to handle Bearby modal opening
  const openBearbyModal = useCallback(() => {
    const bearbyProvider = providerList.find((p) => p.name() === WalletName.Bearby);
    if (bearbyProvider) {
      setShouldOpenBearbyModal(true);
      return true;
    }
    return false;
  }, [providerList]);

  // Function to dismiss Bearby modal
  const dismissBearbyModal = useCallback(() => {
    setShouldOpenBearbyModal(false);
  }, []);

  return {
    client,
    connectedAddress,
    selectedProvider,
    isConnected: !!connectedAddress,
    isConnecting,
    isLoading,
    isAutoConnecting,
    shouldOpenBearbyModal,
    connectWallet,
    disconnectWallet,
    switchAccount,
    providerList,
    accounts,
    openBearbyModal,
    dismissBearbyModal,
  };
};
