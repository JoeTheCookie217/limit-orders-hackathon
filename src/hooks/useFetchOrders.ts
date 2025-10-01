import { useContext, useEffect, useMemo, useState } from "react";
import { AccountWrapperContext } from "context/AccountWrapperContext";
import {
  enrichOrderWithTokens,
  type EnrichedOrder,
} from "utils/datastoreFetcher";
import {
  type PendingLimitOrder,
  type LocallyCompletedOrder,
} from "utils/storage";
import { trpc, type Order } from "utils/trpc";
import { useManageOrdersStorage } from "./useManageOrdersStorage";

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
  locallyCompletedOrders: LocallyCompletedOrder[];

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

  // State for enriched orders
  const [orders, setOrders] = useState<EnrichedOrder[] | undefined>(undefined);

  // Use centralized storage management hook with actual orders
  const { ordersLoading, ordersRemoving, locallyCompletedOrders } =
    useManageOrdersStorage({
      userAddress: connectedAddress,
      orders: orders as any, // Pass enriched orders for cleanup logic
    });

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
              timestamp: new Date(order.timestamp),
            };
            return await enrichOrderWithTokens(orderWithDate);
          })
        );

        setOrders(enrichedOrders);
      } catch (error) {
        console.error("Error enriching orders:", error);
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
                  String(removingOrder.id) === String(order.id) &&
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
        ["EXECUTED", "CANCELLED", "EXPIRED", "CLAIMED"].includes(order.status)
      ) || []
    );
  }, [orders]);

  // Note: Cleanup logic is now handled by useManageOrdersStorage hook
  // It uses dual-field matching (id + scAddress) to prevent premature cleanup

  return {
    // Data
    orders,
    activeOrders,
    completedOrders,

    // Loading and error states
    isLoading,
    isFetched,
    error: error?.message || null,

    // Pending orders (from storage hook)
    ordersLoading,
    ordersRemoving,
    locallyCompletedOrders,

    // Actions
    refetch: async () => {
      await refetch();
    },
  };
};
