import { useEffect, useState } from "react";
import eventEmitter from "utils/eventEmitter";
import {
  getPendingLimitOrderCreation,
  setPendingLimitOrderCreationRemove,
  getPendingLimitOrderDelete,
  setPendingLimitOrderDeleteRemove,
  getLocallyCompletedOrders,
  removeLocallyCompletedOrders,
  type PendingLimitOrder,
  type LocallyCompletedOrder,
} from "utils/storage";
import type { Order } from "utils/types";

interface UseManageOrdersStorageParams {
  userAddress: string | undefined;
  orders: Order[] | undefined;
}

/**
 * Centralized hook for managing pending and locally completed orders
 * with localStorage synchronization and event-driven updates.
 *
 * Based on Dusa interface architecture for robust order state management.
 */
export const useManageOrdersStorage = ({
  userAddress,
  orders,
}: UseManageOrdersStorageParams) => {
  // Three-tier pending order system
  const [ordersLoading, setOrdersLoading] = useState<PendingLimitOrder[]>([]);
  const [ordersRemoving, setOrdersRemoving] = useState<PendingLimitOrder[]>([]);
  const [locallyCompletedOrders, setLocallyCompletedOrders] = useState<
    LocallyCompletedOrder[]
  >([]);

  // Initial load from localStorage when user connects
  useEffect(() => {
    if (!userAddress) {
      // Clear state when no user
      setOrdersLoading([]);
      setOrdersRemoving([]);
      setLocallyCompletedOrders([]);
      return;
    }

    setOrdersLoading(getPendingLimitOrderCreation(userAddress));
    setOrdersRemoving(getPendingLimitOrderDelete(userAddress));
    setLocallyCompletedOrders(getLocallyCompletedOrders(userAddress));
  }, [userAddress]);

  // Synchronize with backend orders - cleanup when confirmed
  useEffect(() => {
    if (!userAddress || !orders) return;

    let needsRefresh = false;

    // 1. Check for completed order creations
    // Match by ID to ensure we're removing the correct order
    // Note: Backend returns id as string, pendingOrder.id is number
    const completedOrders = ordersLoading.filter(
      (pendingOrder) =>
        orders.find(
          (o) => o.id === String(pendingOrder.id) || o.id === pendingOrder.id
        ) !== undefined
    );

    if (completedOrders.length > 0) {
      setPendingLimitOrderCreationRemove(userAddress, completedOrders);
      needsRefresh = true;
    }

    // 2. Check for completed order removals (cancel/claim)
    // Use dual-field matching: id AND scAddress
    const completedRemovals = ordersRemoving.filter((pendingOrder) => {
      const backendOrder = orders.find(
        (o) =>
          o.id === pendingOrder.id &&
          o.limitOrderAddress === pendingOrder.scAddress
      );
      // Order is no longer active/executed in backend = removal completed
      return (
        !backendOrder ||
        backendOrder.status === "CLAIMED" ||
        backendOrder.status === "CANCELED"
      );
    });

    if (completedRemovals.length > 0) {
      setPendingLimitOrderDeleteRemove(userAddress, completedRemovals);
      needsRefresh = true;
    }

    // 3. Clean up locally completed orders when backend confirms status
    const localOrdersToRemove = locallyCompletedOrders
      .filter((localOrder) => {
        const backendOrder = orders.find((o) => o.id === localOrder.id);
        return (
          backendOrder &&
          (backendOrder.status === "CLAIMED" ||
            backendOrder.status === "CANCELED")
        );
      })
      .map((order) => order.id);

    if (localOrdersToRemove.length > 0) {
      removeLocallyCompletedOrders(userAddress, localOrdersToRemove);
      needsRefresh = true;
    }

    // Refresh state from localStorage after cleanup
    if (needsRefresh) {
      setOrdersLoading(getPendingLimitOrderCreation(userAddress));
      setOrdersRemoving(getPendingLimitOrderDelete(userAddress));
      setLocallyCompletedOrders(getLocallyCompletedOrders(userAddress));
    }
  }, [
    userAddress,
    orders?.length,
    ordersLoading.length,
    ordersRemoving.length,
    locallyCompletedOrders.length,
  ]);

  // Listen for new order creation events
  useEffect(() => {
    const handleOrderCreation = () => {
      if (!userAddress) return;
      const updated = getPendingLimitOrderCreation(userAddress);
      setOrdersLoading(updated);
    };

    eventEmitter.on("updateOrdersLoading", handleOrderCreation);
    return () => {
      eventEmitter.off("updateOrdersLoading", handleOrderCreation);
    };
  }, [userAddress]);

  // Listen for order removal events (cancel/claim)
  useEffect(() => {
    const handleOrderRemoval = () => {
      if (!userAddress) return;
      const updated = getPendingLimitOrderDelete(userAddress);
      setOrdersRemoving(updated);
    };

    eventEmitter.on("updateOrdersRemoving", handleOrderRemoval);
    return () => {
      eventEmitter.off("updateOrdersRemoving", handleOrderRemoval);
    };
  }, [userAddress]);

  // Listen for locally completed order events
  useEffect(() => {
    const handleLocalCompletion = () => {
      if (!userAddress) return;
      const updated = getLocallyCompletedOrders(userAddress);
      setLocallyCompletedOrders(updated);
    };

    eventEmitter.on("localOrderCompleted", handleLocalCompletion);
    return () => {
      eventEmitter.off("localOrderCompleted", handleLocalCompletion);
    };
  }, [userAddress]);

  return {
    ordersLoading,
    ordersRemoving,
    locallyCompletedOrders,
  };
};
