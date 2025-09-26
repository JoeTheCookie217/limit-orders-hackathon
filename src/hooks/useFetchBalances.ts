import { useState, useCallback, useEffect } from "react";
import { IERC20 } from "@dusalabs/sdk";
import type { Provider } from "@massalabs/massa-web3";
import { tokens, MASSA } from "utils/tokens";
import type { Token, TokenInfo } from "utils/types";
import { readOnlyClient } from "utils/web3Client";

interface UseFetchBalancesProps {
  client: Provider | null;
  connectedAddress: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseFetchBalancesReturn {
  tokensInfo: TokenInfo[];
  balances: Map<string, bigint>;
  isLoading: boolean;
  error: string | null;
  refetchBalances: () => Promise<void>;
}

export const useFetchBalances = ({
  client,
  connectedAddress,
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds
}: UseFetchBalancesProps): UseFetchBalancesReturn => {
  const [tokensInfo, setTokensInfo] = useState<TokenInfo[]>([]);
  const [balances, setBalances] = useState<Map<string, bigint>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(
    async (token: Token): Promise<bigint> => {
      if (!client || !connectedAddress) {
        console.warn("🚫 Cannot fetch balance: no client or address");
        return 0n;
      }

      console.log(`🔍 Fetching balance for ${token.symbol}:`, {
        tokenAddress: token.address,
        connectedAddress,
        clientType: token.equals(MASSA) ? "wallet" : "readOnly",
      });

      if (token.equals(MASSA)) {
        // Fetch native MAS balance using wallet client
        try {
          const balance = await client.balanceOf([connectedAddress], false);
          return balance[0].balance;
        } catch (error) {
          console.error("❌ Error fetching MAS balance:", error);
          return 0n;
        }
      } else {
        // Fetch token balance using IERC20 contract with dedicated read client
        try {
          const contract = new IERC20(token.address, readOnlyClient);

          return await contract.balanceOf(connectedAddress);
        } catch (error) {
          console.error(
            `❌ Error fetching token balance for ${token.symbol}:`,
            error,
          );
          return 0n;
        }
      }
    },
    [client, connectedAddress],
  );

  const refetchBalances = useCallback(async () => {
    if (!client || !connectedAddress) {
      setTokensInfo([]);
      setBalances(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newTokensInfo: TokenInfo[] = [];
      const newBalances = new Map<string, bigint>();

      // Fetch balances for all tokens
      for (const token of tokens) {
        try {
          const balance = await fetchBalance(token);

          const tokenInfo: TokenInfo = {
            token,
            balance,
            allowance: 0n, // Will be set when needed for specific operations
          };

          newTokensInfo.push(tokenInfo);
          newBalances.set(token.address, balance);
        } catch (tokenError) {
          console.error(
            `Failed to fetch balance for ${token.symbol}:`,
            tokenError,
          );
          // Add token with zero balance on error
          const tokenInfo: TokenInfo = {
            token,
            balance: 0n,
            allowance: 0n,
          };
          newTokensInfo.push(tokenInfo);
          newBalances.set(token.address, 0n);
        }
      }

      setTokensInfo(newTokensInfo);
      setBalances(newBalances);
    } catch (fetchError) {
      const errorMessage = "Failed to fetch token balances";
      setError(errorMessage);
      console.error("Balance fetch error:", fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [client, connectedAddress, fetchBalance]);

  // Initial fetch when wallet connects
  useEffect(() => {
    if (connectedAddress) {
      refetchBalances();
    } else {
      setTokensInfo([]);
      setBalances(new Map());
    }
  }, [connectedAddress, refetchBalances]);

  // Auto-refresh balances
  useEffect(() => {
    if (!autoRefresh || !connectedAddress) return;

    const interval = setInterval(() => {
      refetchBalances();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, connectedAddress, refreshInterval, refetchBalances]);

  return {
    tokensInfo,
    balances,
    isLoading,
    error,
    refetchBalances,
  };
};
