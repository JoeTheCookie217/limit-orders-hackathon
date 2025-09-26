import { useState, useCallback, useContext } from "react";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { useSendTransaction } from "hooks/useSendTransaction";
import eventEmitter from "utils/eventEmitter";
import { setPendingLimitOrderDelete } from 'utils/storage';
import {
  buildCancelOrderTx,
  buildClaimOrderTx,
} from 'utils/transactionBuilder';
import type { Order } from "utils/types";

export type OrderActionType = "cancel" | "claim";

interface UseOrderActionReturn {
  // Loading states
  isProcessing: boolean;
  actionInProgress: OrderActionType | null;

  // Actions
  cancelOrder: (order: Order) => Promise<boolean>;
  claimOrder: (order: Order) => Promise<boolean>;

  // Error handling
  actionError: string | null;
  clearError: () => void;
}

export const useOrderAction = (): UseOrderActionReturn => {
  const { connectedAddress, refetch } = useContext(AccountWrapperContext);

  // State
  const [actionInProgress, setActionInProgress] =
    useState<OrderActionType | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // State for current order being processed
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Transaction hooks
  const { submitTx: submitCancelOrder, pending: cancelPending } =
    useSendTransaction({
      onTxConfirmed: () => {
        console.log("Cancel order transaction confirmed");
        setActionInProgress(null);

        // Add cancelled order to localStorage for immediate UI update
        if (currentOrder && connectedAddress) {
          setPendingLimitOrderDelete(connectedAddress, {
            id: parseInt(currentOrder.id),
            scAddress: currentOrder.limitOrderAddress,
          });
          console.log(
            "Added cancelled order to localStorage:",
            currentOrder.id,
          );
        }

        // Clear current order
        setCurrentOrder(null);

        // Refetch data
        setTimeout(() => {
          refetch(["orders", "balances"]);
          eventEmitter.emit("orderCancelled");
        }, 1000);
      },
    });

  const { submitTx: submitClaimOrder, pending: claimPending } =
    useSendTransaction({
      onTxConfirmed: () => {
        console.log("Claim order transaction confirmed");
        setActionInProgress(null);

        // Refetch data
        setTimeout(() => {
          refetch(["orders", "balances"]);
          eventEmitter.emit("orderClaimed");
        }, 1000);
      },
    });

  const isProcessing = cancelPending || claimPending;

  // Cancel order
  const cancelOrder = useCallback(
    async (order: Order): Promise<boolean> => {
      if (!connectedAddress) {
        setActionError("Wallet not connected");
        return false;
      }

      if (order.status !== "ACTIVE") {
        setActionError("Only active orders can be cancelled");
        return false;
      }

      setActionError(null);
      setActionInProgress("cancel");
      setCurrentOrder(order); // Store the order being cancelled

      try {
        console.log("Cancelling order:", {
          orderId: order.id,
          limitOrderAddress: order.limitOrderAddress,
          tokenIn: order.tokenIn?.symbol,
        });

        // Determine if this is a MAS order
        const isMasOrder = order.tokenIn?.symbol === "MAS";

        // Build cancel transaction
        const cancelTx = buildCancelOrderTx(
          parseInt(order.id),
          order.limitOrderAddress,
          isMasOrder,
        );

        // Submit transaction
        await submitCancelOrder(cancelTx);

        console.log("Cancel order transaction submitted");
        return true;
      } catch (error) {
        console.error("Failed to cancel order:", error);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to cancel order. Please try again.",
        );
        setActionInProgress(null);
        setCurrentOrder(null); // Clear current order on error
        return false;
      }
    },
    [connectedAddress, submitCancelOrder],
  );

  // Claim order
  const claimOrder = useCallback(
    async (order: Order): Promise<boolean> => {
      if (!connectedAddress) {
        setActionError("Wallet not connected");
        return false;
      }

      if (order.status !== "EXECUTED") {
        setActionError("Only executed orders can be claimed");
        return false;
      }

      setActionError(null);
      setActionInProgress("claim");

      try {
        console.log("Claiming order:", {
          orderId: order.id,
          limitOrderAddress: order.limitOrderAddress,
          tokenOut: order.tokenOut?.symbol,
        });

        // Determine if this is a MAS order (for the output token)
        const isMasOrder = order.tokenOut?.symbol === "MAS";

        // Build claim transaction
        const claimTx = buildClaimOrderTx(
          parseInt(order.id),
          order.limitOrderAddress,
          isMasOrder,
        );

        // Submit transaction
        await submitClaimOrder(claimTx);
        return true;
      } catch (error) {
        console.error("Failed to claim order:", error);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to claim order. Please try again.",
        );
        setActionInProgress(null);
        return false;
      }
    },
    [connectedAddress, submitClaimOrder],
  );

  // Clear error
  const clearError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    // Loading states
    isProcessing,
    actionInProgress,

    // Actions
    cancelOrder,
    claimOrder,

    // Error handling
    actionError,
    clearError,
  };
};
