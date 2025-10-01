import { useState, useCallback, useContext } from "react";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import { useSendTransaction } from "hooks/useSendTransaction";
import eventEmitter from "utils/eventEmitter";
import {
  setPendingLimitOrderDelete,
  setPendingLimitOrderDeleteRemove,
  setLocallyCompletedOrder,
  type LocallyCompletedOrder,
} from "utils/storage";
import {
  buildCancelOrderTx,
  buildClaimOrderTx,
} from "utils/transactionBuilder";
import type { Order } from "utils/types";

export type OrderActionType = "cancel" | "claim";

interface UseOrderActionReturn {
  // Loading states
  isProcessing: boolean;
  actionInProgress: OrderActionType | null;
  processingOrderId: string | null;

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
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);

  // State for current order being processed
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Helper to save locally completed order for immediate UI display
  const saveLocallyCompletedOrder = useCallback(
    (status: "CLAIMED" | "CANCELED") => {
      if (!connectedAddress || !currentOrder) return;

      const localOrder: LocallyCompletedOrder = {
        id: parseInt(currentOrder.id),
        limitOrderAddress: currentOrder.limitOrderAddress,
        status,
        timestamp: new Date().toISOString(),
        orderData: { ...currentOrder, status }, // Store complete order data
      };

      setLocallyCompletedOrder(connectedAddress, localOrder);
      eventEmitter.emit("localOrderCompleted");
    },
    [connectedAddress, currentOrder]
  );

  // Transaction hooks
  const { submitTx: submitCancelOrder, pending: cancelPending } =
    useSendTransaction({
      onTxConfirmed: () => {
        setActionInProgress(null);
        setProcessingOrderId(null);

        // Add cancelled order to localStorage for immediate UI update
        if (currentOrder && connectedAddress) {
          setPendingLimitOrderDelete(connectedAddress, {
            id: parseInt(currentOrder.id),
            scAddress: currentOrder.limitOrderAddress,
          });

          // Emit event immediately to hide order from active list
          eventEmitter.emit("updateOrdersRemoving");

          // Save as locally completed for history display
          saveLocallyCompletedOrder("CANCELED");
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
        setActionInProgress(null);

        // Add claimed order to localStorage to hide from active orders immediately
        if (currentOrder && connectedAddress) {
          setPendingLimitOrderDelete(connectedAddress, {
            id: parseInt(currentOrder.id),
            scAddress: currentOrder.limitOrderAddress,
          });

          // ✅ Emit event immediately to hide order from active list
          eventEmitter.emit("updateOrdersRemoving");

          // Save as locally completed for history display
          saveLocallyCompletedOrder("CLAIMED");
        }

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
      setProcessingOrderId(order.id);
      setCurrentOrder(order); // Store the order being cancelled

      try {
        // Determine if this is a MAS order
        const isMasOrder = order.tokenIn?.symbol === "MAS";

        // Build cancel transaction
        const cancelTx = buildCancelOrderTx(
          parseInt(order.id),
          order.limitOrderAddress,
          isMasOrder
        );

        // Submit transaction
        await submitCancelOrder(cancelTx);

        return true;
      } catch (error) {
        console.error("Failed to cancel order:", error);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to cancel order. Please try again."
        );
        setActionInProgress(null);
        setProcessingOrderId(null);
        setCurrentOrder(null); // Clear current order on error
        return false;
      }
    },
    [connectedAddress, submitCancelOrder]
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
        // Determine if this is a MAS order (for the output token)
        const isMasOrder = order.tokenOut?.symbol === "MAS";

        // Build claim transaction
        const claimTx = buildClaimOrderTx(
          parseInt(order.id),
          order.limitOrderAddress,
          isMasOrder
        );

        // Submit transaction
        await submitClaimOrder(claimTx);
        return true;
      } catch (error) {
        console.error("Failed to claim order:", error);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to claim order. Please try again."
        );
        setActionInProgress(null);
        return false;
      }
    },
    [connectedAddress, submitClaimOrder]
  );

  // Clear error
  const clearError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    // Loading states
    isProcessing,
    actionInProgress,
    processingOrderId,

    // Actions
    cancelOrder,
    claimOrder,

    // Error handling
    actionError,
    clearError,
  };
};
