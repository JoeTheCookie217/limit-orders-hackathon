import { useContext, useEffect, useMemo, useState } from "react";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import {
  enrichOrderWithTokens,
  type EnrichedOrder,
} from 'utils/datastoreFetcher';
import {
  getPendingLimitOrderCreation,
  getPendingLimitOrderDelete,
  setPendingLimitOrderCreationRemove,
  setPendingLimitOrderDeleteRemove,
  type PendingLimitOrder,
} from 'utils/storage';
import { trpc, type Order } from 'utils/trpc';

export interface UseFetchOrdersReturn {
  // Data
  orders: EnrichedOrder[] | undefined;
  activeOrders: EnrichedOrder[];
  completedOrders: EnrichedOrder[];

  // Loading and error states
  isLoading: boolean;
  isFetched: boolean;
  error: string | null;

  // Pending orders
  ordersLoading: PendingLimitOrder[];
  ordersRemoving: PendingLimitOrder[];

  // Actions
  refetch: () => Promise<void>;
}

export const useFetchOrders = (): UseFetchOrdersReturn => {
  const { connectedAddress } = useContext(AccountWrapperContext);

  const queryParameters = { userAddress: connectedAddress || "" };
  const queryOptions = {
    enabled: !!connectedAddress,
  };

  const {
    data: orderDetails,
    refetch,
    isLoading,
    isFetched,
    error,
  } = trpc.getOrders.useQuery(queryParameters, queryOptions);

  console.log({ orderDetails });

  // State for enriched orders
  const [orders, setOrders] = useState<EnrichedOrder[] | undefined>(undefined);

  // Enrich orders when orderDetails changes
  useEffect(() => {
    if (!orderDetails) {
      setOrders(undefined);
      return;
    }

    const enrichOrders = async () => {
      try {
        // Enrich orders with token information in parallel
        const enrichedOrders = await Promise.all(
          orderDetails.map(async (order) => {
            // Convert timestamp string to Date before enriching
            const orderWithDate = {
              ...order,
              timestamp: new Date(order.timestamp)
            };
            return await enrichOrderWithTokens(orderWithDate);
          }),
        );

        setOrders(enrichedOrders);
      } catch (error) {
        console.error('Error enriching orders:', error);
        // Fallback to basic orders with timestamp conversion
        const fallbackOrders: EnrichedOrder[] = orderDetails.map((order) => ({
          ...order,
          timestamp: new Date(order.timestamp),
          tokenIn: undefined as any,
          tokenOut: undefined as any,
          amountOut: 0n,
          price: 0,
        }));
        setOrders(fallbackOrders);
      }
    };

    enrichOrders();
  }, [orderDetails]);

  // Get pending orders from localStorage
  const ordersLoading = connectedAddress
    ? getPendingLimitOrderCreation(connectedAddress)
    : [];

  const ordersRemoving = connectedAddress
    ? getPendingLimitOrderDelete(connectedAddress)
    : [];

  // Filter active and completed orders
  const activeOrders = useMemo(() => {
    return (
      orders
        ?.filter((order) => {
          try {
            if (!order) return false;
            return (
              order.status === "ACTIVE" &&
              !ordersRemoving.some(
                (removingOrder) =>
                  removingOrder.id === order.id &&
                  removingOrder.scAddress === order.limitOrderAddress,
              )
            );
          } catch (error) {
            console.error("Error filtering order:", error, order);
            return false;
          }
        })
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ) || []
    );
  }, [orders, ordersRemoving]);

  const completedOrders = useMemo(() => {
    return (
      orders?.filter((order) =>
        ["EXECUTED", "CANCELLED", "EXPIRED", "CLAIMED"].includes(order.status),
      ) || []
    );
  }, [orders]);

  // Clean up pending orders that now exist in backend
  useEffect(() => {
    if (
      orders &&
      orders.length > 0 &&
      ordersLoading.length > 0 &&
      connectedAddress
    ) {
      const ordersToRemove: PendingLimitOrder[] = [];

      ordersLoading.forEach((pendingOrder) => {
        const existsInBackend = orders.some(
          (order) => order.limitOrderAddress === pendingOrder.scAddress,
        );

        if (existsInBackend) {
          ordersToRemove.push(pendingOrder);
        }
      });

      if (ordersToRemove.length > 0) {
        console.log(
          "🧹 Cleaning up pending orders that are now in backend:",
          ordersToRemove,
        );
        setPendingLimitOrderCreationRemove(connectedAddress, ordersToRemove);
      }
    }
  }, [orders, ordersLoading, connectedAddress]);

  // Clean up cancelled orders that are no longer active in backend or have been processed
  useEffect(() => {
    if (orders && ordersRemoving.length > 0 && connectedAddress) {
      const ordersToCleanup: PendingLimitOrder[] = [];

      ordersRemoving.forEach((removingOrder) => {
        const orderInBackend = orders.find(
          (order) =>
            order.id.toString() === removingOrder.id.toString() &&
            order.limitOrderAddress === removingOrder.scAddress,
        );

        // Remove from localStorage if:
        // 1. Order no longer exists in backend (fully processed)
        // 2. Order status is CANCELLED or CLAIMED (processed)
        if (
          !orderInBackend ||
          (orderInBackend &&
            ['CANCELLED', 'CLAIMED', 'EXECUTED'].includes(
              orderInBackend.status,
            ))
        ) {
          ordersToCleanup.push(removingOrder);
        }
      });

      if (ordersToCleanup.length > 0) {
        console.log(
          "🧹 Cleaning up processed cancelled orders:",
          ordersToCleanup,
        );
        setPendingLimitOrderDeleteRemove(connectedAddress, ordersToCleanup);
      }
    }
  }, [orders, ordersRemoving, connectedAddress]);

  console.log({ orders });

  return {
    // Data
    orders,
    activeOrders,
    completedOrders,

    // Loading and error states
    isLoading,
    isFetched,
    error: error?.message || null,

    // Pending orders
    ordersLoading,
    ordersRemoving,

    // Actions
    refetch: async () => {
      await refetch();
    },
  };
};
