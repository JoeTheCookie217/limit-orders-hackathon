import { useState, useCallback, useContext, useEffect } from "react";
import type { Provider } from "@massalabs/massa-web3";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { useSendTransaction } from "hooks/useSendTransaction";
import eventEmitter from "utils/eventEmitter";
import { validateLimitOrderSupport, getIdFromPrice } from "utils/methods";
import {
  setPendingLimitOrderCreation,
  setPendingLimitOrderCreationRemove,
  type PendingLimitOrder,
} from "utils/storage";
import {
  buildAddOrderTx,
  buildIncreaseAllowanceTx,
  toBI,
} from "utils/transactionBuilder";
import { LimitOrder, type Token, type Order } from "utils/types";

export interface LocalPendingLimitOrder {
  id: string;
  scAddress: string;
  token0: Token;
  token1: Token;
  orderType: "buy" | "sell";
  amountIn: string;
  price: string;
  timestamp: number;
}

export interface LocallyCompletedOrder {
  id: string;
  limitOrderAddress: string;
  status: "CLAIMED" | "CANCELED";
  timestamp: string;
  orderData: Order;
}

interface UseManageOrdersReturn {
  // State
  pendingOrders: LocalPendingLimitOrder[];
  completedOrders: LocallyCompletedOrder[];
  orderError: string | null;

  // Loading states
  isCreatingOrder: boolean;

  // Actions
  createLimitOrder: (params: {
    fromToken: Token;
    toToken: Token;
    fromAmount: string;
    limitPrice: string;
    orderType: "buy" | "sell";
  }) => Promise<boolean>;

  clearError: () => void;
}

export const useManageOrders = (): UseManageOrdersReturn => {
  const { connectedAddress, client, balances, refetch } = useContext(
    AccountWrapperContext
  );

  // State
  const [pendingOrders, setPendingOrders] = useState<LocalPendingLimitOrder[]>(
    []
  );
  const [completedOrders, setCompletedOrders] = useState<
    LocallyCompletedOrder[]
  >([]);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Transaction hooks
  const { submitTx: submitLimitOrder, pending: pendingLimitOrder } =
    useSendTransaction({
      onTxConfirmed: () => {
        // Refetch balances and orders
        setTimeout(() => {
          refetch(["balances", "orders"]);

          // Clean up pending orders after refetch to allow backend sync
          setTimeout(() => {
            setPendingOrders([]);
            // Note: localStorage cleanup will be handled by useFetchOrders polling
          }, 2000);
        }, 1000);
      },
    });

  const { submitTx: submitAllowance, pending: pendingAllowance } =
    useSendTransaction({});

  // Combined loading state
  const isCreatingOrder = pendingLimitOrder || pendingAllowance;

  // Validate limit order creation parameters
  const validateOrderParams = useCallback(
    (params: {
      fromToken: Token;
      toToken: Token;
      fromAmount: string;
      limitPrice: string;
    }) => {
      const { fromToken, toToken, fromAmount, limitPrice } = params;

      if (!connectedAddress || !client) {
        return { valid: false, error: "Wallet not connected" };
      }

      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        return { valid: false, error: "Please enter a valid amount" };
      }

      if (!limitPrice || parseFloat(limitPrice) <= 0) {
        return { valid: false, error: "Please enter a valid price" };
      }

      // Check if limit orders are supported for this token pair
      const validation = validateLimitOrderSupport(fromToken, toToken);
      if (!validation.isSupported || !validation.pool) {
        return {
          valid: false,
          error: validation.error || "Token pair not supported",
        };
      }

      // Check balance
      const balance = balances.get(fromToken.address || "") || 0n;
      const requiredAmount = BigInt(
        parseFloat(fromAmount) * 10 ** fromToken.decimals
      );

      if (requiredAmount > balance) {
        return { valid: false, error: "Insufficient balance" };
      }

      return { valid: true, pool: validation.pool };
    },
    [connectedAddress, client, balances]
  );

  // Create limit order
  const createLimitOrder = useCallback(
    async (params: {
      fromToken: Token;
      toToken: Token;
      fromAmount: string;
      limitPrice: string;
      orderType: "buy" | "sell";
    }): Promise<boolean> => {
      setOrderError(null);

      // Validate parameters
      const validation = validateOrderParams(params);
      if (!validation.valid) {
        setOrderError(validation.error || "Invalid order parameters");
        return false;
      }

      const { fromToken, toToken, fromAmount, limitPrice, orderType } = params;
      const pool = validation.pool!;

      // Declare variables outside try block for error handling
      let timestamp: number = Date.now();
      let orderId: number = timestamp;

      try {
        const priceNum = parseFloat(limitPrice);
        const amountBigInt = BigInt(
          parseFloat(fromAmount) * 10 ** fromToken.decimals
        );

        // Calculate binId based on price and binStep
        const binId = getIdFromPrice(priceNum, pool.binStep);

        // Create LimitOrder using Dusa-compatible structure
        const order = new LimitOrder(
          toBI(orderType === "sell" ? 0 : 1), // 0 for sell, 1 for buy in Dusa
          toBI(binId),
          amountBigInt
        );

        // Determine if we should use MAS transaction
        const shouldUseMas = fromToken.symbol === "MAS";

        // Create pending order for UI tracking
        timestamp = Date.now();
        orderId = timestamp;

        const localPendingOrder: LocalPendingLimitOrder = {
          id: orderId.toString(),
          scAddress: pool.loSC,
          token0: fromToken,
          token1: toToken,
          orderType,
          amountIn: fromAmount,
          price: limitPrice,
          timestamp,
        };

        // Add to local pending orders for detailed UI display
        setPendingOrders((prev) => [...prev, localPendingOrder]);

        // Add to localStorage for system-wide tracking (matches Dusa interface)
        if (connectedAddress) {
          setPendingLimitOrderCreation(connectedAddress, {
            id: orderId,
            scAddress: pool.loSC,
          });
        }

        // Build transaction
        const txData = buildAddOrderTx(order, pool.loSC, shouldUseMas);

        // Submit transaction
        await submitLimitOrder(txData);

        // Emit event for other components
        eventEmitter.emit("orderCreated", {
          order: localPendingOrder,
          pool,
        });

        return true;
      } catch (error) {
        console.error("Failed to create limit order:", error);
        setOrderError(
          error instanceof Error
            ? error.message
            : "Failed to create limit order. Please try again."
        );

        // Remove from pending orders on error
        setPendingOrders((prev) =>
          prev.filter((order) => order.timestamp !== timestamp)
        );

        // Remove from localStorage on error
        if (connectedAddress) {
          setPendingLimitOrderCreationRemove(connectedAddress, [
            {
              id: orderId,
              scAddress: pool.loSC,
            },
          ]);
        }

        return false;
      }
    },
    [validateOrderParams, submitLimitOrder]
  );

  // Clear error
  const clearError = useCallback(() => {
    setOrderError(null);
  }, []);

  // Listen to transaction confirmations to move orders from pending to completed
  useEffect(() => {
    const handleTransactionConfirmed = (data: any) => {
      // Move pending orders to completed when transaction is confirmed
      if (data.hash && pendingOrders.length > 0) {
        // Find pending order and move to completed
        // This would normally be done by fetching real orders from backend
        console.log("Transaction confirmed:", data.hash);
      }
    };

    eventEmitter.on("transactionConfirmed", handleTransactionConfirmed);

    return () => {
      eventEmitter.off("transactionConfirmed", handleTransactionConfirmed);
    };
  }, [pendingOrders]);

  // Cleanup pending orders after some time (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      // Remove pending orders older than 5 minutes (should be handled by real order fetching)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setPendingOrders((prev) =>
        prev.filter((order) => order.timestamp > fiveMinutesAgo)
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    // State
    pendingOrders,
    completedOrders,
    orderError,

    // Loading states
    isCreatingOrder,

    // Actions
    createLimitOrder,
    clearError,
  };
};
